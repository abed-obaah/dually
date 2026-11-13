// Cash KYC + Withdraw. iOS only has a static stub here; the working flow is
// Android's CashKycFragment / WithdrawFragment (Stripe Financial Connections →
// kyc/complete, then earnings / withdraw). Copy follows the iOS state table.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { DetailPage } from '../../ui/chrome';
import { SF } from '../../ui/icons';
import { showAlert, withHud } from '../../ui/overlays';
import { errMsg, SFX } from '../settings/shared';
import { getStripe } from './stripe';

type Kyc = { kyc_status?: string; bank_name?: string; last4?: string; account_type?: string };

const WalletPass = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 9h18M15 14h3" />
  </svg>
);
const CheckSeal = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1.8l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 20l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z" />
    <path d="m8 11.5 3 3 5-5.5" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const STATES: Record<string, { icon: JSX.Element; bubble: string; tint: string; title: string; body: string; button?: string; btnColor?: string }> = {
  not_started: { icon: <SFX.buildingColumns size={48} />, bubble: '#EAF4FB', tint: '#0384B3', title: 'Link Your Bank Account',
    body: 'Connect your bank account to withdraw your earnings securely.', button: 'Start Verification' },
  pending: { icon: <WalletPass />, bubble: '#EAF4FB', tint: '#0384B3', title: 'Verification Pending',
    body: 'Your information is being reviewed. This usually takes 1-2 business days.', button: 'Check Status' },
  verified: { icon: <CheckSeal />, bubble: '#EAFBEF', tint: '#2E7D32', title: 'Account Verified',
    body: 'Your bank account is linked and you can now withdraw your earnings.', button: 'Withdraw Earnings' },
  failed: { icon: <SFX.buildingColumns size={48} />, bubble: '#FBEAEA', tint: '#D32F2F', title: 'Verification Failed',
    body: 'We could not verify your bank account. Please try again.', button: 'Try Again', btnColor: '#D32F2F' },
};

function SystemBar({ title }: { title: string }) {
  const nav = useNav();
  return (
    <div className="pt-safe sticky top-0 z-20 bg-page/95 backdrop-blur">
      <div className="relative flex h-[44px] items-center justify-center">
        <button onClick={() => nav.back()} className="absolute left-[8px] flex h-[44px] items-center text-[17px] text-[#007AFF]">
          <SF.chevronLeft size={22} weight={2.4} /><span className="-ml-[2px]">Back</span>
        </button>
        <div className="text-[17px] font-semibold text-black">{title}</div>
      </div>
    </div>
  );
}

export function CashKyc() {
  const nav = useNav();
  const [kyc, setKyc] = useState<Kyc | null>(null);
  const [failedLoad, setFailedLoad] = useState(false);

  const load = useCallback(async (hud = false) => {
    try {
      const r = await (hud ? withHud(() => api('api/v1/user/kyc/status')) : api('api/v1/user/kyc/status'));
      setKyc(r?.data ?? { kyc_status: 'not_started' });
      setFailedLoad(false);
    } catch (e) {
      setFailedLoad(true);
      setKyc((k) => k ?? { kyc_status: 'not_started' });
      showAlert(`Failed to load KYC status: ${errMsg(e)}`);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const link = async () => {
    try {
      const r = await withHud(() => api('api/v1/user/kyc/start', { method: 'POST', body: {} }));
      const clientSecret = r?.data?.clientSecret;
      if (!clientSecret) { showAlert('Failed to start bank linking session'); return; }
      const stripe = await getStripe();
      if (!stripe) { showAlert('Bank linking failed'); return; }
      const res = await stripe.collectFinancialConnectionsAccounts({ clientSecret });
      if (res.error) { showAlert(res.error.message || 'Bank linking failed'); return; }
      const account = res.financialConnectionsSession?.accounts?.[0];
      if (!account) { showAlert('Bank linking canceled'); return; }
      await withHud(() => api('api/v1/user/kyc/complete', { method: 'POST', body: { linked_account_token: account.id } }));
      await load(true);
    } catch (e) {
      showAlert(`KYC completion failed: ${errMsg(e)}`);
    }
  };

  const status = String(kyc?.kyc_status ?? 'not_started').toLowerCase();
  const s = STATES[status] ?? STATES.not_started;
  const onButton = () => {
    if (status === 'verified') nav.push('/settings/withdraw');
    else if (status === 'pending') load(true);
    else link();
  };

  return (
    <div className="screen bg-page">
      <SystemBar title="Cash KYC" />
      {kyc === null ? (
        <div className="pt-[80px] text-center text-[14px] text-muted">Checking your KYC status...</div>
      ) : (
        <div className="flex flex-col items-center px-[24px] pb-tabbar pt-[48px] text-center">
          <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full" style={{ background: s.bubble, color: s.tint }}>{s.icon}</div>
          <div className="mt-[20px] text-[22px] font-bold leading-[27px] text-ink">{s.title}</div>
          <div className="mt-[20px] text-[14px] leading-[18px] text-muted">{s.body}</div>
          {status === 'verified' && (
            <div className="mt-[20px] w-full rounded-[14px] border border-cardstroke bg-white p-[14px] text-left">
              <div className="text-[12px] text-caption">Linked Bank</div>
              <div className="mt-[2px] text-[16px] font-semibold text-ink">{kyc.bank_name || 'Your Bank'}</div>
              {kyc.last4 && <div className="text-[13px] text-muted">Account •••• {kyc.last4}</div>}
            </div>
          )}
          {failedLoad && <div className="mt-[12px] text-[12px] text-caption">Couldn't reach the server. Showing default status.</div>}
          {s.button && (
            <button onClick={onButton} className="mt-[32px] h-[50px] w-full rounded-[12px] text-[15px] font-semibold text-white"
              style={{ background: s.btnColor ?? '#0384B3' }}>
              {s.button}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Withdraw() {
  const nav = useNav();
  const [earn, setEarn] = useState<{ available: number; pending: number } | null>(null);
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api('api/v1/user/earnings')
      .then((r) => { if (alive) setEarn({ available: Number(r?.data?.available_balance) || 0, pending: Number(r?.data?.pending_balance) || 0 }); })
      .catch((e) => { if (alive) { setEarn({ available: 0, pending: 0 }); showAlert(`Failed to load earnings: ${errMsg(e)}`); } });
    return () => { alive = false; };
  }, []);

  const submit = async () => {
    const t = amount.trim();
    if (!t) { setErr('Please enter an amount'); return; }
    const v = Number(t);
    if (!Number.isFinite(v) || v <= 0) { setErr('Please enter a valid amount'); return; }
    if (v < 10) { setErr('Minimum withdrawal is $10.00'); return; }
    setErr('');
    setBusy(true);
    try {
      await withHud(() => api('api/v1/user/withdraw', { method: 'POST', body: { amount: Math.round(v * 100) / 100 } }));
      await showAlert('Withdrawal requested! Funds arrive in 2–5 business days.');
      nav.back('/settings');
    } catch (e) {
      showAlert(errMsg(e) || 'Withdrawal failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DetailPage title="Withdraw">
      <div className="p-[16px]">
        <div className="rounded-[16px] border border-cardstroke bg-white p-[18px]">
          <div className="text-[13px] text-caption">Available Balance</div>
          <div className="mt-[4px] text-[32px] font-bold text-ink">{earn ? `$${earn.available.toFixed(2)}` : '…'}</div>
          <div className="mt-[4px] text-[13px] text-muted">Pending: ${earn ? earn.pending.toFixed(2) : '0.00'}</div>
        </div>
        <div className="mt-[20px] text-[14px] font-semibold text-ink">Withdrawal Amount</div>
        <div className={`mt-[8px] flex h-[52px] items-center rounded-[12px] border bg-white px-[14px] ${err ? 'border-[#D32F2F]' : 'border-cardstroke'}`}>
          <span className="mr-[6px] text-[18px] font-semibold text-ink">$</span>
          <input inputMode="decimal" value={amount} placeholder="0.00"
            onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, '')); setErr(''); }}
            className="h-full flex-1 bg-transparent text-[18px] text-ink outline-none" />
        </div>
        {err && <div className="mt-[6px] text-[12px] text-[#D32F2F]">{err}</div>}
        <div className="mt-[16px] space-y-[4px] text-[13px] leading-[18px] text-muted">
          <div>• Funds typically arrive in 2–5 business days</div>
          <div>• Payouts are sent to your linked bank account</div>
          <div>• Minimum withdrawal: $10.00</div>
        </div>
        <button onClick={submit} disabled={busy}
          className="mt-[24px] h-[52px] w-full rounded-[12px] bg-primary text-[16px] font-bold text-white disabled:opacity-50">
          Request Withdrawal
        </button>
      </div>
    </DetailPage>
  );
}
