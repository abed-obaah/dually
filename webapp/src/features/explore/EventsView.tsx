// Explore → Events (DuallyEventsView + TicketmasterService).
import { useCallback, useEffect, useRef, useState } from 'react';
import Segmented from './Segmented';

const API_KEY = 'oRi4SaRffWocalOD4iWXbALapsJ1k2Kx';
const BASE = 'https://app.ticketmaster.com/discovery/v2/events.json';
const PAGE_SIZE = 20;
const RADIUS = 100;
const MAX_RESULTS = 1000;
const LOCATION_OFF = 'Location is off, so these are events nationwide. Turn on location for Dually in Settings to see events near you.';
const LOCATION_FAIL = "Couldn't find your location, so these are events nationwide.";

function geohash(lat: number, lon: number, precision = 9) {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let latR = [-90, 90], lonR = [-180, 180], hash = '', bit = 0, ch = 0, even = true;
  while (hash.length < precision) {
    if (even) {
      const mid = (lonR[0] + lonR[1]) / 2;
      if (lon >= mid) { ch |= 1 << (4 - bit); lonR[0] = mid; } else lonR[1] = mid;
    } else {
      const mid = (latR[0] + latR[1]) / 2;
      if (lat >= mid) { ch |= 1 << (4 - bit); latR[0] = mid; } else latR[1] = mid;
    }
    even = !even;
    if (bit < 4) bit++; else { hash += base32[ch]; bit = 0; ch = 0; }
  }
  return hash;
}

/** ISO8601 (no fractional seconds, UTC) of tomorrow 00:00 local. */
function earliestStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
function formatDate(raw?: string) {
  if (!raw) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return raw;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
}
function venueLine(e: any) {
  const v = e?._embedded?.venues?.[0];
  if (!v) return 'Location TBD';
  const parts = [v.name, v.city?.name, v.state?.name].filter((x) => typeof x === 'string' && x);
  return parts.length ? parts.join(', ') : 'Location TBD';
}
function dupKey(e: any) {
  const norm = String(e?.name ?? '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).join(' ');
  const venue = String(e?._embedded?.venues?.[0]?.name ?? '').toLowerCase();
  return norm ? `${norm}|${e?.dates?.start?.localDate ?? ''}|${venue}` : `id:${e?.id ?? ''}`;
}
const isFree = (e: any) => Array.isArray(e?.priceRanges) && e.priceRanges.length > 0 && e.priceRanges.every((r: any) => (r?.min ?? 1) === 0);

type Coords = { lat: number; lon: number };

export default function EventsView({ keyword, onCount }: { keyword: string; onCount: (n: number) => void }) {
  const [scope, setScope] = useState(0); // 0 near me, 1 nationwide
  const [notice, setNotice] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [footer, setFooter] = useState(false);
  const st = useRef({ gen: 0, loading: false, nextPage: 0, totalPages: 1, seen: new Set<string>(), events: [] as any[], scope: 0, keyword: '', loc: null as Coords | null, denied: false });
  const onCountRef = useRef(onCount); onCountRef.current = onCount;

  const clear = (s: string | null) => {
    const r = st.current;
    r.gen++; r.loading = false; r.nextPage = 0; r.totalPages = 1; r.seen = new Set(); r.events = [];
    setEvents([]); setFooter(false); setStatus(s);
  };

  const loadNextPage = useCallback(async () => {
    const r = st.current;
    if (r.loading || r.nextPage >= r.totalPages) return;
    r.loading = true;
    if (r.events.length) setFooter(true);
    const params = new URLSearchParams({
      apikey: API_KEY, size: String(PAGE_SIZE), page: String(r.nextPage), sort: 'date,asc', source: 'ticketmaster',
      countryCode: 'US', startDateTime: earliestStart(), includeTBA: 'no', includeTBD: 'no',
    });
    if (r.keyword) params.set('keyword', r.keyword);
    if (r.scope === 0 && r.loc) {
      params.set('geoPoint', geohash(r.loc.lat, r.loc.lon));
      params.set('radius', String(RADIUS));
      params.set('unit', 'miles');
    }
    const gen = r.gen;
    try {
      const res = await fetch(`${BASE}?${params}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      if (gen !== r.gen) return;
      r.loading = false; setFooter(false);
      const isFirst = r.nextPage === 0;
      r.totalPages = Math.min(Number(json?.page?.totalPages ?? 0), Math.floor(MAX_RESULTS / PAGE_SIZE));
      r.nextPage++;
      const list: any[] = Array.isArray(json?._embedded?.events) ? json._embedded.events : [];
      const fresh = list.filter((e) => {
        const idKey = `id:${e?.id ?? ''}`, k = dupKey(e);
        if (r.seen.has(idKey) || r.seen.has(k)) return false;
        r.seen.add(idKey); r.seen.add(k);
        return true;
      });
      r.events = [...r.events, ...fresh];
      setEvents(r.events);
      if (isFirst) onCountRef.current(r.events.length ? Math.max(Number(json?.page?.totalElements ?? 0), r.events.length) : 0);
      if (!fresh.length && list.length && r.nextPage < r.totalPages) { loadNextPage(); return; }
      setStatus(r.events.length ? null : emptyMessage(r.scope, r.keyword));
    } catch {
      if (gen !== r.gen) return;
      r.loading = false; setFooter(false);
      if (!r.events.length) { onCountRef.current(0); setStatus("Couldn't load events. Pull down to try again."); }
    }
  }, []);

  const reload = useCallback(() => { clear('Loading events…'); loadNextPage(); }, [loadNextPage]);

  const fallBack = useCallback((msg: string) => {
    st.current.scope = 1; setScope(1); setNotice(msg); reload();
  }, [reload]);

  const start = useCallback(() => {
    const r = st.current;
    setNotice(null);
    if (r.scope !== 0 || r.loc) { reload(); return; }
    if (r.denied || !navigator.geolocation) { fallBack(LOCATION_OFF); return; }
    clear('Finding events near you…');
    const gen = r.gen;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        r.loc = { lat: p.coords.latitude, lon: p.coords.longitude };
        if (gen === r.gen && r.scope === 0) reload();
      },
      (err) => {
        if (gen !== r.gen) return;
        if (err.code === err.PERMISSION_DENIED) { r.denied = true; fallBack(LOCATION_OFF); }
        else fallBack(LOCATION_FAIL);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  }, [reload, fallBack]);

  // Activated on first mount (the parent mounts this when Events is first shown).
  const activated = useRef(false);
  useEffect(() => {
    const k = keyword.trim();
    if (activated.current && k === st.current.keyword) return;
    st.current.keyword = k;
    activated.current = true;
    start();
  }, [keyword, start]);

  const changeScope = (i: number) => {
    if (i === st.current.scope) return;
    st.current.scope = i; setScope(i); start();
  };

  // Pull-to-refresh (touch) — simplified: overscroll at top by 70px triggers.
  const listRef = useRef<HTMLDivElement>(null);
  const pull = useRef<{ y: number; active: boolean } | null>(null);
  const [pullY, setPullY] = useState(0);
  const refresh = () => {
    const r = st.current;
    if (r.scope === 0 && !r.denied) r.loc = null;
    start();
  };

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const rowsLeft = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (rowsLeft < 5 * 300) loadNextPage();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mx-[14px] mt-[12px] shrink-0">
        <Segmented titles={['Near me', 'Nationwide']} index={scope} onChange={changeScope} height={40} />
      </div>
      <div className="mt-[8px] flex min-h-0 flex-1 flex-col gap-[6px]">
        {notice && <div className="shrink-0 px-[14px] text-center text-[12px] text-muted">{notice}</div>}
        <div ref={listRef} onScroll={onScroll} className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto pb-tabbar"
          onTouchStart={(e) => { if ((listRef.current?.scrollTop ?? 1) <= 0) pull.current = { y: e.touches[0].clientY, active: true }; }}
          onTouchMove={(e) => { if (pull.current?.active) setPullY(Math.max(0, Math.min(100, e.touches[0].clientY - pull.current.y))); }}
          onTouchEnd={() => { if (pull.current?.active && pullY > 70) refresh(); pull.current = null; setPullY(0); }}>
          {pullY > 0 && (
            <div className="flex items-center justify-center" style={{ height: pullY }}>
              <div className="h-[22px] w-[22px] rounded-full border-2 border-black/10 border-t-muted" style={{ animation: pullY > 70 ? 'hud-spin .8s linear infinite' : undefined, transform: `rotate(${pullY * 3}deg)` }} />
            </div>
          )}
          {status && !events.length && (
            <div className="absolute inset-0 flex items-center justify-center px-[20px] text-center text-[15px] text-muted">{status}</div>
          )}
          {events.map((e) => <EventCard key={e?.id ?? dupKey(e)} e={e} />)}
          {footer && (
            <div className="flex h-[44px] items-center justify-center">
              <div className="h-[20px] w-[20px] rounded-full border-2 border-black/10 border-t-muted" style={{ animation: 'hud-spin .8s linear infinite' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function emptyMessage(scope: number, keyword: string) {
  if (keyword) return scope === 0
    ? `No upcoming events near you match “${keyword}”. Try Nationwide.`
    : `No upcoming events match “${keyword}”.`;
  return scope === 0 ? `No upcoming events within ${RADIUS} miles. Try Nationwide.` : 'No upcoming events right now.';
}

function EventCard({ e }: { e: any }) {
  const image: string | undefined = e?.images?.[0]?.url;
  return (
    <div className="mx-[14px] my-[7px] overflow-hidden rounded-[16px] bg-white shadow-[0_3px_6px_rgba(0,0,0,0.08)]">
      <div className="relative h-[180px] overflow-hidden rounded-t-[16px]" style={{ background: '#E8EDF0' }}>
        {image && <img src={image} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.55))' }} />
        {isFree(e) && (
          <div className="absolute left-[10px] top-[10px] flex h-[22px] w-[44px] items-center justify-center rounded-[4px] bg-primary text-[11px] font-bold text-white">FREE</div>
        )}
        <div className="absolute bottom-[12px] left-[12px] text-[12px] font-bold text-white">{formatDate(e?.dates?.start?.localDate)}</div>
      </div>
      <div className="mx-[14px] mt-[12px] line-clamp-2 text-[16px] font-bold text-ink">{e?.name || 'Untitled Event'}</div>
      <div className="mx-[14px] mt-[8px] flex items-center gap-[5px]">
        <MapPinEllipse />
        <span className="truncate text-[13px] text-muted">{venueLine(e)}</span>
      </div>
      <button onClick={() => { if (e?.url) window.open(e.url, '_blank', 'noopener'); }}
        className="mx-[14px] mb-[14px] mt-[12px] h-[38px] w-[calc(100%-28px)] rounded-[8px] bg-primary text-[13px] font-bold text-white">
        Get Tickets
      </button>
    </div>
  );
}

const MapPinEllipse = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#0384B3" strokeWidth={2.2} strokeLinecap="round" className="shrink-0">
    <path d="M12 17s-5-4.6-5-9a5 5 0 0 1 10 0c0 4.4-5 9-5 9z" /><circle cx="12" cy="8" r="1.8" />
    <path d="M7.5 16.2C4.8 16.7 3 17.6 3 18.6 3 20.2 7 21.5 12 21.5s9-1.3 9-2.9c0-1-1.8-1.9-4.5-2.4" />
  </svg>
);
