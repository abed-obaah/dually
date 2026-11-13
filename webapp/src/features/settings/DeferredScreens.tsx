// Deferred screens (§15): Wallet (read-only gift quantities), Cart (layout only),
// Cash KYC, Live activity. Purchases/payments → "Coming soon on the web.".
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { store } from '../../lib/storage';
import { DetailPage, EmptyState } from '../../ui/chrome';
import { Img, SF } from '../../ui/icons';
import { showAlert, withHud } from '../../ui/overlays';
import { errMsg, SFX } from './shared';

const COMING_SOON = 'Coming soon on the web.';
const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// ───────────────────────── Wallet ─────────────────────────

const PIECES: { name: string; key: string; art: string }[] = [
  { name: 'King', key: 'king', art: 'King2_2000' },
  { name: 'Queen', key: 'queen', art: 'King2000' },
  { name: 'Rook', key: 'rook', art: 'Queen2000' },
  { name: 'Pawn', key: 'pawn', art: 'Man2000' },
  { name: 'Knight', key: 'knight', art: 'Horse2000' },
  { name: 'Bishop', key: 'bishop', art: 'Camel2000' },
];

export function Wallet() {
  const nav = useNav();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    withHud(() => api('api/v1/user/getChessProductsAndUserQuantities'))
      .then((r) => { if (alive) setData(r?.data ?? {}); })
      .catch((e) => { if (alive) showAlert(errMsg(e)); });
    return () => { alive = false; };
  }, []);

  const qty = data?.userQuantities ?? {};
  const products: any[] = Array.isArray(data?.products) ? data.products : [];
  const priceOf = (name: string) => num(products.find((p) => String(p?.name ?? '').toLowerCase() === name.toLowerCase())?.priceUsd);

  return (
    <DetailPage title="Wallet" right={
      <button onClick={() => nav.push('/settings/cart')} className="h-[36px] min-w-[64px] rounded-[12px] bg-primary px-[14px] text-[15px] font-bold text-white">Buy</button>
    }>
      <div className="grid grid-cols-2 gap-[14px] p-[16px]">
        {PIECES.map((p) => (
          <div key={p.key} className="flex h-[214px] flex-col items-center rounded-[18px] border border-cardstroke bg-white px-[10px]">
            <Img name={p.art} className="mt-[18px] h-[82px] w-[62px]" />
            <div className="mt-[12px] w-full text-center text-[16px] font-bold leading-[20px] text-ink">{p.name}</div>
            <div className="mt-[4px] w-full text-center text-[13px] leading-[16px] text-caption">Item left: {num(qty[p.key])}</div>
            <div className="mt-[4px] w-full text-center text-[15px] font-bold leading-[18px] text-primary">$ {priceOf(p.name).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </DetailPage>
  );
}

// ───────────────────────── Cart (layout only) ─────────────────────────

const GIFT_ART: Record<string, string> = { King: 'King2_2000', Queen: 'Queen2000', Rook: 'Queen2000', Pawn: 'Man2000', Knight: 'Horse2000', Bishop: 'Camel2000' };

function Check({ on }: { on: boolean }) {
  return (
    <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${on ? 'border-primary bg-primary text-white' : 'border-[#C9D2D8] bg-white'}`}>
      {on && <SFX.check size={13} weight={3} />}
    </span>
  );
}

export function Cart() {
  const [products, setProducts] = useState<any[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    withHud(() => api('api/v1/user/product'))
      .then((r) => { if (alive) setProducts(Array.isArray(r?.data) ? r.data : []); })
      .catch((e) => { if (alive) showAlert(errMsg(e)); });
    return () => { alive = false; };
  }, []);

  const badges = products.filter((p) => /verified badge/i.test(String(p?.name ?? '')));
  const gifts = products.filter((p) => GIFT_ART[String(p?.name ?? '')]);
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const { total, count } = useMemo(() => {
    let t = 0, c = 0;
    products.forEach((p) => { if (picked.has(p?._id)) { t += num(p?.priceUsd); c += 1; } });
    return { total: t, count: c };
  }, [products, picked]);

  return (
    <DetailPage title="Cart">
      <div className="mt-[14px] flex flex-col items-center gap-[4px] px-[20px]">
        <div className="text-[11px] text-caption">Order total</div>
        <div className="text-[24px] font-bold text-ink">$ {total.toFixed(2)}</div>
        <div className="mt-[2px] flex h-[24px] min-w-[90px] items-center justify-center rounded-[12px] bg-page px-[10px] text-[12px] text-label">
          {count} item{count === 1 ? '' : 's'} selected
        </div>
      </div>
      <div className="px-[16px] pt-[16px]">
        {badges.length > 0 && (
          <>
            <div className="mb-[10px] text-[16px] font-bold text-ink">Suggested Items to Buy</div>
            <div className="grid grid-cols-2 gap-[12px]">
              {badges.map((p) => {
                const on = picked.has(p._id);
                return (
                  <button key={p._id} onClick={() => toggle(p._id)}
                    className={`relative flex flex-col items-start rounded-[16px] border p-[12px] text-left ${on ? 'border-primary bg-[#F2FAFD]' : 'border-cardstroke bg-white'}`}>
                    <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-chip"><Img name="ic_verified" size={20} /></span>
                    <span className="mt-[8px] text-[14px] font-semibold text-ink">{p.name}</span>
                    <span className="mt-[2px] text-[14px] font-bold text-primary">$ {num(p.priceUsd).toFixed(2)}</span>
                    <span className="absolute right-[10px] top-[10px]"><Check on={on} /></span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {gifts.length > 0 && (
          <>
            <div className="mb-[10px] mt-[18px] text-[16px] font-bold text-ink">Buy more gifts to send</div>
            <div className="grid grid-cols-3 gap-[8px] rounded-[18px] border border-cardstroke bg-white p-[10px]">
              {gifts.map((p) => {
                const on = picked.has(p._id);
                return (
                  <button key={p._id} onClick={() => toggle(p._id)} className="relative flex flex-col items-center rounded-[14px] py-[8px]">
                    <span className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#F6E4B8] bg-[#FFF6E2]">
                      <Img name={GIFT_ART[p.name]} className="h-[38px] w-[30px]" />
                    </span>
                    <span className="mt-[6px] text-[13px] font-semibold text-ink">{p.name}</span>
                    <span className="text-[12px] font-bold text-primary">$ {num(p.priceUsd).toFixed(2)}</span>
                    <span className="absolute right-[4px] top-[4px] scale-[.8]"><Check on={on} /></span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {count > 0 && (
          <button onClick={() => showAlert(COMING_SOON)} className="mt-[20px] h-[56px] w-full rounded-[12px] bg-primary text-[16px] font-bold text-white">
            Proceed to pay
          </button>
        )}
      </div>
    </DetailPage>
  );
}

// ───────────────────────── Cash KYC ─────────────────────────

export function CashKyc() {
  const nav = useNav();
  // Exception to the app chrome: the system iOS navigation bar is shown here.
  return (
    <div className="screen bg-page">
      <div className="pt-safe sticky top-0 z-20 bg-page/95 backdrop-blur">
        <div className="relative flex h-[44px] items-center justify-center">
          <button onClick={() => nav.back()} className="absolute left-[8px] flex h-[44px] items-center text-[17px] text-[#007AFF]">
            <SF.chevronLeft size={22} weight={2.4} /><span className="-ml-[2px]">Back</span>
          </button>
          <div className="text-[17px] font-semibold text-black">Cash KYC</div>
        </div>
      </div>
      <div className="flex flex-col items-center px-[24px] pb-tabbar pt-[48px] text-center">
        <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-[#EAF4FB] text-primary">
          <SFX.buildingColumns size={48} />
        </div>
        <div className="mt-[20px] text-[22px] font-bold leading-[27px] text-ink">Link Your Bank Account</div>
        <div className="mt-[20px] text-[14px] leading-[18px] text-muted">Connect your bank account to withdraw your earnings securely.</div>
        <button onClick={() => showAlert('Bank account linking is not yet configured on this device.', 'Bank Linking')}
          className="mt-[32px] h-[50px] w-full rounded-[12px] bg-[#D32F2F] text-[15px] font-semibold text-white">
          Start Verification
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Live activity ─────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const parse = (s?: string) => { if (!s) return null; const d = new Date(s); return isNaN(d.getTime()) ? null : d; };
const dayFmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const clockFmt = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const GREY = '#6B7A85';

function LiveCard({ s }: { s: any }) {
  const start = parse(s?.startDate);
  const end = parse(s?.EndDate ?? s?.endDate);
  const ended = String(s?.status ?? '').toLowerCase() === 'end';
  let duration = '—';
  const tm = s?.totalMin;
  if (tm !== undefined && tm !== null && Number.isFinite(Number(tm))) duration = Number(tm) > 0 ? `${Number(tm)} min` : '<1 min';
  else if (start && end) { const m = Math.floor((end.getTime() - start.getTime()) / 60000); duration = m > 0 ? `${m} min` : '<1 min'; }
  const sum = s?.summary ?? {};
  const icon = [
    [SFX.eyeFill, num(sum.totalViewers)],
    [SFX.heartFill, num(sum.likes)],
    [SFX.bubbleFill, num(sum.comments)],
    [SFX.giftFill, Array.isArray(sum.gifts) ? sum.gifts.length : 0],
  ] as const;
  return (
    <div className="mx-[16px] mt-[12px] rounded-[16px] border border-[#EDF1F3] bg-white shadow-[0_2px_6px_rgba(0,0,0,.05)]">
      <div className="flex items-center px-[16px] pt-[16px]">
        <div className="mr-[10px] min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-[18px] text-ink">{start ? dayFmt(start) : '—'}</div>
          <div className="mt-[2px] text-[13px] leading-[16px]" style={{ color: GREY }}>
            {start && end ? `${clockFmt(start)} – ${clockFmt(end)}` : start ? clockFmt(start) : ''}
          </div>
        </div>
        <div className="flex h-[24px] items-center rounded-[12px] bg-[#F1F4F6] px-[10px]">
          <span className="h-[6px] w-[6px] rounded-full" style={{ background: ended ? GREY : '#D93544' }} />
          <span className="ml-[6px] text-[12px] font-semibold" style={{ color: GREY }}>{ended ? 'Ended' : 'Live'}</span>
        </div>
      </div>
      <div className="mt-[14px] h-px bg-hairline" />
      <div className="grid grid-cols-2 px-[16px] pt-[14px]">
        {[[duration, 'Duration'], [String(Array.isArray(s?.joinUser) ? s.joinUser.length : 0), 'Joined']].map(([v, c]) => (
          <div key={c} className="flex flex-col gap-[2px]">
            <span className="text-[17px] font-bold leading-[20px] text-ink">{v}</span>
            <span className="text-[12px]" style={{ color: GREY }}>{c}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-[16px] pb-[16px] pt-[14px]">
        {icon.map(([El, v], i) => (
          <div key={i} className="flex items-center gap-[5px]">
            <span style={{ color: GREY }}><El size={15} /></span>
            <span className="text-[13px] font-semibold text-ink">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiveActivity() {
  const [sessions, setSessions] = useState<any[] | null>(null);
  useEffect(() => {
    let alive = true;
    if (!store.token) { setSessions([]); return; }
    api('api/v1/user/live/history')
      .then((r) => { if (alive) setSessions(Array.isArray(r?.data) ? r.data : []); })
      .catch(() => { if (alive) setSessions([]); }); // iOS: silent, shows empty
    return () => { alive = false; };
  }, []);
  return (
    <DetailPage title="Live activity" bg="#F7F9FA">
      {sessions === null ? (
        <EmptyState loading className="absolute inset-0" />
      ) : sessions.length === 0 ? (
        <EmptyState glyph={<SFX.radiowaves size={60} />} title="No live streams yet"
          body="Once you go live, each session shows up here with how long it ran, who joined, and how it went." className="absolute inset-0" />
      ) : (
        <div className="pb-[24px] pt-[4px]">{sessions.map((s, i) => <LiveCard key={s?._id ?? i} s={s} />)}</div>
      )}
    </DetailPage>
  );
}
