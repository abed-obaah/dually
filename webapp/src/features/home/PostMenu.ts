// Post actions shared by the feed cells (HomeViewController / PostNewViewController
// on iOS): like, bookmark, share and the "Choose Action" ⋮ menu (Report).
// Other features may import these helpers.
import { api, SHARE_POST_URL } from '../../api/client';
import { session } from '../../lib/session';
import { showActions, showAlert, showPrompt, withHud } from '../../ui/overlays';

/** Like / unlike (silent, errors ignored — iOS does not roll back). */
export function sendLike(postId: string, like: boolean) {
  return api(`api/v1/user/posts/${postId}/${like ? 'like' : 'unLike'}`, { method: 'POST' }).catch(() => null);
}

/** Bookmark add / remove (silent, errors ignored). */
export function sendBookmark(postId: string, save: boolean) {
  return save
    ? api('api/v1/user/posts/bookmarks/add', { method: 'POST', body: { postId } }).catch(() => null)
    : api('api/v1/user/posts/bookmarks/remove', { method: 'DELETE', body: { postId } }).catch(() => null);
}

export const SHARE_TEXT = 'Hey your friend shared you this post from dually  ';

/** Open the system share sheet (web share), falling back to copying the link. */
export async function openShareSheet(url: string, text = SHARE_TEXT) {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (typeof nav.share === 'function') {
    try { await nav.share({ text, url }); } catch { /* user cancelled */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    await showAlert('Link copied');
  } catch {
    await showAlert(url);
  }
}

/**
 * Share: POST …/share (HUD, like ApiHandler.postApi), then share
 * `SHARE_POST_URL/{id}`. Resolves the updated `shares` array when the server returns it.
 */
export async function sharePost(postId: string): Promise<any[] | null> {
  let shares: any[] | null = null;
  try {
    const r = await withHud(() => api(`api/v1/user/posts/${postId}/share`, { method: 'POST' }));
    if (Array.isArray(r?.data?.shares)) shares = r.data.shares;
  } catch {
    return null; // iOS only opens the sheet on success
  }
  await openShareSheet(`${SHARE_POST_URL}/${postId}`);
  return shares;
}

/** Report prompt → POST add/report, then refresh reportedIds after 1 s. Resolves true if submitted. */
export async function reportPostFlow(postId: string): Promise<boolean> {
  const text = await showPrompt('', 'Please enter reason for reporting', 'Write here', ['Cancel', 'Submit']);
  if (text === null) return false;
  try {
    await withHud(() => api('api/v1/user/add/report', {
      method: 'POST',
      body: { itemId: postId, itemType: 'Post', reason: 'Spam', description: text },
    }));
  } catch { /* iOS ignores the result */ }
  setTimeout(() => { session.refreshReports(); }, 1000);
  return true;
}

/** The ⋮ "Choose Action" sheet: Report (destructive) / Cancel. */
export async function postMoreMenu(postId: string) {
  const i = await showActions('Choose Action', '', [
    { title: 'Report', style: 'destructive' },
    { title: 'Cancel', style: 'cancel' },
  ]);
  if (i === 0) await reportPostFlow(postId);
}
