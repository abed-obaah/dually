// Floating pill tab bar (TabBarAndroidParity.swift, specs/02 §1).
import { useSession } from '../lib/session';
import { store } from '../lib/storage';
import { Glyph } from '../ui/icons';
import { TABS, type Tab } from './types';

const GLYPH: Record<Tab, string> = {
  home: 'ic_nav_home', explore: 'ic_nav_explore', camera: 'ic_nav_camera', profile: '', settings: 'ic_nav_settings',
};

export function TabBar({ current, onSelect }: { current: Tab; onSelect: (t: Tab) => void }) {
  const { hasUnread, profile } = useSession();
  const avatar = profile?.image || store.avatar;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[400]" style={{ height: 'calc(70px + var(--sab))' }}>
      <div className="pointer-events-auto absolute left-[14px] right-[14px] flex h-[64px] rounded-[32px] bg-navpill" style={{ bottom: 'calc(6px + var(--sab))' }}>
        {TABS.map((t) => (
          <button key={t} aria-label={t} onClick={() => onSelect(t)} className="relative flex flex-1 items-center justify-center">
            {current === t && <span className="absolute h-[48px] w-[48px] rounded-full bg-secondary" />}
            {t === 'profile' ? (
              <span className="relative h-[28px] w-[28px]">
                <img src={avatar || '/app/img/no_profile.png'} alt="" onError={(e) => { e.currentTarget.src = '/app/img/no_profile.png'; }}
                  className="h-[28px] w-[28px] rounded-full border border-white object-cover" />
                {hasUnread && <span className="absolute right-0 top-0 h-[7px] w-[7px] rounded-full bg-[#FF4D4F]" style={{ boxShadow: '0 0 0 1.5px #04729B' }} />}
              </span>
            ) : (
              <Glyph name={GLYPH[t]} size={28} color={t === 'camera' ? '#FFFFFF' : '#D3EAF6'} className="relative" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
