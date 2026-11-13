// Wallet (gift quantities) and Live activity. Cart / KYC / Withdraw live in features/payments.
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { store } from '../../lib/storage';
import { DetailPage, EmptyState } from '../../ui/chrome';
import { Img, SF } from '../../ui/icons';
import { showAlert, withHud } from '../../ui/overlays';
import { errMsg, SFX } from './shared';

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
