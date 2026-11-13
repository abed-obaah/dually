// Explore-local helpers: seen-story store, post actions, HUD ref-counting,
// web share, relative time for stories, post normalisation.
import { api, SHARE_POST_URL } from '../../api/client';
import { session } from '../../lib/session';
import { store } from '../../lib/storage';
import { idOf } from '../../lib/format';
import { Hud, showAlert, showActions, showPrompt } from '../../ui/overlays';

// ---------- HUD (ref-counted so overlapping loads don't hide each other) ----------
let hudCount = 0;
export async function hud<T>(fn: () => Promise<T>, status?: string): Promise<T> {
  if (hudCount++ === 0) Hud.show(status);
  try { return await fn(); } finally { if (--hudCount === 0) Hud.dismiss(); }
}

// ---------- Seen stories (per device) ----------
const SEEN_KEY = 'dually_seenStoryIDs';
export const seenStoryIds = (): Set<string> => new Set(store.json<string[]>(SEEN_KEY, []));
export function markStorySeen(id?: string) {
  if (!id) return;
  const list = store.json<string[]>(SEEN_KEY, []).filter((x) => x !== id);
  list.push(id);
  store.setJson(SEEN_KEY, list.slice(-500));
}

// ---------- Web share ----------
export const SHARE_TEXT = 'Hey your friend shared you this post from dually  ';
export async function webShare(url: string, text = SHARE_TEXT) {
  try {
    if (navigator.share) { await navigator.share({ text, url }); return; }
  } catch (e: any) {
    if (e?.name === 'AbortError') return;
  }
  try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
  showAlert('Link copied');
}
export const postShareUrl = (id: string) => `${SHARE_POST_URL}/${id}`;

// ---------- Posts ----------
export type FeedPost = {
  _id: string; text: string; image?: string; video?: string; thumbnail?: string;
  createdAt?: string; user: any;
  likedByMe: boolean; bookmarkedByMe: boolean;
  likeCount: number; commentCount: number; savedCount: number; shareCount: number; viewsCount: number;
};

const len = (v: any): number | undefined =>
  Array.isArray(v) ? v.length : Array.isArray(v?.userDetails) ? v.userDetails.length : undefined;
const num = (v: any): number | undefined => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() && !isNaN(+v) ? +v : undefined);

/** Accepts ExplorePost, PostDoc (single post) or SimilarPost. */
export function normalizePost(p: any): FeedPost {
  const user = p?.user && typeof p.user === 'object' ? p.user : { _id: idOf(p?.user) };
  const image = typeof p?.image === 'string' ? p.image : Array.isArray(p?.image) ? p.image[0] : undefined;
  return {
    _id: idOf(p),
    text: p?.text ?? '',
    image: image || undefined,
    video: p?.video || undefined,
    thumbnail: p?.thumbnail || undefined,
    createdAt: p?.createdAt,
    user,
    likedByMe: !!p?.likedByMe,
    bookmarkedByMe: !!p?.bookmarkedByMe,
    likeCount: num(p?.likesCount) ?? len(p?.likes) ?? 0,
    commentCount: len(p?.comments) ?? num(p?.commentsCount) ?? 0,
    savedCount: num(p?.savedCount) ?? 0,
    shareCount: len(p?.shares) ?? 0,
    viewsCount: num(p?.viewsCount) ?? 0,
  };
}

const PERMANENT_BADGE = ['ayobamitemiloluwa@gmail.com', 'ubahobaah@gmail.com'];
export const isVerified = (u: any) =>
  !!u && (u.verifiedBy != null || PERMANENT_BADGE.includes(String(u.email ?? '').toLowerCase()));

export const likePost = (id: string, like: boolean) =>
  api(`api/v1/user/posts/${id}/${like ? 'like' : 'unLike'}`, { method: 'POST' }).catch(() => {});
export const bookmarkPost = (id: string, save: boolean) =>
  api(save ? 'api/v1/user/posts/bookmarks/add' : 'api/v1/user/posts/bookmarks/remove',
    { method: save ? 'POST' : 'DELETE', body: { postId: id } }).catch(() => {});

export async function sharePost(id: string) {
  try { await api(`api/v1/user/posts/${id}/share`, { method: 'POST' }); }
  catch (e: any) { return showAlert(e?.message ?? ''); }
  await webShare(postShareUrl(id));
}

/** "Choose Action" → Report → reason prompt → add/report → refresh reportedIds after 1 s. */
export async function reportFlow(postId: string) {
  const i = await showActions('Choose Action', '', [{ title: 'Report', style: 'destructive' }, { title: 'Cancel', style: 'cancel' }]);
  if (i !== 0) return;
  const reason = await showPrompt('', 'Please enter reason for reporting', 'Write here', ['Cancel', 'Submit']);
  if (reason === null) return;
  try {
    await hud(() => api('api/v1/user/add/report', { method: 'POST', body: { itemId: postId, itemType: 'Post', reason: 'Spam', description: reason } }));
    setTimeout(() => session.refreshReports(), 1000);
  } catch (e: any) {
    showAlert(e?.message ?? '');
  }
}

// ---------- Search key ----------
export const queryKey = (q: string) => q.trim().replace(/^@+/, '').trim();
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function matchesName(name: string | undefined, key: string) {
  if (!key) return true;
  const n = fold(name ?? ''), k = fold(key);
  return n.includes(k) || n.replace(/\s+/g, '').includes(k.replace(/\s+/g, ''));
}
export const matchesText = (text: string | undefined, key: string) => !key || fold(text ?? '').includes(fold(key));
export const truncQ = (q: string) => (q.length > 18 ? q.slice(0, 18) + '…' : q);

// ---------- Story relative time (RelativeDateTimeFormatter .short) ----------
export function storyTime(iso?: string): string {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return '';
  const s = Math.round((d.getTime() - Date.now()) / 1000);
  const a = Math.abs(s);
  if (a < 60) return 'Just now';
  const rtf = new Intl.RelativeTimeFormat('en', { style: 'short', numeric: 'always' });
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (a < 86400 * 7) return rtf.format(Math.round(s / 86400), 'day');
  if (a < 86400 * 30) return rtf.format(Math.round(s / (86400 * 7)), 'week');
  if (a < 86400 * 365) return rtf.format(Math.round(s / (86400 * 30)), 'month');
  return rtf.format(Math.round(s / (86400 * 365)), 'year');
}

/** Try unmuted playback; fall back to muted (browser autoplay policy). Returns true when muted. */
export async function playWithFallback(v: HTMLVideoElement): Promise<boolean> {
  try { v.muted = false; await v.play(); return false; }
  catch {
    try { v.muted = true; await v.play(); } catch { /* ignore */ }
    return true;
  }
}

export const isMe = (userId?: string) => !!userId && userId === store.userID;
