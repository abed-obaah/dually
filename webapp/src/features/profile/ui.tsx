// Local building blocks for the profile area (specs/03 §0).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNav } from '../../lib/nav';
import { showAlert } from '../../ui/overlays';
import { SF } from '../../ui/icons';
import { EmptyState } from '../../ui/chrome';

// ---------- SF Symbols not in the shared set ----------
type P = { size?: number; className?: string; style?: React.CSSProperties };
const svg = (vb: string, body: ReactNode) => ({ size = 24, className, style }: P) => (
  <svg width={size} height={size} viewBox={vb} className={className} style={style} fill="none" stroke="currentColor"
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{body}</svg>
);
export const Sym = {
  /** line.3.horizontal.decrease */
  decrease: svg('0 0 24 24', <path d="M3 6h18M6.5 12h11M10 18h4" strokeWidth={2} />),
  /** video */
  video: svg('0 0 24 24', <><rect x="2.5" y="6" width="13.5" height="12" rx="2.5" /><path d="m16 10.5 5.5-3.5v10L16 13.5z" /></>),
  /** smallcircle.filled.circle */
  smallcircle: svg('0 0 24 24', <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></>),
  /** square.grid.3x3 */
  grid3: svg('0 0 24 24', <><rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></>),
  /** play.rectangle */
  playRect: svg('0 0 24 24', <><rect x="2.5" y="4.5" width="19" height="15" rx="3" /><path d="M10 9v6l5-3z" fill="currentColor" /></>),
  /** play.circle.fill */
  playCircleFill: ({ size = 30, style }: P) => (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path fill="currentColor" fillRule="evenodd" d="M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22zM9.8 7.8v8.4l6.8-4.2z" />
    </svg>
  ),
  /** trash.circle.fill */
  trashCircleFill: ({ size = 26, style }: P) => (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path fill="currentColor" fillRule="evenodd"
        d="M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22zM7.5 7.6h9v1.2h-9zM10.3 6.3h3.4v1.3h-3.4zM8.6 9.4h6.8l-.6 7.8H9.2z" />
    </svg>
  ),
  /** bookmark */
  bookmark: svg('0 0 24 24', <path d="M6 3.5h12v17l-6-4.2-6 4.2z" />),
  /** bag */
  bag: svg('0 0 24 24', <><path d="M4.5 8h15l-1 12.5h-13z" /><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" /></>),
  /** gift.fill */
  gift: ({ size = 28, style }: P) => (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} fill="currentColor">
      <rect x="3" y="8" width="18" height="4" rx="1" /><rect x="4.5" y="12.8" width="15" height="8.2" rx="1" />
      <rect x="11" y="8" width="2" height="13" fill="#fff" opacity=".9" />
      <path d="M12 8C10 4 6.5 4.5 7.5 7c.4 1 2.5 1 4.5 1zm0 0c2-4 5.5-3.5 4.5-1-.4 1-2.5 1-4.5 1z" />
    </svg>
  ),
};

// ---------- overlays inside the device frame ----------
/** Portal into `.device` so overlays sit above the tab bar (z 400) and outside scroll containers. */
export function Layer({ children, z = 600 }: { children: ReactNode; z?: number }) {
  const host = typeof document !== 'undefined' ? (document.querySelector('.device') as HTMLElement | null) ?? document.body : null;
  if (!host) return null;
  return createPortal(<div className="absolute inset-0" style={{ zIndex: z }}>{children}</div>, host);
}

// ---------- chrome ----------
/** "Android chrome" app bar (§0.1): 72 high, white, back chevron, centred 18 bold title, 1pt rule. */
export function Bar({ title, right, onBack, fallback, titleClass = 'text-[18px] font-bold', backLeft = 20, backSize = 35, height = 72 }: {
  title: ReactNode; right?: ReactNode; onBack?: () => void; fallback?: string; titleClass?: string; backLeft?: number; backSize?: number; height?: number;
}) {
  const nav = useNav();
  return (
    <div className="pt-safe shrink-0 bg-white">
      <div className="relative flex items-center justify-center bg-white" style={{ height }}>
        <button aria-label="Back" onClick={onBack ?? (() => nav.back(fallback))}
          className="absolute top-1/2 flex -translate-y-1/2 items-center justify-center text-ink"
          style={{ left: backLeft, width: backSize, height: backSize }}>
          <SF.chevronLeft size={22} weight={2.6} />
        </button>
        <div className={`max-w-[60%] truncate text-ink ${titleClass}`}>{title}</div>
        {right && <div className="absolute right-[20px] top-1/2 flex -translate-y-1/2 items-center">{right}</div>}
      </div>
      <div className="h-px bg-hairline" />
    </div>
  );
}

/** Legacy storyboard bar used by Friends lists (§4): 80 high, `back` image, left-aligned HelveticaNeue-Medium 20. */
export function LegacyBar({ title, fallback }: { title: string; fallback?: string }) {
  const nav = useNav();
  return (
    <div className="pt-safe shrink-0 bg-white">
      <div className="relative h-[80px]">
        <button aria-label="Back" onClick={() => nav.back(fallback)} className="absolute left-[20px] top-1/2 h-[35px] w-[35px] -translate-y-1/2">
          <img src="/app/img/back.png" alt="" className="h-full w-full object-contain" />
        </button>
        <div className="absolute left-[65px] top-1/2 -translate-y-1/2 text-[20px] font-medium text-black" style={{ fontFamily: HELV }}>{title}</div>
      </div>
    </div>
  );
}

export const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

// ---------- data helpers ----------
export const handleOf = (name?: string) => (name ? '@' + name.replace(/ /g, '').toLowerCase() : '');

/** Flatten a PostBucket array (`allImagePost`) into post docs. */
export function bucketPosts(buckets: any): any[] {
  const b = Array.isArray(buckets) ? buckets[0] : null;
  const list: any[] = Array.isArray(b?.posts) ? b.posts : [];
  return list.map((e) => (e && typeof e.post === 'object' ? e.post : null)).filter(Boolean);
}
export const postCount = (u: any) => (Array.isArray(u?.allImagePost?.[0]?.posts) ? u.allImagePost[0].posts.length : 0)
  + (Array.isArray(u?.allVideoPost?.[0]?.posts) ? u.allVideoPost[0].posts.length : 0);
export const friendsCount = (u: any) => (Array.isArray(u?.friends) ? u.friends.length : 0);

/** Posts with createdAt only, newest first (string compare like iOS). */
export const sortNewest = (posts: any[]) =>
  posts.filter((p) => !!p?.createdAt).sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

export async function shareLink(url: string, text?: string) {
  try {
    if (navigator.share) { await navigator.share(text ? { text, url } : { url }); return; }
  } catch (e: any) {
    if (e?.name === 'AbortError') return;
  }
  try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
  showAlert('Link copied');
}
/** Share profile (§1.7) — iOS placeholder google.com URL fixed to the real profile link. */
export const shareProfile = (userId: string) => shareLink(`https://dually.app/app/user/${userId}`, 'Check out this profile!');

// ---------- icon tab strip (§0.3) ----------
export function IconTabs({ icons, selected, onSelect }: { icons: ReactNode[]; selected: number; onSelect: (i: number) => void }) {
  return (
    <div className="shrink-0">
      <div className="flex h-[46px] w-full">
        {icons.map((ic, i) => (
          <button key={i} onClick={() => onSelect(i)} className="relative flex flex-1 items-center justify-center text-ink">
            <span className="flex h-[24px] w-[24px] items-center justify-center" style={{ opacity: i === selected ? 1 : 0.45, marginTop: -2 }}>{ic}</span>
            {i === selected && <span className="absolute bottom-0 left-1/2 h-[2px] w-[52px] -translate-x-1/2 bg-ink" />}
          </button>
        ))}
      </div>
      <div className="h-px bg-hairline" />
    </div>
  );
}

// ---------- grid tile (§0.2) ----------
export type TileItem = { id: string; thumb?: string; video?: string; raw: any };

export function toTile(p: any, allowVideoAsImage: boolean): TileItem {
  const thumb = p?.thumbnail || p?.image || (allowVideoAsImage ? p?.video : '') || '';
  return { id: p?._id ?? '', thumb: typeof thumb === 'string' ? thumb : '', video: typeof p?.video === 'string' ? p.video : '', raw: p };
}

function Tile({ t, onOpen, onDelete }: { t: TileItem; onOpen: () => void; onDelete?: () => void }) {
  const isVideoThumb = !!t.thumb && t.thumb === t.video;
  const [failed, setFailed] = useState(!t.thumb || isVideoThumb);
  return (
    <div className="relative aspect-square overflow-hidden bg-[#E9EDF0]" onClick={onOpen}>
      {!failed && (
        <img src={t.thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
      {failed && t.video && (
        <video src={t.video + '#t=0.1'} preload="metadata" muted playsInline className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      )}
      {t.video && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/90">
          <Sym.playCircleFill size={30} />
        </span>
      )}
      {onDelete && (
        <button aria-label="Delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute right-[4px] top-[4px] text-white/90">
          <Sym.trashCircleFill size={26} />
        </button>
      )}
    </div>
  );
}

export function TileGrid({ tiles, onOpen, onDelete }: { tiles: TileItem[]; onOpen: (t: TileItem, i: number) => void; onDelete?: (t: TileItem) => void }) {
  return (
    <div className="grid grid-cols-3 gap-[2px] bg-white">
      {tiles.map((t, i) => <Tile key={t.id || i} t={t} onOpen={() => onOpen(t, i)} onDelete={onDelete ? () => onDelete(t) : undefined} />)}
    </div>
  );
}

export const CameraEmpty = ({ title, body }: { title: string; body: string }) => (
  <EmptyState glyph={<SF.camera size={60} weight={1.5} />} title={title} body={body} className="min-h-full py-[16px]" />
);

// ---------- media viewers (§7.1 / §7.2) ----------
export function PhotoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <Layer z={700}>
      <div className="anim-fade absolute inset-0 bg-black">
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-contain" />
        <button aria-label="Close" onClick={onClose} className="absolute left-[16px] flex h-[32px] w-[32px] items-center justify-center text-white"
          style={{ top: 'calc(var(--sat) + 12px)' }}>
          <SF.xmark size={26} weight={2.4} />
        </button>
      </div>
    </Layer>
  );
}

export function VideoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
  }, []);
  return (
    <Layer z={700}>
      <div className="anim-fade absolute inset-0 bg-black">
        <video ref={ref} src={src} controls playsInline autoPlay className="absolute inset-0 h-full w-full object-contain" />
        <button onClick={onClose} className="absolute left-[16px] rounded-[16px] bg-white/20 px-[12px] py-[5px] text-[15px] font-semibold text-white backdrop-blur"
          style={{ top: 'calc(var(--sat) + 12px)' }}>
          Done
        </button>
      </div>
    </Layer>
  );
}

/** State helper: open the right viewer for a tile (video → player, photo → photo viewer). */
export function useMediaViewer() {
  const [media, setMedia] = useState<{ kind: 'photo' | 'video'; src: string } | null>(null);
  const open = (t: TileItem) => {
    if (t.video) setMedia({ kind: 'video', src: t.video });
    else if (t.raw?.image || t.thumb) setMedia({ kind: 'photo', src: t.raw?.image || t.thumb! });
  };
  const node = media ? (media.kind === 'video'
    ? <VideoViewer src={media.src} onClose={() => setMedia(null)} />
    : <PhotoViewer src={media.src} onClose={() => setMedia(null)} />) : null;
  return { open, node };
}

export const errMsg = (e: any) => (e?.message ? String(e.message) : 'Something went wrong');
