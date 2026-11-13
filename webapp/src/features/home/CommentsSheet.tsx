import { ModalPortal } from '../../ui/portal';
// Comments sheet — CommentsViewController + CommentsAndroidParity (specs/02 §5).
// Rendered position:absolute over the presenting screen (inside the device frame).
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { idOf, parseDate } from '../../lib/format';
import { store } from '../../lib/storage';
import { Glyph, img } from '../../ui/icons';
import { showAlert } from '../../ui/overlays';

const EMOJIS = ['❤️', '😀', '😍', '😎', '🥳', '🤔', '😭', '🔥', '🤓', '🤪', '😝', '👍', '🙏', '💯'];
const GREY = '#A6A2A2';

/** CommentsViewController.getTimeAgo (its own format, singular "day"). */
export function commentTimeAgo(iso?: string | null): string {
  const d = parseDate(iso);
  if (!d) return 'Unknown time';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr`;
  return `${Math.floor(diff / 86400)} day`;
}

type Mode =
  | { kind: 'new' }
  | { kind: 'reply'; commentId: string }
  | { kind: 'editComment'; commentId: string }
  | { kind: 'editReply'; commentId: string; replyId: string };

const AvatarImg = ({ src, size }: { src?: string | null; size: number }) => (
  <img src={src || img('no_profile')} alt="" draggable={false}
    onError={(e) => { (e.currentTarget as HTMLImageElement).src = img('no_profile'); }}
    className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
);

export default function CommentsSheet({ postId, onClose, onCountChange }: { postId: string; onClose: () => void; onCountChange?: (n: number) => void }) {
  const me = store.userID;
  const [comments, setComments] = useState<any[] | null>(null);
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'new' });
  const [mentions, setMentions] = useState<any[] | null>(null);
  const searched = useRef('');
  const searchTimer = useRef<number>();
  const input = useRef<HTMLInputElement>(null);
  const countCb = useRef(onCountChange);
  countCb.current = onCountChange;

  const load = useCallback(async () => {
    try {
      const r = await api(`api/v1/user/posts/${postId}/comment`);
      const list: any[] = Array.isArray(r?.data?.comments) ? r.data.comments : [];
      setComments(list);
      countCb.current?.(Number(r?.data?.count ?? list.length) || 0);
    } catch (e) {
      setComments((c) => c ?? []);
      showAlert((e as Error).message);
    }
  }, [postId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  const send = async () => {
    input.current?.blur(); // the keyboard always closes
    const t = text;
    if (!t) return;
    const base = `api/v1/user/posts/${postId}`;
    try {
      if (mode.kind === 'reply') await api(`${base}/reply-comment/${mode.commentId}`, { method: 'POST', body: { text: t } });
      else if (mode.kind === 'editComment') await api(`${base}/edit/comment/${mode.commentId}`, { method: 'PUT', body: { text: t } });
      else if (mode.kind === 'editReply') await api(`${base}/reply-comment/${mode.commentId}/replies/${mode.replyId}`, { method: 'PUT', body: { text: t } });
      else await api(`${base}/comment`, { method: 'POST', body: { text: t } });
      setText('');
      setMode({ kind: 'new' });
      setMentions(null);
      await load();
    } catch (e) {
      showAlert((e as Error).message);
    }
  };

  const toggleLike = (likeUser: any[] | undefined) => {
    const list = (likeUser ?? []).map(idOf);
    return list.includes(me) ? list.filter((u) => u !== me) : [...list, me];
  };
  const likeComment = (c: any) => {
    const cid = idOf(c);
    setComments((all) => (all ?? []).map((x) => (idOf(x) === cid ? { ...x, likeUser: toggleLike(x.likeUser) } : x)));
    api(`api/v1/user/posts/${postId}/comment/${cid}`, { method: 'POST' }).catch(() => {});
  };
  const likeReply = (c: any, r: any) => {
    const cid = idOf(c), rid = idOf(r);
    setComments((all) => (all ?? []).map((x) => (idOf(x) !== cid ? x : {
      ...x, replies: (x.replies ?? []).map((y: any) => (idOf(y) === rid ? { ...y, likeUser: toggleLike(y.likeUser) } : y)),
    })));
    api(`api/v1/user/posts/${postId}/reply-comment/${cid}/reply/${rid}`, { method: 'POST', body: { text: '' } }).catch(() => {});
  };

  const focus = () => setTimeout(() => input.current?.focus(), 0);

  // @-mention: search the substring from the first "@" (without the "@").
  const onText = (v: string) => {
    setText(v);
    window.clearTimeout(searchTimer.current);
    const at = v.indexOf('@');
    if (!v || at < 0) { setMentions(null); return; }
    const query = v.slice(at);
    searchTimer.current = window.setTimeout(async () => {
      try {
        const r = await api('api/v1/user/searchUser', { query: { search: query.replace(/@/g, '') } });
        searched.current = query;
        setMentions(Array.isArray(r?.data?.docs) ? r.data.docs : []);
      } catch { /* ignored, like iOS */ }
    }, 250);
  };
  const pickMention = (u: any) => {
    setText((t) => t.replace(searched.current, '@' + (u?.fullName ?? '')));
    setMentions(null);
    focus();
  };

  return (
    <ModalPortal>
    <div className="absolute inset-0 z-[500] flex flex-col bg-[#CCCCCC] anim-fade">
      {/* Area above the sheet (white root under a 20% black overlay); tap to dismiss. */}
      <button aria-label="Close comments" onClick={onClose} className="w-full shrink-0" style={{ height: '14.985%' }} />

      <div className="anim-sheet relative flex min-h-0 flex-1 flex-col rounded-t-[20px] bg-white">
        <span className="absolute left-1/2 top-[10px] h-[5px] w-[44px] -translate-x-1/2 rounded-[2.5px] bg-[#DCE2E7]" />
        <div className="flex h-[79px] shrink-0 items-center justify-center text-[17px] font-bold text-ink">Comments</div>
        <div className="h-px shrink-0 bg-hairline" />

        {/* List */}
        <div className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto bg-white">
          {comments && comments.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-[15px] text-caption">No comments yet</div>
          )}
          {(comments ?? []).map((c) => (
            <div key={idOf(c)}>
              <CommentRow item={c} me={me} time={c?.commentedAt}
                onLike={() => likeComment(c)}
                onReply={() => { setMode({ kind: 'reply', commentId: idOf(c) }); focus(); }}
                onEdit={() => { setMode({ kind: 'editComment', commentId: idOf(c) }); setText(c?.text ?? ''); focus(); }} />
              {(Array.isArray(c?.replies) ? c.replies : []).map((r: any) => (
                <CommentRow key={idOf(r)} reply item={r} me={me} time={r?.repliedAt}
                  onLike={() => likeReply(c, r)}
                  onEdit={() => { setMode({ kind: 'editReply', commentId: idOf(c), replyId: idOf(r) }); setText(r?.text ?? ''); focus(); }} />
              ))}
            </div>
          ))}
        </div>

        {/* @-mention dropdown (373×230 at x 10, above the emoji row) */}
        {mentions && (
          <div className="no-scrollbar absolute left-[10px] right-[10px] z-10 h-[230px] overflow-y-auto rounded-[8px] bg-white shadow-[0_2px_12px_rgba(0,0,0,.15)]"
            style={{ bottom: 'calc(143px + var(--sab))' }}>
            {mentions.map((u) => (
              <button key={idOf(u)} onClick={() => pickMention(u)} className="relative block h-[50px] w-full text-left">
                <img src={u?.image || img('no_profile')} alt="" draggable={false}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = img('no_profile'); }}
                  className="absolute left-[10px] top-[10px] h-[30px] w-[30px] rounded-[15px] object-cover" />
                <span className="absolute left-[50px] right-[10px] top-[8px] truncate text-[15px] text-black" style={{ fontFamily: '"Helvetica Neue", Helvetica, sans-serif' }}>{u?.fullName ?? ''}</span>
                <span className="absolute left-[50px] top-[28px] flex items-center gap-[5px] text-[12px] text-[#434343]" style={{ fontFamily: '"Helvetica Neue", Helvetica, sans-serif' }}>
                  <span className="text-black">{String(u?.friendCount ?? 0)}</span> Friends
                  <span className="mx-[2px] h-[8px] w-[8px] rounded-full bg-[#434343]" />
                  <span className="text-black">{String(u?.postCount ?? 0)}</span> Posts
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Emoji strip */}
        <div className="no-scrollbar flex h-[40px] shrink-0 items-center gap-[12px] overflow-x-auto bg-white px-[12px]">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => onText(text + e)} className="shrink-0 text-[32px] leading-[40px]">{e}</button>
          ))}
        </div>

        {/* Composer */}
        <div className="h-px shrink-0 bg-hairline" />
        <div className="pb-safe shrink-0 bg-white">
          <div className="flex h-[102px] items-center">
            <div className="ml-[20px]"><AvatarImg src={store.avatar} size={40} /></div>
            <input ref={input} value={text} onChange={(e) => onText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder="Add a comment..."
              className="ml-[20px] mr-[10px] h-[44px] min-w-0 flex-1 rounded-[14px] border border-[#E6EBEF] bg-[#F3F5F7] px-[16px] text-[14px] text-ink outline-none placeholder:text-[#9AA6AE]" />
            <button aria-label="Send" onClick={send} className="mr-[20px] flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-primary">
              <Glyph name="ic_send" size={24} color="#FFFFFF" />
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

function CommentRow({ item, me, time, reply, onLike, onReply, onEdit }: {
  item: any; me: string; time?: string; reply?: boolean; onLike: () => void; onReply?: () => void; onEdit: () => void;
}) {
  const likes: string[] = (Array.isArray(item?.likeUser) ? item.likeUser : []).map(idOf);
  const mine = !!me && idOf(item?.user) === me;
  const editLabel = item?.updatedAt != null ? 'Edited' : 'Edit';
  return (
    <div className="flex items-start pb-[10px] pt-[20px]" style={{ paddingLeft: reply ? 80 : 20 }}>
      <AvatarImg src={item?.user?.image} size={50} />
      <div className="ml-[10px] min-w-0 flex-1">
        <div className="flex items-baseline">
          <span className="truncate text-[12px] font-semibold text-black">{item?.user?.fullName ?? ''}</span>
          <span className="ml-[5px] shrink-0 text-[8px]" style={{ color: GREY }}>{time ? commentTimeAgo(time) : ''}</span>
        </div>
        <div className="whitespace-pre-wrap break-words text-[13px] text-black">{item?.text ?? ''}</div>
        <div className="mt-[4px] flex text-[12px]" style={{ color: GREY }}>
          {!reply && <button onClick={onReply} className="h-[25px] w-[40px] text-left">Reply</button>}
          {!reply && <span className="w-[20px]" />}
          {mine && <button onClick={onEdit} className={`${reply ? 'h-[20px]' : 'h-[25px]'} w-[45px] text-left`}>{editLabel}</button>}
        </div>
      </div>
      <div className="ml-[5px] mr-[10px] flex w-[30px] shrink-0 flex-col items-center">
        <button aria-label="Like" onClick={onLike} className="h-[20px] w-[20px]">
          <img src={img(likes.includes(me) ? 'red_Heart' : 'ic_unlike')} alt="" draggable={false} className="h-full w-full object-contain" />
        </button>
        <span className="text-[14px]" style={{ color: GREY }}>{String(likes.length)}</span>
      </div>
    </div>
  );
}
