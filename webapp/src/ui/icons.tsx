// Image assets exported from Assets.xcassets live in /app/img/<imageset>.(png|svg|webp).
// SF Symbols used by the iOS code are re-drawn here as inline SVGs.
import type { CSSProperties, SVGProps } from 'react';

const WEBP = new Set(['onboarding_welcome1', 'onboarding_welcome2', 'onboarding_welcome3', 'ic_butterfly', 'backImg']);
const SVG = new Set(['ic_nav_home', 'ic_nav_explore', 'ic_nav_camera', 'ic_nav_settings', 'deleteStoryNew', 'ic_search_new', 'shareStoryNew']);

/** URL of an imageset by its Assets.xcassets name. */
export const img = (name: string) =>
  `/app/img/${encodeURIComponent(name)}.${WEBP.has(name) ? 'webp' : SVG.has(name) ? 'svg' : 'png'}`;

/** Full-colour asset image. */
export function Img({ name, size, className, style, alt = '' }: { name: string; size?: number; className?: string; style?: CSSProperties; alt?: string }) {
  return <img src={img(name)} alt={alt} draggable={false} className={className} style={{ width: size, height: size, objectFit: 'contain', ...style }} />;
}

/** Template (tinted) asset — like UIImage.withRenderingMode(.alwaysTemplate) + tintColor. */
export function Glyph({ name, size = 24, color = 'currentColor', className = '', style }: { name: string; size?: number; color?: string; className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={`glyph shrink-0 ${className}`} style={{ width: size, height: size, color, ['--src' as string]: `url("${img(name)}")`, ...style }} />;
}

type P = SVGProps<SVGSVGElement> & { size?: number; weight?: number };
const sf = (d: React.ReactNode, vb = '0 0 24 24') =>
  function SF({ size = 20, weight = 2, ...rest }: P) {
    return (
      <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor" strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" {...rest}>
        {d}
      </svg>
    );
  };

export const SF = {
  chevronLeft: sf(<path d="M15 4 7 12l8 8" />),
  chevronRight: sf(<path d="m9 4 8 8-8 8" />),
  chevronDown: sf(<path d="m4 9 8 8 8-8" />),
  xmark: sf(<path d="M6 6l12 12M18 6 6 18" />),
  ellipsis: sf(<g fill="currentColor" stroke="none"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></g>),
  ellipsisV: sf(<g fill="currentColor" stroke="none"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></g>),
  magnifyingglass: sf(<><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.8-4.8" /></>),
  house: sf(<path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />),
  calendar: sf(<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  person2: sf(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.3-6 6.5-6s5.9 2.4 6.5 6" /><circle cx="17" cy="9" r="2.8" /><path d="M16.5 14.2c2.6.2 4.5 2.4 5 5.3" /></>),
  person: sf(<><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4.2 4-7 8-7s7.2 2.8 8 7" /></>),
  paperplane: sf(<path d="M21 3 3 10.5l7 2.5 2.5 7zM21 3l-11 10" />),
  trash: sf(<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />),
  mappin: sf(<><path d="M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></>),
  eye: sf(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  eyeSlash: sf(<><path d="M2 12s3.6-7 10-7c2 0 3.7.7 5.1 1.6M22 12s-3.6 7-10 7c-2 0-3.7-.7-5.1-1.6" /><path d="M3 3l18 18" /></>),
  lock: sf(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  bell: sf(<><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
  checkmark: sf(<path d="m5 12 5 5 9-10" />),
  plus: sf(<path d="M12 5v14M5 12h14" />),
  share: sf(<><path d="M12 15V3M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></>),
  camera: sf(<><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></>),
  play: sf(<path d="M7 4v16l13-8z" fill="currentColor" />),
  pause: sf(<path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor" />),
  info: sf(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>),
  questionmark: sf(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.5" /></>),
  doc: sf(<><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>),
  shield: sf(<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />),
  arrowRightSquare: sf(<><path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" /><path d="M3 12h11M10 8l4 4-4 4" /></>),
  heart: sf(<path d="M12 20s-7.5-4.6-9.2-9.3C1.6 7.4 3.8 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.4 0 5.6 3.4 4.4 6.7C19.5 15.4 12 20 12 20z" />),
  photo: sf(<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.5" /><path d="m21 16-5-5-8 8" /></>),
  video: sf(<><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3z" /></>),
};
