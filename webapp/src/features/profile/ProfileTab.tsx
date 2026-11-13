// My Profile (ProfileViewController + ProfileAndroidParity, specs/03 §1).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import { session, useSession } from '../../lib/session';
import { store } from '../../lib/storage';
import { useNav } from '../../lib/nav';
import { Hud, showAlert } from '../../ui/overlays';
import { SF } from '../../ui/icons';
import {
  CameraEmpty, HELV, IconTabs, Layer, Sym, TileGrid, bucketPosts, errMsg, friendsCount, handleOf, postCount,
  shareProfile, sortNewest, toTile, useMediaViewer, type TileItem,
} from './ui';

const EMPTY = [
  { title: 'No posts yet', body: 'Photos you share will show up here.' },
  { title: 'No posts yet', body: 'Videos you share will show up here.' },
  { title: 'No stories yet', body: 'Stories you post will show up here.' },
];

export default function ProfileTab({ active }: { active: boolean }) {
  const nav = useNav();
  const { profile } = useSession();
  const [tab, setTab] = useState(0);
  const [unread, setUnread] = useState(0);
  const [stories, setStories] = useState<any[] | null>(null);
  const storiesLoading = useRef(false);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<TileItem | null>(null);
  const viewer = useMediaViewer();

  // On every appear: profile (no HUD) + notifications badge.
  useEffect(() => {
    if (!active) return;
    session.loadProfile().catch((e) => showAlert(errMsg(e)));
    api('api/v1/user/notifications/user')
      .then((r) => {
        const list: any[] = Array.isArray(r?.data) ? r.data : [];
        const n = list.filter((x) => x?.status === 'unread').length;
        setUnread(n);
        session.setUnread(n > 0);
      })
      .catch(() => {});
  }, [active]);

  const loadStories = useCallback(() => {
    if (stories || storiesLoading.current) return;
    storiesLoading.current = true;
    api('api/v1/user/status')
      .then((r) => setStories(Array.isArray(r?.data) ? r.data : []))
      .catch(() => { /* retried on next selection */ })
      .finally(() => { storiesLoading.current = false; });
  }, [stories]);

  useEffect(() => { if (tab === 2) loadStories(); }, [tab, loadStories]);

  const user = profile;
  const photos = useMemo(() => sortNewest(bucketPosts(user?.allImagePost)).map((p) => toTile(p, true)).filter((t) => !removed.has(t.id)), [user, removed]);
  const videos = useMemo(() => sortNewest(bucketPosts(user?.allVideoPost)).map((p) => toTile(p, true)).filter((t) => !removed.has(t.id)), [user, removed]);
  const storyTiles = useMemo(() => (stories ?? []).map((s) => toTile(s, true)), [stories]);
  const tiles = tab === 0 ? photos : tab === 1 ? videos : storyTiles;

  const posts = user ? postCount(user) - countRemoved(user, removed) : 0;
  const friends = friendsCount(user);
  const name: string = user?.fullName ?? '';
  const bio: string = (user?.bio ?? '').trim();
  const avatar = user?.image || store.avatar || '';

  const doDelete = async (t: TileItem) => {
    setConfirm(null);
    Hud.show();
    try {
      await api(`api/v1/user/posts/${t.id}`, { method: 'DELETE' });
      setRemoved((s) => new Set(s).add(t.id)); // instant tile removal
      await session.loadProfile();
      setRemoved(new Set());
    } catch (e) {
      setRemoved(new Set());
      Hud.dismiss();
      showAlert(errMsg(e));
      return;
    }
    Hud.dismiss();
  };

  const openTile = (t: TileItem, i: number) => {
    if (tab === 2) nav.push('/story/me', { index: i, statuses: stories });
    else viewer.open(t);
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-white">
      {/* 1.1 app bar */}
      <div className="pt-safe shrink-0 bg-white">
        <div className="relative flex h-[80px] items-center justify-center">
          <button aria-label="Cart" onClick={() => nav.push('/settings/cart')} className="absolute left-[16px] top-1/2 h-[30px] w-[30px] -translate-y-1/2">
            <img src="/app/img/cart.png" alt="" className="h-full w-full object-contain" />
          </button>
          <div className="text-[20px] font-bold text-ink">Profile</div>
          <button aria-label="Notifications" onClick={() => nav.push('/notifications')} className="absolute right-[16px] top-1/2 h-[30px] w-[30px] -translate-y-1/2">
            <img src="/app/img/ic_bell.png" alt="" className="h-full w-full object-contain" />
            {unread > 0 && (
              <span className="absolute left-[22px] top-[2px] text-[10px] font-medium leading-none text-[#FF3B30]">{unread}</span>
            )}
          </button>
        </div>
      </div>

      {/* 1.2 header */}
      <div className="shrink-0 px-[24px] pt-[16px]">
        <div className="flex flex-col items-center">
          <div className="relative h-[96px] w-[96px]">
            <img src={avatar || '/app/img/no_profile.png'} alt="" onError={(e) => { e.currentTarget.src = '/app/img/no_profile.png'; }}
              className="h-[96px] w-[96px] rounded-full object-cover" />
            {user?.verifiedBy != null && <img src="/app/img/ic_verified.png" alt="" className="absolute bottom-0 right-0 h-[24px] w-[24px]" />}
          </div>
          <div className="mt-[12px] min-h-[20px] text-center text-[17px] font-bold text-ink">{name}</div>
          <div className="mt-[2px] min-h-[18px] text-center text-[15px] text-muted">{handleOf(name)}</div>
          <div className="mt-[18px] flex w-full">
            <div className="flex flex-1 flex-col items-center gap-[2px]">
              <span className="text-[17px] font-bold text-ink">{posts}</span>
              <span className="text-[13px] text-caption">{posts > 1 ? 'Posts' : 'Post'}</span>
            </div>
            <button onClick={() => nav.push('/profile/friends')} className="flex flex-1 flex-col items-center gap-[2px]">
              <span className="text-[17px] font-bold text-ink">{friends}</span>
              <span className="text-[13px] text-caption">{friends > 1 ? 'Friends' : 'Friend'}</span>
            </button>
          </div>
          <div className="mt-[16px] flex gap-[8px]">
            <button onClick={() => nav.push('/profile/edit')}
              className="h-[46px] w-[190px] rounded-[6px] border border-[#E1E4E8] bg-white text-[15px] text-ink">Edit profile</button>
            <button aria-label="Share" onClick={() => shareProfile(user?._id || store.userID)}
              className="flex h-[46px] w-[46px] items-center justify-center rounded-[6px] border border-[#E1E4E8] bg-white text-ink">
              <SF.share size={20} weight={1.8} />
            </button>
          </div>
          <div className={`mt-[14px] w-full whitespace-pre-wrap break-words text-center text-[14px] ${bio ? 'text-ink' : 'text-caption'}`}>
            {bio || 'Tap to add bio'}
          </div>
        </div>
      </div>

      {/* 1.3 tabs */}
      <div className="mt-[10px]">
        <IconTabs selected={tab} onSelect={setTab}
          icons={[<Sym.decrease key="p" size={24} />, <Sym.video key="v" size={24} />, <Sym.smallcircle key="s" size={24} />]} />
      </div>

      {/* 1.4 grid */}
      <div className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto px-[15px] pb-tabbar">
        {tiles.length > 0
          ? <TileGrid key={tab} tiles={tiles} onOpen={openTile} onDelete={tab === 2 ? undefined : (t) => setConfirm(t)} />
          : <CameraEmpty title={EMPTY[tab].title} body={EMPTY[tab].body} />}
      </div>

      {viewer.node}
      {confirm && <DeleteDialog onCancel={() => setConfirm(null)} onDelete={() => doDelete(confirm)} />}
    </div>
  );
}

function countRemoved(user: any, removed: Set<string>) {
  if (!removed.size) return 0;
  const ids = [...bucketPosts(user?.allImagePost), ...bucketPosts(user?.allVideoPost)].map((p) => p?._id);
  return ids.filter((id) => removed.has(id)).length;
}

/** §1.8 Delete Post dialog — above everything incl. the floating tab bar. */
function DeleteDialog({ onCancel, onDelete }: { onCancel: () => void; onDelete: () => void }) {
  return (
    <Layer z={650}>
      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
        <div className="flex h-[200px] w-[250px] flex-col overflow-hidden rounded-[10px] bg-white text-center" style={{ fontFamily: HELV }}>
          <div className="flex h-[50px] shrink-0 items-center justify-center text-[17px] font-bold text-black">Delete Post?</div>
          <div className="flex h-[50px] shrink-0 items-center justify-center px-[6px] text-[16px] leading-[19px] text-black">
            Are you sure you want to delete this post permanent?
          </div>
          <button onClick={onDelete} className="h-[50px] shrink-0 border-t border-[#AAAAAA] text-[16px] font-medium text-[#0484B3]">Delete</button>
          <button onClick={onCancel} className="h-[50px] shrink-0 border-t border-[#AAAAAA] text-[16px] font-medium text-[#0484B3]">Cancel</button>
        </div>
      </div>
    </Layer>
  );
}
