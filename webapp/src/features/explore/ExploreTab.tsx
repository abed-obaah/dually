// Explore tab root (ExploreViewController + ExploreAndroidParity / LiveNowAndroidParity).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { useSession } from '../../lib/session';
import { store } from '../../lib/storage';
import { idOf } from '../../lib/format';
import { Avatar, EmptyState } from '../../ui/chrome';
import { Img, SF } from '../../ui/icons';
import { showAlert } from '../../ui/overlays';
import Segmented from './Segmented';
import EventsView from './EventsView';
import PeopleSearch, { SearchPill } from './PeopleSearch';
import { hud, matchesName, matchesText, queryKey, seenStoryIds, truncQ } from './lib';
import type { StoryItem } from './StoryViewer';

type FriendEntry = { friend: any; statuses: any[] };

export default function ExploreTab({ active }: { active: boolean }) {
  const nav = useNav();
  const { profile } = useSession();
  const [section, setSection] = useState(0); // 0 Popular, 1 Live Now, 2 Events
  const [eventsMounted, setEventsMounted] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  // ---------- search ----------
  const [text, setText] = useState('');
  const [query, setQuery] = useState(''); // applied (debounced 0.4 s) text
  useEffect(() => {
    if (text === query) return;
    const t = setTimeout(() => setQuery(text), 400);
    return () => clearTimeout(t);
  }, [text, query]);
  const key = queryKey(query);
  const [peopleSearch, setPeopleSearch] = useState<string | null>(null);

  // ---------- stories ----------
  const [myStories, setMyStories] = useState<any[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [seen, setSeen] = useState<Set<string>>(() => seenStoryIds());
  const storyPage = useRef({ page: 1, hasMore: false, loading: false, gen: 0 });

  const loadFriends = useCallback(async (page: number) => {
    const sp = storyPage.current;
    if (page === 1) { sp.gen++; sp.loading = false; }
    if (sp.loading) return;
    sp.loading = true;
    const gen = sp.gen;
    try {
      const call = () => api('api/v1/user/status/friends/get', { query: { page, limit: 10 } });
      const r = page === 1 ? await hud(call) : await call();
      if (gen !== sp.gen) return;
      const list: FriendEntry[] = (Array.isArray(r?.data) ? r.data : [])
        .filter((d: any) => d?.friend)
        .map((d: any) => ({ friend: d.friend, statuses: Array.isArray(d.statuses) ? d.statuses : [] }));
      setFriends((prev) => {
        const base = page === 1 ? [] : prev.map((x) => ({ ...x, statuses: [...x.statuses] }));
        for (const e of list) {
          const fid = idOf(e.friend);
          const existing = base.find((x) => idOf(x.friend) === fid);
          if (existing) existing.statuses.push(...e.statuses);
          else base.push({ ...e, statuses: [...e.statuses] });
        }
        return base.filter((x) => x.statuses.length > 0);
      });
      sp.page = page;
      const p = r?.pagination;
      sp.hasMore = !!p && Number(p.currentPage ?? page) < Number(p.totalPages ?? 0);
    } catch { /* silent */ }
    finally { if (gen === sp.gen) sp.loading = false; }
  }, []);

  const loadMine = useCallback(async () => {
    try {
      const r = await hud(() => api('api/v1/user/status'));
      setMyStories(Array.isArray(r?.data) ? r.data : []);
    } catch { setMyStories([]); }
  }, []);

  // ---------- popular ----------
  const [posts, setPosts] = useState<any[]>([]);
  const [popularLoaded, setPopularLoaded] = useState(false);
  const pop = useRef({ page: 0, hasMore: true, loading: false, gen: 0 });

  const loadPopular = useCallback(async (reset = false) => {
    const p = pop.current;
    if (reset) { p.gen++; p.page = 0; p.hasMore = true; p.loading = false; setPosts([]); setPopularLoaded(false); }
    if (p.loading || !p.hasMore) return;
    p.loading = true;
    const gen = p.gen, page = p.page + 1;
    try {
      const r = await api('api/v1/user/posts/getMostLikedPosts/Today', { query: { page, limit: 10 } });
      if (gen !== p.gen) return;
      const list: any[] = Array.isArray(r?.data) ? r.data : [];
      setPosts((prev) => {
        const ids = new Set(prev.map((x) => x?._id));
        return [...prev, ...list.filter((x) => x?._id && !ids.has(x._id) && ids.add(x._id))];
      });
      p.page = page;
      const pg = r?.pagination;
      p.hasMore = !!pg && Number(pg.currentPage ?? page) < Number(pg.totalPages ?? 0);
    } catch {
      if (gen === p.gen) p.hasMore = false;
    } finally {
      if (gen === p.gen) { p.loading = false; setPopularLoaded(true); }
    }
  }, []);

  // ---------- live ----------
  const [lives, setLives] = useState<any[]>([]);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const live = useRef({ page: 0, hasMore: true, loading: false, gen: 0 });
  const loadLive = useCallback(async (reset: boolean, silent = true) => {
    const l = live.current;
    if (reset) { l.gen++; l.page = 0; l.hasMore = true; l.loading = false; }
    if (l.loading || !l.hasMore) return;
    l.loading = true;
    const gen = l.gen, page = l.page + 1;
    try {
      const call = () => api('api/v1/user/live', { query: { page, limit: 10 } });
      const r = silent ? await call() : await hud(call);
      if (gen !== l.gen) return;
      const list: any[] = Array.isArray(r?.data) ? r.data : [];
      setLives((prev) => {
        const base = page === 1 ? [] : prev;
        const ids = new Set(base.map((x) => x?._id));
        return [...base, ...list.filter((x) => x?._id && !ids.has(x._id) && ids.add(x._id))];
      });
      l.page = page;
      const pg = r?.pagination;
      l.hasMore = !!pg && Number(pg.currentPage ?? page) < Number(pg.totalPages ?? 0);
    } catch {
      if (gen === l.gen) { l.hasMore = false; if (page === 1) setLives([]); }
    } finally {
      if (gen === l.gen) { l.loading = false; setLiveLoaded(true); }
    }
  }, []);

  // viewWillAppear: reload everything (lists are cleared first, like iOS).
  useEffect(() => {
    if (!active) return;
    setSeen(seenStoryIds());
    loadMine();
    loadFriends(1);
    loadPopular(true);
    loadLive(true, false);
  }, [active, loadMine, loadFriends, loadPopular, loadLive]);

  // Live auto-refresh every 20 s while visible and in the foreground.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') loadLive(true, true);
    }, 20000);
    return () => clearInterval(id);
  }, [active, loadLive]);

  // While a query is active, fetch every remaining Popular page.
  useEffect(() => {
    if (key && popularLoaded && pop.current.hasMore && !pop.current.loading) loadPopular();
  }, [key, posts, popularLoaded, loadPopular]);

  const filteredPosts = useMemo(
    () => (key ? posts.filter((p) => matchesName(p?.user?.fullName, key) || matchesText(p?.text, key)) : posts),
    [posts, key],
  );
  const filteredLives = useMemo(
    () => (key ? lives.filter((l) => matchesName(l?.user?.fullName, key)) : lives),
    [lives, key],
  );

  const selectSection = (i: number) => {
    setSection(i);
    if (i === 2) setEventsMounted(true);
  };

  // ---------- story tray ----------
  const myAvatar = store.avatar || profile?.image || myStories[0]?.user?.image || '';
  const unseen = (statuses: any[]) => statuses.some((s) => s?._id && !seen.has(s._id));

  const openMine = () => nav.push('/story/me', { statuses: myStories });
  const openFriend = (i: number) => {
    const items: StoryItem[] = [];
    for (const f of friends.slice(i)) for (const s of f.statuses) items.push({ status: s, friend: f.friend });
    nav.push(`/story/${idOf(friends[i].friend)}`, { items });
  };

  const onTrayScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const sp = storyPage.current;
    if (sp.hasMore && !sp.loading && el.scrollLeft + el.clientWidth > el.scrollWidth - 140) loadFriends(sp.page + 1);
  };

  // ---------- body scroll (pagination) ----------
  const onBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (section === 0 && remaining < el.clientHeight * 2) loadPopular();
    if (section === 1 && remaining < 200) loadLive(false);
  };

  const showTray = myStories.length > 0 || friends.length > 0;
  const eventsBadge = section !== 2 && eventCount > 0 ? (eventCount > 99 ? '99+' : String(eventCount)) : null;
  const searchingMore = !!key && pop.current.hasMore;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-white">
      {/* Header (dark block) */}
      <div className="pt-safe shrink-0 bg-white">
        <div className="rounded-b-[26px] pb-[10px] pt-[8px]" style={{ background: '#0B0B0D' }}>
          <div className="flex h-[36px] items-center justify-between px-[18px]">
            <div className="text-[22px] font-bold text-white">Explore</div>
            <Avatar src={myAvatar} size={36} />
          </div>
          <SearchPill className="mx-[18px] mt-[10px]" value={text} onChange={setText}
            onSubmit={() => setQuery(text)} placeholder="Search names, posts, or events..." />
        </div>
      </div>

      <div className="h-px shrink-0" />
      <div className="mt-[10px] shrink-0">
        {showTray && (
          <div className="no-scrollbar mx-[10px] flex h-[90px] overflow-x-auto overflow-y-hidden" onScroll={onTrayScroll}>
            {myStories.length > 0 && (
              <TrayItem name="Your story" small image={myAvatar} unseen={unseen(myStories)} onClick={openMine} />
            )}
            {friends.map((f, i) => (
              <TrayItem key={idOf(f.friend) || i} name={f.friend?.name ?? ''} image={f.friend?.image} unseen={unseen(f.statuses)} onClick={() => openFriend(i)} />
            ))}
          </div>
        )}

        <div className="mx-[14px] mt-[14px]">
          <Segmented titles={['Popular', 'Live Now', 'Events']} index={section} onChange={selectSection} height={48}
            badges={[null, null, eventsBadge]} />
        </div>

        {key && (
          <div className="mx-[14px] mt-[10px] flex h-[32px] items-center gap-[8px] px-[4px]">
            {section !== 2 && (
              <Chip icon={<SF.calendar size={14} weight={2.3} />} label={`Events for “${truncQ(key)}”`} onClick={() => selectSection(2)} />
            )}
            <Chip icon={<SF.person2 size={15} weight={2.1} />} label={`People named “${truncQ(key)}”`} onClick={() => setPeopleSearch(key)} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="relative min-h-0 flex-1">
        {section === 0 && (
          <div className="no-scrollbar absolute inset-0 overflow-y-auto pb-tabbar" onScroll={onBodyScroll}>
            {popularLoaded && filteredPosts.length === 0 && !searchingMore ? (
              <BodyEmpty title={key ? 'No matching posts' : 'Nothing trending yet'}
                body={key ? `No popular posts match “${key}”.` : 'Popular posts will appear here.'} />
            ) : (
              <div className="mx-[17px] my-[10px] grid grid-cols-2 gap-[10px]">
                {filteredPosts.map((p) => (
                  <GridTile key={p._id} post={p} onClick={() => nav.push(`/post/${p._id}`, { post: p })} />
                ))}
              </div>
            )}
          </div>
        )}
        {section === 1 && (
          <div className="no-scrollbar absolute inset-0 overflow-y-auto pb-tabbar" onScroll={onBodyScroll}>
            {liveLoaded && filteredLives.length === 0 ? (
              <BodyEmpty title={key ? 'No matching streams' : 'Nobody is live'}
                body={key ? `Nobody live matches “${key}”.` : 'Live streams will appear here when they start.'} />
            ) : (
              <div className="mx-[18px] py-[4px]">
                {filteredLives.map((l) => <LiveRow key={l._id} item={l} />)}
              </div>
            )}
          </div>
        )}
        {eventsMounted && (
          <div className="absolute inset-0" style={{ display: section === 2 ? 'block' : 'none' }}>
            <EventsView keyword={query} onCount={setEventCount} />
          </div>
        )}
      </div>

      {peopleSearch !== null && <PeopleSearch initial={peopleSearch} onClose={() => setPeopleSearch(null)} />}
    </div>
  );
}

function TrayItem({ name, image, unseen, onClick, small }: { name: string; image?: string; unseen: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button onClick={onClick} className="relative h-[90px] w-[70px] shrink-0">
      <div className="absolute left-[5px] top-[2px] h-[60px] w-[60px] rounded-full"
        style={{
          padding: unseen ? 3 : 1.5,
          background: unseen ? 'linear-gradient(45deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5)' : '#C7C7CC',
        }}>
        <div className="h-full w-full overflow-hidden rounded-full bg-white" style={{ padding: 2.5 }}>
          <Avatar src={image} size={unseen ? 49 : 52} />
        </div>
      </div>
      <div className="absolute left-[10px] right-[10px] top-[66px] truncate text-center text-black"
        style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: small ? 10.5 : 12, lineHeight: '15px' }}>
        {name}
      </div>
    </button>
  );
}

function Chip({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-[32px] min-w-0 items-center gap-[6px] rounded-full px-[12px] text-primary" style={{ background: '#EFF2F4' }}>
      <span className="shrink-0">{icon}</span>
      <span className="truncate text-[13px] font-medium">{label}</span>
    </button>
  );
}

function BodyEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
      <EmptyState glyph="searching_magni" title={title} body={body} />
    </div>
  );
}

function GridTile({ post, onClick }: { post: any; onClick: () => void }) {
  const media = post?.video ? post?.thumbnail || post?.image : post?.image || post?.thumbnail;
  const src = typeof media === 'string' ? media : '';
  return (
    <button onClick={onClick} className="relative w-full overflow-hidden rounded-[18px]" style={{ aspectRatio: '1 / 1.45', background: '#EFF2F4' }}>
      {src && <img src={src} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute left-[10px] top-[10px] h-[34px] w-[34px]">
        <Avatar src={post?.user?.image} size={34} border="2px solid #fff" />
        <Img name="android_addicon" size={22} className="absolute left-[6px] top-[23px]" />
      </div>
    </button>
  );
}

function LiveRow({ item }: { item: any }) {
  const name = (item?.user?.fullName ?? '').trim();
  return (
    <button onClick={() => showAlert('Coming soon on the web.')} className="flex h-[64px] w-full items-center text-left">
      <div className="relative ml-[6px] h-[46px] w-[46px] shrink-0 rounded-full p-[2px]" style={{ background: '#FF2D55' }}>
        <Avatar src={item?.user?.image} size={42} />
        <div className="absolute left-1/2 flex h-[15px] w-[30px] -translate-x-1/2 items-center justify-center rounded-[3px] text-[8px] font-bold text-white"
          style={{ background: '#FF3B30', top: 46 + 3 - 15 }}>LIVE</div>
      </div>
      <div className="ml-[12px] flex min-w-0 flex-1 flex-col gap-[2px]">
        <div className="truncate text-[14px] text-ink">{name ? `${name} is live now.` : 'Someone is live now.'}</div>
        <div className="text-[11px] text-caption">Live now</div>
      </div>
      <div className="mr-[6px] flex h-[34px] w-[72px] shrink-0 items-center justify-center rounded-[17px] bg-primary text-[12px] font-bold text-white">Join</div>
    </button>
  );
}
