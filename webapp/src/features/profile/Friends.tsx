// Friends (§4, FriendsViewController) and Friend's friends (§5, FriendFriendsViewController).
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useNav } from '../../lib/nav';
import { store } from '../../lib/storage';
import { Hud, showAlert } from '../../ui/overlays';
import { Avatar } from '../../ui/chrome';
import { HELV, LegacyBar, errMsg } from './ui';

function FriendRow({ u, onClick }: { u: any; onClick?: () => void }) {
  const count = Array.isArray(u?.friends) ? u.friends.length : 0;
  return (
    <div onClick={onClick} className={`relative flex h-[80px] items-center bg-white ${onClick ? 'cursor-pointer' : ''}`} style={{ fontFamily: HELV }}>
      <Avatar src={u?.image} size={50} className="ml-[20px]" />
      <div className="ml-[10px] mr-[20px] flex h-[50px] min-w-0 flex-1 flex-col justify-start">
        <div className="truncate text-[18px] leading-[22px] text-black">{u ? (u.fullName ?? '') : 'N/A'}</div>
        <div className="flex items-baseline">
          <span className="text-[18px] leading-[22px] text-black">{count}</span>
          <span className="ml-[5px] text-[14px] text-[#434343]">Friends</span>
        </div>
      </div>
      <span className="absolute bottom-0 left-[20px] right-0 h-px bg-[#C6C6C8]/60" />
    </div>
  );
}

const userOf = (entry: any) => {
  const u = entry?.users?.[0]?.user;
  return u && typeof u === 'object' ? u : null;
};

/** `/profile/friends` — my friends. */
export function MyFriends() {
  const nav = useNav();
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    Hud.show();
    api('api/v1/user/getAllFriends')
      .then((r) => setRows(Array.isArray(r?.data) ? r.data : []))
      .catch((e) => { setRows([]); showAlert(errMsg(e)); })
      .finally(() => Hud.dismiss());
  }, []);
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-white">
      <LegacyBar title="Friends" fallback="/profile" />
      <div className="relative min-h-0 flex-1 overflow-y-auto pb-tabbar">
        {rows?.map((d, i) => {
          const u = userOf(d);
          return (
            <FriendRow key={u?._id ?? i} u={u} onClick={u?._id ? () => nav.push(u._id === store.userID ? '/profile' : `/user/${u._id}/friends`) : undefined} />
          );
        })}
        {rows && rows.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[18px] font-medium text-[#8E8E93]">No friends</div>
        )}
      </div>
    </div>
  );
}

/** `/user/:id/friends` — another user's friends (rows not tappable). */
export function UserFriends() {
  const { id = '' } = useParams();
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    Hud.show();
    api(`api/v1/user/getAllFriends/user/${id}`)
      .then((r) => setRows(Array.isArray(r?.data?.friends) ? r.data.friends : []))
      .catch((e) => { setRows([]); showAlert(errMsg(e)); })
      .finally(() => Hud.dismiss());
  }, [id]);
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-white">
      <LegacyBar title="Friends" fallback="/profile" />
      <div className="relative min-h-0 flex-1 overflow-y-auto pb-tabbar">
        {rows?.map((d, i) => <FriendRow key={userOf(d)?._id ?? i} u={userOf(d)} />)}
        {/* Web fix: iOS never un-hides this label (list is just blank). */}
        {rows && rows.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[18px] font-medium text-[#8E8E93]">No friends</div>
        )}
      </div>
    </div>
  );
}
