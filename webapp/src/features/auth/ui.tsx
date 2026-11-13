// Shared building blocks for the dark auth / onboarding screens (specs/01-auth §0).
import { useEffect, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { Glyph, img } from '../../ui/icons';
import { useNav } from '../../lib/nav';
import { signInWithApple, signInWithGoogle, preloadSocial } from './social';

export const GRADIENT = 'linear-gradient(180deg, #0C2D3D 0%, #08161F 50%, #04090D 100%)';
export const FIELD_FILL = 'rgba(255,255,255,0.0784)';
export const FIELD_STROKE = 'rgba(255,255,255,0.149)';
export const HELVETICA = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/** Sets <meta name=theme-color> while mounted (light status bar over the dark gradient). */
export function useThemeColor(color: string) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const prev = meta.getAttribute('content');
    meta.setAttribute('content', color);
    return () => { if (prev) meta.setAttribute('content', prev); };
  }, [color]);
}

/** Full-screen gradient backdrop. `scroll` = content in a vertical scroll view pinned to the safe area. */
export function AuthScreen({ children, scroll = true, animate = true, className = '', overlay }: { children: ReactNode; scroll?: boolean; animate?: boolean; className?: string; overlay?: ReactNode }) {
  useThemeColor('#0C2D3D');
  return (
    <div className={`absolute inset-0 overflow-hidden text-white ${animate ? 'anim-push' : ''}`} style={{ background: GRADIENT }}>
      {scroll ? (
        <div className={`screen no-scrollbar pt-safe pb-safe ${className}`}>{children}</div>
      ) : (
        <div className={`absolute inset-0 flex flex-col pt-safe pb-safe ${className}`}>{children}</div>
      )}
      {overlay}
    </div>
  );
}

/** White 100×100 r22 card with the android_login_logo mark inset ≈7. */
export function LogoCard() {
  return (
    <div className="mx-auto flex h-[100px] w-[100px] items-center justify-center overflow-hidden rounded-[22px] bg-white">
      <img src={img('android_login_logo')} alt="" draggable={false} className="h-[86px] w-[86px] object-contain" />
    </div>
  );
}

export const Title = ({ children, left, style }: { children: ReactNode; left?: boolean; style?: CSSProperties }) => (
  <div className={`text-[26px] font-bold leading-[31px] text-white ${left ? 'text-left' : 'text-center'}`} style={style}>{children}</div>
);
export const Subtitle = ({ children, left, style }: { children: ReactNode; left?: boolean; style?: CSSProperties }) => (
  <div className={`text-[14px] leading-[17px] text-mutedtext ${left ? 'text-left' : 'text-center'}`} style={style}>{children}</div>
);

/** 56pt filled pill (#0384B3, r28, SF 17 bold white). */
export function Pill({ children, onClick, className = '', style }: { children: ReactNode; onClick?: () => void; className?: string; style?: CSSProperties }) {
  return (
    <button type="button" onClick={onClick} style={style}
      className={`block h-[56px] w-full rounded-[28px] bg-primary text-[17px] font-bold text-white transition-opacity active:opacity-70 ${className}`}>
      {children}
    </button>
  );
}

/** Text link button (#07A5DE, SF 15, bold unless `regular`). */
export function LinkButton({ children, onClick, regular, className = '', style }: { children: ReactNode; onClick?: () => void; regular?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <button type="button" onClick={onClick} style={style}
      className={`text-[15px] text-secondary active:opacity-50 ${regular ? 'font-normal' : 'font-bold'} ${className}`}>
      {children}
    </button>
  );
}

const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
};

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string;
  onChange: (v: string) => void;
  icon?: 'email' | 'lock';
  /** x of the 20×20 leading glyph inside the container. */
  iconX?: number;
  /** x where the text starts inside the container. */
  textX?: number;
  /** Secure field with the eye toggle. */
  secure?: boolean;
  /** Trailing accessory (e.g. dropdown arrow) — replaces the eye. */
  trailing?: ReactNode;
  trailingWidth?: number;
  containerClass?: string;
  containerStyle?: CSSProperties;
};

/** 56pt input_field_bg container (fill, 1pt stroke, r16) with optional glyph and eye toggle. */
export function Field({ value, onChange, icon, iconX = 10, textX, secure, trailing, trailingWidth = 25, containerClass = '', containerStyle, type, ...rest }: FieldProps) {
  const [shown, setShown] = useState(false);
  const left = textX ?? (icon ? iconX + 30 : 10);
  const right = secure || trailing ? 10 + trailingWidth + 5 : 10;
  return (
    <div className={`relative h-[56px] overflow-hidden rounded-[16px] ${containerClass}`}
      style={{ background: FIELD_FILL, border: `1px solid ${FIELD_STROKE}`, ...containerStyle }}>
      {icon && (
        <Glyph name={icon} size={20} color="#AFC0CB" className="absolute top-1/2 -translate-y-1/2" style={{ left: iconX - 1 }} />
      )}
      <input
        {...rest}
        type={secure ? (shown ? 'text' : 'password') : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={blurOnEnter}
        enterKeyHint="done"
        spellCheck={false}
        className="absolute bottom-[5px] top-[5px] min-w-0 bg-transparent text-[15px] text-white caret-secondary outline-none placeholder:text-hint"
        style={{ left: left - 1, width: `calc(100% - ${left + right - 2}px)` }}
      />
      {secure && (
        <button type="button" aria-label={shown ? 'Hide password' : 'Show password'} onClick={() => setShown((s) => !s)}
          className="absolute right-[9px] top-1/2 flex h-[25px] w-[25px] -translate-y-1/2 items-center justify-center">
          {/* iOS: `hide` while hidden, `view` while revealed. */}
          <Glyph name={shown ? 'view' : 'hide'} size={21} color="#AFC0CB" />
        </button>
      )}
      {!secure && trailing && (
        <div className="absolute right-[9px] top-1/2 flex -translate-y-1/2 items-center justify-center" style={{ width: trailingWidth, height: trailingWidth }}>
          {trailing}
        </div>
      )}
    </div>
  );
}

/** "——— or ———" divider (caption SF 14 #8FA0AB, 1pt rules 14pt from it). */
export function OrDivider({ style }: { style?: CSSProperties }) {
  return (
    <div className="flex items-center" style={style}>
      <div className="h-px flex-1" style={{ background: FIELD_STROKE }} />
      <div className="px-[14px] text-[14px] leading-[17px] text-hint">or</div>
      <div className="h-px flex-1" style={{ background: FIELD_STROKE }} />
    </div>
  );
}

function AppleLogo() {
  return (
    <svg width="17" height="20" viewBox="0 0 814 1000" aria-hidden fill="#fff">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

/**
 * Google pill + Apple button (Facebook item is hidden on iOS).
 * Login: items centred at 348pt; Register: items fill the width (353 on a 393 screen).
 */
export function SocialStack({ fixedWidth, style }: { fixedWidth?: number; style?: CSSProperties }) {
  const nav = useNav();
  useEffect(() => { preloadSocial(); }, []);
  const w: CSSProperties = fixedWidth ? { width: fixedWidth, maxWidth: '100%' } : { width: '100%' };
  return (
    <div className="flex flex-col items-center gap-[20px]" style={style}>
      <button type="button" aria-label="Login with Google" onClick={() => signInWithGoogle(nav)}
        className="flex h-[56px] items-center justify-center overflow-hidden rounded-[28px] bg-white active:opacity-80" style={w}>
        <img src={img('google')} alt="" draggable={false} className="w-full object-contain" style={{ maxHeight: 56 }} />
      </button>
      <button type="button" onClick={() => signInWithApple(nav)}
        className="flex h-[56px] items-center justify-center gap-[6px] rounded-[6px] bg-black text-[21px] font-medium tracking-[-0.2px] text-white active:opacity-80"
        style={w}>
        <AppleLogo />
        <span className="leading-none">Sign in with Apple</span>
      </button>
    </div>
  );
}

/** Back row (§0.7): 7% screen height, 35×35 `back` glyph at x=20, "Back" Helvetica Neue 20. */
export function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-[7%] min-h-[44px] w-full shrink-0 items-center">
      <button type="button" aria-label="Back" onClick={onBack} className="ml-[20px] flex h-[35px] w-[35px] items-center justify-center active:opacity-50">
        <Glyph name="back" size={20} color="#FFFFFF" style={{ height: 18 }} />
      </button>
      <div className="ml-[20px] mr-[10px] py-[5px] text-[20px] text-white" style={{ fontFamily: HELVETICA }}>Back</div>
    </div>
  );
}
