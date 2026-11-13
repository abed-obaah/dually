// Auth helpers shared by the auth screens.
import { session } from '../../lib/session';
import { store } from '../../lib/storage';

type Nav = { reset: (to: string) => void; push: (to: string, state?: unknown) => void };

const EMAIL_RE = /^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
/** iOS isValidEmail: spaces stripped, NSPredicate MATCHES (full match). */
export const isValidEmail = (s: string) => EMAIL_RE.test(s.replace(/\s/g, ''));

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e ?? ''));

/** `iosDeviceToken` is only sent when present. */
export const withDeviceToken = <T extends object>(body: T): T & { iosDeviceToken?: string } =>
  store.deviceToken ? { ...body, iosDeviceToken: store.deviceToken } : body;

/** Enter the main app (initial tab /camera), then replay a deep link stored while logged out. */
export function enterApp(nav: Nav) {
  session.clear();
  nav.reset('/camera');
  let pending: string | null = null;
  try {
    pending = sessionStorage.getItem('pendingDeepLink');
    sessionStorage.removeItem('pendingDeepLink');
  } catch { /* storage unavailable */ }
  if (pending) nav.push(pending);
}
