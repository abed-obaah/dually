// My Purchases (MyPurchasesViewController, specs/03 §9 + foundation §3.11).
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { store } from '../../lib/storage';
import { EmptyState } from '../../ui/chrome';
import { Glyph } from '../../ui/icons';
import { Bar, Sym } from './ui';

type Load = { kind: 'loading' } | { kind: 'ok'; orders: any[] } | { kind: 'error'; body: string };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
function fmtDate(iso?: string) {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtPrice(o: any) {
  const raw = o?.paidAmount ?? o?.totalAmount;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!isFinite(n)) return '—';
  const c = String(o?.currency ?? '').toUpperCase();
  const sym = c === 'INR' ? '₹' : c === 'GBP' ? '£' : '$';
  return `${sym}${n.toFixed(2)}`;
}
const items = (o: any): any[] => (Array.isArray(o?.items) ? o.items : []);
function title(o: any) {
  const names = items(o).map((it) => {
    const name = it?.productId && typeof it.productId === 'object' ? it.productId.name : null;
    if (!name) return null;
    const q = Number(it?.quantity ?? 1);
    return q > 1 ? `${name} × ${q}` : name;
  }).filter(Boolean);
  return names.length ? names.join(', ') : 'Purchase';
}
const qty = (o: any) => items(o).reduce((s, it) => s + (Number(it?.quantity) || 0), 0);

function Art({ o }: { o: any }) {
  const first = String(items(o)[0]?.productId?.name ?? '').toLowerCase();
  const piece = first.includes('king') ? 'King2_2000'
    : first.includes('queen') || first.includes('rook') ? 'Queen2000'
    : first.includes('pawn') ? 'Man2000'
    : first.includes('knight') ? 'Horse2000'
    : first.includes('bishop') ? 'Camel2000' : null;
  if (piece) return <img src={`/app/img/${piece}.png`} alt="" className="h-[44px] w-[40px] object-contain" />;
  if (first.includes('verified') || first.includes('badge')) return <Glyph name="ic_verified" size={36} color="#0384B3" />;
  return <span className="text-primary"><Sym.gift size={30} /></span>;
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const color = s === 'paid' ? '#1E8E3E' : s === 'failed' ? '#FF3B30' : '#5B6770';
  return (
    <span className="inline-flex h-[20px] items-center rounded-[10px] px-[8px] text-[11px] font-semibold"
      style={{ color, background: color + '1F' }}>{status || '—'}</span>
  );
}

export default function Purchases() {
  const [state, setState] = useState<Load>({ kind: 'loading' });
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!store.token) { setState({ kind: 'error', body: 'Please sign in to see your purchases.' }); return; }
    try {
      const r = await api('api/v1/user/Cart/getOrder');
      const list: any[] = Array.isArray(r?.data) ? r.data : [];
      const paid = list.filter((o) => String(o?.paymentStatus ?? '').toLowerCase() === 'paid')
        .sort((a, b) => String(b?.createdAt ?? '').localeCompare(String(a?.createdAt ?? '')));
      setState({ kind: 'ok', orders: paid });
    } catch (e) {
      const st = e instanceof ApiError ? e.status : undefined;
      if (st === 404) setState({ kind: 'ok', orders: [] });
      else if (st === 401) setState({ kind: 'error', body: 'Please sign in to see your purchases.' });
      else if (st) setState({ kind: 'error', body: `Something went wrong (${st}). Pull down to try again.` });
      else setState({ kind: 'error', body: 'Check your connection and pull down to try again.' });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Minimal pull-to-refresh (UIRefreshControl).
  const onTouchStart = (e: React.TouchEvent) => { startY.current = (scroller.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null; };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    setPull(Math.max(0, Math.min(90, (e.touches[0].clientY - startY.current) * 0.5)));
  };
  const onTouchEnd = () => { if (pull > 60 && !refreshing) refresh(); setPull(0); startY.current = null; };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-page">
      <Bar title="My Purchases" fallback="/settings" backLeft={14} backSize={44} />
      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto pb-tabbar"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {(pull > 0 || refreshing) && (
          <div className="flex justify-center" style={{ height: refreshing ? 44 : pull, alignItems: 'center' }}>
            <div className="h-[20px] w-[20px] rounded-full border-2 border-black/10 border-t-muted"
              style={{ animation: refreshing ? 'hud-spin .8s linear infinite' : undefined, transform: `rotate(${pull * 4}deg)` }} />
          </div>
        )}
        {state.kind === 'loading' && <EmptyState loading title="Loading purchases..." className="absolute inset-0" />}
        {state.kind === 'error' && <EmptyState glyph={<Sym.bag size={60} />} title="Couldn't load purchases" body={state.body} className="absolute inset-0" />}
        {state.kind === 'ok' && state.orders.length === 0 && (
          <EmptyState glyph={<Sym.bag size={60} />} title="No purchases yet" body="Gifts and items you buy from the store will show up here." className="absolute inset-0" />
        )}
        {state.kind === 'ok' && state.orders.length > 0 && (
          <div className="pb-[24px] pt-[4px]">
            {state.orders.map((o, i) => (
              <div key={o?._id ?? i} className="relative mx-[16px] mt-[12px] flex rounded-[16px] border border-cardstroke bg-white p-[14px]">
                <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[14px] bg-[#EAF4FA]"><Art o={o} /></div>
                <div className="ml-[12px] min-w-0 flex-1 pr-[8px]">
                  <div className="line-clamp-2 text-[16px] font-bold leading-[20px] text-ink">{title(o)}</div>
                  <div className="mt-[3px] text-[13px] text-muted">{`Qty ${qty(o)} · #${o?.orderId || o?._id || ''}`}</div>
                  <div className="mt-[3px] text-[12px] text-caption">{fmtDate(o?.createdAt)}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <div className="text-[15px] font-bold text-primary">{fmtPrice(o)}</div>
                  <div className="mt-[8px]"><StatusPill status={String(o?.paymentStatus ?? '')} /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
