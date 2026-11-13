// Viewer live (LiveViewController). /live/:id — id is the live `_id`
// (Explore "Live Now") or a Live notification's channelId, same as iOS.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { useNav } from '../../lib/nav';
import { session } from '../../lib/session';
import { store } from '../../lib/storage';
import { Img, SF } from '../../ui/icons';
import { Hud, showActions, showAlert } from '../../ui/overlays';
import { AGORA_APP_ID, joinErrorText, loadAgora, withTimeout } from './agora';
import { fmtCount, joinLive, leaveLive, mmss, pollLive, sharePoints, type LiveSession } from './api';
import { isGiftKey, listen, sendComment, sendGift, sendHeart, type ChatDoc } from './chat';
import { Chip, CommentBar, CommentList, GIFTS, GiftBurst, GiftTray, Hearts, PeopleIcon, type BurstHandle, type HeartsHandle } from './ui';

const QUICK = ['Hello', '😂', '😍', '👋', '👍', '🔥', '👏'];
const counts = (u: any): Record<string, number> =>
  Object.fromEntries(GIFTS.map((g) => [g.api, Number(u?.[g.api]) || 0]));

export default function ViewerLive() {
  const { id = '' } = useParams();
  const nav = useNav();
  const stage = useRef<HTMLDivElement>(null);
  const hearts = useRef<HeartsHandle>(null);
  const burst = useRef<BurstHandle>(null);
  const [live, setLive] = useState<LiveSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [viewers, setViewers] = useState(0);
  const [comments, setComments] = useState<ChatDoc[]>([]);
  const [tray, setTray] = useState(false);
  const [gifts, setGifts] = useState<Record<string, number>>(() => counts(session.get().profile));
  const [waiting, setWaiting] = useState(true);
  const [muted, setMuted] = useState(false);
  const [chatDown, setChatDown] = useState(false);
  const rt = useRef<{ client?: any; audio?: any; tick?: number; poll?: number; unsub?: () => void; left?: boolean; liveId?: string; shown: Set<string>; joinedAt: number }>({ shown: new Set(), joinedAt: Date.now() });

  const refreshGifts = useCallback(() => {
    session.loadProfile().then((u) => { if (u) setGifts(counts(u)); }).catch(() => {});
  }, []);

  const leave = useCallback(async (opts: { message?: string } = {}) => {
    const r = rt.current;
    if (r.left) return;
    r.left = true;
    clearInterval(r.tick); clearInterval(r.poll);
    r.unsub?.();
    if (r.liveId) leaveLive(r.liveId);
    await r.client?.leave().catch(() => {});
    if (opts.message) await showAlert(opts.message);
    nav.back('/explore');
  }, [nav]);
  const leaveRef = useRef(leave);
  leaveRef.current = leave;

  const onChat = useCallback((changes: { type: string; doc: ChatDoc }[]) => {
    const r = rt.current;
    const add: ChatDoc[] = [];
    for (const { type, doc } of changes) {
      if (type !== 'added') continue;
      if (doc.gift === 'CommentLiked' || doc.gift === 'CommentUnLiked') continue;
      if (isGiftKey(doc.gift)) {
        if (!r.shown.has(doc.docId) && Date.now() - doc.time <= 30_000) { r.shown.add(doc.docId); burst.current?.show(doc.gift!, doc.giftName); }
        continue;
      }
      if (doc.gift === 'heart') {
        if (doc.senderId !== store.userID && doc.time >= r.joinedAt - 5000) hearts.current?.burst(5);
        continue;
      }
      if (doc.reaction === 'liked' || (doc.liked === false && !doc.message)) continue;
      add.push(doc);
    }
    if (add.length) {
      setComments((prev) => {
        const seen = new Set(prev.map((p) => p.docId));
        return [...prev, ...add.filter((a) => !seen.has(a.docId))].sort((a, b) => a.time - b.time);
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const r = rt.current;
    (async () => {
      Hud.show();
      let s: LiveSession;
      try {
        const [, joined] = await Promise.all([loadAgora(), joinLive(id)]);
        s = joined;
      } catch (e) {
        Hud.dismiss();
        if (!cancelled) { await showAlert(e instanceof ApiError && e.status && e.status < 500 ? 'This live has ended.' : (e as Error).message || 'This live has ended.'); nav.back('/explore'); }
        return;
      }
      if (cancelled) { leaveLive(s.liveId); Hud.dismiss(); return; }
      setLive(s);
      r.liveId = s.liveId;
      r.joinedAt = Date.now();
      r.unsub = listen(s.channelId, onChat, () => setChatDown(true));
      const start = s.startDate ? new Date(s.startDate).getTime() : Date.now();
      const base = Number.isFinite(start) ? start + 2000 : Date.now();
      r.tick = window.setInterval(() => setElapsed(Math.max(0, (Date.now() - base) / 1000)), 1000);
      setElapsed(Math.max(0, (Date.now() - base) / 1000));
      refreshGifts();

      const AgoraRTC = await loadAgora();
      AgoraRTC.onAutoplayFailed = () => setMuted(true);
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'h264' });
      r.client = client;
      client.on('user-published', async (user: any, mediaType: 'audio' | 'video') => {
        try { await client.subscribe(user, mediaType); } catch { return; }
        if (mediaType === 'video' && stage.current) {
          user.videoTrack.play(stage.current, { fit: 'cover', mirror: false });
          setWaiting(false);
          setTimeout(() => {
            const st = user.videoTrack?.getMediaStreamTrack?.().getSettings?.() ?? {};
            const w = st.width, h = st.height;
            if (w && h && Math.abs(Math.min(w, h) / Math.max(w, h) - 0.5625) >= 0.02 && stage.current) {
              user.videoTrack.stop();
              user.videoTrack.play(stage.current, { fit: 'contain', mirror: false });
            }
          }, 800);
        }
        if (mediaType === 'audio') { r.audio = user.audioTrack; user.audioTrack.play(); }
      });
      client.on('user-left', () => {
        if (r.left) return;
        setTimeout(() => leaveRef.current({ message: 'User is Offline!' }), 500);
      });
      try {
        await client.setClientRole('audience', { level: 2 });
        await withTimeout(client.join(AGORA_APP_ID, s.channelId, s.token, null));
      } catch (e) {
        Hud.dismiss();
        if (!cancelled) { leaveRef.current({ message: joinErrorText(e) }); }
        return;
      }
      Hud.dismiss();
      if (cancelled) return;
      showAlert('Joined successfully!');
      r.poll = window.setInterval(async () => {
        try {
          const p = await pollLive(s.liveId);
          if (!p) { leaveRef.current({ message: 'This live has ended.' }); return; }
          setViewers(p.joinUser.length);
        } catch (e) {
          if (e instanceof ApiError && e.status && e.status >= 400 && e.status < 500) leaveRef.current({ message: 'This live has ended.' });
        }
      }, 2000);
    })();
    return () => {
      cancelled = true;
      if (!r.left) {
        r.left = true;
        clearInterval(r.tick); clearInterval(r.poll);
        r.unsub?.();
        r.client?.leave().catch(() => {});
        if (r.liveId) leaveLive(r.liveId);
      }
      Hud.dismiss();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const comment = (t: string) => { if (live) sendComment(live.channelId, t).catch(() => showAlert('Comment not sent.')); };
  const heart = () => { hearts.current?.burst(5); if (live) sendHeart(live.channelId).catch(() => {}); };

  const pickGift = async (g: typeof GIFTS[number]) => {
    if (!live) return;
    if ((gifts[g.api] ?? 0) <= 0) {
      const i = await showActions('Dually', "You don't have any gift to send, you need to buy first!", [{ title: 'Go to Buy' }, { title: 'Cancel', style: 'cancel' }]);
      if (i === 0) { setTray(false); nav.push('/settings/cart'); }
      return;
    }
    setTray(false);
    burst.current?.show(g.key, g.name);
    setGifts((c) => ({ ...c, [g.api]: Math.max(0, (c[g.api] ?? 0) - 1) }));
    sendGift(live.channelId, g.key, g.name).then((docId) => rt.current.shown.add(docId)).catch(() => {});
    try { await sharePoints(live.hostId, g.api); refreshGifts(); }
    catch { showAlert('Gift Not Sent!'); refreshGifts(); }
  };

  return (
    <div className="screen overflow-hidden bg-black" onClick={() => tray && setTray(false)}>
      <div ref={stage} className="absolute inset-0" />
      {waiting && live && <div className="absolute inset-0 flex items-center justify-center text-[14px] text-white/60">Connecting to the live…</div>}
      <Hearts ref={hearts} />
      <GiftBurst ref={burst} />

      <div className="absolute right-[16px] z-[40] flex flex-col items-end gap-[8px]" style={{ top: 'calc(var(--sat) + 12px)' }}>
        <div className="flex items-center gap-[8px]">
          <Chip>{mmss(elapsed)}</Chip>
          <button aria-label="Close" onClick={(e) => { e.stopPropagation(); leave(); }}
            className="flex h-[36px] w-[36px] items-center justify-center rounded-full border border-white/20 bg-black/35 text-white">
            <SF.xmark size={18} weight={2.4} />
          </button>
        </div>
        <Chip><PeopleIcon />{fmtCount(viewers)}</Chip>
      </div>

      {muted && (
        <button onClick={(e) => { e.stopPropagation(); rt.current.audio?.play(); setMuted(false); }}
          className="absolute left-1/2 top-[45%] z-[45] -translate-x-1/2 rounded-full bg-black/60 px-[18px] py-[10px] text-[14px] font-semibold text-white">
          Tap to unmute
        </button>
      )}

      {live && (
        <div className="absolute inset-x-0 z-[35]" style={{ bottom: 'calc(var(--sab) + 16px)' }} onClick={(e) => e.stopPropagation()}>
          {tray && (
            <div className="mb-[8px] ml-[16px] mr-[14px]">
              <GiftTray counts={gifts} onPick={pickGift} onBuy={() => { setTray(false); nav.push('/settings/cart'); }} />
            </div>
          )}
          <div className="relative">
            {chatDown && <div className="mx-[20px] mb-[8px]"><Chip>Live chat is unavailable right now</Chip></div>}
            <div className="pr-[64px]"><CommentList items={comments} /></div>
            <button aria-label="Send a gift" onClick={() => setTray((t) => !t)}
              className="absolute bottom-0 right-[14px] flex h-[46px] w-[46px] items-center justify-center rounded-full border border-white/20 bg-black/35 p-[8px]">
              <Img name="ic_butterfly" size={30} />
            </button>
          </div>
          <div className="no-scrollbar mt-[12px] flex h-[36px] gap-[8px] overflow-x-auto px-[12px]">
            {QUICK.map((q) => (
              <button key={q} onClick={() => comment(q)}
                className="h-[36px] min-w-[52px] shrink-0 rounded-[18px] border border-white/20 bg-black/35 px-[16px] text-[14px] font-medium text-white active:bg-black/65">
                {q}
              </button>
            ))}
          </div>
          <div className="mt-[8px]"><CommentBar onSend={comment} onHeart={heart} heartImg /></div>
        </div>
      )}
    </div>
  );
}
