// Shared live overlays: floating hearts, gift burst, comment list + bar, chips.
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Img } from '../../ui/icons';
import type { ChatDoc } from './chat';

export const PRIMARY = '#0384B3';

/** Gift catalogue (DuallyLiveGift.pieces). key = Firestore `gift`, api = share-points key. */
export const GIFTS = [
  { name: 'King', key: 'king', api: 'king', art: 'King2_2000' },
  { name: 'Queen', key: 'queen', api: 'queen', art: 'King2000' },
  { name: 'Knight', key: 'horse', api: 'knight', art: 'Horse2000' },
  { name: 'Rook', key: 'elephant', api: 'rook', art: 'Queen2000' },
  { name: 'Bishop', key: 'camel', api: 'bishop', art: 'Camel2000' },
  { name: 'Pawn', key: 'soldier', api: 'pawn', art: 'Man2000' },
];
export const giftArt = (key?: string) => GIFTS.find((g) => g.key === key)?.art ?? 'ic_butterfly';
export const giftLabel = (key?: string) => GIFTS.find((g) => g.key === key)?.name ?? (key === 'butterfly' ? 'Butterfly' : key ?? '');

// ───────── floating hearts (DuallyHeartReactionView) ─────────

const HEART_TINTS = ['#FF2D55', '#FF375F', '#F5426C', '#FF6482', '#E5232D', '#FF8FA3'];
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export type HeartsHandle = { burst: (n?: number) => void };

export const Hearts = forwardRef<HeartsHandle>(function Hearts(_, ref) {
  const host = useRef<HTMLDivElement>(null);
  const side = useRef(0);
  const inFlight = useRef(0);
  useImperativeHandle(ref, () => ({
    burst(n = 5) {
      const el = host.current;
      if (!el) return;
      for (let i = 0; i < Math.min(n, 12); i++) {
        setTimeout(() => {
          if (inFlight.current >= 60) return;
          const W = el.clientWidth, H = el.clientHeight;
          const size = rnd(16, 30);
          const left = side.current++ % 2 === 0;
          const x0 = left ? 8 + rnd(0, W * 0.16) : W - 8 - size - rnd(0, W * 0.16);
          const drift = rnd(12, 56) * (left ? 1 : -1);
          const rise = H * rnd(0.62, 0.92);
          const tilt = rnd(-14, 14);
          const dur = rnd(2100, 3300);
          const h = document.createElement('div');
          h.style.cssText = `position:absolute;left:${x0}px;top:${H}px;width:${size}px;height:${size}px;color:${HEART_TINTS[Math.floor(Math.random() * HEART_TINTS.length)]}`;
          h.innerHTML = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M12 21s-7.5-4.6-9.2-9.3C1.6 8.4 3.8 5 7.2 5c2 0 3.6 1.1 4.8 2.8C13.2 6.1 14.8 5 16.8 5c3.4 0 5.6 3.4 4.4 6.7C19.5 16.4 12 21 12 21z"/></svg>';
          el.appendChild(h);
          inFlight.current++;
          const frames: Keyframe[] = [];
          const scaleAt = (t: number) => (t < 0.1 ? 0.45 + (t / 0.1) * 0.65 : t < 0.16 ? 1.1 - ((t - 0.1) / 0.06) * 0.1 : t < 0.7 ? 1 : 1 - ((t - 0.7) / 0.3) * 0.25);
          const opAt = (t: number) => (t < 0.08 ? t / 0.08 : t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
          for (let k = 0; k <= 20; k++) {
            const t = k / 20;
            const e = 1 - (1 - t) ** 2;
            const wob = Math.sin(t * Math.PI * 2 * 1.6) * 10;
            frames.push({ offset: t, opacity: opAt(t), transform: `translate(${drift * e + wob}px, ${-rise * e}px) rotate(${tilt * t}deg) scale(${scaleAt(t)})` });
          }
          const a = h.animate(frames, { duration: dur, easing: 'linear', fill: 'forwards' });
          a.onfinish = () => { h.remove(); inFlight.current--; };
        }, i * 90);
      }
    },
  }), []);
  return <div ref={host} className="pointer-events-none absolute inset-0 z-[30] overflow-hidden" />;
});

// ───────── gift burst (DuallyGiftBurstView) ─────────

export type BurstHandle = { show: (giftKey: string, name?: string) => void };
export const GiftBurst = forwardRef<BurstHandle>(function GiftBurst(_, ref) {
  const [g, setG] = useState<{ key: string; name?: string; n: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number>();
  useImperativeHandle(ref, () => ({
    show(key, name) {
      clearTimeout(timer.current);
      setLeaving(false);
      setG((p) => ({ key, name, n: (p?.n ?? 0) + 1 }));
      timer.current = window.setTimeout(() => {
        setLeaving(true);
        timer.current = window.setTimeout(() => setG(null), 320);
      }, 6500);
    },
  }), []);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!g) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[31] flex flex-col items-center" style={{ top: '42%', transform: 'translateY(-50%)' }}>
      <div key={g.n} className="flex flex-col items-center"
        style={{ animation: leaving ? 'live-gift-out .32s cubic-bezier(.2,.8,.2,1) forwards' : 'live-gift-in .42s cubic-bezier(.34,1.56,.64,1) both' }}>
        <Img name={giftArt(g.key)} size={96} />
        {g.name && (
          <div className="mt-[8px] rounded-full border border-white/20 bg-black/45 px-[14px] py-[5px] text-[15px] font-medium text-white">{g.name}</div>
        )}
      </div>
    </div>
  );
});

// ───────── comments ─────────

export function CommentList({ items, imageFor }: { items: ChatDoc[]; imageFor?: (c: ChatDoc) => string | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const [alphas, setAlphas] = useState<number[]>([]);
  const recompute = () => {
    const el = ref.current;
    if (!el) return;
    const rows = Array.from(el.children) as HTMLElement[];
    const bottom = el.scrollTop + el.clientHeight;
    const visible = rows.filter((r) => r.offsetTop < bottom && r.offsetTop + r.offsetHeight > el.scrollTop);
    const a = rows.map(() => 1);
    if (visible.length > 3) {
      const idx = visible.map((v) => rows.indexOf(v));
      const lastVis = idx[idx.length - 1];
      rows.forEach((_, i) => {
        const fromBottom = lastVis - i;
        a[i] = fromBottom < 3 ? 1 : fromBottom === 3 ? 0.67 : fromBottom === 4 ? 0.33 : 0;
      });
    }
    setAlphas(a);
  };
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
    recompute();
  }, [items.length]);
  return (
    <div ref={ref} onScroll={recompute} className="no-scrollbar overflow-y-auto" style={{ maxHeight: 400, height: Math.min(items.length * 50, 400) }}>
      {items.map((c, i) => (
        <div key={c.docId} className="flex items-start gap-[10px] px-[16px] py-[6px] transition-opacity" style={{ opacity: alphas[i] ?? 1 }}>
          {c.senderName ? (
            <img src={imageFor?.(c) || c.senderImage || '/app/img/no_profile.png'} alt="" className="h-[36px] w-[36px] shrink-0 rounded-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/app/img/no_profile.png'; }} />
          ) : <span className="w-[36px] shrink-0" />}
          <div className="min-w-0 flex-1" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', textShadow: '0 1px 2px rgba(0,0,0,.45)' }}>
            <div className="truncate text-[16px] font-medium leading-[20px] text-white">{c.senderName}</div>
            <div className="break-words text-[14px] leading-[18px] text-white">{c.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommentBar({ onSend, onHeart, heartImg }: { onSend: (t: string) => void; onHeart: () => void; heartImg?: boolean }) {
  const [text, setText] = useState('');
  const [pop, setPop] = useState(0);
  const send = () => { const t = text.trim(); if (!t) return; onSend(t); setText(''); };
  return (
    <div className="mx-[20px] flex h-[50px] items-center rounded-[25px] border border-white/25 bg-black/40 pl-[16px] pr-[8px]">
      <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        placeholder="Add Comment......" enterKeyHint="send"
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/50" />
      <button aria-label="Send" onClick={send} className="ml-[6px] flex h-[34px] w-[34px] items-center justify-center rounded-full" style={{ background: PRIMARY }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3 3 10.5l7 2.5 2.5 7zM21 3l-11 10" /></svg>
      </button>
      <button aria-label="Send a heart" onClick={() => { setPop((n) => n + 1); onHeart(); }}
        key={pop} className="ml-[6px] flex h-[34px] w-[34px] items-center justify-center rounded-full"
        style={{ background: heartImg ? 'transparent' : '#FF2D55', animation: pop ? 'live-pop .35s cubic-bezier(.34,1.56,.64,1)' : undefined }}>
        {heartImg ? <Img name="red_Heart" size={30} /> : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 21s-7.5-4.6-9.2-9.3C1.6 8.4 3.8 5 7.2 5c2 0 3.6 1.1 4.8 2.8C13.2 6.1 14.8 5 16.8 5c3.4 0 5.6 3.4 4.4 6.7C19.5 16.4 12 21 12 21z" /></svg>
        )}
      </button>
    </div>
  );
}

export function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex h-[30px] items-center gap-[6px] rounded-full border border-white/20 bg-black/40 px-[10px] text-[13px] font-semibold text-white ${className}`}>{children}</div>;
}

export const PeopleIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="2.8" /><path d="M2 20c.5-3.8 3.4-6 7-6s6.5 2.2 7 6zM15.5 14.2c3.2-.4 5.8 1.6 6.5 5.8h-4.6c-.3-2.3-.9-4.3-1.9-5.8z" /></svg>
);

/** Gift tray (viewer). */
export function GiftTray({ counts, onPick, onBuy }: { counts: Record<string, number>; onPick: (g: typeof GIFTS[number]) => void; onBuy: () => void }) {
  return (
    <div className="rounded-[22px] border border-white/[.18] px-[10px] pb-[10px] pt-[12px] shadow-[0_6px_10px_rgba(0,0,0,.28)]" style={{ background: 'rgba(14,17,22,0.85)' }}>
      <div className="mb-[10px] flex items-center justify-between px-[4px]">
        <div className="text-[14px] font-semibold text-white">Send a gift</div>
        <button onClick={onBuy} className="rounded-full px-[14px] py-[5px] text-[12px] font-medium text-white active:brightness-90" style={{ background: PRIMARY }}>Buy</button>
      </div>
      <div className="grid grid-cols-3 gap-y-[8px]">
        {GIFTS.map((g) => {
          const n = counts[g.api] ?? 0;
          return (
            <button key={g.key} onClick={() => onPick(g)} className="mx-[4px] flex h-[98px] flex-col items-center rounded-[16px] border border-white/[.12] bg-white/[.08] active:bg-white/[.24]"
              style={{ opacity: n === 0 ? 0.42 : 1 }}>
              <span className="relative mt-[10px] flex h-[48px] w-[48px] items-center justify-center rounded-full" style={{ background: 'linear-gradient(rgba(255,255,255,.24),rgba(255,255,255,.08))' }}>
                <Img name={g.art} size={34} />
                <span className="absolute -right-[4px] -top-[6px] flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] border border-white/30 bg-black/90 px-[4px] text-[10px] text-white">{n}</span>
              </span>
              <span className="mt-[8px] text-[11px] font-medium text-white">{g.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
