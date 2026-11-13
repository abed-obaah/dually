// Account Privacy (§2), Notification settings (§3), Change password (§4).
import { Fragment, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { session, useSession } from '../../lib/session';
import { store } from '../../lib/storage';
import { Card, Caption, DetailPage, Toggle } from '../../ui/chrome';
import { Glyph } from '../../ui/icons';
import { showAlert, withHud } from '../../ui/overlays';
import { errMsg, signOut } from './shared';

type Flags = Record<string, boolean>;

/**
 * Toggle state read from the iOS UserDefaults keys, and (web fix) re-seeded
 * from the server profile whenever it loads/changes — iOS never loaded them.
 */
function useSettingFlags(keys: string[]) {
  const { profile } = useSession();
  const [flags, setFlags] = useState<Flags>(() => Object.fromEntries(keys.map((k) => [k, store.bool(k)])));
  useEffect(() => {
    if (!profile) return;
    const patch: Flags = {};
    keys.forEach((k) => {
      if (typeof profile[k] === 'boolean') { patch[k] = profile[k]; store.setBool(k, profile[k]); }
    });
    if (Object.keys(patch).length) setFlags((f) => ({ ...f, ...patch }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);
  return [flags, setFlags] as const;
}

/** PUT updateSettings; mirror `data` into storage + session profile. No revert on failure (iOS). */
async function updateSettings(body: Flags, keys: string[]) {
  try {
    const r = await withHud(() => api('api/v1/user/updateSettings', { method: 'PUT', body }));
    const data = r?.data ?? {};
    const patch: Flags = {};
    keys.forEach((k) => {
      const v = typeof data[k] === 'boolean' ? data[k] : body[k];
      if (typeof v === 'boolean') { store.setBool(k, v); patch[k] = v; }
    });
    const p = session.get().profile;
    if (p) session.setProfile({ ...p, ...patch });
  } catch (e) {
    showAlert(errMsg(e));
  }
}

// ───────────────────────── Account Privacy ─────────────────────────

export function AccountPrivacy() {
  const [flags, setFlags] = useSettingFlags(['isPrivateAccount']);
  const on = flags.isPrivateAccount;
  const change = (v: boolean) => {
    setFlags({ isPrivateAccount: v });
    store.setBool('isPrivateAccount', v);
    updateSettings({ isPrivateAccount: v }, ['isPrivateAccount']);
  };
  return (
    <DetailPage title="Account Privacy">
      <div className="px-[16px] pt-[8px]">
        <Caption className="flex h-[16px] items-center">PRIVACY</Caption>
        <Card className="mt-[8px] px-[22px] py-[34px]">
          <div className="flex items-center">
            <div className="flex-1 pr-[20px] text-[16px] font-bold text-ink">Private Account</div>
            <Toggle on={on} onChange={change} />
          </div>
          <div className="mt-[20px] text-[12px] leading-[15px] text-caption">
            When your account is private, only people you approve can see your posts.
          </div>
        </Card>
      </div>
    </DetailPage>
  );
}

// ───────────────────────── Notification settings ─────────────────────────

const GROUPS: { caption: string; rows: [string, string][] }[] = [
  { caption: 'Common', rows: [['General Notification', 'isGeneral'], ['Sound', 'isSound'], ['Vibrate', 'isVibrate']] },
  {
    caption: 'System and service update',
    rows: [['App Update', 'isAppUpdate'], ['Promotion', 'isPromotion'], ['Discount Available', 'isDiscount'], ['Payment Request', 'isPayment']],
  },
  {
    caption: 'Other',
    rows: [['Push Notification', 'isPushNotification'], ['New Tips Available', 'isNewTips'], ['New Service Available', 'isNewServiceAvilable']],
  },
];
const NOTIF_KEYS = GROUPS.flatMap((g) => g.rows.map((r) => r[1]));

export function NotificationSettings() {
  const [flags, setFlags] = useSettingFlags(NOTIF_KEYS);
  const change = (key: string, v: boolean) => {
    const next = { ...flags, [key]: v };
    setFlags(next);
    const body: Flags = {};
    NOTIF_KEYS.forEach((k) => { body[k] = !!next[k]; store.setBool(k, body[k]); });
    updateSettings(body, NOTIF_KEYS);
  };
  return (
    <DetailPage title="Notification">
      <div className="px-[18px] pb-[24px]">
        {GROUPS.map((g, gi) => (
          <Fragment key={g.caption}>
            <div className={`flex h-[24px] items-center pl-[34px] text-[13px] text-caption ${gi === 0 ? 'mt-[20px]' : 'mt-[34px]'}`}>{g.caption}</div>
            <Card className="mt-[9px] py-[6px]">
              {g.rows.map(([label, key], ri) => (
                <Fragment key={key}>
                  {ri > 0 && (
                    <div className="relative h-[25px]">
                      <div className="absolute left-[14px] right-0 top-[12px] h-px bg-hairline" />
                    </div>
                  )}
                  <div className="flex h-[21px] items-center px-[34px]">
                    <span className="flex-1 truncate text-[16px] text-ink">{label}</span>
                    <Toggle on={!!flags[key]} onChange={(v) => change(key, v)} />
                  </div>
                </Fragment>
              ))}
            </Card>
          </Fragment>
        ))}
      </div>
    </DetailPage>
  );
}

// ───────────────────────── Change password ─────────────────────────

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  // Web fix: iOS Old/New reveal buttons were reversed (first tap only swapped the icon).
  // Here every field behaves like iOS "Confirm": `hide` = hidden, `view` = revealed.
  const [shown, setShown] = useState(false);
  return (
    <div>
      <div className="text-[13px] leading-[16px] text-muted">{label}</div>
      <div className="relative mt-[7px] h-[56px] rounded-[14px] border border-[#E6EBEF] bg-[#F3F5F7]">
        <div className="absolute bottom-[5px] left-[20px] right-[40px] top-[5px] flex items-center">
          <span className="flex w-[32px] shrink-0 items-center"><Glyph name="lock" size={20} color="#8A97A0" /></span>
          <input type={shown ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={label}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-[#C4C4C6]" />
        </div>
        <button type="button" aria-label={shown ? 'Hide password' : 'Show password'} onClick={() => setShown((s) => !s)}
          className="absolute right-[10px] top-1/2 flex h-[24px] w-[24px] -translate-y-1/2 items-center justify-center">
          <Glyph name={shown ? 'view' : 'hide'} size={24} color="#8A97A0" />
        </button>
      </div>
    </div>
  );
}

export function ChangePassword() {
  const nav = useNav();
  const [oldP, setOld] = useState('');
  const [newP, setNew] = useState('');
  const [conf, setConf] = useState('');

  const save = async () => {
    if (!oldP) return showAlert('Old Password cannot be empty.', 'Alert');
    if (!newP) return showAlert('New Password cannot be empty.', 'Alert');
    if (!conf) return showAlert('Confirm Password cannot be empty.', 'Alert');
    if (newP !== conf) return showAlert('New Password and Confirm Password do not match.', 'Alert');
    try {
      const r = await withHud(() => api('api/v1/user/profile/changePassword', {
        method: 'POST', body: { oldPassword: oldP, newPassword: newP, confirmPassword: conf },
      }));
      await showAlert(r?.message ?? '');
      // iOS pushes Login without clearing the session; web signs out and resets to /login.
      signOut(nav.reset);
    } catch (e) {
      showAlert(errMsg(e));
    }
  };

  return (
    <DetailPage title="Change password">
      <div className="min-h-full" onClick={(e) => { if (e.target === e.currentTarget) (document.activeElement as HTMLElement | null)?.blur(); }}>
        <form className="px-[20px] pt-[20px]" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="flex flex-col gap-[16px]">
            <PasswordField label="Old Password" value={oldP} onChange={setOld} />
            <PasswordField label="New Password" value={newP} onChange={setNew} />
            <PasswordField label="Confirm Password" value={conf} onChange={setConf} />
          </div>
          <button type="submit" className="mt-[30px] h-[56px] w-full rounded-[28px] bg-primary text-[17px] font-bold text-white">SAVE</button>
        </form>
      </div>
    </DetailPage>
  );
}
