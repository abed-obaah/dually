// Mirrors the iOS UserDefaults keys (see specs/00-foundation §2) in localStorage.
const get = (k: string) => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const set = (k: string, v: string | null) => {
  try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ }
};

export const store = {
  get token() { return get('accessToken'); },
  set token(v: string | null) { set('accessToken', v); },
  get loggedIn() { return get('isUserLoggedIn') === 'true'; },
  set loggedIn(v: boolean) { set('isUserLoggedIn', String(v)); },
  get userID() { return get('userID') ?? ''; },
  set userID(v: string) { set('userID', v); },
  get username() { return get('username') ?? ''; },
  set username(v: string) { set('username', v); },
  get avatar() { return get('profileImageURL') ?? ''; },
  set avatar(v: string) { set('profileImageURL', v); },
  get deviceToken() { return get('deviceToken') ?? ''; },
  bool(k: string) { return get(k) === 'true'; },
  setBool(k: string, v: boolean) { set(k, String(v)); },
  json<T>(k: string, fallback: T): T {
    const raw = get(k);
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },
  setJson(k: string, v: unknown) { set(k, JSON.stringify(v)); },
};
