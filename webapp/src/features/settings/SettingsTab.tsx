// Settings tab root (SettingsViewController + SettingsAndroidParity, specs/04 §1).
import { Fragment, type ReactNode } from 'react';
import { useNav } from '../../lib/nav';
import { Card, Caption, Row } from '../../ui/chrome';
import { showActions } from '../../ui/overlays';
import { signOut, SFX } from './shared';

type Item = { label: string; icon: string | ReactNode; to?: string; destructive?: boolean; logout?: boolean };
type Section = { caption: string; rows: Item[] };

const SECTIONS: Section[] = [
  {
    caption: 'ACCOUNT',
    rows: [
      { label: 'Account Privacy', icon: 'ic_Lock', to: '/settings/privacy' },
      { label: 'Notification', icon: 'ic_notify', to: '/settings/notifications' },
      { label: 'Password', icon: 'ic_key', to: '/settings/password' },
      { label: 'Blocked', icon: 'ic_blocked', to: '/settings/blocked' },
      { label: 'Comments', icon: 'ic_comments', to: '/settings/comments' },
    ],
  },
  {
    caption: 'CONTENT',
    rows: [
      { label: 'Saved', icon: 'ic_Saved', to: '/saved' },
      { label: 'Wallet', icon: 'Wallet', to: '/settings/wallet' },
      { label: 'My Purchases', icon: <SFX.bag size={20} />, to: '/profile/purchases' },
      { label: 'Withdraw Earnings', icon: <SFX.banknote size={20} />, to: '/settings/kyc' },
      { label: 'Live activity', icon: <SFX.radiowaves size={20} />, to: '/settings/live-activity' },
    ],
  },
  {
    caption: 'SUPPORT',
    rows: [
      { label: 'Privacy Policy', icon: 'ic_PrivacyPolicy', to: '/settings/privacy-policy' },
      { label: 'Terms & Conditions', icon: 'ic_TermsConditions', to: '/settings/terms' },
      { label: 'About', icon: 'ic_about', to: '/settings/about' },
      { label: 'Help', icon: 'ic_help', to: '/settings/help' },
    ],
  },
  {
    caption: 'ACCOUNT ACTIONS',
    rows: [
      { label: 'Delete Account', icon: 'ic_delete', to: '/settings/delete', destructive: true },
      { label: 'Logout', icon: 'logout', destructive: true, logout: true },
    ],
  },
];

export default function SettingsTab({ active }: { active: boolean }) {
  const nav = useNav();

  const logout = async () => {
    const i = await showActions('Alert', 'Are you sure you want to logout?', [{ title: 'No', style: 'cancel' }, { title: 'Yes' }]);
    if (i === 1) signOut(nav.reset);
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-page" aria-hidden={!active}>
      <div className="pt-safe shrink-0">
        <div className="mt-[12px] flex h-[51px] items-center px-[20px] py-[5px]">
          <h1 className="text-[28px] font-bold leading-none text-ink">Settings</h1>
        </div>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-[18px] pb-tabbar pt-[10px]">
          {SECTIONS.map((s, si) => (
            <Fragment key={s.caption}>
              <Caption className={`flex h-[26px] items-center ${si > 0 ? 'mt-[18px]' : ''}`}>{s.caption}</Caption>
              <Card className="mt-[8px]">
                {s.rows.map((r, ri) => (
                  <Row key={r.label} icon={r.icon} label={r.label} destructive={r.destructive} last={ri === s.rows.length - 1}
                    onClick={() => (r.logout ? logout() : r.to && nav.push(r.to))} />
                ))}
              </Card>
            </Fragment>
          ))}
          <div className="h-[20px]" />
        </div>
      </div>
    </div>
  );
}
