// `/story/me` (StoryPreviewViewController) and `/story/:userId`
// (FriendsStoryPreviewViewController) with DuallyStoryChrome.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { useSession } from '../../lib/session';
import { store } from '../../lib/storage';
import { idOf } from '../../lib/format';
import { Avatar, EmptyState } from '../../ui/chrome';
import { SF } from '../../ui/icons';
import { showActions, showAlert } from '../../ui/overlays';
import { hud, markStorySeen, playWithFallback, postShareUrl, storyTime, webShare } from './lib';

export type StoryItem = { status: any; friend?: any };

const IMAGE_MS = 4000;
const TICK_MS = 50;
const TEXT_SHADOW = '1px 2px 6px rgba(0,0,0,0.667)';

export default function StoryViewer({ own }: { own: boolean }) {
  const { userId = '' } = useParams();
  const nav = useNav();
  const loc = useLocation();
  const { profile } = useSession();
  const st = loc.state as any;

  const [items, setItems] = useState<StoryItem[] | null>(() => {
    if (own && Array.isArray(st?.statuses) && st.statuses.length) return st.statuses.map((s: any) => ({ status: s }));
    if (!own && Array.isArray(st?.items) && st.items.length) return st.items;
    return null;
  });
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const close = useCallback(() => nav.back('/explore'), [nav]);

  // Cold open: refetch.
  useEffect(() => {
    if (items) return;
    let alive = true;
    (async () => {
      try {
        if (own) {
          const r = await hud(() => api('api/v1/user/status'));
          const list: any[] = Array.isArray(r?.data) ? r.data : [];
          if (alive) setItems(list.map((s) => ({ status: s })));
        } else {
          const r = await hud(() => api('api/v1/user/status/friends/get'));
          const data: any[] = (Array.isArray(r?.data) ? r.data : []).filter((d: any) => d?.friend);
          const start = Math.max(0, data.findIndex((d) => idOf(d.friend) === userId));
          const flat: StoryItem[] = [];
          for (const d of data.slice(start)) for (const s of d.statuses ?? []) flat.push({ status: s, friend: d.friend });
          if (alive) setItems(flat);
        }
      } catch (e: any) {
        if (alive) { setItems([]); showAlert(e?.message ?? ''); }
      }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Nothing to show → pop.
  useEffect(() => { if (items && items.length === 0) close(); }, [items, close]);

  const count = items?.length ?? 0;
  const item = items?.[Math.min(index, count - 1)];
  const isVideo = !!item?.status?.video;

  const next = useCallback(() => {
    if (index >= count - 1) close();
    else { setIndex(index + 1); setProgress(0); }
  }, [index, count, close]);
  const prev = useCallback(() => {
    setProgress(0);
    if (index > 0) setIndex(index - 1);
  }, [index]);

  // Mark seen.
  useEffect(() => { if (item?.status?._id) markStorySeen(item.status._id); }, [item?.status?._id]);

  // Image timer.
  const [imgReady, setImgReady] = useState(false);
  useEffect(() => { setImgReady(false); }, [item]);
  useEffect(() => {
    if (!item || isVideo || !imgReady) return;
    let elapsed = 0;
    const t = window.setInterval(() => {
      elapsed += TICK_MS;
      setProgress(Math.min(1, elapsed / IMAGE_MS));
      if (elapsed >= IMAGE_MS) { window.clearInterval(t); next(); }
    }, TICK_MS);
    return () => window.clearInterval(t);
  }, [item, isVideo, imgReady, next]);

  // HUD while a GIF (own) / video loads.
  const loaded = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!item) return;
    const isGif = /\.gif(\?|$)/i.test(item.status?.image ?? '');
    if (!(isVideo || (own && isGif))) return;
    let done!: () => void;
    const p = new Promise<void>((r) => { done = r; });
    loaded.current = done;
    hud(() => p, own ? 'Loading gif...' : 'Loading video...');
    const safety = window.setTimeout(done, 10000);
    return () => { window.clearTimeout(safety); done(); loaded.current = null; };
  }, [item, isVideo, own]);
  const markLoaded = () => loaded.current?.();

  // Video playback.
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = video.current;
    if (!isVideo || !v) return;
    v.currentTime = 0;
    playWithFallback(v).then((m) => setMuted(m));
  }, [index, isVideo, item]);

  // ---------- gestures ----------
  const width = useRef(0);
  const drag = useRef<{ x: number; y: number; t: number; axis: 'x' | 'y' | null } | null>(null);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    width.current = e.currentTarget.clientWidth;
    drag.current = { x: e.clientX, y: e.clientY, t: Date.now(), axis: null };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const mx = e.clientX - d.x, my = e.clientY - d.y;
    if (!d.axis && Math.hypot(mx, my) > 10) d.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
    if (d.axis === 'x') setDx(mx);
    if (d.axis === 'y') setDy(Math.max(0, my));
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const mx = e.clientX - d.x, my = e.clientY - d.y;
    setDx(0); setDy(0);
    if (!d.axis) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (e.clientX - rect.left < rect.width / 3) prev(); else next();
      return;
    }
    if (d.axis === 'y') { if (my > 100) close(); return; }
    if (mx < -60) next();
    else if (mx > 60 && index > 0) prev();
  };

  // ---------- own actions ----------
  const doDelete = async () => {
    if (!item) return;
    const i = await showActions('Delete this story?', 'It will be removed for everyone.', [
      { title: 'Delete', style: 'destructive' }, { title: 'Cancel', style: 'cancel' },
    ]);
    if (i !== 0) return;
    const sid = item.status?._id;
    try {
      await hud(() => api(`api/v1/user/status/${sid}`, { method: 'DELETE' }));
    } catch (e: any) {
      showAlert(e?.message ?? '');
      return;
    }
    const left = (items ?? []).filter((x) => x.status?._id !== sid);
    if (!left.length) { close(); return; }
    setItems(left);
    setIndex((n) => Math.min(n, left.length - 1));
    setProgress(0);
  };
  const doShare = async () => {
    const sid = item?.status?._id;
    if (!sid) return;
    try { await api(`api/v1/user/status/${sid}/share`, { method: 'POST' }); }
    catch (e: any) { showAlert(e?.message ?? ''); return; }
    webShare(postShareUrl(sid));
  };

  const stop = (e: React.PointerEvent) => e.stopPropagation();

  const authorName = own ? 'Your Story' : item?.friend?.name ?? '';
  const authorImage = own ? store.avatar || profile?.image || '' : item?.friend?.image;

  return (
    <div className="absolute inset-0 overflow-hidden bg-black" style={{ colorScheme: 'dark' }}>
      {!items && <EmptyState dark loading className="absolute inset-0" />}
      <div className="absolute inset-0 touch-none select-none"
        style={{ transform: `translateY(${dy}px)`, opacity: dy ? Math.max(0.4, 1 - dy / 600) : 1, transition: dy ? 'none' : 'transform .2s' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; setDx(0); setDy(0); }}>
        {item && (
          <div key={item.status?._id ?? index} className="absolute inset-0 overflow-hidden rounded-[16px] bg-black"
            style={{ transform: `translateX(${dx}px)`, transition: dx ? 'none' : 'transform .2s' }}>
            {isVideo ? (
              <video ref={video} src={item.status.video} poster={item.status.thumbnail || undefined} playsInline
                className="absolute inset-0 h-full w-full object-contain"
                onCanPlay={markLoaded} onPlaying={markLoaded} onError={() => { markLoaded(); }}
                onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(Math.min(1, v.currentTime / v.duration)); }}
                onEnded={next} />
            ) : (
              <StoryImage src={item.status?.image} onReady={() => { setImgReady(true); markLoaded(); }} />
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[160px]"
              style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.45))' }} />
          </div>
        )}

        {/* Top scrim */}
        <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: 'calc(var(--sat) + 110px)', background: 'linear-gradient(180deg, rgba(0,0,0,0.6), transparent)' }} />

        {/* Progress */}
        <div className="absolute left-[12px] right-[12px] flex gap-[4px]" style={{ top: 'calc(var(--sat) + 8px)' }}>
          {(items ?? []).map((_, i) => (
            <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-[1.5px]" style={{ background: 'rgba(255,255,255,0.35)' }}>
              <div className="h-full bg-white" style={{ width: `${(i < index ? 1 : i === index ? progress : 0) * 100}%` }} />
            </div>
          ))}
        </div>

        {/* Author row + close */}
        {item && (
          <div className="absolute left-[14px] right-[6px] flex items-center" style={{ top: 'calc(var(--sat) + 23px)', height: 44 }}>
            <div className="flex min-w-0 flex-1 items-center gap-[10px]">
              <Avatar src={authorImage} size={36} border="1.5px solid rgba(255,255,255,0.9)" />
              <div className="flex min-w-0 flex-col" style={{ textShadow: TEXT_SHADOW }}>
                <span className="truncate text-[15px] font-semibold leading-[18px] text-white">{authorName}</span>
                <span className="mt-[1px] text-[13px] font-medium leading-[16px]" style={{ color: 'rgba(255,255,255,0.75)' }}>{storyTime(item.status?.createdAt)}</span>
              </div>
            </div>
            <button aria-label="Close" onPointerDown={stop} onPointerUp={stop} onClick={close}
              className="flex h-[44px] w-[44px] items-center justify-center text-white" style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.35))' }}>
              <SF.xmark size={20} weight={2.6} />
            </button>
          </div>
        )}

        {isVideo && muted && (
          <button onPointerDown={stop} onPointerUp={stop}
            onClick={() => { const v = video.current; if (v) { v.muted = false; setMuted(false); v.play().catch(() => {}); } }}
            className="absolute left-[14px] rounded-full bg-black/50 px-[10px] py-[5px] text-[12px] font-semibold text-white"
            style={{ top: 'calc(var(--sat) + 75px)' }}>
            Tap to unmute
          </button>
        )}

        {/* Own story actions */}
        {own && item && (
          <div className="absolute bottom-[20px] right-[16px] flex flex-col gap-[14px]" style={{ marginBottom: 'var(--sab)' }}>
            <GlassButton label="Share" onClick={doShare} stop={stop}><SF.paperplane size={18} weight={2.4} /></GlassButton>
            <GlassButton label="Delete" onClick={doDelete} stop={stop}><SF.trash size={18} weight={2.4} /></GlassButton>
          </div>
        )}
      </div>
    </div>
  );
}

function GlassButton({ children, label, onClick, stop }: { children: React.ReactNode; label: string; onClick: () => void; stop: (e: React.PointerEvent) => void }) {
  return (
    <button aria-label={label} onPointerDown={stop} onPointerUp={stop} onClick={onClick}
      className="flex h-[46px] w-[46px] items-center justify-center rounded-full text-white backdrop-blur-md"
      style={{ background: 'rgba(255,255,255,0.18)', border: '0.5px solid rgba(255,255,255,0.3)' }}>
      {children}
    </button>
  );
}

function StoryImage({ src, onReady }: { src?: string; onReady: () => void }) {
  const [fit, setFit] = useState<'contain' | 'cover'>('contain');
  const [failed, setFailed] = useState(!src);
  useEffect(() => { if (!src) onReady(); }, [src]); // eslint-disable-line react-hooks/exhaustive-deps
  if (failed || !src) return <div className="absolute inset-0 bg-black" />;
  return (
    <img src={src} alt="" draggable={false} className="absolute inset-0 h-full w-full"
      style={{ objectFit: fit }}
      onLoad={(e) => {
        const im = e.currentTarget;
        setFit(im.naturalWidth && im.naturalHeight / im.naturalWidth >= 1.5 ? 'cover' : 'contain');
        onReady();
      }}
      onError={() => { setFailed(true); onReady(); }} />
  );
}
