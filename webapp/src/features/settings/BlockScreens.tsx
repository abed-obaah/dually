// Blocked (§5), Comments (§6), Blocked Commenters (§6.1).
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import { idOf } from '../../lib/format';
import { useNav } from '../../lib/nav';
import { DetailPage } from '../../ui/chrome';
import { Img } from '../../ui/icons';
import { showAlert, withHud } from '../../ui/overlays';
import { errMsg, HELVETICA } from './shared';

const NO_PROFILE = '/app/img/no_profile.png';
const listOf = (r: any): any[] => (Array.isArray(r?.data) ? r.data : []);

function Pic({ src, className, style }: { src?: string; className: string; style?: React.CSSProperties }) {
  return (
    <img src={src || NO_PROFILE} alt="" draggable={false} className={`shrink-0 object-cover ${className}`} style={style}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_PROFILE; }} />
  );
}

// ───────────────────────── Blocked ─────────────────────────

export function Blocked() {
  const [list, setList] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    withHud(() => api('api/v1/user/getBlockedUsers'))
      .then((r) => { if (alive) setList(listOf(r)); })
      .catch((e) => { if (alive) { setList([]); showAlert(errMsg(e)); } })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  const unblock = async (user: any) => {
    const uid = idOf(user);
    try {
      await withHud(() => api('api/v1/user/unblockUser', { method: 'POST', body: { unblockUserId: uid } }));
      setList((l) => l.filter((d) => idOf(d?.user) !== uid));
    } catch { /* iOS: silent */ }
  };

  return (
    <DetailPage title="Blocked" bg="#FFFFFF">
      <div className="no-scrollbar">
        {list.map((d, i) => {
          const u = d?.user ?? {};
          return (
            <div key={idOf(u) || i} className="anim-fade relative flex h-[80px] items-center px-[20px]">
              <Pic src={u.image} className="h-[50px] w-[50px] rounded-full" />
              <div className="ml-[10px] min-w-0 flex-1 truncate text-[16px] font-medium text-black" style={HELVETICA}>{u.fullName ?? ''}</div>
              <button onClick={() => unblock(u)} className="ml-[10px] h-[35px] w-[110px] shrink-0 rounded-[10px] bg-[#F0EFEF] text-[18px] font-bold text-black" style={HELVETICA}>
                Unblock
              </button>
              {i < list.length - 1 && <div className="absolute bottom-0 left-[15px] right-0 h-[0.5px] bg-[#C6C6C8]" />}
            </div>
          );
        })}
      </div>
      {loaded && list.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[16px] text-[#808080]">No Blocked Users</div>
      )}
    </DetailPage>
  );
}

// ───────────────────────── Comments ─────────────────────────

export function CommentsPrivacy() {
  const nav = useNav();
  const [list, setList] = useState<any[] | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    withHud(() => api('api/v1/user/getBlockedUsers'))
      .then((r) => { if (!alive) return; const l = listOf(r); setList(l); setCount(l.length); })
      .catch((e) => { if (alive) showAlert(errMsg(e)); });
    return () => { alive = false; };
  }, []);

  // iOS quirk kept: a failed load (count nil) still pushes an empty list.
  const open = () => { if (count !== 0) nav.push('/settings/blocked-commenters', { list: list ?? [] }); };

  return (
    <DetailPage title="Comments">
      <div className="bg-white px-[20px] pb-[20px] pt-[10px]" style={HELVETICA}>
        <div className="flex justify-end">
          <button onClick={open} className="h-[40px] w-[176px] text-center text-[18px] font-medium text-[#AAAAAA]">
            {count ?? 0} People &gt;
          </button>
        </div>
        <div className="mt-[5.67px] text-[18px] font-medium text-black">Block comments from</div>
        <div className="mt-[10px] text-[15px] leading-[18px] text-[#AAAAAA]">
          Use this setting to block comments from specific users or groups. You can prevent certain people from leaving comments on your posts, giving you more control over your interactions. Simply add the users or groups you want to block, and their comments will be hidden from your content.
        </div>
      </div>
    </DetailPage>
  );
}

// ───────────────────────── Blocked Commenters ─────────────────────────

const plural = (n: number, one: string, many: string) => (n <= 1 ? one : many);
const bucketLen = (v: any): number => {
  if (!Array.isArray(v)) return 0;
  // FriendBucket / PostBucket arrays: [{ users|posts: [...] }]; flat arrays otherwise.
  if (v.length && (Array.isArray(v[0]?.users) || Array.isArray(v[0]?.posts))) {
    return v.reduce((n: number, b: any) => n + (b?.users?.length ?? b?.posts?.length ?? 0), 0);
  }
  return v.length;
};

export function BlockedCommenters() {
  const loc = useLocation();
  const passed = (loc.state as { list?: any[] } | null)?.list;
  const [list, setList] = useState<any[]>(passed ?? []);
  const [q, setQ] = useState('');

  // Web: a direct visit/reload has no passed list — load it once instead of showing a blank page.
  useEffect(() => {
    if (passed) return;
    api('api/v1/user/getBlockedUsers').then((r) => setList(listOf(r))).catch(() => {});
  }, [passed]);

  // Web fix: the iOS search box filtered nothing.
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? list.filter((d) => String(d?.user?.fullName ?? '').toLowerCase().includes(t)) : list;
  }, [list, q]);

  return (
    <DetailPage title="Blocked Commenters" bg="#FFFFFF">
      <div className="px-[20px] pt-[20px]">
        <div className="relative flex h-[50px] items-center rounded-[10px] border-2 border-[#F2F2F7] bg-white">
          <Img name="ic_search" size={20} className="absolute left-[10px] top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" type="text"
            className="ml-[38px] h-full min-w-0 flex-1 bg-transparent pr-[10px] text-[17px] text-black outline-none placeholder:text-[#C4C4C6]" />
        </div>
      </div>
      <div style={HELVETICA}>
        {shown.map((d, i) => {
          const u = d?.user ?? {};
          const friends = bucketLen(u.friends);
          const posts = bucketLen(u.allImagePost) + bucketLen(u.allVideoPost);
          return (
            <div key={idOf(u) || i} className="relative min-h-[115px] px-[20px] pb-[20px] pt-[20px]">
              <Pic src={u.image} className="absolute left-[20px] top-[20px] h-[75px] w-[75px]" style={{ borderRadius: 27 }} />
              <div className="ml-[85px]">
                <div className="truncate text-[18px] leading-[22px] text-black">{u.fullName ?? ''}</div>
                <div className="mt-[7px] flex items-center text-black">
                  <span className="text-[18px]">{friends}</span>
                  <span className="ml-[5px] text-[14px] text-[#434343]">{plural(friends, 'Friend', 'Friends')}</span>
                  <span className="mx-[10px] h-[8px] w-[8px] rounded-full bg-black" />
                  <span className="text-[18px]">{posts}</span>
                  <span className="ml-[5px] text-[14px] text-[#434343]">{plural(posts, 'Post', 'Posts')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DetailPage>
  );
}
