// Other person's profile — one layout for FriendProfile / SearchPersonProfile /
// SerchingUser view controllers (specs/03 §2).
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { store } from '../../lib/storage';
import { useNav } from '../../lib/nav';
import { useSession } from '../../lib/session';
import { Hud, showAlert } from '../../ui/overlays';
import { SF } from '../../ui/icons';
import { Avatar } from '../../ui/chrome';
import {
  Bar, CameraEmpty, HELV, IconTabs, Layer, Sym, TileGrid, bucketPosts, errMsg, friendsCount, handleOf, postCount,
  shareProfile, sortNewest, toTile, useMediaViewer,
} from './ui';

type Follow = { title: 'Follow' | 'Requested' | 'Following' | 'Blocked'; white: boolean; enabled: boolean };
const BLUE: Follow = { title: 'Follow', white: false, enabled: true };

export default function UserProfileRoute() {
  const { id = '' } = useParams();
  if (id && id === store.userID) return <Navigate to="/profile" replace />;
  return <UserProfile key={id} id={id} />;
}

function UserProfile({ id }: { id: string }) {
  const nav = useNav();
  const loc = useLocation();
  const { reportedIds } = useSession();
  // Optional model handed over by the caller ({user, isFriend, isBlocked}) for an instant first paint.
  const seed = (loc.state as any)?.user ? (loc.state as any) : null;
  const [user, setUser] = useState<any>(seed?.user ?? null);
  const [follow, setFollow] = useState<Follow>(() => initialFollow(seed));
  const [blocked, setBlocked] = useState<boolean>(!!seed?.isBlocked);
  const [tab, setTab] = useState(0);
  const [menu, setMenu] = useState(false);
  const [blockSheet, setBlockSheet] = useState(false);
  const [unblock, setUnblock] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const viewer = useMediaViewer();

  useEffect(() => {
    let alive = true;
    api(`api/v1/user/profile/${id}`)
      .then(async (r) => {
        if (!alive) return;
        const d = r?.data ?? {};
        setUser(d.user ?? null);
        setBlocked(!!d.isBlocked);
        let f = initialFollow(d);
        if (!d.isBlocked && !d.isFriend) {
          try {
            const q = await api(`api/v1/user/getFriendRequests/user/${id}`);
            const list: any[] = Array.isArray(q?.data) ? q.data : [];
            if (list.some((x) => x?.requester?._id === store.userID && x?.status === 'PENDING')) {
              f = { title: 'Requested', white: true, enabled: false };
            }
          } catch { /* 404 = none */ }
        }
        if (alive) setFollow(f);
      })
      .catch((e) => { if (alive) showAlert(errMsg(e)); });
    return () => { alive = false; };
  }, [id]);

  const name: string = user?.fullName ?? '';
  const photos = useMemo(() => sortNewest(bucketPosts(user?.allImagePost)).filter((p) => !reportedIds.has(p._id)).map((p) => toTile(p, false)), [user, reportedIds]);
  const videos = useMemo(() => sortNewest(bucketPosts(user?.allVideoPost)).filter((p) => !reportedIds.has(p._id)).map((p) => toTile(p, false)), [user, reportedIds]);
  const tiles = tab === 0 ? photos : videos;

  const onFollow = async () => {
    if (!follow.enabled) return;
    if (follow.title === 'Blocked') { setUnblock(true); return; }
    if (follow.title === 'Following') {
      try {
        const r = await withHud(() => api('api/v1/user/unfriend-from-list', { method: 'POST', body: { friendId: id } }));
        if (r?.status === 200 || r?.status === undefined) setFollow(BLUE);
        else showAlert(r?.message || 'Something went wrong');
      } catch (e) { showAlert(errMsg(e)); }
      return;
    }
    if (follow.title === 'Follow') {
      setFollow({ title: 'Follow', white: true, enabled: true });
      try {
        await withHud(() => api('api/v1/user/sendFriendRequest', { method: 'POST', body: { recipientId: id } }));
        setFollow(user?.isPrivateAccount
          ? { title: 'Requested', white: true, enabled: false }
          : { title: 'Following', white: true, enabled: true });
      } catch (e) { showAlert(errMsg(e)); }
    }
  };

  const doBlock = async () => {
    try {
      await withHud(() => api('api/v1/user/blockUser', { method: 'POST', body: { blockUserId: id } }));
      setBlockSheet(false);
      setToast(`${name} is blocked`);
      setTimeout(() => setToast(null), 1000);
      setBlocked(true);
      setFollow({ title: 'Blocked', white: false, enabled: true });
    } catch (e) { showAlert(errMsg(e)); }
  };

  const doUnblock = async () => {
    try {
      await withHud(() => api('api/v1/user/unblockUser', { method: 'POST', body: { unblockUserId: id } }));
      setUnblock(false);
      setBlocked(false);
      setFollow(BLUE);
    } catch (e) { showAlert(errMsg(e)); }
  };

  const followStyle = follow.white
    ? { background: '#FFFFFF', color: '#000000', border: '1px solid #000000' }
    : { background: follow.title === 'Follow' ? '#0484B3' : '#0384B3', color: '#FFFFFF', border: '0' };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-white">
      <Bar title="Profile" fallback="/home"
        right={!blocked ? (
          <button aria-label="More" onClick={() => setMenu(true)} className="flex h-[40px] w-[20px] items-center justify-center text-ink">
            <SF.ellipsis size={22} />
          </button>
        ) : undefined} />

      <div className="shrink-0 px-[24px] pt-[16px]">
        <div className="flex flex-col items-center">
          <Avatar src={user?.image} size={96} />
          <div className="mt-[12px] flex min-h-[20px] items-center justify-center gap-[4px]">
            <span className="text-center text-[17px] font-bold text-ink">{name}</span>
            {user?.verifiedBy != null && user && <img src="/app/img/ic_verified.png" alt="" className="h-[16px] w-[16px]" />}
          </div>
          <div className="mt-[2px] min-h-[18px] text-center text-[15px] text-muted">{handleOf(name)}</div>
          <div className="mt-[18px] flex w-full">
            <div className="flex flex-1 flex-col items-center gap-[2px]">
              <span className="text-[17px] font-bold text-ink">{user ? postCount(user) : 0}</span>
              <span className="text-[13px] text-caption">Posts</span>
            </div>
            <button onClick={() => nav.push(`/user/${id}/friends`)} className="flex flex-1 flex-col items-center gap-[2px]">
              <span className="text-[17px] font-bold text-ink">{friendsCount(user)}</span>
              <span className="text-[13px] text-caption">Friends</span>
            </button>
          </div>
          <div className="mt-[16px] flex gap-[8px]">
            <button onClick={onFollow} disabled={!follow.enabled}
              className="h-[46px] w-[190px] rounded-[10px] text-[15px] font-semibold"
              style={{ ...followStyle, opacity: follow.enabled || follow.white ? 1 : 0.4 }}>
              {follow.title}
            </button>
            <button aria-label="Share" onClick={() => shareProfile(id)}
              className="flex h-[46px] w-[46px] items-center justify-center rounded-[10px] border border-black bg-white text-ink">
              <SF.share size={20} weight={1.8} />
            </button>
          </div>
          <div className="mt-[14px] w-full whitespace-pre-wrap break-words text-center text-[14px] text-caption">{(user?.bio ?? '').trim()}</div>
        </div>
      </div>

      {!blocked && (
        <>
          <div className="mt-[10px]">
            <IconTabs selected={tab} onSelect={setTab} icons={[<Sym.grid3 key="g" size={24} />, <Sym.playRect key="v" size={24} />]} />
          </div>
          <div className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto pb-tabbar">
            {tiles.length > 0
              ? <TileGrid key={tab} tiles={tiles} onOpen={(t) => viewer.open(t)} />
              : <CameraEmpty title="No posts yet" body="Photos they share will show up here." />}
          </div>
        </>
      )}

      {viewer.node}
      {menu && <BlockMenu onClose={() => setMenu(false)} onBlock={() => { setMenu(false); setBlockSheet(true); }} />}
      {blockSheet && <BlockSheet user={user} onClose={() => setBlockSheet(false)} onBlock={doBlock} />}
      {unblock && <UnblockDialog name={name} onCancel={() => setUnblock(false)} onUnblock={doUnblock} />}
      {toast && (
        <Layer z={720}>
          <div className="absolute inset-0 bg-black/30">
            <div className="absolute left-1/2 top-[75%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[10px] bg-white px-[10px] py-[5px] text-center text-[16px] font-medium leading-[30px] text-black"
              style={{ fontFamily: HELV }}>{toast}</div>
          </div>
        </Layer>
      )}
    </div>
  );
}

function initialFollow(d: any): Follow {
  if (!d) return BLUE;
  // Web fix: "Blocked" is tappable so the user can reach the Unblock dialog.
  if (d.isBlocked) return { title: 'Blocked', white: false, enabled: true };
  if (d.isFriend) return { title: 'Following', white: false, enabled: true };
  return BLUE;
}

async function withHud<T>(fn: () => Promise<T>) {
  Hud.show();
  try { return await fn(); } finally { Hud.dismiss(); }
}

/** §2.4 Block menu. */
function BlockMenu({ onClose, onBlock }: { onClose: () => void; onBlock: () => void }) {
  return (
    <Layer>
      <div className="anim-fade absolute inset-0 bg-black/30" onClick={onClose}>
        <div className="absolute right-0 h-[40px] w-[90px] rounded-[10px] bg-white"
          style={{ top: 'calc(var(--sat) + 73px)', animation: 'pf-slide-left .3s ease-in-out' }} onClick={(e) => e.stopPropagation()}>
          <button onClick={onBlock} className="absolute left-[5px] top-[5px] h-[30px] w-[80px] text-[18px] font-medium text-[#EB2D2D]" style={{ fontFamily: HELV }}>Block</button>
        </div>
      </div>
      <style>{'@keyframes pf-slide-left{from{transform:translateX(100%)}to{transform:translateX(0)}}'}</style>
    </Layer>
  );
}

/** §2.5 Block confirmation sheet. */
function BlockSheet({ user, onClose, onBlock }: { user: any; onClose: () => void; onBlock: () => void }) {
  const bullets: [string, string][] = [
    ['ic_blocked', 'They won’t be able to message you or find your profile or cintent on Dually'],
    ['ic_silent', 'They won’t be able to notified that you blocked them'],
    ['ic_settings', 'You can unblock them anytime in settings'],
  ];
  return (
    <Layer>
      <div className="anim-sheet absolute inset-0 bg-black/30" onClick={onClose} style={{ fontFamily: HELV }}>
        <div className="absolute inset-x-0 bottom-0 h-[70%] overflow-y-auto bg-white px-[20px] pb-safe" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-center pt-[78px]"><Avatar src={user?.image} size={100} /></div>
          <div className="mt-[25px] text-center text-[20px] font-medium text-black">Blocked {user?.fullName ?? ''}</div>
          <div className="mt-[10px] text-center text-[16px] text-black/60">This will also block any other accounts that they may have create in future</div>
          <div className="mt-[24px] flex flex-col gap-[14px]">
            {bullets.map(([icon, text]) => (
              <div key={icon} className="flex items-start gap-[10px]">
                <img src={`/app/img/${icon}.png`} alt="" className="mt-[1px] h-[20px] w-[20px] shrink-0 object-contain" />
                <div className="text-[16px] text-black">{text}</div>
              </div>
            ))}
          </div>
          <button onClick={onBlock} className="mb-[24px] mt-[50px] h-[50px] w-full rounded-[10px] bg-[#0484B3] text-[20px] font-bold text-white">Block</button>
        </div>
      </div>
    </Layer>
  );
}

/** §2.6 Unblock dialog (hard-coded "Henry Arthur" replaced with the real name — web fix). */
function UnblockDialog({ name, onCancel, onUnblock }: { name: string; onCancel: () => void; onUnblock: () => void }) {
  return (
    <Layer>
      <div className="anim-fade absolute inset-0 flex items-center justify-center bg-black/30" style={{ fontFamily: HELV }}>
        <div className="anim-sheet relative flex h-[282px] w-[250px] flex-col overflow-hidden rounded-[10px] bg-white">
          <div className="px-[10px] pt-[15px] text-center text-[16px] font-medium leading-[20px] text-black">Unblock</div>
          <div className="truncate px-[10px] text-center text-[16px] font-medium leading-[20px] text-black">Blocked {name}</div>
          <div className="mt-[10px] flex-1 px-[10px] text-center text-[14px] leading-[17px] text-black/60">
            {name || 'This user'} and other accounts that they may have or create will now be able to follow and message you on Dually. They won&rsquo;t be notified that you unblovked them
          </div>
          <button onClick={onUnblock} className="h-[51px] shrink-0 border-t border-[#AEAEB2] text-[16px] font-medium text-[#0484B3]">Unblock</button>
          <button onClick={onCancel} className="h-[51px] shrink-0 border-t border-[#AEAEB2] text-[16px] font-medium text-[#0484B3]">Cancel</button>
        </div>
      </div>
    </Layer>
  );
}
