// UIDatePicker (.wheels, .date) shown as the Age field's inputView with a
// Cancel / Done toolbar (specs/01-auth §6.1.6).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const ROW = 32;
const VISIBLE = 7; // 224pt wheel
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function Wheel({ items, index, onChange, align, width }: { items: string[]; index: number; onChange: (i: number) => void; align: 'left' | 'right' | 'center'; width: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  useLayoutEffect(() => {
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
  return (
    <div ref={ref} onScroll={onScroll} className="no-scrollbar relative h-full overflow-y-auto"
      style={{ width, scrollSnapType: 'y mandatory', WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 35%, #000 65%, transparent)' }}>
      <div style={{ height: ((VISIBLE - 1) / 2) * ROW }} />
      {items.map((t, i) => (
        <div key={t + i} onClick={() => onChange(i)}
          className={`flex items-center px-[10px] text-[21px] ${align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'}`}
          style={{ height: ROW, scrollSnapAlign: 'center', color: i === index ? '#000' : 'rgba(0,0,0,0.45)' }}>
          {t}
        </div>
      ))}
      <div style={{ height: ((VISIBLE - 1) / 2) * ROW }} />
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Parses dd-MM-yyyy. */
export function parseDMY(s: string): Date | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return isNaN(d.getTime()) ? null : d;
}

export default function DateWheelSheet({ initial, onDone, onCancel }: { initial: string; onDone: (v: string) => void; onCancel: () => void }) {
  const now = new Date();
  const start = parseDMY(initial) ?? now;
  const years = Array.from({ length: now.getFullYear() - 1900 + 1 }, (_, i) => String(1900 + i));
  const [month, setMonth] = useState(start.getMonth());
  const [day, setDay] = useState(start.getDate() - 1);
  const [year, setYear] = useState(start.getFullYear() - 1900);
  const [shown, setShown] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r); }, []);

  const daysIn = new Date(1900 + year, month + 1, 0).getDate();
  const days = Array.from({ length: daysIn }, (_, i) => String(i + 1));
  const d = Math.min(day, daysIn - 1);

  const done = () => onDone(`${pad(d + 1)}-${pad(month + 1)}-${1900 + year}`);

  return (
    <div className="absolute inset-0 z-[50]" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 bg-[#D1D4DA] pb-safe"
        style={{ transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: 'transform .25s ease-out' }}>
        <div className="flex h-[44px] items-center justify-between border-t border-black/10 bg-[#F7F7F7] px-[16px] text-[17px] text-[#007AFF]">
          <button type="button" onClick={onCancel} className="active:opacity-50">Cancel</button>
          <button type="button" onClick={done} className="active:opacity-50">Done</button>
        </div>
        <div className="relative flex justify-center bg-[#D1D4DA] px-[16px]" style={{ height: VISIBLE * ROW }}>
          <div className="pointer-events-none absolute inset-x-[10px] top-1/2 h-[32px] -translate-y-1/2 rounded-[8px] bg-black/[0.06]" />
          <Wheel items={MONTHS} index={month} onChange={setMonth} align="left" width="46%" />
          <Wheel items={days} index={d} onChange={setDay} align="right" width="18%" />
          <Wheel items={years} index={year} onChange={setYear} align="right" width="28%" />
        </div>
      </div>
    </div>
  );
}
