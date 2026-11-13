// Home tab — HomeViewController + HomeAndroidParity / FeedCellAndroidParity
// (specs/02 §2). Full-screen black vertical pager, one post per screen.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, hasMore } from '../../api/client';
import { firstName, idOf, timeAgo } from '../../lib/format';
import { useNav } from '../../lib/nav';
import { useSession } from '../../lib/session';
import { store } from '../../lib/storage';
import { EmptyState } from '../../ui/chrome';
import { Glyph, Img, SF, img } from '../../ui/icons';
import CommentsSheet from './CommentsSheet';
import { postMoreMenu, sendBookmark, sendLike, sharePost } from './PostMenu';

const LIMIT = 5;
const BADGE_EMAILS = ['ayobamitemiloluwa@gmail.com', 'ubahobaah@gmail.com'];
const SHADOW = '1px 2px 3px rgba(0,0,0,0.667)';

/**
 * Browsers block unmuted autoplay until the user has interacted with the page:
 * start playback unmuted and fall back to muted if the browser refuses.
 */
export function playWithSound(v: HTMLVideoElement, onMuted: (m: boolean) => void) {
  v.muted = false;
  onMuted(false);
  const p = v.play();
  if (p && typeof p.catch === 'function') {
    p.catch((e: unknown) => {
      if ((e as { name?: string })?.name !== 'NotAllowedError') return; // e.g. AbortError from a pause()
      v.muted = true;
      onMuted(true);
      v.play().catch(() => {});
    });
  }
}

const isVerified = (u: any) =>
  (u?.verifiedBy !== undefined && u?.verifiedBy !== null) || BADGE_EMAILS.includes(String(u?.email ?? '').toLowerCase());
const count = (v: any) => (Array.isArray(v) ? v.length : Number(v) || 0);

export default function HomeTab({ active }: { active: boolean }) {
  const nav = useNav();
  const { reportedIds } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cur, setCur] = useState(0);                          // most visible cell
  const [playIdx, setPlayIdx] = useState<number | null>(0);   // the ≥60% visible cell
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const page = useRef(1);
  const more = useRef(true);
  const loading = useRef(false);
  const curRef = useRef(0);
  curRef.current = cur;

  const visible = useMemo(() => posts.filter((p) => !reportedIds.has(idOf(p))), [posts, reportedIds]);

  /** Page-1 reload (viewWillAppear / after comments). Keeps deeper pages if the user is past page 1. */
  const refresh = useCallback(async () => {
    loading.current = true;
    try {
      const r = await api('api/v1/user/posts', { query: { page: 1, limit: LIMIT } });
      const fresh: any[] = Array.isArray(r?.data) ? r.data : [];
      setPosts((prev) => {
        if (prev.length === 0 || curRef.current < LIMIT) {
          page.current = 1;
          more.current = hasMore(r?.pagination);
          return fresh;
        }
        const byId = new Map(fresh.map((p) => [idOf(p), p]));
        return prev.map((p) => byId.get(idOf(p)) ?? p);
      });
    } catch { /* silent */ }
    loading.current = false;
    setLoaded(true);
  }, []);

  const loadMore = useCallback(async () => {
    if (loading.current || !more.current) return;
    loading.current = true;
    const next = page.current + 1;
    try {
      const r = await api('api/v1/user/posts', { query: { page: next, limit: LIMIT } });
      const list: any[] = Array.isArray(r?.data) ? r.data : [];
      page.current = next;
      more.current = hasMore(r?.pagination);
      setPosts((prev) => {
        const seen = new Set(prev.map(idOf));
        return [...prev, ...list.filter((p) => !seen.has(idOf(p)))];
      });
    } catch { /* silent */ }
    loading.current = false;
  }, []);

  // viewWillAppear: reload page 1 every time Home becomes visible.
  useEffect(() => { if (active) refresh(); }, [active, refresh]);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el || !el.clientHeight) return;
    const h = el.clientHeight;
    const pos = el.scrollTop / h;
    const i = Math.floor(pos);
    const frac = pos - i;
    setCur(Math.round(pos));
    setPlayIdx(1 - frac >= 0.6 ? i : frac >= 0.6 ? i + 1 : null);
    if (el.scrollTop > el.scrollHeight - 2 * h) loadMore();
  }, [loadMore]);

  useEffect(() => { measure(); }, [visible.length, measure]);

  const update = (id: string, fn: (p: any) => any) => setPosts((prev) => prev.map((p) => (idOf(p) === id ? fn(p) : p)));

  const onLike = (p: any) => {
    const id = idOf(p);
    const like = !p.likedByMe;
    update(id, (x) => {
      const likes = Array.isArray(x.likes) ? x.likes : [];
      return { ...x, likedByMe: like, likes: like ? [...likes, { user: store.userID }] : likes.slice(0, Math.max(0, likes.length - 1)) };
    });
    sendLike(id, like);
  };
  const onSave = (p: any) => {
    const id = idOf(p);
    const save = !p.bookmarkedByMe;
    update(id, (x) => ({ ...x, bookmarkedByMe: save })); // iOS does not change the save badge locally
    sendBookmark(id, save);
  };
  const onShare = async (p: any) => {
    const id = idOf(p);
    const shares = await sharePost(id);
    if (shares) update(id, (x) => ({ ...x, shares }));
  };
  const onAuthor = (p: any) => {
    const uid = idOf(p.user);
    if (!uid) return;
    if (uid === store.userID) nav.push('/profile');
    else nav.push(`/user/${uid}`);
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div ref={scroller} onScroll={measure}
        className="no-scrollbar absolute inset-x-0 bottom-0 snap-y snap-mandatory overflow-y-scroll overscroll-contain"
        style={{ top: 'var(--sat)' }}>
        {visible.map((p, i) => (
          <div key={idOf(p) || i} className="relative h-full w-full snap-start snap-always">
            <FeedCell post={p}
              near={Math.abs(i - cur) <= 2}
              current={i === cur}
              playing={active && !commentsFor && playIdx === i}
              onLike={() => onLike(p)}
              onComment={() => setCommentsFor(idOf(p))}
              onSave={() => onSave(p)}
              onShare={() => onShare(p)}
              onMore={() => postMoreMenu(idOf(p))}
              onAuthor={() => onAuthor(p)} />
          </div>
        ))}
      </div>

      {/* Floating brand header (58pt, logo 48×48 at x 14). */}
      <div className="pointer-events-none absolute inset-x-0 z-10 flex h-[58px] items-center" style={{ top: 'var(--sat)' }}>
        <Img name="ic_home_logo_only" size={48} className="ml-[14px]" />
      </div>

      {(!loaded || visible.length === 0) && (
        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center">
          {!loaded
            ? <EmptyState dark loading title="Loading your feed..." />
            : <EmptyState dark glyph={<SF.house size={72} weight={1.6} />} title="Your feed is empty"
                body="Add friends to see their posts here, or share your first moment." />}
        </div>
      )}

      {commentsFor && (
        <CommentsSheet postId={commentsFor}
          onCountChange={(n) => update(commentsFor, (x) => ({ ...x, comments: Array.from({ length: n }, (_, k) => x.comments?.[k] ?? null) }))}
          onClose={() => { setCommentsFor(null); refresh(); }} />
      )}
    </div>
  );
}

type CellProps = {
  post: any; near: boolean; current: boolean; playing: boolean;
  onLike: () => void; onComment: () => void; onSave: () => void; onShare: () => void; onMore: () => void; onAuthor: () => void;
};

function FeedCell({ post, near, current, playing, onLike, onComment, onSave, onShare, onMore, onAuthor }: CellProps) {
  const isVideo = !!post?.video;
  const vref = useRef<HTMLVideoElement>(null);
  const [btn, setBtn] = useState<'pause' | 'play' | null>(null);
  const [muted, setMuted] = useState(false);
  const [rail, setRail] = useState(false);
  const timer = useRef<number>();

  const flashPause = () => {
    setBtn('pause');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setBtn((b) => (b === 'pause' ? null : b)), 4000);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => { if (!current) setRail(false); }, [current]); // collapses on reuse

  // Autoplay the ≥60% visible cell; pause everything else.
  useEffect(() => {
    if (!isVideo) return;
    const v = vref.current;
    if (playing) {
      if (v) playWithSound(v, setMuted);
      flashPause();
    } else {
      v?.pause();
      window.clearTimeout(timer.current);
      setBtn('play');
    }
  }, [playing, isVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = () => {
    const v = vref.current;
    if (!isVideo || !v) return;
    if (muted) { // muted-autoplay fallback: the first tap turns the sound on
      v.muted = false;
      setMuted(false);
      if (v.paused) v.play().catch(() => {});
      return;
    }
    if (v.paused) { v.play().catch(() => {}); flashPause(); }
    else { v.pause(); window.clearTimeout(timer.current); setBtn('play'); }
  };

  const user = post?.user ?? {};
  const actions: { label: string; icon: string; count: number; onClick: () => void }[] = [
    { label: 'Like', icon: post?.likedByMe ? 'ic_heart' : 'empty_heart', count: count(post?.likes), onClick: onLike },
    { label: 'Comment', icon: 'ic_comments 1', count: count(post?.comments), onClick: onComment },
    { label: 'Save', icon: post?.bookmarkedByMe ? 'ic_save' : 'ic_unfillBookmark', count: count(post?.savedCount), onClick: onSave },
    { label: 'Share', icon: 'ic_Share', count: count(post?.shares), onClick: onShare },
    { label: 'Views', icon: 'binocularsWhite2', count: count(post?.viewsCount), onClick: () => {} },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* Media */}
      <div className="absolute inset-0" onClick={togglePlay}>
        {isVideo ? (
          <>
            {post?.thumbnail && <img src={post.thumbnail} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain" />}
            {near && (
              <video ref={vref} src={post.video} loop playsInline preload={current ? 'auto' : 'metadata'}
                className="absolute inset-0 h-full w-full object-contain" />
            )}
          </>
        ) : post?.image ? (
          <img src={post.image} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </div>

      {/* Scrims */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[132px]"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,.65), rgba(0,0,0,.30) 50%, rgba(0,0,0,0))' }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[330px]"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,.45) 50%, rgba(0,0,0,.90))' }} />

      {/* btnPlay: ic_Pause (auto-hides after 4 s) / ic_playVideo (stays while paused) */}
      {isVideo && btn && (
        <button aria-label={btn === 'pause' ? 'Pause' : 'Play'} onClick={togglePlay}
          className="absolute left-1/2 top-1/2 h-[50px] w-[50px] -translate-x-1/2 -translate-y-1/2">
          <Img name={btn === 'pause' ? 'ic_Pause' : 'ic_playVideo'} size={50} />
        </button>
      )}

      {/* Web only: muted-autoplay indicator, tap to turn sound on. */}
      {isVideo && playing && muted && (
        <button aria-label="Unmute" onClick={togglePlay}
          className="absolute right-[14px] top-[13px] z-20 flex h-[32px] w-[32px] items-center justify-center rounded-full bg-black/45 text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" /><path d="m16 9 5 6M21 9l-5 6" />
          </svg>
        </button>
      )}

      {/* Caption block (bottom-left) */}
      <div className="absolute left-[14px] flex flex-col items-start font-poppins text-white"
        style={{ bottom: 'calc(84px + var(--sab))', maxWidth: 'calc(100% - 88px)', textShadow: SHADOW }}>
        <button onClick={onAuthor} className="mb-[6px] flex items-center gap-[5px] text-left">
          <span className="text-[16px] font-bold leading-[20px]">{firstName(user.fullName)}</span>
          {isVerified(user) && <Img name="ic_verified" size={16} />}
        </button>
        {post?.text ? (
          <div className="mb-[4px] text-[14px] leading-[19px]"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>
            {post.text}
          </div>
        ) : null}
        <div className="text-[12px] leading-[16px] text-white/70">{timeAgo(post?.createdAt)}</div>
      </div>

      {/* Right action rail (bottom-pinned, grows upward when revealed) */}
      <div className="absolute right-[8px] flex flex-col items-center" style={{ bottom: 'calc(80px + var(--sab))' }}>
        <button aria-label="Show actions" onClick={() => setRail((r) => !r)} className="relative h-[60px] w-[54px] shrink-0">
          <img src={user.image || img('no_profile')} alt="" draggable={false}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = img('no_profile'); }}
            className="absolute left-[3px] top-0 h-[48px] w-[48px] rounded-full border-2 border-white object-cover" />
          <Img name="android_addicon" size={22} className="pointer-events-none absolute left-[16px] top-[37px]" />
        </button>
        <div className="grid transition-[grid-template-rows,opacity] duration-200 ease-out"
          style={{ gridTemplateRows: rail ? '1fr' : '0fr', opacity: rail ? 1 : 0 }}>
          <div className="flex min-h-0 flex-col items-center gap-[6px] overflow-hidden">
            <div className="h-[8px] shrink-0" />{/* 14pt spacer = 8 + 6 gap */}
            {actions.map((a) => (
              <button key={a.label} aria-label={a.label} onClick={a.onClick} tabIndex={rail ? 0 : -1}
                className="relative flex h-[40px] w-[40px] shrink-0 items-center justify-center">
                <span className="flex" style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,.4))' }}>
                  <Glyph name={a.icon} size={30} color="#FFFFFF" />
                </span>
                <span className="absolute top-[2px] flex h-[14px] min-w-[14px] -translate-x-1/2 items-center justify-center rounded-[7px] border border-white bg-[#FF3B30] px-[3px] text-[8px] font-bold leading-none text-white"
                  style={{ left: 36 }}>
                  {String(a.count)}
                </span>
              </button>
            ))}
            <button aria-label="More" onClick={onMore} tabIndex={rail ? 0 : -1}
              className="flex h-[36px] w-[26px] shrink-0 items-end justify-center">
              <span className="flex" style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,.4))' }}>
                <Glyph name="ic_dots" size={26} color="#FFFFFF" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
