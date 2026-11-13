// Settings-area helpers: local SF Symbol drawings, the Helvetica Neue stack used
// by the unstyled storyboard scenes, and the sign-out routine (logout / delete
// account / change password).
import type { CSSProperties, ReactNode, SVGProps } from 'react';
import { session } from '../../lib/session';
import { store } from '../../lib/storage';

export const HELVETICA: CSSProperties = { fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' };

type P = SVGProps<SVGSVGElement> & { size?: number; weight?: number };
const sf = (d: ReactNode, filled = false) =>
  function Sym({ size = 20, weight = 1.8, ...rest }: P) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'}
        strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" {...rest}>
        {d}
      </svg>
    );
  };

/** SF Symbols with no imageset (Settings rows, Help, Cash KYC, Live activity). */
export const SFX = {
  bag: sf(<><path d="M5 8h14l-1 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>),
  banknote: sf(<><rect x="2.5" y="6" width="19" height="12" rx="1.5" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v5M18 9.5v5" /></>),
  radiowaves: sf(<><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" /><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8" /></>),
  message: sf(<path d="M12 4c5 0 9 3.1 9 7s-4 7-9 7c-1 0-2-.1-2.9-.4L4.5 20l1.2-3.6C4 15 3 13.1 3 11c0-3.9 4-7 9-7z" />),
  questionCircle: sf(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" /><circle cx="12" cy="17" r=".6" fill="currentColor" /></>),
  buildingColumns: sf(<path d="M12 2 2 7.2V9h20V7.2zM4 10.5h3v7.5H4zM10.5 10.5h3v7.5h-3zM17 10.5h3v7.5h-3zM2 19.5h20V22H2z" />, true),
  eyeFill: sf(<path fillRule="evenodd" d="M12 5C5.6 5 2 12 2 12s3.6 7 10 7 10-7 10-7-3.6-7-10-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />, true),
  heartFill: sf(<path d="M12 20s-7.5-4.6-9.2-9.3C1.6 7.4 3.8 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.4 0 5.6 3.4 4.4 6.7C19.5 15.4 12 20 12 20z" />, true),
  bubbleFill: sf(<path d="M5 3h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-8l-5 4v-4H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" />, true),
  giftFill: sf(<path d="M3 8h18v4H3zM4.5 13h6.5v8H4.5zM13 13h6.5v8H13zM11 8h2v4h-2zM12 8C10.5 4.5 7 4 7 6s3 2 5 2zm0 0c1.5-3.5 5-4 5-2s-3 2-5 2z" />, true),
  check: sf(<path d="m5 12 5 5 9-10" />),
};

const SETTINGS_KEYS = [
  'isPrivateAccount', 'isAllowGifComments', 'isGeneral', 'isSound', 'isVibrate', 'isAppUpdate', 'isPromotion',
  'isDiscount', 'isPayment', 'isPushNotification', 'isNewTips', 'isNewServiceAvilable',
  'profileImage', 'profileImageURL', 'userID', 'username', 'cartcount',
];

/**
 * Web sign-out: iOS only flips isUserLoggedIn (leaving the token behind); the
 * web clears the token, cached settings and in-memory session too.
 */
export function signOut(reset: (to: string) => void) {
  store.token = null;
  store.loggedIn = false;
  try { SETTINGS_KEYS.forEach((k) => localStorage.removeItem(k)); } catch { /* private mode */ }
  session.clear();
  reset('/login');
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e ?? ''));
