// ForgotPasswordViewController + OTP sheet (specs/01-auth §7).
import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { showAlert, withHud } from '../../ui/overlays';
import { errMsg } from './flow';
import { AuthScreen, BackRow, FIELD_FILL, FIELD_STROKE, Field, GRADIENT, LinkButton, Pill, Subtitle, Title } from './ui';

const isMobile = (v: string) => /^\d{10}$/.test(v);

function OtpSheet({ open, contact, onCancel, onVerified }: {
  open: boolean; contact: string; onCancel: () => void; onVerified: (userId: string, otp: string) => void;
}) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (open) setDigits(['', '', '', '']); }, [open]);

  const setAt = (i: number, raw: string) => {
    const chars = raw.replace(/\s/g, '');
    const next = [...digits];
    if (chars.length > 1) {
      // Paste / autofill of several digits: spread over the boxes.
      chars.slice(0, 4 - i).split('').forEach((c, k) => { next[i + k] = c; });
      setDigits(next);
      refs.current[Math.min(3, i + chars.length - 1)]?.focus();
      return;
    }
    next[i] = chars;
    setDigits(next);
    if (chars && i < 3) refs.current[i + 1]?.focus();
    if (!chars && i > 0) refs.current[i - 1]?.focus();
  };

  const resend = async () => {
    try {
      const r: any = await withHud(() => api('api/v1/user/resendOtp/', { method: 'POST', auth: false }));
      await showAlert(r?.message ?? '');
    } catch { /* iOS shows nothing on failure */ }
  };

  const verify = async () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (digits.some((d) => !d)) return showAlert('Please enter the complete OTP.');
    const otp = digits.join('');
    const isEmail = contact.includes('@');
    // iOS sends only `email` ("" on the phone path); the web also passes the mobile number then.
    const body: Record<string, string> = { email: isEmail ? contact : '', otp };
    if (!isEmail) body.mobileNumber = contact;
    try {
      const r: any = await withHud(() => api('api/v1/user/forgot/Verifyotp', { method: 'POST', auth: false, body }));
      const userId = r?.data?.userId ?? r?.data?._id ?? '';
      onVerified(String(userId), otp);
    } catch (e) {
      await showAlert(errMsg(e));
    }
  };

  return (
    <div className="absolute inset-0 z-20"
      style={{
        background: 'rgba(0,0,0,0.5)',
        opacity: open ? 1 : 0,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'opacity .3s ease-in-out, transform .3s ease-in-out',
        pointerEvents: open ? 'auto' : 'none',
      }}
      aria-hidden={!open}
      onClick={() => (document.activeElement as HTMLElement | null)?.blur?.()}>
      <div className="absolute inset-x-0 bottom-0 rounded-t-[20px] pb-[calc(40px+var(--sab))]" style={{ background: GRADIENT }}
        onClick={(e) => e.stopPropagation()}>
        <LinkButton onClick={onCancel} className="ml-[20px] mt-[10px] h-[34px] w-[60px] text-left">Cancel</LinkButton>
        <div className="px-[20px]">
          <Title style={{ marginTop: 20 }}>Verify Your Number</Title>
          <Subtitle style={{ marginTop: 10 }}>Please enter the digit code sent to your Email address</Subtitle>
        </div>
        <div className="mt-[25px] flex justify-center gap-[20px]">
          {digits.map((d, i) => (
            <div key={i} className="h-[56px] w-[56px] overflow-hidden rounded-[12px]"
              style={{ background: FIELD_FILL, border: `1px solid ${FIELD_STROKE}` }}>
              <input
                ref={(el) => { refs.current[i] = el; }}
                value={d}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus();
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${i + 1}`}
                tabIndex={open ? 0 : -1}
                className="h-full w-full bg-transparent px-[9px] py-[4px] text-center text-[20px] font-bold text-white caret-secondary outline-none"
              />
            </div>
          ))}
        </div>
        <div className="mt-[30px] flex justify-center">
          <LinkButton onClick={resend} className="h-[35px] w-[100px]">Resend Code</LinkButton>
        </div>
        <div className="mt-[11px] px-[20px]">
          <Pill onClick={verify}>CONTINUE</Pill>
        </div>
      </div>
    </div>
  );
}

export default function Forgot() {
  const nav = useNav();
  const [value, setValue] = useState('');
  const [sheet, setSheet] = useState(false);

  const submit = async () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (!value) return showAlert('Please enter your email or mobile number.');
    const email = value.includes('@');
    const mobile = isMobile(value);
    if (!email && !mobile) return showAlert('Please enter a valid email or mobile number.');
    try {
      await withHud(() => api('api/v1/user/forget/Password', {
        method: 'POST', auth: false, body: { mobileNumber: mobile && !email ? value : '', email: email ? value : '' },
      }));
      setSheet(true);
    } catch (e) {
      await showAlert(errMsg(e));
    }
  };

  return (
    <AuthScreen scroll={false} overlay={
      <OtpSheet open={sheet} contact={value} onCancel={() => { setSheet(false); (document.activeElement as HTMLElement | null)?.blur?.(); }}
        onVerified={(userId, otp) => { setSheet(false); nav.push('/new-password', { userId, otp }); }} />
    }>
      <BackRow onBack={() => nav.back('/login')} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-[20px]">
        <Title left style={{ marginTop: 20 }}>Forgot Your Password</Title>
        <Subtitle left style={{ marginTop: 10 }}>
          Enter your registered email address or phone number, and we&apos;ll send you a link to reset your password.
        </Subtitle>
        <Field containerStyle={{ marginTop: 20 }} value={value} onChange={setValue}
          placeholder="Email Address or Phone Number" type="text" autoComplete="email" autoCapitalize="off" autoCorrect="off"
          onFocus={(e) => window.setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)} />
        <Subtitle left style={{ marginTop: 10 }}>You may receive Email or SMS notification from us</Subtitle>
      </div>
      <div className="shrink-0 px-[20px] pb-[20px]">
        <Pill onClick={submit}>CONTINUE</Pill>
      </div>
    </AuthScreen>
  );
}
