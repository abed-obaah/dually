// HTTP layer mirroring Netwrok/ApiHandler.swift: same host, same paths, same
// Bearer header, same error-message resolution and 401 handling.
import { store } from '../lib/storage';

export const BASE_URL = 'https://back-end.dually.app/';
export const SHARE_POST_URL = 'https://back-end.dually.app/api/post';

export class ApiError extends Error {
  constructor(message: string, public status?: number, public body?: unknown) { super(message); }
}

type Listener = () => void;
const sessionExpiredListeners = new Set<Listener>();
export const onSessionExpired = (l: Listener) => {
  sessionExpiredListeners.add(l);
  return () => { sessionExpiredListeners.delete(l); };
};

function messageFor(status: number, json: any): string {
  if (status === 401) return 'Session expired. Please log in again.';
  if (status >= 400 && status < 500) {
    return json?.error?.message || json?.message || json?.description || `Client Error ${status}: Invalid Request`;
  }
  if (status >= 500) return `Server Error ${status}: ${json?.message || 'Internal Server Error'}`;
  return `HTTP Error: ${status}`;
}

type Opts = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;            // JSON body (also sent with DELETE, like iOS)
  form?: FormData;           // multipart body
  query?: Record<string, string | number | undefined>;
  auth?: boolean;            // default true
  timeoutMs?: number;
};

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const { method = 'GET', body, form, query, auth = true, timeoutMs = 60000 } = opts;
  let url = BASE_URL + path.replace(/^\//, '');
  if (query) {
    const q = Object.entries(query).filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
    if (q) url += (url.includes('?') ? '&' : '?') + q;
  }
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (auth && store.token) headers.Authorization = `Bearer ${store.token}`;
  let payload: BodyInit | undefined;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: payload, signal: ctrl.signal });
  } catch {
    throw new ApiError('Network request failed');
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }

  if (res.ok) {
    if (json === null && text) throw new ApiError('Failed to decode response', res.status, text);
    return json as T;
  }
  if (res.status === 401) {
    store.loggedIn = false;
    store.token = null;
    sessionExpiredListeners.forEach((l) => l());
  }
  throw new ApiError(messageFor(res.status, json), res.status, json);
}

/** Generic media upload used before creating a post/story or avatar (part name is always `image`). */
export function mediaForm(file: Blob, filename?: string, extra?: Record<string, string>) {
  const fd = new FormData();
  const ext = file.type.includes('gif') ? 'gif' : file.type.startsWith('video') ? 'mp4' : 'jpg';
  fd.append('image', file, filename || `${crypto.randomUUID()}.${ext}`);
  if (extra) Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

/** Most list endpoints use { pagination: { currentPage, totalPages } }. Be lenient about types. */
export function hasMore(p: any): boolean {
  if (!p) return false;
  if (typeof p.hasMore === 'boolean') return p.hasMore;
  if (typeof p.hasNextPage === 'boolean') return p.hasNextPage;
  const cur = Number(p.currentPage ?? p.page ?? 1);
  const tot = Number(p.totalPages ?? 1);
  return cur < tot;
}
