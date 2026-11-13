// Notifications list — NotificationViewController + DetailScreensAndroidParity (specs/02 §6).
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { idOf, parseDate, timeAgo } from '../../lib/format';
import { useNav } from '../../lib/nav';
import { session } from '../../lib/session';
import { store } from '../../lib/storage';
import { AppBar } from '../../ui/chrome';
import { img } from '../../ui/icons';
import { Hud, showAlert } from '../../ui/overlays';

const TWO_HOURS = 2 * 60 * 60 * 1000;
const POST_TITLES = ['Like Post', 'comment Post', 'Unlike Post'];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function sectionTitle(d: Date | null): string {
  if (!d) return '';
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return 'Today';
  if (dayKey(d) === dayKey(yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NotificationsScreen() {
  const nav = useNav();
  const [items, setItems] = useState<any[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      Hud.show();
      try {
        // iOS: empty multipart PUT, then the list on success.
        await api('api/v1/user/notifications/markAll/read', { method: 'PUT', form: new FormData() });
        session.setUnread(false);
        const r = await api('api/v1/user/notifications/user');
        if (alive) setItems(Array.isArray(r?.data) ? r.data : []);
      } catch (e) {
        if (alive) setItems((x) => x ?? []);
        Hud.dismiss();
        showAlert((e as Error).message);
        return;
      }
      Hud.dismiss();
    })();
    return () => { alive = false; Hud.dismiss(); };
  }, []);

  const sections = useMemo(() => {
    const sorted = [...(items ?? [])].sort((a, b) => (parseDate(b?.createdAt)?.getTime() ?? 0) - (parseDate(a?.createdAt)?.getTime() ?? 0));
    const out: { key: string; title: string; rows: any[] }[] = [];
    for (const n of sorted) {
      const d = parseDate(n?.createdAt);
      const key = d ? dayKey(d) : 'unknown';
      let s = out.find((x) => x.key === key);
      if (!s) { s = { key, title: sectionTitle(d), rows: [] }; out.push(s); }
      s.rows.push(n);
    }
    return out;
  }, [items]);

  const openRow = (n: any) => {
    if (n?.title === 'Live') {
      const d = parseDate(n?.createdAt);
      if (d && Date.now() - d.getTime() > TWO_HOURS) { showAlert('This live has ended.'); return; }
      if (n?.channelId) nav.push(`/live/${n.channelId}`);
      return;
    }
    const pid = idOf(n?.post);
    if (pid) nav.push(`/post/${pid}`, { post: typeof n.post === 'object' ? n.post : undefined, openComments: n?.title === 'comment Post' });
  };
  const openUser = (n: any) => {
    const uid = idOf(n?.user);
    if (!uid || uid === store.userID) return;
    nav.push(`/user/${uid}`);
  };

  const requestsPill = store.bool('isPrivateAccount') ? (
    <button onClick={() => nav.push('/profile/requests')}
      className="-mr-[2px] flex h-[32px] items-center rounded-[16px] border border-[#E6EBEF] bg-[#F1F4F6] px-[14px] py-[6px] text-[13px] font-semibold text-primary">
      Requests
    </button>
  ) : undefined;

  return (
    <div className="screen flex flex-col bg-white">
      <AppBar title="Notifications" right={requestsPill} />
      {items && items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-[24px] pb-tabbar text-center leading-[1.25]">
          <div className="text-[17px] font-bold text-muted">No notifications yet</div>
          <div className="mt-[4px] text-[14px] text-[#9AA6AE]">Likes, comments and friend requests will show up here.</div>
        </div>
      ) : (
        <div className="pb-tabbar">
          {sections.map((s) => (
            <div key={s.key}>
              <div className="flex h-[40px] items-center bg-white pl-[10px] text-[14px] font-semibold text-muted">{s.title}</div>
              {s.rows.map((n, i) => <NotificationRow key={idOf(n) || i} n={n} onOpen={() => openRow(n)} onUser={() => openUser(n)} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationRow({ n, onOpen, onUser }: { n: any; onOpen: () => void; onUser: () => void }) {
  const title = n?.title;
  const created = parseDate(n?.createdAt);
  const isLive = title === 'Live';
  const fresh = isLive && !!created && Date.now() - created.getTime() <= TWO_HOURS;
  let sentence = typeof n?.content === 'string' && n.content ? n.content.split('.')[0] : 'No content';
  if (isLive && !fresh) sentence = sentence.replace(' is live', ' was live');
  const showThumb = POST_TITLES.includes(title);
  const thumb = n?.post?.image || n?.post?.thumbnail || img('no_profile');

  return (
    <div role="button" tabIndex={0} onClick={onOpen} className="flex h-[60px] cursor-pointer items-center bg-white">
      <button aria-label="Open profile" onClick={(e) => { e.stopPropagation(); onUser(); }} className="ml-[10px] shrink-0">
        <img src={n?.user?.image || img('no_profile')} alt="" draggable={false}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = img('no_profile'); }}
          className="h-[50px] w-[50px] rounded-full object-cover" />
      </button>
      <div className="ml-[10px] min-w-0 flex-1 overflow-hidden py-[10px] text-ink"
        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '17px' }}>
        <span className="text-[13px]">{`${sentence}. `}</span>
        <span className="text-[10px] text-[#AAAAAA]">{timeAgo(n?.createdAt)}</span>
      </div>
      {fresh && (
        <button onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="ml-[10px] h-[29px] w-[100px] shrink-0 rounded-[14px] bg-primary text-[13px] font-semibold text-white">
          Join
        </button>
      )}
      {showThumb ? (
        <img src={thumb} alt="" draggable={false}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = img('no_profile'); }}
          className="ml-[10px] mr-[10px] h-[50px] w-[50px] shrink-0 rounded-[10px] bg-hairline object-cover" />
      ) : <span className="w-[10px] shrink-0" />}
    </div>
  );
}
