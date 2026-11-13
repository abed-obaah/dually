// Edit Profile helpers: UIDatePicker(.wheels) lookalike, country picker sheet, square cropper
// (UIImagePickerController allowsEditing).
import { useEffect, useMemo, useRef, useState } from 'react';
import { SF } from '../../ui/icons';
import { COUNTRIES, flagOf, type Country } from './countries';
import { Layer } from './ui';

// ---------------- date wheel ----------------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ROW = 34;
const VISIBLE = 7;

function Wheel({ items, index, onChange, width, align = 'center' }: {
  items: string[]; index: number; onChange: (i: number) => void; width: number | string; align?: 'left' | 'right' | 'center';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  useEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ROW) !== index) el.scrollTop = index * ROW;
  }, [index, items.length]);
  const onScroll = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ROW)));
      if (i !== index) onChange(i);
    }, 90);
  };
  const pad = (ROW * (VISIBLE - 1)) / 2;
  return (
    <div ref={ref} onScroll={onScroll} className="no-scrollbar relative overflow-y-auto"
      style={{ width, height: ROW * VISIBLE, scrollSnapType: 'y mandatory', paddingTop: pad, paddingBottom: pad,
        maskImage: 'linear-gradient(to bottom, transparent, #000 35%, #000 65%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 35%, #000 65%, transparent)' }}>
      {items.map((it, i) => (
        <div key={i} onClick={() => { ref.current?.scrollTo({ top: i * ROW, behavior: 'smooth' }); }}
          className="cursor-pointer px-[8px] text-[21px] text-black"
          style={{ height: ROW, lineHeight: `${ROW}px`, scrollSnapAlign: 'center', textAlign: align, opacity: i === index ? 1 : 0.35 }}>
          {it}
        </div>
      ))}
    </div>
  );
}

export const fmtDMY = (d: Date) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
export function parseDMY(s?: string): Date | null {
  const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec((s ?? '').trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return isNaN(d.getTime()) ? null : d;
}

/** Bottom date picker with [Cancel … Done] toolbar; Done returns `dd-MM-yyyy`. */
export function DateWheelSheet({ value, onCancel, onDone }: { value: Date; onCancel: () => void; onDone: (v: string) => void }) {
  const thisYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 151 }, (_, i) => String(thisYear - 120 + i)), [thisYear]);
  const [m, setM] = useState(value.getMonth());
  const [y, setY] = useState(Math.max(0, years.indexOf(String(value.getFullYear()))));
  const [d, setD] = useState(value.getDate() - 1);
  const year = Number(years[y]);
  const dim = new Date(year, m + 1, 0).getDate();
  const days = useMemo(() => Array.from({ length: dim }, (_, i) => String(i + 1)), [dim]);
  const day = Math.min(d, dim - 1);
  return (
    <Layer z={680}>
      <div className="absolute inset-0" onClick={onCancel}>
        <div className="anim-sheet absolute inset-x-0 bottom-0 bg-[#D1D5DB] pb-safe" onClick={(e) => e.stopPropagation()}>
          <div className="flex h-[44px] items-center justify-between border-b border-black/10 bg-[#F7F7F7] px-[16px] text-[17px] text-[#007AFF]">
            <button onClick={onCancel}>Cancel</button>
            <button onClick={() => onDone(fmtDMY(new Date(year, m, day + 1)))} className="font-semibold">Done</button>
          </div>
          <div className="relative flex justify-center bg-white py-[4px]">
            <div className="pointer-events-none absolute inset-x-[10px] rounded-[8px] bg-[#767680]/[.12]" style={{ top: 4 + ROW * 3, height: ROW }} />
            <Wheel items={MONTHS} index={m} onChange={setM} width={150} align="right" />
            <Wheel items={days} index={day} onChange={setD} width={60} />
            <Wheel items={years} index={y} onChange={setY} width={90} align="left" />
          </div>
        </div>
      </div>
    </Layer>
  );
}

// ---------------- country picker ----------------
export function CountrySheet({ onClose, onPick }: { onClose: () => void; onPick: (c: Country) => void }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(s) || c.code.includes(s.replace('+', '')) || c.iso.toLowerCase() === s) : COUNTRIES;
  }, [q]);
  return (
    <Layer z={680}>
      <div className="anim-fade absolute inset-0 bg-black/40" onClick={onClose}>
        <div className="anim-sheet absolute inset-x-0 bottom-0 top-[44px] flex flex-col overflow-hidden rounded-t-[12px] bg-white" onClick={(e) => e.stopPropagation()}>
          <div className="relative flex h-[56px] shrink-0 items-center justify-center">
            <button onClick={onClose} className="absolute left-[16px] text-[17px] text-[#007AFF]">Close</button>
            <div className="text-[17px] font-semibold text-black">Select a Country</div>
          </div>
          <div className="shrink-0 px-[16px] pb-[8px]">
            <div className="flex h-[36px] items-center gap-[6px] rounded-[10px] bg-[#767680]/[.12] px-[8px] text-[#8E8E93]">
              <SF.magnifyingglass size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-full flex-1 bg-transparent text-[17px] text-black outline-none placeholder:text-[#8E8E93]" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-safe">
            {list.map((c) => (
              <button key={c.iso} onClick={() => onPick(c)} className="flex h-[44px] w-full items-center border-b border-[#C6C6C8]/50 px-[16px] text-left">
                <span className="mr-[12px] text-[24px]">{flagOf(c.iso)}</span>
                <span className="flex-1 truncate text-[17px] text-black">{c.name}</span>
                <span className="text-[17px] text-[#8E8E93]">+{c.code}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layer>
  );
}

// ---------------- square cropper ----------------
/** Lets the user pan/zoom an image inside a square, then returns a JPEG (q 0.7) of the square. */
export function SquareCropper({ file, onCancel, onDone }: { file: File; onCancel: () => void; onDone: (b: Blob) => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const box = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [V, setV] = useState(0);
  const [s, setS] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; s: number } | null>(null);

  useEffect(() => {
    const measure = () => setV(box.current?.clientWidth ?? 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const base = nat && V ? V / Math.min(nat.w, nat.h) : 1;
  const dispW = (nat?.w ?? 0) * base * s;
  const dispH = (nat?.h ?? 0) * base * s;
  const clamp = (o: { x: number; y: number }, sc = s) => {
    const w = (nat?.w ?? 0) * base * sc, h = (nat?.h ?? 0) * base * sc;
    const mx = Math.max(0, (w - V) / 2), my = Math.max(0, (h - V) / 2);
    return { x: Math.max(-mx, Math.min(mx, o.x)), y: Math.max(-my, Math.min(my, o.y)) };
  };
  const zoom = (ns: number) => { const c = Math.max(1, Math.min(5, ns)); setS(c); setOff((o) => clamp(o, c)); };

  const onDown = (e: React.PointerEvent) => { (e.target as Element).setPointerCapture?.(e.pointerId); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (!pinch.current) pinch.current = { d: dist, s };
      else zoom(pinch.current.s * (dist / pinch.current.d));
      return;
    }
    setOff((o) => clamp({ x: o.x + e.clientX - prev.x, y: o.y + e.clientY - prev.y }));
  };
  const onUp = (e: React.PointerEvent) => { pointers.current.delete(e.pointerId); if (pointers.current.size < 2) pinch.current = null; };

  const choose = () => {
    const im = imgRef.current;
    if (!im || !nat || !V) return;
    const k = base * s;
    const sx = (dispW / 2 - off.x - V / 2) / k;
    const sy = (dispH / 2 - off.y - V / 2) / k;
    const side = V / k;
    const out = Math.min(1080, Math.round(side));
    const c = document.createElement('canvas');
    c.width = out; c.height = out;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, out, out);
    ctx.drawImage(im, sx, sy, side, side, 0, 0, out, out);
    c.toBlob((b) => b && onDone(b), 'image/jpeg', 0.7);
  };

  return (
    <Layer z={690}>
      <div className="absolute inset-0 flex flex-col bg-black">
        <div className="flex flex-1 items-center">
          <div ref={box} className="relative aspect-square w-full touch-none overflow-hidden"
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            onWheel={(e) => zoom(s * (e.deltaY < 0 ? 1.08 : 0.92))}>
            <img ref={imgRef} src={url} alt="" draggable={false}
              onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{ width: dispW || undefined, height: dispH || undefined, transform: `translate(calc(-50% + ${off.x}px), calc(-50% + ${off.y}px))`, visibility: nat ? 'visible' : 'hidden' }} />
            <div className="pointer-events-none absolute inset-0 border border-white/70" />
          </div>
        </div>
        <div className="flex h-[64px] shrink-0 items-center justify-between px-[20px] pb-safe text-[18px] text-white">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={choose} className="font-semibold">Choose</button>
        </div>
      </div>
    </Layer>
  );
}
