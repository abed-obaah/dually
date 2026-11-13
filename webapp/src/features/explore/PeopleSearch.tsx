// People-search overlay (ExploreSearchAndroidParity): dark header with back +
// "Search", recent searches, searchUser results.
import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { Avatar } from '../../ui/chrome';
import { Img, SF } from '../../ui/icons';
import { hud, isMe, isVerified } from './lib';

const profileCache = new Map<string, any>();

export default function PeopleSearch({ initial, onClose }: { initial: string; onClose: () => void }) {
  const nav = useNav();
  const [text, setText] = useState(initial);
  const [results, setResults] = useState<any[] | null>(null); // null = show recents
  const [recents, setRecents] = useState<any[]>([]);
  const [recentsLoaded, setRecentsLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqSeq = useRef(0);

  useEffect(() => {
    api('api/v1/user/recent-search', { query: { page: 1, limit: 2 } })
      .then((r) => setRecents(Array.isArray(r?.data?.docs) ? r.data.docs : []))
      .catch(() => {})
      .finally(() => setRecentsLoaded(true));
  }, []);

  useEffect(() => {
    const q = text.trim().replace(/^@+/, '').trim();
    if (!q) { reqSeq.current++; setResults(null); return; }
    const seq = ++reqSeq.current;
    const t = setTimeout(() => {
      hud(() => api('api/v1/user/searchUser', { query: { search: q } }))
        .then((r) => { if (seq === reqSeq.current) setResults(Array.isArray(r?.data?.docs) ? r.data.docs : []); })
        .catch(() => { if (seq === reqSeq.current) setResults([]); });
    }, initial && text === initial ? 0 : 1000);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (id: string) => {
    if (!id) return;
    nav.push(isMe(id) ? '/profile' : `/user/${id}`);
  };

  const showingRecents = results === null;
  const empty = showingRecents ? recentsLoaded && recents.length === 0 : results.length === 0;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-white anim-fade">
      <div className="pt-safe shrink-0 rounded-b-[26px]" style={{ background: '#0B0B0D' }}>
        <div className="relative h-[118px]">
          <button aria-label="Back" onClick={onClose} className="absolute left-[12px] top-[8px] flex h-[35px] w-[35px] items-center justify-center text-white">
            <SF.chevronLeft size={24} weight={2.4} />
          </button>
          <div className="absolute right-[18px] top-[8px] flex h-[35px] items-center text-[22px] font-bold text-white">Search</div>
          <SearchPill inputRef={inputRef} className="absolute left-[18px] right-[18px] top-[53px]" value={text} onChange={setText}
            placeholder="Search people, posts..." onSubmit={() => {}} />
        </div>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-white pb-tabbar">
        <div className="flex h-[50px] items-center px-[18px] text-[18px] font-bold text-ink">{showingRecents ? 'Recent Searches' : 'Accounts'}</div>
        {empty && <div className="pt-[60px] text-center text-[18px] text-[#AAAAAA]">No Data Found</div>}
        {showingRecents
          ? recents.map((r, i) => <RecentRow key={r?._id ?? i} doc={r} onOpen={open} />)
          : results!.map((u, i) => <UserRow key={u?._id ?? i} user={u} onOpen={open} />)}
      </div>
    </div>
  );
}

export function SearchPill({ value, onChange, onSubmit, placeholder, className = '', inputRef }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; placeholder: string; className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const local = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? local;
  return (
    <div onClick={() => ref.current?.focus()} className={`flex h-[44px] items-center rounded-[22px] ${className}`} style={{ background: '#1B1E21' }}>
      <span className="ml-[18px] shrink-0" style={{ color: '#8A9299' }}><SF.magnifyingglass size={18} weight={2.2} /></span>
      <form className="ml-[12px] mr-[12px] flex min-w-0 flex-1 items-center" onSubmit={(e) => { e.preventDefault(); ref.current?.blur(); onSubmit(); }}>
        <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          type="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          className="explore-search min-w-0 flex-1 bg-transparent text-[14px] text-white caret-white outline-none placeholder:text-[#8A9299]" />
        {value && (
          <button type="button" aria-label="Clear" onClick={(e) => { e.stopPropagation(); onChange(''); onSubmit(); }}
            className="ml-[6px] flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full" style={{ background: '#8A9299', color: '#1B1E21' }}>
            <SF.xmark size={10} weight={3} />
          </button>
        )}
      </form>
      <style>{'.explore-search::-webkit-search-cancel-button{-webkit-appearance:none;display:none}'}</style>
    </div>
  );
}

function plural(n: number, one: string) { return `${n} ${n > 1 ? one + 's' : one}`; }

function UserRow({ user, onOpen }: { user: any; onOpen: (id: string) => void }) {
  const friends = Number(user?.friendCount ?? 0) || 0;
  const posts = Number(user?.postCount ?? 0) || 0;
  return (
    <button onClick={() => onOpen(user?._id ?? '')} className="flex w-full items-center px-[18px] py-[10px] text-left">
      <Avatar src={user?.image} size={50} />
      <div className="ml-[12px] min-w-0 flex-1">
        <div className="flex items-center gap-[5px]">
          <span className="truncate text-[16px] font-semibold text-ink">{user?.fullName ?? ''}</span>
          {isVerified(user) && <Img name="ic_verified" size={16} />}
        </div>
        <div className="mt-[2px] text-[13px] text-muted">{plural(friends, 'Friend')}&nbsp;&nbsp;{plural(posts, 'Post')}</div>
      </div>
      <span className="ml-[8px] flex h-[18px] w-[12px] items-center justify-center text-muted"><SF.chevronRight size={14} weight={2.4} /></span>
    </button>
  );
}

function RecentRow({ doc, onOpen }: { doc: any; onOpen: (id: string) => void }) {
  const uid: string = typeof doc?.user === 'string' ? doc.user : doc?.user?._id ?? '';
  const [p, setP] = useState<any>(() => profileCache.get(uid) ?? (typeof doc?.user === 'object' ? doc.user : null));
  useEffect(() => {
    if (!uid || profileCache.has(uid)) return;
    api(`api/v1/user/profile/${uid}`).then((r) => {
      const d = r?.data?.user ?? r?.data ?? null;
      const bucketLen = (b: any) => (Array.isArray(b) ? b[0]?.posts?.length ?? 0 : 0);
      const merged = d ? {
        ...d,
        friendCount: d.friendCount ?? (Array.isArray(d.friends)
          ? (Array.isArray(d.friends[0]?.users) ? d.friends.reduce((n: number, b: any) => n + (b?.users?.length ?? 0), 0) : d.friends.length)
          : 0),
        postCount: d.postCount ?? bucketLen(d.allImagePost) + bucketLen(d.allVideoPost),
      } : null;
      if (merged) { profileCache.set(uid, merged); setP(merged); }
    }).catch(() => {});
  }, [uid]);
  return <UserRow user={{ ...(p ?? {}), _id: uid, fullName: p?.fullName ?? doc?.searchQuery ?? '' }} onOpen={onOpen} />;
}
