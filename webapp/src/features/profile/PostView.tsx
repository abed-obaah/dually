// Single post (PostViewController + PostAndroidParity, specs/03 §7.3). Opened from notifications.
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, SHARE_POST_URL } from '../../api/client';
import { idOf } from '../../lib/format';
import { useNav } from '../../lib/nav';
import { store } from '../../lib/storage';
import { showAlert } from '../../ui/overlays';
import CommentsSheet from '../home/CommentsSheet';
import { errMsg, shareLink } from './ui';

function ago(iso?: string) {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return '';
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s} sec ago`;
  if (s < 3600) return `${Math.floor(s / 60)} mins ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hrs ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

const str = (v: any) => (typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : '');

export default function PostView() {
  const { id = '' } = useParams();
  const nav = useNav();
  const [post, setPost] = useState<any>(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [saved, setSaved] = useState(false);
  const [comments, setComments] = useState(0);
  const [rail, setRail] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [ctrl, setCtrl] = useState(false);
  const [muted, setMuted] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number>();

  useEffect(() => {
    api(`api/v1/user/posts/${id}`)
      .then((r) => {
        const p = r?.data ?? null;
        setPost(p);
        setLiked(!!p?.likedByMe);
        setLikes(Array.isArray(p?.likes) ? p.likes.length : 0);
        setSaved(!!p?.bookmarkedByMe);
        setComments(Array.isArray(p?.comments) ? p.comments.length : 0);
      })
      .catch((e) => showAlert(errMsg(e)));
    api(`api/v1/user/posts/${id}/comment`)
      .then((r) => { const c = r?.data?.count ?? r?.data?.comments?.length; if (typeof c === 'number') setComments(c); })
      .catch(() => {});
    api(`api/v1/user/posts/getSimilarPosts/${id}`, { query: { page: 1, limit: 10 } }).catch(() => {}); // fetched, not displayed (iOS parity)
  }, [id]);

  const videoUrl = str(post?.video);
  const imageUrl = str(post?.image) || str(post?.thumbnail);

  useEffect(() => {
    const v = video.current;
    if (!v || !videoUrl) return;
    v.play().catch(() => { v.muted = true; setMuted(true); v.play().catch(() => setPlaying(false)); });
  }, [videoUrl]);

  const toggleVideo = () => {
    const v = video.current;
    if (!v) return;
    if (muted) { v.muted = false; setMuted(false); }
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); } else { v.pause(); setPlaying(false); }
    setCtrl(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setCtrl(false), 3000);
  };
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const like = async () => {
    const next = !liked;
    setLiked(next); setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try { await api(`api/v1/user/posts/${id}/${next ? 'like' : 'unLike'}`, { method: 'POST' }); } catch (e) {
      setLiked(!next); setLikes((n) => Math.max(0, n + (next ? -1 : 1))); showAlert(errMsg(e));
    }
  };
  const bookmark = async () => {
    const next = !saved;
    setSaved(next);
    try {
      await api(`api/v1/user/posts/bookmarks/${next ? 'add' : 'remove'}`, { method: next ? 'POST' : 'DELETE', body: { postId: id } });
    } catch (e) { setSaved(!next); showAlert(errMsg(e)); }
  };
  const share = async () => {
    try { await api(`api/v1/user/posts/${id}/share`, { method: 'POST' }); } catch { /* still share */ }
    shareLink(`${SHARE_POST_URL}/${id}`, 'Hey your friend shared you this post from dually  ');
  };
  const author = post?.user && typeof post.user === 'object' ? post.user : null;
  const authorId = idOf(post?.user);
  const openAuthor = () => {
    if (!authorId) return;
    // Web fix: iOS pushed a profile with a nil model (blank screen).
    nav.push(authorId === store.userID ? '/profile' : `/user/${authorId}`);
  };

  const count = (n: number) => <span className="mt-[2px] text-center text-[12px] font-semibold text-white">{n}</span>;

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {videoUrl ? (
        <video ref={video} src={videoUrl} loop playsInline muted={muted} poster={str(post?.thumbnail) || undefined}
          onClick={toggleVideo} className="absolute inset-0 h-full w-full object-cover" />
      ) : imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}

      {videoUrl && (ctrl || !playing) && (
        <button onClick={toggleVideo} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-85">
          <img src={`/app/img/${playing ? 'ic_Pause' : 'ic_playVideo'}.png`} alt="" className="h-[66px] w-auto" />
        </button>
      )}
      {videoUrl && muted && (
        <button onClick={toggleVideo} className="absolute right-[12px] rounded-full bg-black/50 px-[10px] py-[4px] text-[12px] font-semibold text-white"
          style={{ top: 'calc(var(--sat) + 16px)' }}>Tap to unmute</button>
      )}

      <button aria-label="Back" onClick={() => nav.back('/home')} className="absolute left-[10px] h-[42px]" style={{ top: 'calc(var(--sat) + 8px)' }}>
        <img src="/app/img/i_back.png" alt="" className="h-[42px] w-auto" />
      </button>

      {/* right rail */}
      <div className="absolute right-[8px] flex flex-col items-center gap-[14px]" style={{ bottom: 'calc(var(--sab) + 80px)' }}>
        {rail && (
          <>
            <button onClick={like} className="flex flex-col items-center">
              <img src={`/app/img/${liked ? 'ic_heart' : 'empty_heart'}.png`} alt="" className="h-[34px] w-[34px] object-contain" />{count(likes)}
            </button>
            <button onClick={() => setShowComments(true)} className="flex flex-col items-center">
              <img src="/app/img/ic_comments%201.png" alt="" className="h-[34px] w-[34px] object-contain" />{count(comments)}
            </button>
            <button onClick={bookmark}>
              <img src={`/app/img/${saved ? 'ic_save' : 'ic_unfillBookmark'}.png`} alt="" className="h-[34px] w-[34px] object-contain" />
            </button>
            <button onClick={share}>
              <img src="/app/img/ic_Share.png" alt="" className="h-[34px] w-[34px] object-contain" />
            </button>
            <div className="flex flex-col items-center">
              <img src="/app/img/binocularsWhite2.png" alt="" className="h-[34px] w-[34px] object-contain" />{count(Number(post?.viewsCount ?? 0))}
            </div>
          </>
        )}
        <button onClick={() => setRail((v) => !v)} className="h-[48px] w-[48px] overflow-hidden rounded-full border-2 border-white">
          <img src={author?.image || '/app/img/no_profile.png'} alt="" onError={(e) => { e.currentTarget.src = '/app/img/no_profile.png'; }}
            className="h-full w-full object-cover" />
        </button>
      </div>

      {/* caption */}
      <div className="absolute left-[14px] right-[76px] flex flex-col gap-[4px]" style={{ bottom: 'calc(var(--sab) + 84px)' }}>
        <button onClick={openAuthor} className="self-start text-[16px] font-semibold text-white">{(author?.fullName ?? '').trim().split(/\s+/)[0]}</button>
        {post && <div className="text-[12px] text-white/70">{ago(post.createdAt)}</div>}
        {post?.text && <div className="line-clamp-2 text-[14px] text-white">{post.text}</div>}
        {(post?.city || post?.location) && typeof (post.city || post.location) === 'string' && (
          <div className="text-[12px] text-white/70">{post.city || post.location}</div>
        )}
      </div>

      {showComments && <CommentsSheet postId={id} onClose={() => setShowComments(false)} onCountChange={setComments} />}
    </div>
  );
}
