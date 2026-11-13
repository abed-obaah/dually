// Camera tab — CameraViewController + CameraAndroidParity.
// Back camera full-bleed, front camera in a draggable 35%-width PiP ("Tap" swaps
// them), flip chip cycles front-only / back-only, dual chip restores the PiP,
// pinch zoom 1–5×, Photo / Video / Live pill, gallery picker.
//
// Browsers differ in how many cameras can run at once. When two can (many
// Android phones) the PiP is live and video records both. When only one can
// (iPhone Safari), the PiP shows a still of the other camera that is re-taken
// at the moment of capture, so dual photos still work; video then records the
// main camera only.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Img } from '../../ui/icons';
import { Hud, showAlert } from '../../ui/overlays';
import { useNav } from '../../lib/nav';
import { store } from '../../lib/storage';
import {
  OUT_H, OUT_W, canRecordVideo, canvas, drawCover, drawDual, letterbox, loadImage, mapPip, recordCanvas,
  setCaptured, snapshot, toBlob, type PipLayout, type Recorder,
} from './media';

type Mode = 'Photo' | 'Video' | 'Live';
type Layout = 'dual' | 'front' | 'back';
type Facing = 'environment' | 'user';

const SCRIM = 'rgba(0,0,0,0.349)';
const POS_KEY = 'FrontCameraViewFrame';
const POS_VER_KEY = 'FrontCameraViewFrameVersion';
const POS_VER = 'v10-pip-35pct';

/** Remembered across tab visits: can this browser run two cameras at once? */
let concurrentSupport: boolean | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const other = (f: Facing): Facing => (f === 'user' ? 'environment' : 'user');

function getCam(facing: Facing) {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  });
}

const trackOk = (s: MediaStream | null) => {
  const t = s?.getVideoTracks()[0];
  return !!t && t.readyState === 'live' && !t.muted && t.enabled;
};

async function attach(v: HTMLVideoElement | null, s: MediaStream | null) {
  if (!v) return;
  v.srcObject = s;
  if (!s) return;
  try { await v.play(); } catch { /* muted inline autoplay — ignore */ }
  for (let i = 0; i < 40 && !v.videoWidth; i++) await sleep(25);
}

function cssPx(expr: string): number {
  const d = document.createElement('div');
  d.style.cssText = `position:absolute;visibility:hidden;height:${expr}`;
  document.body.appendChild(d);
  const h = d.getBoundingClientRect().height;
  d.remove();
  return h;
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function CameraTab({ active }: { active: boolean }) {
  const nav = useNav();
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLVideoElement>(null);
  const pipRef = useRef<HTMLVideoElement>(null);
  const stillRef = useRef<HTMLCanvasElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mainStream = useRef<MediaStream | null>(null);
  const pipStream = useRef<MediaStream | null>(null);
  const still = useRef<HTMLCanvasElement | null>(null);
  const seq = useRef(0);

  const [mode, setMode] = useState<Mode>('Photo');
  const [state, setState] = useState<'idle' | 'starting' | 'on' | 'denied'>('idle');
  const [layout, setLayout] = useState<Layout>('dual');
  const [flipped, setFlipped] = useState(false);          // dual: front camera is the main view
  const [concurrent, setConcurrent] = useState(false);
  const [hasTwo, setHasTwo] = useState(true);
  const [hasStill, setHasStill] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const mainFacing: Facing = layout === 'dual' ? (flipped ? 'user' : 'environment') : layout === 'front' ? 'user' : 'environment';
  const showPip = layout === 'dual' && hasTwo && state === 'on' && (concurrent || (hasStill && mode !== 'Video'));

  // ── PiP geometry ──
  const [box, setBox] = useState({ cw: 0, ch: 0, sat: 0, sab: 0 });
  const pipW = Math.round(box.cw * 0.35);
  const pipH = Math.round((pipW * 299) / 208);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r || !r.width) return;
      setBox({ cw: r.width, ch: r.height, sat: cssPx('var(--sat)'), sab: cssPx('var(--sab)') });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active]);

  const topBound = box.sat > 50 ? box.sat - 12 : box.sat + 2;
  // Bottom bound: safeBottom + 140, and never closer than 6pt to the mode pill.
  // Pill top = sab + 157 + 40 from the bottom.
  const maxBottom = Math.min(box.ch - (box.sab + 140), box.ch - (box.sab + 157 + 40) - 6);
  const clamp = useCallback((x: number, y: number) => ({
    x: Math.min(Math.max(x, 15), box.cw - pipW - 15),
    y: Math.min(Math.max(y, topBound), Math.max(topBound, maxBottom - pipH)),
  }), [box.cw, pipW, pipH, topBound, maxBottom]);

  // Restore the saved position (percentages, versioned like iOS).
  useEffect(() => {
    if (!box.cw) return;
    let p = { x: 16, y: topBound };
    type Saved = { xPercentage?: number; yPercentage?: number } | null;
    let saved: Saved = null;
    try { if (localStorage.getItem(POS_VER_KEY) === POS_VER) saved = store.json<Saved>(POS_KEY, null); } catch { /* private mode */ }
    if (saved && typeof saved.xPercentage === 'number' && typeof saved.yPercentage === 'number') {
      p = { x: (saved.xPercentage / 100) * box.cw, y: (saved.yPercentage / 100) * box.ch };
    }
    setPos(clamp(p.x, p.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.cw, box.ch, topBound]);

  const pip = pos ?? { x: 16, y: topBound };
  const pipLayout = (): PipLayout => ({ cw: box.cw, ch: box.ch, x: pip.x, y: pip.y, w: pipW, h: pipH, maxBottom });
  const layoutRef = useRef(pipLayout);
  layoutRef.current = pipLayout;

  const drag = useRef<{ id: number; dx: number; dy: number; moved: boolean } | null>(null);
  const posRef = useRef(pos); posRef.current = pos;
  const onPipDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if ((e.target as HTMLElement).closest('[data-swap]')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, dx: e.clientX - pip.x, dy: e.clientY - pip.y, moved: false };
  };
  const onPipMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.moved = true;
    setPos(clamp(e.clientX - d.dx, e.clientY - d.dy));
  };
  const onPipUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    const p = posRef.current;
    if (drag.current?.moved && p && box.cw) {
      store.setJson(POS_KEY, { xPercentage: (p.x / box.cw) * 100, yPercentage: (p.y / box.ch) * 100 });
      try { localStorage.setItem(POS_VER_KEY, POS_VER); } catch { /* private mode */ }
    }
    drag.current = null;
  };

  // ── camera lifecycle ──
  const stopAll = () => {
    [mainStream.current, pipStream.current].forEach((s) => s?.getTracks().forEach((t) => t.stop()));
    mainStream.current = null;
    pipStream.current = null;
    if (mainRef.current) mainRef.current.srcObject = null;
    if (pipRef.current) pipRef.current.srcObject = null;
  };

  const paintStill = (c: HTMLCanvasElement | null) => {
    still.current = c;
    setHasStill(!!c);
    const out = stillRef.current;
    if (!out || !c) return;
    out.width = c.width; out.height = c.height;
    out.getContext('2d')!.drawImage(c, 0, 0);
  };

  /** One-camera browsers: briefly switch to the other camera and keep a frame of it. */
  const grabOther = async (facing: Facing, my: number): Promise<HTMLCanvasElement | null> => {
    mainStream.current?.getTracks().forEach((t) => t.stop());
    mainStream.current = null;
    let s: MediaStream | null = null;
    let frame: HTMLCanvasElement | null = null;
    try {
      s = await getCam(other(facing));
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true;
      await attach(v, s);
      await sleep(250); // let exposure settle
      frame = snapshot(v);
      v.srcObject = null;
    } catch { /* keep the old still */ }
    s?.getTracks().forEach((t) => t.stop());
    if (my !== seq.current) return frame;
    const back = await getCam(facing);
    if (my !== seq.current) { back.getTracks().forEach((t) => t.stop()); return frame; }
    mainStream.current = back;
    await attach(mainRef.current, back);
    return frame;
  };

  const start = useCallback(async (lay: Layout = layout, flip: boolean = flipped) => {
    const my = ++seq.current;
    stopAll();
    setState('starting');
    setZoom(1);
    const facing: Facing = lay === 'dual' ? (flip ? 'user' : 'environment') : lay === 'front' ? 'user' : 'environment';
    try {
      const s1 = await getCam(facing);
      if (my !== seq.current) { s1.getTracks().forEach((t) => t.stop()); return; }
      mainStream.current = s1;
      await attach(mainRef.current, s1);

      const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      const two = cams.length >= 2;
      setHasTwo(two);

      let both = false;
      if (lay === 'dual' && two && concurrentSupport !== false) {
        try {
          const s2 = await getCam(other(facing));
          await sleep(500);
          const id1 = s1.getVideoTracks()[0]?.getSettings().deviceId;
          const id2 = s2.getVideoTracks()[0]?.getSettings().deviceId;
          both = trackOk(s1) && trackOk(s2) && id1 !== id2;
          if (my !== seq.current) { s2.getTracks().forEach((t) => t.stop()); return; }
          if (both) { pipStream.current = s2; await attach(pipRef.current, s2); }
          else s2.getTracks().forEach((t) => t.stop());
        } catch { both = false; }
        concurrentSupport = both;
        if (!both && !trackOk(mainStream.current)) {
          // Opening the second camera stopped the first (iOS Safari) — reopen it.
          mainStream.current?.getTracks().forEach((t) => t.stop());
          const again = await getCam(facing);
          if (my !== seq.current) { again.getTracks().forEach((t) => t.stop()); return; }
          mainStream.current = again;
          await attach(mainRef.current, again);
        }
      } else if (lay === 'dual' && two) {
        both = false;
      }
      setConcurrent(both);
      if (lay === 'dual' && two && !both) {
        const frame = await grabOther(facing, my);
        if (my !== seq.current) return;
        paintStill(frame);
      } else paintStill(null);
      if (my === seq.current) setState('on');
    } catch (e: any) {
      if (my !== seq.current) return;
      stopAll();
      const denied = e?.name === 'NotAllowedError' || e?.name === 'SecurityError';
      setState(denied ? 'denied' : 'idle');
      if (!denied) showAlert('Unable to access the camera. Please make sure no other app is using it and try again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, flipped]);

  // ── video recording state (declared before the lifecycle effects use it) ──
  const rec = useRef<{ r: Recorder; raf: number; tick: number; mic: MediaStream | null } | null>(null);
  const stopRecordingRef = useRef<(discard?: boolean) => Promise<void>>(async () => {});

  // Start when the tab becomes visible (if permission was granted before); stop when hidden.
  useEffect(() => {
    if (!active) {
      seq.current++;
      stopRecordingRef.current(true);
      stopAll();
      setState((s) => (s === 'denied' ? s : 'idle'));
      return;
    }
    let cancelled = false;
    const go = () => { if (!cancelled) start(); };
    const perms = navigator.permissions?.query?.({ name: 'camera' as PermissionName });
    if (perms) perms.then((p) => { if (p.state === 'granted') go(); else if (store.bool('cameraGranted') && p.state === 'prompt') go(); }).catch(() => { if (store.bool('cameraGranted')) go(); });
    else if (store.bool('cameraGranted')) go();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(() => () => { seq.current++; stopRecordingRef.current(true); stopAll(); }, []);
  useEffect(() => { if (state === 'on') store.setBool('cameraGranted', true); }, [state]);

  // Release the camera while the app is in the background (iOS stops the session too).
  useEffect(() => {
    const vis = () => {
      if (!active) return;
      if (document.hidden) { seq.current++; stopRecordingRef.current(true); stopAll(); setState((s) => (s === 'denied' ? s : 'idle')); }
      else if (store.bool('cameraGranted')) start();
    };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [active, start]);

  // ── controls ──
  const flipChip = () => {
    if (recording || busy) return;
    const next: Layout = layout === 'dual' ? 'front' : layout === 'front' ? 'back' : 'front';
    setLayout(next);
    if (state !== 'denied') start(next, flipped);
  };
  const dualChip = () => {
    if (recording || busy || layout === 'dual') return;
    setLayout('dual');
    if (state !== 'denied') start('dual', flipped);
  };
  const swap = async () => {
    if (recording || busy || state !== 'on') return;
    const f = !flipped;
    setFlipped(f);
    setZoom(1);
    if (concurrent && mainStream.current && pipStream.current) {
      // Both live: just swap which stream is full-screen.
      const a = mainStream.current, b = pipStream.current;
      mainStream.current = b; pipStream.current = a;
      await Promise.all([attach(mainRef.current, b), attach(pipRef.current, a)]);
    } else start('dual', f);
  };

  // Pinch zoom on the main preview (1.0…5.0).
  const pinch = useRef<{ pts: Map<number, { x: number; y: number }>; d0: number; z0: number }>({ pts: new Map(), d0: 0, z0: 1 });
  const dist = () => { const [a, b] = [...pinch.current.pts.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    pinch.current.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.pts.size === 2) { pinch.current.d0 = dist(); pinch.current.z0 = zoomRef.current; }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pinch.current.pts.has(e.pointerId)) return;
    pinch.current.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.pts.size === 2 && pinch.current.d0) {
      setZoom(Math.min(5, Math.max(1, pinch.current.z0 * (dist() / pinch.current.d0))));
    }
  };
  const onUp = (e: React.PointerEvent) => { pinch.current.pts.delete(e.pointerId); if (pinch.current.pts.size < 2) pinch.current.d0 = 0; };
  const onWheel = (e: React.WheelEvent) => { if (e.ctrlKey) setZoom((z) => Math.min(5, Math.max(1, z * (e.deltaY < 0 ? 1.05 : 0.95)))); };

  const zoomRef = useRef(zoom); zoomRef.current = zoom;

  // ── capture ──
  const goPreview = (blob: Blob, kind: 'image' | 'video' | 'gif', w: number, h: number, fromGallery: boolean) => {
    setCaptured({ kind, blob, url: URL.createObjectURL(blob), width: w, height: h, fromGallery });
    nav.push('/camera/preview');
  };

  const takePhoto = async () => {
    const v = mainRef.current;
    if (!v || state !== 'on' || busy) return;
    setBusy(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 60);
    try {
      const my = seq.current;
      const mainFrame = snapshot(v);
      if (!mainFrame) throw new Error('no frame');
      const c = canvas(OUT_W, OUT_H);
      const ctx = c.getContext('2d')!;
      const mirrorMain = mainFacing === 'user';
      if (layout === 'dual' && hasTwo) {
        let pipSrc: HTMLCanvasElement | null = null;
        if (concurrent && pipRef.current?.videoWidth) pipSrc = snapshot(pipRef.current);
        else {
          Hud.show();
          const fresh = await grabOther(mainFacing, my).finally(() => Hud.dismiss());
          if (fresh) paintStill(fresh);
          pipSrc = fresh ?? still.current;
        }
        drawDual(ctx, mainFrame, mirrorMain, zoom, pipSrc, !mirrorMain, pipSrc ? mapPip(pipLayout()) : null);
      } else {
        drawCover(ctx, mainFrame, 0, 0, OUT_W, OUT_H, mirrorMain, zoom);
      }
      const blob = await toBlob(c, 'image/jpeg', 0.92);
      goPreview(blob, 'image', OUT_W, OUT_H, false);
    } catch {
      showAlert('Unable to capture photo. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Video: per-frame composite into a 720×1280 canvas, recorded to MP4.
  const startRecording = async () => {
    if (!canRecordVideo()) {
      showAlert('Video recording is not supported in this browser. Please use Safari or Chrome.');
      return;
    }
    const v = mainRef.current;
    if (!v || state !== 'on' || busy) return;
    setBusy(true);
    let mic: MediaStream | null = null;
    try { mic = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true }, video: false }); }
    catch { mic = null; }
    const c = canvas(OUT_W, OUT_H);
    const ctx = c.getContext('2d')!;
    const mirrorMain = mainFacing === 'user';
    const dual = layout === 'dual' && concurrent;
    const draw = () => {
      const pv = pipRef.current;
      if (dual && pv) drawDual(ctx, v, mirrorMain, zoomRef.current, pv, !mirrorMain, mapPip(layoutRef.current()));
      else drawDual(ctx, v, mirrorMain, zoomRef.current, null, false, null);
    };
    draw();
    let r: Recorder;
    try { r = recordCanvas(c, mic?.getAudioTracks() ?? []); }
    catch {
      mic?.getTracks().forEach((t) => t.stop());
      setBusy(false);
      showAlert('Unable to start recording. Please try again.');
      return;
    }
    const t0 = performance.now();
    const loop = () => { if (!rec.current) return; draw(); rec.current.raf = requestAnimationFrame(loop); };
    rec.current = { r, raf: 0, mic, tick: window.setInterval(() => setElapsed((performance.now() - t0) / 1000), 100) };
    rec.current.raf = requestAnimationFrame(loop);
    setElapsed(0);
    setRecording(true);
    setBusy(false);
  };

  const stopRecording = async (discard = false) => {
    const cur = rec.current;
    if (!cur) return;
    rec.current = null;
    cancelAnimationFrame(cur.raf);
    clearInterval(cur.tick);
    setRecording(false);
    setElapsed(0);
    if (discard) { cur.r.cancel(); cur.mic?.getTracks().forEach((t) => t.stop()); return; }
    Hud.show();
    try {
      const blob = await cur.r.stop();
      cur.mic?.getTracks().forEach((t) => t.stop());
      Hud.dismiss();
      if (!blob.size) throw new Error('empty');
      goPreview(blob, 'video', OUT_W, OUT_H, false);
    } catch {
      Hud.dismiss();
      showAlert('Unable to save the video. Please try again.');
    }
  };
  stopRecordingRef.current = stopRecording;

  const shutter = () => {
    if (state !== 'on') { if (state !== 'starting') start(); return; }
    if (mode === 'Photo') takePhoto();
    else if (mode === 'Video') { if (recording) stopRecording(); else startRecording(); }
    else showAlert('Going live is coming soon on the web. Please use the Dually app to go live.');
  };

  // ── gallery (single image or video) ──
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const isGif = f.type === 'image/gif';
    const isImage = f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name);
    const isVideo = f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(f.name);
    try {
      if (isGif) {
        const u = URL.createObjectURL(f);
        const i = await loadImage(u).finally(() => URL.revokeObjectURL(u));
        goPreview(f, 'gif', i.naturalWidth, i.naturalHeight, true);
      } else if (isImage) {
        const u = URL.createObjectURL(f);
        const i = await loadImage(u).finally(() => URL.revokeObjectURL(u));
        const c = letterbox(i, 1080, 1920);
        goPreview(await toBlob(c, 'image/jpeg', 0.92), 'image', 1080, 1920, true);
      } else if (isVideo) {
        // MP4/MOV only — the iOS and Android apps can't play WebM.
        if (!/mp4|quicktime|m4v/i.test(f.type) && !/\.(mp4|mov|m4v)$/i.test(f.name)) {
          showAlert('This video format is not supported. Please choose an MP4 or MOV video.');
          return;
        }
        const u = URL.createObjectURL(f);
        const meta = await new Promise<[number, number]>((res, rej) => {
          const v = document.createElement('video');
          v.preload = 'metadata'; v.muted = true; v.playsInline = true;
          v.onloadedmetadata = () => res([v.videoWidth, v.videoHeight]);
          v.onerror = () => rej(new Error('bad video'));
          v.src = u;
        }).finally(() => URL.revokeObjectURL(u));
        goPreview(f, 'video', meta[0], meta[1], true);
      } else {
        showAlert('Please choose a photo or a video.');
      }
    } catch {
      showAlert('Unable to open this file. Please choose another photo or video.');
    }
  };

  const shutterIcon = mode === 'Photo' ? 'ic_photo' : mode === 'Video' ? 'ic_video' : 'ic_live';
  const pipMirror = mainFacing === 'user' ? undefined : 'scaleX(-1)';

  return (
    <div ref={rootRef} className="absolute inset-0 touch-none select-none overflow-hidden bg-black"
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
      <video ref={mainRef} autoPlay playsInline muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: `${mainFacing === 'user' ? 'scaleX(-1) ' : ''}scale(${zoom})` }} />

      {state !== 'on' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          {state === 'starting' ? (
            <div className="h-[28px] w-[28px] rounded-full border-2 border-white/20 border-t-white/80" style={{ animation: 'hud-spin .8s linear infinite' }} />
          ) : (
            <>
              <div className="text-[16px] text-white/70">{state === 'denied' ? 'Camera access was blocked. Allow it in your browser settings to use the camera.' : 'Allow camera access to start capturing.'}</div>
              <button onClick={() => start()} className="mt-4 h-[44px] rounded-full bg-primary px-6 text-[15px] font-bold text-white">
                {state === 'denied' ? 'Try again' : 'Enable camera'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Shutter flash (black 0 → .55 over .06s → 0 over .18s) */}
      <div className="pointer-events-none absolute inset-0 bg-black"
        style={{ opacity: flash ? 0.55 : 0, transition: `opacity ${flash ? 60 : 180}ms` }} />

      {/* Front-camera PiP */}
      <div onPointerDown={onPipDown} onPointerMove={onPipMove} onPointerUp={onPipUp} onPointerCancel={onPipUp}
        className="absolute overflow-hidden rounded-[18px] bg-black"
        style={{ left: pip.x, top: pip.y, width: pipW, height: pipH, display: showPip ? 'block' : 'none', touchAction: 'none' }}>
        <video ref={pipRef} autoPlay playsInline muted className="h-full w-full object-cover"
          style={{ display: concurrent ? 'block' : 'none', transform: pipMirror }} />
        <canvas ref={stillRef} className="h-full w-full object-cover"
          style={{ display: concurrent ? 'none' : 'block', transform: pipMirror }} />
        <button data-swap aria-label="Swap cameras" onClick={swap} className="absolute right-0 top-0 flex h-[50px] w-[50px] items-center justify-center">
          <Img name="Tap" size={33} />
        </button>
      </div>

      {/* Recording timer (viewForTimer, MM:SS) */}
      {recording && (
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1 text-[15px] font-semibold tabular-nums text-white"
          style={{ top: 'calc(var(--sat) + 20px)', background: SCRIM }}>
          <span className="h-[8px] w-[8px] rounded-full bg-[#ED1C24]" />{mmss(elapsed)}
        </div>
      )}

      {/* Right chip column */}
      <div className="absolute right-[12px] flex flex-col items-center gap-[12px]" style={{ top: 'calc(var(--sat) + 20px)' }}>
        <button aria-label="Flip camera" onClick={flipChip} className="flex h-[44px] w-[44px] items-center justify-center rounded-full" style={{ background: SCRIM }}>
          <Img name="ic_cameraRotation" size={24} />
        </button>
        <button aria-label="Dual camera" onClick={dualChip} className="flex h-[44px] w-[44px] items-center justify-center rounded-full" style={{ background: SCRIM }}>
          <Img name="ic_filter" size={24} />
        </button>
        <div className="flex h-[28px] min-w-[44px] items-center justify-center rounded-[14px] px-2 text-[11px] font-semibold text-white" style={{ background: SCRIM }}>
          {zoom.toFixed(1)}x
        </div>
      </div>

      {/* Mode pill */}
      <div ref={pillRef} className="absolute left-1/2 flex h-[40px] -translate-x-1/2 items-center gap-[18px] whitespace-nowrap rounded-[24px] px-[22px]"
        style={{ bottom: 'calc(var(--sab) + 157px)', background: SCRIM, visibility: recording ? 'hidden' : 'visible' }}>
        {(['Photo', 'Video', 'Live'] as Mode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)} className="text-[18px] leading-[20px]" style={{ color: mode === m ? 'rgb(4,132,179)' : '#FFFFFF' }}>{m}</button>
        ))}
      </div>

      {/* Gallery + shutter */}
      <button aria-label="Gallery" disabled={recording} onClick={() => fileRef.current?.click()}
        className="absolute left-[20px] h-[50px] w-[50px]" style={{ bottom: 'calc(var(--sab) + 92px)', visibility: recording ? 'hidden' : 'visible' }}>
        <Img name="ic_gallery" size={50} />
      </button>
      <input ref={fileRef} type="file" accept="image/*,video/mp4,video/quicktime,.mov,.mp4,.m4v" className="hidden" onChange={onPick} />
      <button aria-label={recording ? 'Stop recording' : 'Capture'} onClick={shutter} disabled={busy}
        className="absolute left-1/2 h-[70px] w-[70px] -translate-x-1/2" style={{ bottom: 'calc(var(--sab) + 82px)' }}>
        <Img name={shutterIcon} size={70} />
        {recording && <span className="absolute inset-[8px] rounded-full bg-[#ED1C24]" />}
      </button>
    </div>
  );
}
