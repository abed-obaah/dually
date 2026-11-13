// Host live (CameraViewController live mode + CameraViewController+Agora).
// Opened from the Camera tab's Live shutter. Cameras are composited into a
// 720×1280 canvas (back full-frame, front PiP where the browser can run both
// cameras, otherwise a single camera with flip) and published to Agora as a
// custom 480×848 / 15 fps / 800 kbps H.264 track, exactly what app viewers get.
// Chat/hearts/gifts use the shared Firestore room. Ends in the Live Summary.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNav } from '../../lib/nav';
import { session } from '../../lib/session';
import { store } from '../../lib/storage';
import { Img } from '../../ui/icons';
import { Hud, showAlert } from '../../ui/overlays';
import { OUT_H, OUT_W, canRecordVideo, drawDual, mapPip, recordCanvas, snapshot, type Recorder } from '../camera/media';
import { AGORA_APP_ID, joinErrorText, loadAgora, withTimeout } from './agora';
import { endLive, fmtCount, mmss, pollLive, startLive, type LiveSession } from './api';
import { deleteDoc, isGiftKey, listen, sendComment, sendHeart, sendJoined, type ChatDoc } from './chat';
import { Chip, CommentBar, CommentList, GiftBurst, Hearts, PeopleIcon, type BurstHandle, type HeartsHandle } from './ui';
import LiveSummary, { type SummaryData } from './LiveSummary';

type Facing = 'user' | 'environment';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const camera = (facing: Facing) => navigator.mediaDevices.getUserMedia({
  video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
});
const trackOk = (s: MediaStream | null) => { const t = s?.getVideoTracks()[0]; return !!t && t.readyState === 'live' && !t.muted; };
/** Phones only decode camera video that is inline, muted and in the document (like the Camera tab's <video>s). */
function mkVideo() {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.autoplay = true;
  v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
  v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
  return v;
}
/** Two streams are different cameras if their device ids or facing modes differ. */
const settingsOf = (s: MediaStream): MediaTrackSettings => s.getVideoTracks()[0]?.getSettings() ?? {};
function differentCams(x: MediaTrackSettings, b: MediaStream) {
  const y = settingsOf(b);
  if (x.deviceId && y.deviceId && x.deviceId !== y.deviceId) return true;
  return !!x.facingMode && !!y.facingMode && x.facingMode !== y.facingMode;
}
async function attach(v: HTMLVideoElement, s: MediaStream | null) {
  v.srcObject = s;
  if (!s) return;
  try { await v.play(); } catch { /* inline muted autoplay */ }
  for (let i = 0; i < 40 && !v.videoWidth; i++) await sleep(25);
}

// Default PiP on the 390×844 reference container (16, 50), 35 % wide, 208:299.
const PIP = (() => {
  const cw = 390, ch = 844, w = cw * 0.35, h = (w * 299) / 208;
  return mapPip({ cw, ch, x: 16, y: 50, w, h, maxBottom: ch });
})();

export default function HostLive() {
  const nav = useNav();
  const view = useRef<HTMLCanvasElement>(null);
  const mainV = useRef<HTMLVideoElement>(mkVideo());
  const pipV = useRef<HTMLVideoElement>(mkVideo());
  const videoHost = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { videoHost.current?.append(mainV.current, pipV.current); }, []);
  const streams = useRef<{ main: MediaStream | null; pip: MediaStream | null }>({ main: null, pip: null });
  const facingRef = useRef<Facing>('environment');
  const dualRef = useRef(false);
  /** iPhone & co. can't run two cameras: a still of the other camera fills the PiP (as in the Camera tab). */
  const stillRef = useRef<HTMLCanvasElement | null>(null);

  const [live, setLive] = useState<LiveSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [viewers, setViewers] = useState(0);
  const [comments, setComments] = useState<ChatDoc[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [chatDown, setChatDown] = useState(false);
  const hearts = useRef<HeartsHandle>(null);
  const burst = useRef<BurstHandle>(null);
  const joinUsers = useRef<any[]>([]);

  const rt = useRef<{
    client?: any; video?: any; mic?: any; draw?: number; tick?: number; poll?: number; unsub?: () => void;
    rec?: Recorder | null; wake?: any; ending?: boolean; t0: number;
    likes: number; gifts: Record<string, number>; viewerIds: Set<string>; peak: number; joined: number; commentCount: number;
  }>({ t0: 0, likes: 0, gifts: {}, viewerIds: new Set(), peak: 0, joined: 0, commentCount: 0 });

  const stopCams = () => {
    [streams.current.main, streams.current.pip].forEach((s) => s?.getTracks().forEach((t) => t.stop()));
    streams.current = { main: null, pip: null };
  };

  /** Open the main camera, then try the other one as PiP (kept only if both stay live). */
  const openCams = useCallback(async (facing: Facing, wantDual: boolean) => {
    stopCams();
    const main = await camera(facing);
    streams.current.main = main;
    await attach(mainV.current, main);
    const mainSettings = settingsOf(main); // read now: on iPhone opening the 2nd camera ends this track
    let ok = false;
    if (wantDual) {
      try {
        const pip = await camera(facing === 'user' ? 'environment' : 'user');
        await sleep(300);
        if (trackOk(main) && trackOk(pip) && differentCams(mainSettings, pip)) {
          streams.current.pip = pip;
          await attach(pipV.current, pip);
          ok = true;
        } else {
          const distinct = trackOk(pip) && differentCams(mainSettings, pip);
          if (distinct) {
            await attach(pipV.current, pip);
            stillRef.current = snapshot(pipV.current);
            pipV.current.srcObject = null;
          }
          pip.getTracks().forEach((t) => t.stop());
          if (!trackOk(main)) {
            main.getTracks().forEach((t) => t.stop());
            streams.current.main = await camera(facing);
            await attach(mainV.current, streams.current.main);
          }
        }
      } catch { /* single camera */ }
    }
    facingRef.current = facing;
    dualRef.current = ok;
  }, []);

  // Compositor: draws into the on-screen canvas, which is also what Agora + the recorder capture.
  const startDrawing = () => {
    const c = view.current!;
    const ctx = c.getContext('2d')!;
    const frame = () => {
      const m = mainV.current;
      if (!m.videoWidth) return;
      const mirror = facingRef.current === 'user';
      const pip = dualRef.current && pipV.current.videoWidth ? pipV.current : stillRef.current;
      drawDual(ctx, m, mirror, 1, pip, !mirror, PIP);
    };
    rt.current.draw = window.setInterval(frame, 1000 / 30);
  };

  const onChat = useCallback((changes: { type: string; doc: ChatDoc }[]) => {
    const r = rt.current;
    const ch = live?.channelId ?? '';
    const add: ChatDoc[] = [];
    for (const { type, doc } of changes) {
      if (type !== 'added') continue;
      if (doc.gift === 'CommentLiked' || doc.gift === 'CommentUnLiked') continue;
      if (isGiftKey(doc.gift)) {
        burst.current?.show(doc.gift!, doc.giftName);
        r.gifts[doc.gift!] = (r.gifts[doc.gift!] ?? 0) + 1;
        deleteDoc(ch, doc.docId);
        continue;
      }
      if (doc.gift === 'heart') {
        r.likes += 1;
        if (doc.senderId !== store.userID) { hearts.current?.burst(5); deleteDoc(ch, doc.docId); }
        continue;
      }
      if (doc.reaction === 'liked' || (doc.liked === false && !doc.message)) { if (doc.liked === false && !doc.message) deleteDoc(ch, doc.docId); continue; }
      add.push(doc);
    }
    if (add.length) {
      setComments((prev) => {
        const seen = new Set(prev.map((p) => p.docId));
        const next = [...prev, ...add.filter((a) => !seen.has(a.docId))].sort((a, b) => a.time - b.time);
        r.commentCount = next.length;
        return next;
      });
    }
  }, [live?.channelId]);

  useEffect(() => {
    if (!live) return;
    const unsub = listen(live.channelId, onChat, () => setChatDown(true));
    rt.current.unsub = unsub;
    return unsub;
  }, [live, onChat]);

  // Start sequence (btnClickTapped .live → startLiveBroadcast).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      Hud.show();
      try {
        if (!store.token) throw new Error('You need to be signed in to go live.');
        const AgoraRTC = await loadAgora();
        try { await openCams('environment', true); }
        catch { throw new Error('Camera access is needed to go live. Please allow camera access and try again.'); }
        if (cancelled) return;
        startDrawing();
        let mic: any;
        try { mic = await AgoraRTC.createMicrophoneAudioTrack({ encoderConfig: 'speech_standard' }); }
        catch { throw new Error('Microphone access is needed to go live. Please allow microphone access and try again.'); }
        rt.current.mic = mic;
        const s = await startLive();
        if (cancelled) { endLive(s.liveId); return; }
        const client = AgoraRTC.createClient({ mode: 'live', codec: 'h264' });
        rt.current.client = client;
        await client.setClientRole('host');
        try { await withTimeout(client.join(AGORA_APP_ID, s.channelId, s.token, null)); }
        catch (e) { endLive(s.liveId); throw new Error(joinErrorText(e)); }
        const vtrack = view.current!.captureStream(15).getVideoTracks()[0];
        const video = AgoraRTC.createCustomVideoTrack({ mediaStreamTrack: vtrack, bitrateMax: 800, bitrateMin: 300, optimizationMode: 'motion' });
        rt.current.video = video;
        await client.publish([video, mic]);
        if (cancelled) return;

        const r = rt.current;
        Object.assign(r, { likes: 0, gifts: {}, viewerIds: new Set(), peak: 0, joined: 0, commentCount: 0, ending: false, t0: performance.now() });
        r.tick = window.setInterval(() => setElapsed((performance.now() - r.t0) / 1000), 250);
        r.poll = window.setInterval(async () => {
          if (r.ending) return;
          try {
            const p = await pollLive(s.liveId);
            if (!p || r.ending) return;
            const ju = p.joinUser;
            joinUsers.current = ju;
            const n = ju.length;
            ju.forEach((u) => r.viewerIds.add(String(u?.userId ?? u?._id ?? u)));
            r.peak = Math.max(r.peak, n);
            setViewers(n);
            if (n > r.joined) { const last = ju[n - 1]; if (last?.fullName) sendJoined(s.channelId, last).catch(() => {}); }
            r.joined = n;
          } catch { /* transient */ }
        }, 2000);
        if (canRecordVideo()) {
          try { r.rec = recordCanvas(view.current!, [mic.getMediaStreamTrack()]); } catch { r.rec = null; }
        }
        if (!r.rec) showAlert("Couldn't record this live video (not supported in this browser). Your stream will continue, but there won't be a video to download afterward.");
        try { r.wake = await (navigator as any).wakeLock?.request('screen'); } catch { /* optional */ }
        setLive(s);
        Hud.dismiss();
        showAlert('You are live now');
        session.loadProfile().catch(() => {});
      } catch (e) {
        Hud.dismiss();
        cleanup();
        if (!cancelled) {
          await showAlert(e instanceof Error && e.message ? e.message : "Couldn't start the live stream. Please try again.");
          nav.back('/camera');
        }
      }
    })();
    return () => {
      cancelled = true;
      // Leaving without End Live (back gesture, tab close): end it on the server too.
      if (rt.current.client && !rt.current.ending) {
        rt.current.ending = true;
        const id = liveIdRef.current;
        if (id) endLive(id);
        rt.current.rec?.cancel();
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveIdRef = useRef('');
  useEffect(() => { liveIdRef.current = live?.liveId ?? ''; }, [live]);

  function cleanup() {
    const r = rt.current;
    clearInterval(r.draw); clearInterval(r.tick); clearInterval(r.poll);
    r.unsub?.();
    try { r.video?.close(); } catch { /* ignore */ }
    try { r.mic?.close(); } catch { /* ignore */ }
    r.client?.leave().catch(() => {});
    r.client = undefined;
    r.wake?.release?.().catch?.(() => {});
    stopCams();
  }

  const endLiveTapped = async () => {
    const r = rt.current;
    if (!live || r.ending) return;
    r.ending = true;
    clearInterval(r.tick);
    Hud.show('Live Ending');
    endLive(live.liveId);
    let blob: Blob | null = null;
    try { blob = r.rec ? await r.rec.stop() : null; } catch { blob = null; }
    r.rec = null;
    const duration = (performance.now() - r.t0) / 1000;
    cleanup();
    Hud.dismiss();
    setSummary({
      duration, totalViewers: r.viewerIds.size, peakViewers: r.peak, likes: r.likes,
      comments: r.commentCount, gifts: { ...r.gifts }, video: blob && blob.size ? blob : null,
    });
  };

  const flip = async () => {
    if (!live || rt.current.ending) return;
    if (dualRef.current) {
      // Swap which camera is full-frame (isCameraFlipped).
      const { main, pip } = streams.current;
      streams.current = { main: pip, pip: main };
      await attach(mainV.current, pip);
      await attach(pipV.current, main);
      const f: Facing = facingRef.current === 'user' ? 'environment' : 'user';
      facingRef.current = f;
    } else {
      // One camera at a time: the current main becomes the PiP still.
      const prev = stillRef.current ? snapshot(mainV.current) : null;
      try {
        await openCams(facingRef.current === 'user' ? 'environment' : 'user', false);
        if (prev) stillRef.current = prev;
      } catch { showAlert('Unable to switch camera.'); }
    }
  };

  const imageFor = (c: ChatDoc) => {
    if (c.senderImage && c.senderImage !== 'null') return c.senderImage;
    const u = joinUsers.current.find((j) => String(j?.userId ?? j?._id) === c.senderId);
    return u?.image;
  };

  if (summary) return <LiveSummary data={summary} onDone={() => nav.back('/camera')} />;

  return (
    <div className="screen overflow-hidden bg-black">
      <div ref={videoHost} aria-hidden className="pointer-events-none absolute inset-0" />
      <canvas ref={view} width={OUT_W} height={OUT_H} className="absolute inset-0 h-full w-full object-cover" />
      <Hearts ref={hearts} />
      <GiftBurst ref={burst} />

      {live && (
        <>
          <div className="absolute right-[16px] z-[40] flex flex-col items-end gap-[10px]" style={{ top: 'calc(var(--sat) + 24px)' }}>
            <div className="flex items-center gap-[8px]">
              <div className="flex h-[30px] w-[56px] items-center justify-center rounded-[6px] bg-white text-[13px] font-semibold text-ink">{mmss(elapsed)}</div>
              <button onClick={endLiveTapped} className="h-[30px] w-[56px] rounded-[6px] bg-[#FF3B30] text-[12px] text-white" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>End Live</button>
            </div>
            <div className="flex h-[30px] items-center gap-[6px] rounded-[6px] bg-white px-[10px] text-[13px] font-semibold text-ink"><PeopleIcon />{fmtCount(viewers)}</div>
            <button aria-label="Flip camera" onClick={flip} className="flex h-[44px] w-[44px] items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.349)' }}>
              <Img name="ic_cameraRotation" size={22} />
            </button>
          </div>
          <div className="absolute inset-x-0 z-[35]" style={{ bottom: 'calc(var(--sab) + 16px)' }}>
            {chatDown && <div className="mx-[20px] mb-[8px]"><Chip>Live chat is unavailable right now</Chip></div>}
            <CommentList items={comments} imageFor={imageFor} />
            <div className="mt-[8px]">
              <CommentBar
                onSend={(t) => sendComment(live.channelId, t).catch(() => showAlert('Comment not sent.'))}
                onHeart={() => { hearts.current?.burst(5); sendHeart(live.channelId).catch(() => {}); }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
