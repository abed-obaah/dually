// Delete account (§7), Help (§8), Help Center (§9), Raise a query (§10),
// About (§11), Privacy Policy (§12), Terms & Conditions (§13).
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { store } from '../../lib/storage';
import { Card, Caption, DetailPage, Row } from '../../ui/chrome';
import { Glyph, Img, img, SF } from '../../ui/icons';
import { showActions, showAlert, withHud } from '../../ui/overlays';
import { errMsg, HELVETICA, SFX, signOut } from './shared';

const blurActive = () => (document.activeElement as HTMLElement | null)?.blur();

// ───────────────────────── Delete account ─────────────────────────

export function DeleteAccount() {
  const nav = useNav();
  const del = async () => {
    if (!store.token) return showAlert('No valid access token found.');
    // Web fix: iOS deleted immediately with no confirmation.
    const i = await showActions('Delete account', 'Are you sure you want to permanently delete your account? This action is irreversible.',
      [{ title: 'Cancel', style: 'cancel' }, { title: 'Delete', style: 'destructive' }]);
    if (i !== 1) return;
    try {
      const r = await withHud(() => api('api/v1/user/profile/delete', { method: 'DELETE' }));
      store.loggedIn = false;
      await showAlert(r?.message ?? '');
      signOut(nav.reset);
    } catch (e) {
      showAlert(errMsg(e));
    }
  };
  return (
    <DetailPage title="Delete account">
      <div className="bg-white px-[20px] pb-[20px] pt-[20px]" style={HELVETICA}>
        <div className="text-[20px] font-medium leading-[24px] text-black">Delete account permanently</div>
        <div className="mt-[10px] text-[15px] leading-[18px] text-[#AAAAAA]">
          Clicking this button will permanently delete your account, including all your data, posts, and interactions. This action is irreversible, so please be sure before proceeding. If you wish to keep your account, simply exit without clicking.
        </div>
        <button onClick={del} aria-label="DELETE ACCOUNT" className="mt-[33.33px] flex h-[50px] w-full items-center justify-center overflow-visible bg-white">
          <img src={img('ic_deletebtn')} alt="" draggable={false} className="h-[53px] w-[347px] max-w-none" />
        </button>
      </div>
    </DetailPage>
  );
}

// ───────────────────────── Help ─────────────────────────

export function Help() {
  const nav = useNav();
  return (
    <DetailPage title="Help">
      <div className="pl-[25px] pr-[20px] pt-[5px]">
        <Caption className="flex h-[26px] items-center">GET SUPPORT</Caption>
        <Card className="mt-[8px]">
          <Row icon={<SFX.message size={20} />} label="Raise a query" labelClass="text-[15px] font-semibold" onClick={() => nav.push('/settings/raise-query')} />
          <Row icon={<SFX.questionCircle size={20} />} label="Help center" labelClass="text-[15px] font-semibold" last onClick={() => nav.push('/settings/help-center')} />
        </Card>
      </div>
    </DetailPage>
  );
}

// ───────────────────────── Help Center ─────────────────────────

const TOPICS: { label: string; to: string }[] = [
  { label: 'Posts', to: '/home' },
  { label: 'Profile', to: '/profile' },
];

export function HelpCenter() {
  const nav = useNav();
  const [q, setQ] = useState('');
  // Web fix: iOS covered the search box with a button that jumped to Explore; here it filters the topics.
  const topics = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? TOPICS.filter((x) => x.label.toLowerCase().includes(t)) : TOPICS;
  }, [q]);
  return (
    <DetailPage title="Help Center">
      <div className="bg-white pb-[30px] pl-[25px] pr-[20px] pt-[20px]">
        <div className="text-[22px] font-bold leading-[27px] text-ink">How can we help you?</div>
        <div className="relative mt-[20px] flex h-[50px] items-center rounded-[10px] border-2 border-[#F2F2F7] bg-white">
          <Img name="ic_search" size={20} className="absolute left-[8px] top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help articles"
            className="ml-[28px] h-full min-w-0 flex-1 bg-transparent px-[8px] text-[17px] text-black outline-none placeholder:text-[#C4C4C6]" />
        </div>
        <div className="mt-[30px] text-[12px] tracking-[0.72px] text-caption">FEATURED TOPICS</div>
        {topics.length > 0 ? (
          <Card className="mt-[20px]">
            {topics.map((t, i) => (
              <div key={t.label}>
                {i > 0 && <div className="h-[10px]" />}
                <button onClick={() => nav.push(t.to)} className="relative flex h-[56px] w-full items-center text-left">
                  <span className="flex-1 text-[16px] text-ink">{t.label}</span>
                  <span className="mr-[4px] flex h-[22px] w-[22px] items-center justify-center text-caption"><SF.chevronRight size={15} weight={2} /></span>
                  {i < topics.length - 1 && <span className="absolute bottom-0 left-0 right-0 h-px bg-hairline" />}
                </button>
              </div>
            ))}
          </Card>
        ) : (
          <div className="mt-[20px] text-[14px] text-caption">No results</div>
        )}
      </div>
    </DetailPage>
  );
}

// ───────────────────────── Raise a query ─────────────────────────

export function RaiseQuery() {
  const nav = useNav();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [num, setNum] = useState('');
  const [msg, setMsg] = useState('');
  const [toast, setToast] = useState<'hidden' | 'in' | 'out'>('hidden');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const send = async () => {
    blurActive();
    if (!name) return showAlert('Please enter your name.');
    if (!email) return showAlert('Please enter your email.');
    if (!num) return showAlert('Please enter your number.');
    if (!msg) return showAlert('Please enter your query.');
    try {
      await withHud(() => api('api/v1/user/contact/us', { method: 'POST', body: { fullName: name, email, mobileNumber: num, message: msg } }));
      setToast('in');
      timers.current.push(window.setTimeout(() => setToast('out'), 2500));
      timers.current.push(window.setTimeout(() => nav.back(), 3000));
    } catch (e) {
      showAlert(errMsg(e));
    }
  };

  const enterBlurs = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); } };
  const label = 'absolute left-[25px] right-[20px] text-[14px] leading-[17px] text-ink';
  const box = 'absolute left-[25px] right-[20px] rounded-[14px] border border-[#E6EBEF] bg-[#F3F5F7] p-[5px]';
  const input = 'h-full w-full bg-transparent text-[15px] font-medium text-black outline-none';

  return (
    <DetailPage title="Raise a query">
      <div className="relative h-[558px] bg-white" onClick={(e) => { if (e.target === e.currentTarget) blurActive(); }}>
        <div className="pointer-events-none absolute left-[9px] right-[4px] top-[2px] h-[480px] rounded-[18px] border border-cardstroke bg-white" />
        <div className={label} style={{ top: 20 }}>Full Name</div>
        <div className={box} style={{ top: 46, height: 50 }}><input className={input} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={enterBlurs} /></div>
        <div className={label} style={{ top: 121 }}>Email</div>
        <div className={box} style={{ top: 152, height: 50 }}><input className={input} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={enterBlurs} /></div>
        <div className={label} style={{ top: 212 }}>Number</div>
        <div className={box} style={{ top: 243, height: 50 }}>
          <input className={input} inputMode="numeric" pattern="[0-9]*" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, ''))} onKeyDown={enterBlurs} />
        </div>
        <div className={label} style={{ top: 303 }}>Your query</div>
        <div className={box} style={{ top: 334, height: 130 }}>
          <textarea className={`${input} resize-none`} value={msg} onChange={(e) => setMsg(e.target.value.replace(/\n/g, ''))} onKeyDown={enterBlurs} />
        </div>
        <button onClick={send} className="absolute left-[25px] right-[20px] top-[484px] h-[54px] rounded-[27px] bg-primary text-[17px] font-bold text-white">SEND</button>
      </div>
      {toast !== 'hidden' && (
        <div className="absolute inset-0 z-[300] bg-black/30" style={{ opacity: toast === 'in' ? 1 : 0, transition: 'opacity .5s', animation: 'qfade .5s' }}>
          <style>{'@keyframes qfade{from{opacity:0}to{opacity:1}}'}</style>
          <div className="absolute left-1/2 top-[75%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[7px] bg-white px-[10px] py-[5px] text-center text-[16px] font-medium text-black" style={HELVETICA}>
            Your query has been sent
          </div>
        </div>
      )}
    </DetailPage>
  );
}

// ───────────────────────── About ─────────────────────────

export function About() {
  const [user, setUser] = useState<any>(null);
  const [since, setSince] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    api('api/v1/user/profile') // shouldIgnoreLoader: no HUD
      .then((r) => { if (!alive) return; setUser(r?.data?.user ?? null); setSince(r?.data?.memberSince ?? null); setLoaded(true); })
      .catch((e) => { if (alive) showAlert(errMsg(e)); });
    return () => { alive = false; };
  }, []);

  const avatar = loaded ? (user?.image || img('no_profile')) : img('ic_Profile');
  return (
    <DetailPage title="About">
      <div className="relative overflow-hidden bg-white px-[20px] pb-[28px] pt-[20px]">
        <div className="pointer-events-none absolute bottom-[4px] left-[18px] right-[18px] top-[-4px] rounded-[18px] border border-cardstroke bg-white" />
        <div className="relative">
          <img src={avatar} alt="" draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).src = img('no_profile'); }}
            className="mx-auto block h-[96px] w-[96px] rounded-full object-cover" />
          <div className="mt-[30px] min-h-[22px] text-center text-[18px] font-semibold leading-[22px] text-ink">{user?.fullName ?? ''}</div>
          <div className="mt-[10px] text-center text-[14px] leading-[17px] text-muted">{user?.bio || 'N/A'}</div>
          <div className="mt-[20px] h-px bg-hairline" />
          <div className="mt-[19px] flex items-center">
            <Glyph name="ic_calender" size={26} color="#0384B3" />
            <div className="ml-[20px] flex flex-col gap-[5px]">
              <div className="text-[15px] font-semibold leading-[18px] text-ink">Date joined</div>
              <div className="text-[12px] leading-[18px] text-caption">{since ?? 'N/a'}</div>
            </div>
          </div>
        </div>
      </div>
    </DetailPage>
  );
}

// ───────────────────────── Privacy Policy / Terms ─────────────────────────

function useRemoteText(path: string, pick: (d: any) => string | undefined) {
  const [text, setText] = useState('N/A');
  useEffect(() => {
    if (!store.token) { showAlert('No valid access token found.'); return; }
    let alive = true;
    withHud(() => api(path))
      .then((r) => {
        if (!alive) return;
        const list: any[] = Array.isArray(r?.data) ? r.data : [];
        setText(list.map(pick).filter(Boolean).join('\n\n'));
      })
      .catch((e) => { if (alive) showAlert(errMsg(e)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return text;
}

const TEXT = 'whitespace-pre-wrap break-words px-[20px] py-[20px] text-[12px] leading-[14.5px] text-black';

export function PrivacyPolicy() {
  const text = useRemoteText('api/v1/user/privacy', (d) => d?.header);
  return (
    <DetailPage title="Privacy Policy" bg="#FFFFFF">
      <div className={TEXT}>{text}</div>
    </DetailPage>
  );
}

export function Terms() {
  const text = useRemoteText('api/v1/user/terms-and-conditions', (d) => d?.content);
  return (
    <DetailPage title="Terms & Conditions">
      <div className={`bg-white ${TEXT}`}>{text}</div>
    </DetailPage>
  );
}
