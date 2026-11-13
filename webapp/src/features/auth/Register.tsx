// RegisterationViewController "Create your account" (specs/01-auth §5).
import { useState } from 'react';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { store } from '../../lib/storage';
import { Glyph, Img } from '../../ui/icons';
import { showAlert, withHud } from '../../ui/overlays';
import { errMsg, isValidEmail } from './flow';
import { AuthScreen, Field, HELVETICA, LinkButton, LogoCard, OrDivider, Pill, SocialStack, Subtitle, Title } from './ui';

export default function Register() {
  const nav = useNav();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);

  const submit = async () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (!email.trim()) return showAlert('Email address cannot be empty.', 'Alert');
    if (!isValidEmail(email)) return showAlert('Please enter a valid email address.', 'Alert');
    if (!password) return showAlert('Password cannot be empty.', 'Alert');
    if (!confirm) return showAlert('Confirm Password cannot be empty.', 'Alert');
    if (password !== confirm) return showAlert('Passwords do not match.', 'Alert');
    if (!agreed) return showAlert('You must agree to the terms and conditions.', 'Alert');
    try {
      const r: any = await withHud(() => api('api/v1/user/signup', {
        method: 'POST', auth: false, body: { email, password, confirmPassword: confirm },
      }));
      const token = r?.data?.accessToken;
      if (token) store.token = token;
      nav.push('/profile-setup'); // no alert (signup message is not decoded on iOS)
    } catch (e) {
      await showAlert(errMsg(e));
    }
  };

  return (
    <AuthScreen>
      <div className="px-[20px] pb-[20px] pt-[20px]">
        <LogoCard />
        <Title style={{ marginTop: 30 }}>Create your account</Title>
        <Subtitle style={{ marginTop: 15 }}>Enter your details to get an account</Subtitle>

        <Field containerStyle={{ marginTop: 20 }} icon="email" iconX={10} textX={42}
          value={email} onChange={setEmail} placeholder="Email"
          type="email" inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" name="email" />
        <Field containerStyle={{ marginTop: 20 }} icon="lock" iconX={10} textX={42} secure
          value={password} onChange={setPassword} placeholder="Password"
          autoComplete="new-password" autoCapitalize="off" autoCorrect="off" name="new-password" />
        <Field containerStyle={{ marginTop: 20 }} icon="lock" iconX={10} textX={42} secure
          value={confirm} onChange={setConfirm} placeholder="Confirm Password"
          autoComplete="new-password" autoCapitalize="off" autoCorrect="off" name="confirm-password" />

        {/* Terms row: 30×30 checkbox + non-editable text view (Helvetica 12, inset 8 / 5). */}
        <div className="mt-[20px] flex items-start">
          <button type="button" role="checkbox" aria-checked={agreed} aria-label="Agree with our Terms & Conditions"
            onClick={() => setAgreed((a) => !a)} className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
            {agreed
              ? <Img name="check" size={16} />
              : <Glyph name="uncheck" color="#07A5DE" style={{ width: 16, height: 17 }} />}
          </button>
          <div className="h-[40px] min-w-0 flex-1 pl-[5px] pt-[8px] text-[12px] leading-[14px]" style={{ fontFamily: HELVETICA }}>
            <span style={{ color: '#AAAAAA' }}>Agree with our </span>
            <span style={{ color: '#5EB4BF' }}>Terms &amp; Conditions</span>
          </div>
        </div>

        <Pill className="mt-[20px]" onClick={submit}>REGISTER</Pill>
        <OrDivider style={{ marginTop: 20 }} />
        <SocialStack style={{ marginTop: 20 }} />

        <div className="mt-[70px] flex h-[40px] items-center gap-[5px]">
          <div className="min-w-0 flex-1 text-right text-[15px] text-mutedtext">Already have an account</div>
          <div className="w-[100px] text-left">
            <LinkButton onClick={() => nav.push('/login')}>Login</LinkButton>
          </div>
        </div>
      </div>
    </AuthScreen>
  );
}
