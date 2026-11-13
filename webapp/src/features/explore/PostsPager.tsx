// `/post/:id` — PostNewViewController + SimilarPostAndroidParity: full-screen
// vertical pager. Item 0 = the tapped / deep-linked post, then similar posts.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { useSession } from '../../lib/session';
import { firstName, timeAgo } from '../../lib/format';
import { Avatar, EmptyState } from '../../ui/chrome';
import { Glyph, Img } from '../../ui/icons';
import { showAlert } from '../../ui/overlays';
import CommentsSheet from '../home/CommentsSheet';
import {
  bookmarkPost, isMe, isVerified, likePost, normalizePost, playWithFallback, reportFlow, sharePost, type FeedPost,
} from './lib';

export default function PostsPager() {
  const { id = '' } = useParams();
  const nav = useNav();
  const loc = useLocation();
  const { reportedIds } = useSession();
  const st = loc.state as any;
  const seed = st?.post ?? (Array.isArray(st?.posts) ? st.posts[st.index ?? 0] : null);

  const [main, setMain] = useState<FeedPost | null>(() => (seed && seed._id === id ? normalizePost(seed) : null));
  const [similar, setSimilar] = useState<FeedPost[]>([]);
  const [failed, setFailed] = useState(false);
  const sim = useRef({ page: 0, hasMore: true, loading: false });
  const [current, setCurrent] = useState(0);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  // Cold open (deep link): GET posts/{id}.
  useEffect(() => {
    if (main) return;
    let alive = true;
    api(`api/v1/user/posts/${id}`)
      .then((r) => { if (alive) { if (r?.data) setMain(normalizePost(r.data)); else setFailed(true); } })
      .catch((e) => { if (alive) { setFailed(true); showAlert(e?.message ?? ''); } });
    return () => { alive = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSimilar = useCallback(async () => {
    const s = sim.current;
    if (s.loading || !s.hasMore || !id) return;
    s.loading = true;
    const page = s.page + 1;
    try {
      const r = await api(`api/v1/user/posts/getSimilarPosts/${id}`, { query: { page, limit: 10 } });
      const list: any[] = Array.isArray(r?.posts) ? r.posts : [];
      setSimilar((prev) => {
        const ids = new Set([id, ...prev.map((p) => p._id)]);
        return [...prev, ...list.map(normalizePost).filter((p) => p._id && !ids.has(p._id) && ids.add(p._id))];
      });
      s.page = page;
      s.hasMore = r?.hasMore === true;
    } catch {
      s.hasMore = false;
    } finally {
      s.loading = false;
    }
  }, [id]);

  useEffect(() => { loadSimilar(); }, [loadSimilar]);

  const items = useMemo(
    () => [...(main ? [main] : []), ...similar].filter((p) => !reportedIds.has(p._id)),
    [main, similar, reportedIds],
  );

  useEffect(() => {
    if (items.length && current >= items.length - 2) loadSimilar();
  }, [current, items.length, loadSimilar]);

  const update = (pid: string, patch: Partial<FeedPost>) => {
    setMain((m) => (m && m._id === pid ? { ...m, ...patch } : m));
    setSimilar((list) => list.map((p) => (p._id === pid ? { ...p, ...patch } : p)));
  };

  const scroller = useRef<HTMLDivElement>(null);
  const onScroll = () => {
    const el = scroller.current;
    if (!el || !el.clientHeight) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    if (i !== current) setCurrent(i);
  };

  const cur = items[Math.min(current, items.length - 1)];

  const openProfile = (uid?: string) => {
    if (!uid) return;
    nav.push(isMe(uid) ? '/profile' : `/user/${uid}`);
  };

  return (
    <div className="absolute inset-0 bg-black">
      <div ref={scroller} onScroll={onScroll} className="no-scrollbar absolute inset-0 snap-y snap-mandatory overflow-y-scroll">
        {items.map((p, i) => (
          <PostCell key={p._id} post={p} active={i === current} near={Math.abs(i - current) <= 2}
            muted={muted} setMuted={setMuted}
            onLike={() => {
              const liked = !p.likedByMe;
              update(p._id, { likedByMe: liked, likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)) });
              likePost(p._id, liked);
            }}
            onSave={() => { const s = !p.bookmarkedByMe; update(p._id, { bookmarkedByMe: s }); bookmarkPost(p._id, s); }}
            onComment={() => setCommentsFor(p._id)}
            onShare={() => sharePost(p._id)}
            onMore={() => reportFlow(p._id)}
            onName={() => openProfile(p.user?._id)} />
        ))}
      </div>

      {!main && !failed && <EmptyState dark loading className="absolute inset-0" />}

      {/* Back button */}
      <button aria-label="Back" onClick={() => nav.back('/explore')}
        className="absolute left-[12px] z-10 flex h-[42px] w-[42px] items-center justify-center"
        style={{ top: 'calc(var(--sat) + 8px)' }}>
        <Img name="i_back" size={42} />
      </button>

      {/* Author pill (follows the post on screen) */}
      {cur && (
        <div className="pointer-events-none absolute inset-x-[64px] z-10 flex justify-center" style={{ top: 'calc(var(--sat) + 8px)' }}>
          <button onClick={() => openProfile(cur.user?._id)}
            className="pointer-events-auto flex h-[44px] max-w-full items-center rounded-[22px] pl-[5px] pr-[16px]"
            style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <Avatar src={cur.user?.image} size={34} border="1px solid rgba(255,255,255,0.4)" />
            <div className="ml-[8px] flex min-w-0 flex-col items-start leading-tight">
              <span className="max-w-full truncate text-[15px] font-semibold text-white">{firstName(cur.user?.fullName)}</span>
              <span className="font-poppins text-[12px]" style={{ color: 'rgba(255,255,255,0.75)' }}>{timeAgo(cur.createdAt)}</span>
            </div>
          </button>
        </div>
      )}

      {commentsFor && (
        <CommentsSheet postId={commentsFor} onClose={() => setCommentsFor(null)}
          onCountChange={(n) => update(commentsFor, { commentCount: n })} />
      )}
    </div>
  );
}

const SHADOW = '1px 2px 3px rgba(0,0,0,0.667)';

function PostCell({ post, active, near, muted, setMuted, onLike, onSave, onComment, onShare, onMore, onName }: {
  post: FeedPost; active: boolean; near: boolean; muted: boolean; setMuted: (m: boolean) => void;
  onLike: () => void; onSave: () => void; onComment: () => void; onShare: () => void; onMore: () => void; onName: () => void;
}) {
  const [railOpen, setRailOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showPlay, setShowPlay] = useState(false);
  const hideTimer = useRef<number>();
  const video = useRef<HTMLVideoElement>(null);
  const isVideo = !!post.video;

  const flashPause = () => {
    setShowPlay(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowPlay(false), 4000);
  };

  useEffect(() => {
    const v = video.current;
    if (!isVideo || !v) return;
    if (active) {
      setPaused(false);
      flashPause();
      playWithFallback(v).then((m) => { if (m) setMuted(true); });
    } else {
      v.pause();
      setPaused(true);
      setShowPlay(true);
      window.clearTimeout(hideTimer.current);
    }
  }, [active, isVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);
  useEffect(() => { if (!active) setRailOpen(false); }, [active]);

  const toggle = () => {
    const v = video.current;
    if (!isVideo || !v) return;
    if (muted) { v.muted = false; setMuted(false); if (v.paused) v.play().catch(() => {}); setPaused(false); flashPause(); return; }
    if (v.paused) { v.play().catch(() => {}); setPaused(false); flashPause(); }
    else { v.pause(); setPaused(true); window.clearTimeout(hideTimer.current); setShowPlay(true); }
  };

  const media = post.image;
  return (
    <div className="relative h-full w-full snap-start snap-always overflow-hidden bg-black">
      {/* Media */}
      <div className="absolute inset-0" onClick={toggle}>
        {isVideo ? (
          <>
            {post.thumbnail && <img src={post.thumbnail} alt="" className="absolute inset-0 h-full w-full object-contain" />}
            {near && (
              <video ref={video} src={post.video} poster={post.thumbnail} loop playsInline preload={active ? 'auto' : 'metadata'}
                className="absolute inset-0 h-full w-full object-contain" />
            )}
          </>
        ) : media ? (
          <img src={media} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </div>

      {/* Scrims */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[132px]"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.30) 50%, transparent)' }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[330px]"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.90))' }} />

      {/* Play / pause */}
      {isVideo && showPlay && (
        <button onClick={toggle} className="absolute left-1/2 top-1/2 h-[66px] w-[66px] -translate-x-1/2 -translate-y-1/2" style={{ opacity: 0.85 }}>
          <Img name={paused ? 'ic_playVideo' : 'ic_Pause'} size={66} />
        </button>
      )}
      {isVideo && muted && active && (
        <button onClick={toggle} className="absolute right-[12px] rounded-full bg-black/50 px-[10px] py-[5px] text-[12px] font-semibold text-white"
          style={{ top: 'calc(var(--sat) + 60px)' }}>
          Tap to unmute
        </button>
      )}

      {/* Caption block */}
      <div className="absolute bottom-[84px] left-[14px] right-[76px] flex flex-col items-start text-white" style={{ textShadow: SHADOW }}>
        <button onClick={onName} className="flex items-center gap-[5px]">
          <span className="text-[16px] font-semibold">{firstName(post.user?.fullName)}</span>
          {isVerified(post.user) && <Img name="ic_verified" size={16} />}
        </button>
        {post.text && <div className="mt-[6px] line-clamp-2 break-words text-[14px]">{post.text}</div>}
        <div className="mt-[4px] text-[12px]" style={{ color: 'rgba(255,255,255,0.70)' }}>{timeAgo(post.createdAt)}</div>
      </div>

      {/* Right action rail */}
      <div className="absolute bottom-[80px] right-[8px] flex flex-col items-center">
        <button onClick={() => setRailOpen((o) => !o)} className="relative h-[60px] w-[54px]">
          <Avatar src={post.user?.image} size={48} border="2px solid #fff" className="absolute left-[3px] top-0" />
          <Img name="android_addicon" size={22} className="pointer-events-none absolute left-[16px] top-[37px]" />
        </button>
        <div className="h-[14px]" />
        <div className="flex flex-col items-center gap-[6px] overflow-hidden transition-all duration-200"
          style={{ maxHeight: railOpen ? 300 : 0, opacity: railOpen ? 1 : 0 }}>
          <Action icon={post.likedByMe ? 'ic_heart' : 'empty_heart'} count={post.likeCount} onClick={onLike} />
          <Action icon="ic_comments 1" count={post.commentCount} onClick={onComment} />
          <Action icon={post.bookmarkedByMe ? 'ic_save' : 'ic_unfillBookmark'} count={post.savedCount} onClick={onSave} />
          <Action icon="ic_Share" count={post.shareCount} onClick={onShare} />
          <Action icon="binocularsWhite2" count={post.viewsCount} />
          <button onClick={onMore} className="flex h-[36px] w-[26px] items-end justify-center">
            <span className="flex" style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,.4))' }}><Glyph name="ic_dots" size={26} color="#fff" /></span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Action({ icon, count, onClick }: { icon: string; count: number; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="relative flex h-[40px] w-[40px] items-center justify-center">
      <span className="flex" style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,.4))' }}><Glyph name={icon} size={30} color="#fff" /></span>
      <span className="absolute top-[2px] flex h-[14px] min-w-[14px] -translate-x-1/2 items-center justify-center rounded-[7px] border border-white px-[3px] text-[8px] font-bold leading-none text-white"
        style={{ left: 36, background: '#FF3B30' }}>
        {String(count)}
      </span>
    </button>
  );
}
