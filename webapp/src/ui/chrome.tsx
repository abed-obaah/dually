// Light detail-screen chrome shared by pushed screens (DuallyScreenChrome.swift,
// specs/04 §0). App bar 72pt white, back chevron, bold 18 title, 1pt rule.
import type { ReactNode } from 'react';
import { useNav } from '../lib/nav';
import { Glyph, SF } from './icons';
import { ModalPortal } from './portal';

export function AppBar({ title, onBack, right, hideBack }: { title?: ReactNode; onBack?: () => void; right?: ReactNode; hideBack?: boolean }) {
  const nav = useNav();
  return (
    <div className="pt-safe sticky top-0 z-20 bg-page">
      <div className="relative flex h-[72px] items-center justify-center bg-white">
        {!hideBack && (
          <button aria-label="Back" onClick={onBack ?? (() => nav.back())}
            className="absolute left-[20px] top-1/2 flex h-[35px] w-[35px] -translate-y-1/2 items-center justify-center text-ink">
            <SF.chevronLeft size={22} weight={2.6} />
          </button>
        )}
        <div className="max-w-[60%] truncate text-[18px] font-bold text-ink">{title}</div>
        {right && <div className="absolute right-[16px] top-1/2 flex -translate-y-1/2 items-center">{right}</div>}
      </div>
      <div className="h-px bg-hairline" />
    </div>
  );
}

/** Full-screen pushed page on #F4F6F8 with app bar. */
export function DetailPage({ title, children, right, onBack, bg = '#F4F6F8', className = '', scroll = true }: {
  title?: ReactNode; children: ReactNode; right?: ReactNode; onBack?: () => void; bg?: string; className?: string; scroll?: boolean;
}) {
  return (
    <div className={`screen flex flex-col ${scroll ? '' : 'overflow-hidden'}`} style={{ background: bg }}>
      <AppBar title={title} right={right} onBack={onBack} />
      <div className={`flex-1 pb-tabbar ${className}`}>{children}</div>
    </div>
  );
}

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`overflow-hidden rounded-[18px] border border-cardstroke bg-white ${className}`}>{children}</div>
);

export const Caption = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`pl-[6px] text-[12px] uppercase tracking-[0.72px] text-caption ${className}`}>{children}</div>
);

/** Settings-style 62pt row with icon chip + chevron. `icon` is an imageset name or an SF element. */
export function Row({ icon, label, onClick, destructive, last, labelClass, chevron = true }: {
  icon: string | ReactNode; label: ReactNode; onClick?: () => void; destructive?: boolean; last?: boolean; labelClass?: string; chevron?: boolean;
}) {
  const tint = destructive ? '#FF3B30' : '#0384B3';
  return (
    <button onClick={onClick} className="relative flex h-[62px] w-full items-center text-left">
      <span className="ml-[14px] flex h-[40px] w-[40px] items-center justify-center rounded-[12px]"
        style={{ background: destructive ? 'rgba(255,59,48,.1)' : '#EAF4FA', color: tint }}>
        {typeof icon === 'string' ? <Glyph name={icon} size={20} color={tint} /> : icon}
      </span>
      <span className={`ml-[14px] flex-1 truncate ${labelClass ?? 'text-[16px]'}`} style={{ color: destructive ? '#FF3B30' : '#1A2730' }}>{label}</span>
      {chevron && <span className="mr-[14px] flex h-[22px] w-[22px] items-center justify-center text-caption"><SF.chevronRight size={15} weight={2} /></span>}
      {!last && <span className="absolute bottom-0 left-[68px] right-0 h-px bg-hairline" />}
    </button>
  );
}

/** iOS UISwitch 51×31, on-tint #0384B3. */
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className="relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
      style={{ background: on ? '#0384B3' : '#E9E9EA' }}>
      <span className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,.15),0_1px_1px_rgba(0,0,0,.16)] transition-[left] duration-200"
        style={{ left: on ? 22 : 2 }} />
    </button>
  );
}

/** Footer primary button (DuallyChrome.primaryButton): #0384B3, white 16 bold, radius 12. */
export const PrimaryButton = ({ children, onClick, className = '', disabled }: { children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean }) => (
  <button disabled={disabled} onClick={onClick}
    className={`h-[52px] w-full rounded-[12px] bg-primary text-[16px] font-bold text-white disabled:opacity-50 ${className}`}>{children}</button>
);

/** Light input (bg_input_light): fill #F3F5F7, stroke #E6EBEF, radius 14, height 52. */
export const LightInput = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={`h-[52px] w-full rounded-[14px] border border-[#E6EBEF] bg-[#F3F5F7] px-[16px] text-[15px] text-ink outline-none placeholder:text-[#9AA6AE] ${p.className ?? ''}`} />
);

/** DuallyEmptyStateView. */
export function EmptyState({ glyph, title, body, dark, loading, className = '' }: {
  glyph?: string | ReactNode; title?: string; body?: string; dark?: boolean; loading?: boolean; className?: string;
}) {
  return (
    <div className={`pointer-events-none flex flex-col items-center justify-center px-[36px] text-center ${className}`}>
      {loading ? (
        <div className={`h-[36px] w-[36px] rounded-full border-2 ${dark ? 'border-white/20 border-t-white' : 'border-black/10 border-t-muted'}`} style={{ animation: 'hud-spin .8s linear infinite' }} />
      ) : glyph ? (
        typeof glyph === 'string'
          ? <Glyph name={glyph} size={dark ? 72 : 60} color={dark ? 'rgba(255,255,255,.35)' : 'rgba(91,103,112,.5)'} />
          : <span style={{ color: dark ? 'rgba(255,255,255,.35)' : 'rgba(91,103,112,.5)' }}>{glyph}</span>
      ) : null}
      {(title || loading) && (
        <div className={dark ? 'mt-[16px] text-[18px] font-bold text-white' : 'mt-[14px] text-[17px] font-bold text-muted'}>{title ?? 'Loading...'}</div>
      )}
      {body && <div className={dark ? 'mt-[6px] text-[14px] text-white/70' : 'mt-[4px] text-[14px] text-[#9AA6AE]'}>{body}</div>}
    </div>
  );
}

/** Circular avatar with `no_profile` fallback. */
export function Avatar({ src, size, className = '', border }: { src?: string | null; size: number; className?: string; border?: string }) {
  return (
    <img src={src || '/app/img/no_profile.png'} alt="" draggable={false}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/app/img/no_profile.png'; }}
      className={`shrink-0 rounded-full object-cover ${className}`}
      style={{ width: size, height: size, border }} />
  );
}

/** Bottom sheet container (white, rounded top), dismiss on backdrop tap. */
export function Sheet({ children, onClose, className = '' }: { children: ReactNode; onClose: () => void; className?: string }) {
  return (
    <ModalPortal>
      <div className="absolute inset-0 flex flex-col justify-end bg-black/40 anim-fade" onClick={onClose}>
        <div className={`anim-sheet rounded-t-[20px] bg-white pb-safe ${className}`} onClick={(e) => e.stopPropagation()}>{children}</div>
      </div>
    </ModalPortal>
  );
}
