// Google / Apple sign-in for the web, then the same backend call as iOS
// (POST api/v1/user/socialLogin/add, specs/01-auth §4.4–4.5).
import { api } from '../../api/client';
import { store } from '../../lib/storage';
import { showAlert, withHud } from '../../ui/overlays';
import { enterApp, errMsg, withDeviceToken } from './flow';

type Nav = { reset: (to: string) => void; push: (to: string, state?: unknown) => void };

const env = import.meta.env as Record<string, string | undefined>;
const GOOGLE_CLIENT_ID = env.VITE_GOOGLE_CLIENT_ID;
const APPLE_SERVICE_ID = env.VITE_APPLE_SERVICE_ID;
const APPLE_REDIRECT_URI = env.VITE_APPLE_REDIRECT_URI;

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const APPLE_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  let p = scripts.get(src);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { scripts.delete(src); reject(new Error('Network request failed')); };
      document.head.appendChild(s);
    });
    scripts.set(src, p);
  }
  return p;
}

/** Load the SDKs early so the sign-in popup opens within the tap's user activation. */
export function preloadSocial() {
  if (GOOGLE_CLIENT_ID) loadScript(GSI_SRC).catch(() => {});
  if (APPLE_SERVICE_ID) loadScript(APPLE_SRC).catch(() => {});
}

/** Decode a JWT payload (no verification — the backend only receives name/email, like iOS). */
function jwtPayload(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(b64).split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

// ---------- Google (Google Identity Services) ----------

type GoogleProfile = { name: string; email: string };

function googleProfile(): Promise<GoogleProfile | null> {
  const g = (window as any).google;
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: GoogleProfile | null) => { if (!done) { done = true; resolve(v); } };

    // Fallback when One Tap can't be shown: OAuth popup + userinfo.
    const popup = () => {
      try {
        const client = g.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          callback: async (resp: any) => {
            if (!resp?.access_token) return finish(null);
            try {
              const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${resp.access_token}` } });
              const u = await r.json();
              finish({ name: u?.name ?? '', email: u?.email ?? '' });
            } catch { finish(null); }
          },
          error_callback: () => finish(null),
        });
        client.requestAccessToken({ prompt: 'select_account' });
      } catch { finish(null); }
    };

    try {
      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
        callback: (resp: any) => {
          const p = jwtPayload(resp?.credential ?? '');
          finish({ name: p.name ?? [p.given_name, p.family_name].filter(Boolean).join(' '), email: p.email ?? '' });
        },
      });
      g.accounts.id.prompt((n: any) => {
        if (done) return;
        const notShown = n?.isNotDisplayed?.() || n?.isSkippedMoment?.();
        const dismissedByUser = n?.isDismissedMoment?.() && n?.getDismissedReason?.() !== 'credential_returned';
        if (notShown) popup();
        else if (dismissedByUser) finish(null);
      });
    } catch {
      popup();
    }
  });
}

export async function signInWithGoogle(nav: Nav) {
  if (!GOOGLE_CLIENT_ID) { await showAlert('Google sign-in is not configured for the web yet.'); return; }
  try { await loadScript(GSI_SRC); } catch (e) { await showAlert(errMsg(e)); return; }
  const profile = await googleProfile();
  if (!profile) return; // cancelled / SDK error: nothing happens (iOS)
  const name = profile.name ?? '';
  await socialLogin(nav, {
    firstName: name,
    lastName: '',
    fullName: `${name} `.trim(),
    phone: '',
    email: profile.email ?? '',
    userType: 'USER',
    socialType: 'Google',
    appleToken: '',
  });
}

// ---------- Apple (Sign in with Apple JS) ----------

export async function signInWithApple(nav: Nav) {
  if (!APPLE_SERVICE_ID) { await showAlert('Apple sign-in is not configured for the web yet.'); return; }
  try { await loadScript(APPLE_SRC); } catch (e) { await showAlert(errMsg(e)); return; }
  const AppleID = (window as any).AppleID;
  let res: any;
  try {
    AppleID.auth.init({
      clientId: APPLE_SERVICE_ID,
      scope: 'name email',
      redirectURI: APPLE_REDIRECT_URI || window.location.origin + window.location.pathname,
      usePopup: true,
    });
    res = await AppleID.auth.signIn();
  } catch {
    return; // cancelled / error: nothing happens (iOS)
  }
  const payload = jwtPayload(res?.authorization?.id_token ?? '');
  const sub: string = payload.sub ?? '';
  if (!sub) return;
  const n = res?.user?.name ?? {};
  const firstName = [n.firstName, n.lastName].filter(Boolean).join(' ');
  await socialLogin(nav, {
    firstName,
    lastName: '',
    fullName: `${firstName} `.trim(),
    phone: '',
    // Apple only returns `user.email` on first authorisation; the id_token carries it too.
    email: res?.user?.email ?? payload.email ?? '',
    userType: 'USER',
    socialType: 'Apple',
    appleToken: sub,
  });
}

// ---------- Backend ----------

async function socialLogin(nav: Nav, body: Record<string, string>) {
  try {
    const r: any = await withHud(() => api('api/v1/user/socialLogin/add', { method: 'POST', auth: false, body: withDeviceToken(body) }));
    const d = r?.data ?? {};
    if (d.token) store.token = d.token;
    // iOS bug fix: social login never saved userID (needed for "is this mine" checks).
    const id = d.id ?? d._id;
    if (id) store.userID = String(id);
    store.loggedIn = true;
    await showAlert(r?.msg ?? r?.message ?? '');
    enterApp(nav);
  } catch (e) {
    await showAlert(errMsg(e));
  }
}
