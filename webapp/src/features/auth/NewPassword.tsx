// ChangePasswordViewController "New Password" (reset flow, specs/01-auth §8).
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { showAlert, withHud } from '../../ui/overlays';
import { errMsg } from './flow';
import { AuthScreen, BackRow, Field, Pill, Subtitle, Title } from './ui';

export default function NewPassword() {
  const nav = useNav();
  const state = (useLocation().state ?? {}) as { userId?: string; otp?: string };
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const submit = async () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (!password) return showAlert('Password cannot be empty.', 'Alert');
    if (!confirm) return showAlert('Confirm Password cannot be empty.', 'Alert');
    if (password !== confirm) return showAlert('Passwords do not match.', 'Alert');
    try {
      await withHud(() => api(`api/v1/user/changePassword/${encodeURIComponent(state.userId ?? '')}`, {
        method: 'POST', auth: false, body: { otp: state.otp ?? '', newPassword: password, confirmPassword: confirm },
      }));
      nav.push('/success'); // no alert
    } catch (e) {
      await showAlert(errMsg(e));
    }
  };

  return (
    <AuthScreen scroll={false}>
      <BackRow onBack={() => nav.back('/forgot')} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-[20px]">
        <Title left style={{ marginTop: 20 }}>New Password</Title>
        <Subtitle left style={{ marginTop: 10 }}>Set the new pasword for your account so you can login and access all feature</Subtitle>
        <div className="mt-[33px] flex flex-col gap-[20px]">
          <Field icon="lock" iconX={20} textX={52} secure value={password} onChange={setPassword} placeholder="Password"
            autoComplete="new-password" autoCapitalize="off" autoCorrect="off" name="new-password" />
          <Field icon="lock" iconX={20} textX={52} secure value={confirm} onChange={setConfirm} placeholder="Confirm Password"
            autoComplete="new-password" autoCapitalize="off" autoCorrect="off" name="confirm-password" />
        </div>
      </div>
      <div className="shrink-0 px-[20px] pb-[20px]">
        <Pill onClick={submit}>UPDATE PASSWORD</Pill>
      </div>
    </AuthScreen>
  );
}
