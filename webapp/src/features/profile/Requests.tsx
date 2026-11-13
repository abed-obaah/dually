// Follow Request (FollowRequestsViewController, specs/03 §6).
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Hud, showAlert } from '../../ui/overlays';
import { Avatar } from '../../ui/chrome';
import { Bar, errMsg } from './ui';

function sentAgo(iso?: string) {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return 'Time unknown';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'less than a minute ago';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

export default function Requests() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [leaving, setLeaving] = useState<Set<string>>(new Set());

  useEffect(() => {
    Hud.show();
    api('api/v1/user/getFriendRequests')
      .then((r) => setRows(Array.isArray(r?.data) ? r.data : []))
      .catch((e) => { setRows([]); showAlert(errMsg(e)); })
      .finally(() => Hud.dismiss());
  }, []);

  const confirm = async (req: any) => {
    const id = req._id;
    if (titles[id]) return;
    setTitles((t) => ({ ...t, [id]: 'Follow Back' }));
    Hud.show();
    try {
      await api('api/v1/user/acceptFriendRequest', { method: 'POST', body: { requestId: id } });
      setTitles((t) => ({ ...t, [id]: 'Requested' }));
    } catch (e) {
      setTitles((t) => { const n = { ...t }; delete n[id]; return n; });
      showAlert(errMsg(e));
    } finally { Hud.dismiss(); }
  };

  const decline = async (req: any) => {
    const id = req._id;
    Hud.show();
    try {
      await api('api/v1/user/rejectFriendRequest', { method: 'POST', body: { requestId: id } });
      setLeaving((s) => new Set(s).add(id));
      setTimeout(() => setRows((r) => (r ?? []).filter((x) => x._id !== id)), 250);
    } catch (e) { showAlert(errMsg(e)); } finally { Hud.dismiss(); }
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-white">
      <Bar title="Follow Request" fallback="/notifications" />
      <div className="relative min-h-0 flex-1 overflow-y-auto pb-tabbar">
        {rows?.map((req) => {
          const name: string = req?.requester?.fullName ?? '';
          const gone = leaving.has(req._id);
          return (
            <div key={req._id} className="relative flex min-h-[106px] items-center overflow-hidden bg-white transition-all duration-200"
              style={{ opacity: gone ? 0 : 1, transform: gone ? 'translateX(-30px)' : undefined }}>
              <Avatar src={req?.requester?.image} size={50} className="ml-[15px]" />
              <div className="ml-[10px] w-[168px] py-[10px] leading-[19px]">
                <span className="text-[16px] font-bold text-black">{name}</span>{' '}
                <span className="text-[14px] font-medium text-[#555555]/80">sent a follow request.</span>{' '}
                <span className="text-[14px] text-[#AAAAAA]">{sentAgo(req?.sentAt)}</span>
              </div>
              <button onClick={() => confirm(req)}
                className="ml-auto h-[29px] w-[80px] shrink-0 rounded-[5px] bg-[#0484B3] text-[14px] text-white">
                {titles[req._id] ?? 'Confirm'}
              </button>
              <button aria-label="Decline" onClick={() => decline(req)} className="ml-[10px] mr-[20px] flex h-[30px] w-[30px] shrink-0 items-center justify-center bg-white">
                <img src="/app/img/ic_cross.png" alt="" className="h-full w-full object-contain" />
              </button>
            </div>
          );
        })}
        {rows && rows.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[16px] text-[#8E8E93]">No Friend Requests</div>
        )}
      </div>
    </div>
  );
}
