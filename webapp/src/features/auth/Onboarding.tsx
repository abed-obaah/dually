// Onboarding pages 1–3 (Welcome / DualCameraRecording / GetStarted), specs/01-auth §3.
// iOS pushes three separate screens; the web shows them in a swipeable pager.
import { useRef, useState } from 'react';
import { Glyph, img } from '../../ui/icons';
import { useNav } from '../../lib/nav';
import { AuthScreen, Pill } from './ui';

const PAGES = [
  { image: 'onboarding_welcome1', title: 'Welcome to Dually', subtitle: 'Twice the view, double the impact', button: 'Next' },
  { image: 'onboarding_welcome2', title: 'Dual Camera Recording', subtitle: 'Capture syncronized video/photos', button: 'Next' },
  { image: 'onboarding_welcome3', title: 'Social Interaction', subtitle: 'Unleash your creativity', button: 'Get Started' },
];

function Dots({ active }: { active: number }) {
  return (
    <div className="flex w-full items-center justify-center gap-[8px]">
      {PAGES.map((_, i) => (
        <div key={i} className="h-[8px] rounded-[4px]"
          style={{ width: i === active ? 22 : 8, background: i === active ? '#07A5DE' : 'rgba(255,255,255,0.2)' }} />
      ))}
    </div>
  );
}

export default function Onboarding() {
  const nav = useNav();
  const [index, setIndex] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; t: number; axis?: 'x' | 'y' } | null>(null);
  const width = useRef(1);

  const toLogin = () => nav.push('/login');
  const next = () => (index < PAGES.length - 1 ? setIndex(index + 1) : toLogin());

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    start.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    width.current = e.currentTarget.clientWidth || 1;
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!s.axis) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      s.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (s.axis === 'x') { e.currentTarget.setPointerCapture?.(e.pointerId); setDragging(true); }
    }
    if (s.axis !== 'x') return;
    const atEdge = (index === 0 && mx > 0) || (index === PAGES.length - 1 && mx < 0);
    setDx(atEdge ? mx * 0.35 : mx);
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    if (!s || s.axis !== 'x') return;
    const mx = e.clientX - s.x;
    const v = mx / Math.max(1, performance.now() - s.t); // px/ms
    const threshold = width.current * 0.25;
    if ((mx < -threshold || v < -0.4) && index < PAGES.length - 1) setIndex(index + 1);
    else if ((mx > threshold || v > 0.4) && index > 0) setIndex(index - 1);
    setDx(0);
    setDragging(false);
  };

  return (
    <AuthScreen scroll={false} animate={false}>
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div
          className="flex h-full"
          style={{
            width: `${PAGES.length * 100}%`,
            transform: `translateX(calc(${(-index * 100) / PAGES.length}% + ${dx}px))`,
            transition: dragging ? 'none' : 'transform .35s cubic-bezier(.2,.8,.2,1)',
          }}
        >
          {PAGES.map((p, i) => (
            <div key={p.image} className="flex h-full flex-col px-[24px] pb-[28px] pt-[20px]" style={{ width: `${100 / PAGES.length}%` }}
              aria-hidden={i !== index}>
              {/* Wordmark: `Dually` template tinted white, full width × 30, aspect-fit. */}
              <Glyph name="Dually" color="#FFFFFF" style={{ width: '100%', height: 30 }} />
              <div className="mt-[12px] min-h-0 flex-1">
                <img src={img(p.image)} alt="" draggable={false} className="h-full w-full object-contain" />
              </div>
              <div className="mt-[8px] text-center text-[27px] font-bold leading-[32px] text-white">{p.title}</div>
              <div className="mt-[10px] text-center text-[15px] leading-[21px] text-mutedtext">{p.subtitle}</div>
              <div className="mt-[24px]"><Dots active={i} /></div>
              <Pill className="mt-[32px]" onClick={next}>{p.button}</Pill>
              <button type="button" onClick={toLogin}
                className="mt-[14px] w-full px-[20px] py-[8px] text-center text-[15px] leading-[18px] text-white active:opacity-50">
                Login
              </button>
            </div>
          ))}
        </div>
      </div>
    </AuthScreen>
  );
}
