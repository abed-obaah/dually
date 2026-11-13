// LogInViewController (specs/01-auth §4).
import { useState } from 'react';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { store } from '../../lib/storage';
import { showAlert, withHud } from '../../ui/overlays';
import { enterApp, errMsg, isValidEmail, withDeviceToken } from './flow';
import { AuthScreen, Field, LinkButton, LogoCard, OrDivider, Pill, SocialStack, Subtitle, Title } from './ui';

export default function Login() {
  const nav = useNav();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (!email.trim()) return showAlert('Email address cannot be empty.', 'Alert');
    if (!isValidEmail(email)) return showAlert('Please enter a valid email address.', 'Alert');
    if (!password) return showAlert('Password cannot be empty.', 'Alert');
    try {
      const r: any = await withHud(() => api('api/v1/user/loginWithPhone', {
        method: 'POST', auth: false, body: withDeviceToken({ email, password }),
      }));
      const d = r?.data ?? {};
      if (d.id != null) store.userID = String(d.id);
      if (d.token) store.token = d.token;
      store.loggedIn = true;
      // iOS falls back to the literal "alert" when message is null — web shows no alert then.
      await showAlert(r?.message ?? '');
      enterApp(nav);
    } catch (e) {
      await showAlert(errMsg(e));
    }
  };

  return (
    <AuthScreen>
      <div className="px-[20px] pb-[20px] pt-[20px]">
        <LogoCard />
        <Title style={{ marginTop: 15 }}>Login</Title>
        <Subtitle style={{ marginTop: 10 }}>Enter your registered email &amp; password</Subtitle>

        <Field containerStyle={{ marginTop: 30 }} icon="email" iconX={10} textX={40}
          value={email} onChange={setEmail} placeholder="Email"
          type="email" inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" name="email" />
        <Field containerStyle={{ marginTop: 20 }} icon="lock" iconX={10} textX={40} secure
          value={password} onChange={setPassword} placeholder="Password"
          autoComplete="current-password" autoCapitalize="off" autoCorrect="off" name="password" />

        <div className="mt-[10px] flex justify-end">
          <LinkButton regular className="h-[30px]" onClick={() => nav.push('/forgot')}>Forgot Password?</LinkButton>
        </div>

        <Pill className="mt-[20px]" onClick={submit}>LOGIN</Pill>
        <OrDivider style={{ marginTop: 20 }} />
        <SocialStack fixedWidth={348} style={{ marginTop: 20 }} />

        <div className="mt-[70px] grid h-[40px] grid-cols-2 items-center gap-[5px]">
          <div className="text-right text-[15px] text-mutedtext">New user?</div>
          <div className="text-left">
            <LinkButton onClick={() => nav.push('/register')}>Register</LinkButton>
          </div>
        </div>
      </div>
    </AuthScreen>
  );
}
