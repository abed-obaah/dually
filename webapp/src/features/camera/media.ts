// Capture → preview → upload helpers (CameraViewController / PreviewViewController
// on iOS). See the capture spec: 720×1280 composites, PiP mapping (dually_mapPIP),
// PUT upload-id-picture → POST posts | status.
import { api, ApiError } from '../../api/client';
import { img } from '../../ui/icons';

export const OUT_W = 720;
export const OUT_H = 1280;

// ───────────────────────── hand-off between camera and preview ─────────────────────────

export type Captured = {
  kind: 'image' | 'video' | 'gif';
  blob: Blob;
  url: string;          // object URL for display
  width: number;
  height: number;
  fromGallery: boolean;
};

let pending: Captured | null = null;
export function setCaptured(c: Captured | null) {
  if (pending && pending !== c) URL.revokeObjectURL(pending.url);
  pending = c;
}
export const getCaptured = () => pending;

// ───────────────────────── drawing ─────────────────────────

export type Source = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement | ImageBitmap;

export function sourceSize(s: Source): [number, number] {
  if (s instanceof HTMLVideoElement) return [s.videoWidth, s.videoHeight];
  if (s instanceof HTMLImageElement) return [s.naturalWidth, s.naturalHeight];
  return [s.width, s.height];
}

/** Aspect-fill `src` into the rect, optionally mirrored and digitally zoomed (centre crop). */
export function drawCover(ctx: CanvasRenderingContext2D, src: Source, dx: number, dy: number, dw: number, dh: number, mirror = false, zoom = 1) {
  const [sw, sh] = sourceSize(src);
  if (!sw || !sh) return;
  const scale = Math.max(dw / sw, dh / sh) * zoom;
  const cw = dw / scale, ch = dh / scale;
  const cx = (sw - cw) / 2, cy = (sh - ch) / 2;
  ctx.save();
  if (mirror) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(src, cx, cy, cw, ch, 0, 0, dw, dh);
  } else {
    ctx.drawImage(src, cx, cy, cw, ch, dx, dy, dw, dh);
  }
  ctx.restore();
}

/** Aspect-fit `src` onto a black canvas of the given size (gallery letterbox, 1080×1920). */
export function letterbox(src: Source, w: number, h: number): HTMLCanvasElement {
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const [sw, sh] = sourceSize(src);
  const s = Math.min(w / sw, h / sh);
  const dw = sw * s, dh = sh * s;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return c;
}

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** On-screen PiP layout, cached when the user drags (DuallyPIPLayout). */
export type PipLayout = { cw: number; ch: number; x: number; y: number; w: number; h: number; maxBottom: number };
export type Rect = { x: number; y: number; w: number; h: number; r: number };

/** dually_mapPIP: map the on-screen PiP onto the 720×1280 output. */
export function mapPip(l: PipLayout, W = OUT_W, H = OUT_H): Rect {
  const scale = W / Math.max(l.cw, 1);
  const w = l.w * scale, h = l.h * scale;
  const gap = 8 * scale;
  let x: number;
  if (l.x <= 40) x = gap;
  else if (l.cw - (l.x + l.w) <= 40) x = W - w - gap;
  else x = gap + (l.x / Math.max(l.cw - l.w, 1)) * (W - w - 2 * gap);
  let y: number;
  if (l.y <= 80) y = gap;
  else y = gap + (l.y / Math.max(l.ch - l.h, 1)) * (H - h - 2 * gap);
  const maxY = (l.maxBottom / Math.max(l.ch, 1)) * H;
  if (y + h > maxY) y = Math.max(gap, maxY - h);
  return { x, y, w, h, r: 18 * scale };
}

/** One composited frame: main camera full-bleed, PiP rounded on top. */
export function drawDual(ctx: CanvasRenderingContext2D, main: Source, mainMirror: boolean, zoom: number, pip: Source | null, pipMirror: boolean, rect: Rect | null) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, OUT_W, OUT_H);
  drawCover(ctx, main, 0, 0, OUT_W, OUT_H, mainMirror, zoom);
  if (pip && rect) {
    ctx.save();
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.r);
    ctx.clip();
    ctx.fillStyle = '#000';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    drawCover(ctx, pip, rect.x, rect.y, rect.w, rect.h, pipMirror, 1);
    ctx.restore();
  }
}

/** Grab the current frame of a playing video into a canvas. */
export function snapshot(v: HTMLVideoElement): HTMLCanvasElement | null {
  if (!v.videoWidth) return null;
  const c = canvas(v.videoWidth, v.videoHeight);
  c.getContext('2d')!.drawImage(v, 0, 0);
  return c;
}

export const toBlob = (c: HTMLCanvasElement, type = 'image/jpeg', q = 0.92) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), type, q));

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('image load failed'));
    i.src = src;
  });
}

// ───────────────────────── text overlay + watermark ─────────────────────────

/** Text box in media-relative units (0…1 of the displayed media rect). */
export type TextOverlay = { text: string; cx: number; cy: number; boxW: number; fontPx: number; displayW: number };

/** Draw the white text box (UITextView: white bg, 16pt medium, centred, auto height). */
export function drawText(ctx: CanvasRenderingContext2D, t: TextOverlay, W: number, H: number) {
  if (!t.text.trim()) return;
  const s = W / Math.max(t.displayW, 1);
  const font = t.fontPx * s;
  const boxW = t.boxW * s;
  const pad = 8 * s;
  ctx.save();
  ctx.font = `500 ${font}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  const lines = wrap(ctx, t.text, boxW - pad * 2);
  const lineH = font * 1.2;
  const boxH = Math.max(40 * s, lines.length * lineH + pad * 2);
  const x = t.cx * W - boxW / 2;
  const y = t.cy * H - boxH / 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, boxW, boxH);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const top = y + boxH / 2 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x + boxW / 2, top + i * lineH));
  ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/(\s+)/)) {
      const next = line + word;
      if (ctx.measureText(next).width <= max || !line) {
        // Break very long words character by character.
        if (ctx.measureText(next).width > max && !line) {
          let chunk = '';
          for (const ch of word) {
            if (ctx.measureText(chunk + ch).width > max && chunk) { out.push(chunk); chunk = ''; }
            chunk += ch;
          }
          line = chunk;
        } else line = next;
      } else {
        out.push(line.trimEnd());
        line = word.trimStart();
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}

let logo: Promise<HTMLImageElement> | null = null;
const logoImg = () => (logo ??= loadImage(img('ic_LogoName')));

/** DuallyWatermark: width 14% + 10pt (screen), 3% from the right, bottom edge 12% up. */
export async function drawWatermark(ctx: CanvasRenderingContext2D, W: number, H: number, screenW: number) {
  const l = await logoImg().catch(() => null);
  if (!l) return;
  const w = W * (0.14 + 10 / Math.max(screenW, 1));
  const h = (w * l.naturalHeight) / Math.max(l.naturalWidth, 1);
  ctx.drawImage(l, W - W * 0.03 - w, H - H * 0.12 - h, w, h);
}

/** Preload the logo so watermarking a video frame loop never waits. */
export const preloadLogo = () => logoImg().catch(() => null);

// ───────────────────────── recording ─────────────────────────

/** MP4 only: the iOS app (AVPlayer) can't play WebM, so never upload it. */
export function mp4Mime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const c = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4'];
  return c.find((m) => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } }) ?? null;
}

export const canRecordVideo = () => mp4Mime() !== null && typeof HTMLCanvasElement.prototype.captureStream === 'function';

export type Recorder = { stop: () => Promise<Blob>; cancel: () => void };

/** Record a canvas (+ optional audio track) to MP4. */
export function recordCanvas(c: HTMLCanvasElement, audio: MediaStreamTrack[] = []): Recorder {
  const mime = mp4Mime()!;
  const stream = c.captureStream(30);
  audio.forEach((t) => stream.addTrack(t));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 96_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.start(1000);
  const end = () => stream.getVideoTracks().forEach((t) => t.stop());
  return {
    stop: () => new Promise<Blob>((res) => {
      rec.onstop = () => { end(); res(new Blob(chunks, { type: 'video/mp4' })); };
      if (rec.state !== 'inactive') rec.stop(); else rec.onstop(new Event('stop'));
    }),
    cancel: () => { rec.onstop = null; if (rec.state !== 'inactive') rec.stop(); end(); },
  };
}

/**
 * Re-encode a video with overlays burned in, in real time (mergeTextViewToVideo /
 * watermark-on-save). Audio is carried through Web Audio so it works in Safari.
 */
export async function renderVideo(src: string, draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void, onProgress?: (p: number) => void): Promise<Blob> {
  const v = document.createElement('video');
  v.src = src;
  v.playsInline = true;
  v.crossOrigin = 'anonymous';
  v.preload = 'auto';
  v.muted = false;
  v.load();
  // Wait for a decoded frame, so the first recorded frame isn't black.
  await new Promise<void>((res, rej) => {
    if (v.readyState >= 2) return res();
    v.onloadeddata = () => res();
    v.onerror = () => rej(new Error('video load failed'));
  });
  const W = v.videoWidth & ~1, H = v.videoHeight & ~1;
  const c = canvas(W, H);
  const ctx = c.getContext('2d')!;
  let audioCtx: AudioContext | null = null;
  const tracks: MediaStreamTrack[] = [];
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AC();
    const node = audioCtx.createMediaElementSource(v);
    const dest = audioCtx.createMediaStreamDestination();
    node.connect(dest);
    tracks.push(...dest.stream.getAudioTracks());
    await audioCtx.resume().catch(() => {});
  } catch { v.muted = true; }

  const frame = () => {
    ctx.drawImage(v, 0, 0, W, H);
    draw(ctx, W, H);
  };
  frame();
  const rec = recordCanvas(c, tracks);
  let raf = 0;
  const loop = () => {
    frame();
    if (v.duration) onProgress?.(Math.min(1, v.currentTime / v.duration));
    raf = requestAnimationFrame(loop);
  };
  try {
    await v.play();
  } catch (e) {
    rec.cancel();
    audioCtx?.close().catch(() => {});
    throw e;
  }
  loop();
  await new Promise<void>((res) => { v.onended = () => res(); });
  cancelAnimationFrame(raf);
  frame();
  const blob = await rec.stop();
  audioCtx?.close().catch(() => {});
  return blob;
}

// ───────────────────────── upload (StatusViewModel) ─────────────────────────

export const UPLOAD_FAILED = 'Network Problem, File Upload Failed, Please Try again.';

/** Step 1: PUT api/v1/user/upload-id-picture, single multipart part `image`. */
export async function uploadMedia(blob: Blob, kind: Captured['kind']): Promise<{ img: string; thumbnail: string }> {
  const ext = kind === 'video' ? 'mp4' : kind === 'gif' ? 'gif' : 'jpg';
  const type = kind === 'video' ? 'video/mp4' : kind === 'gif' ? 'image/gif' : 'image/jpeg';
  const file = blob.type === type ? blob : new Blob([blob], { type });
  const fd = new FormData();
  fd.append('image', file, `${crypto.randomUUID().toUpperCase()}.${ext}`);
  let r: any;
  try {
    r = await api('api/v1/user/upload-id-picture', { method: 'PUT', form: fd, timeoutMs: 180_000 });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) throw e;
    throw new ApiError(UPLOAD_FAILED);
  }
  const d = Array.isArray(r?.data) ? r.data[0] : r?.data;
  const url = typeof d?.img === 'string' ? d.img.trim() : '';
  if (!url || url === 'null') throw new ApiError(UPLOAD_FAILED);
  return { img: url, thumbnail: typeof d?.thumbnail === 'string' ? d.thumbnail : '' };
}

export async function createPost(media: { img: string; thumbnail: string }, kind: Captured['kind'], fromGallery: boolean, f: { caption: string; category: string; topic: string }) {
  const isVideo = kind === 'video';
  return api('api/v1/user/posts', {
    method: 'POST',
    body: {
      text: f.caption,
      image: isVideo ? '' : media.img,
      video: isVideo ? media.img : '',
      thumbnail: media.thumbnail || '',
      postType: fromGallery ? 'ios_gallery' : '',
      categoryType: f.category,
      topics: f.topic,
    },
  });
}

export async function createStory(media: { img: string; thumbnail: string }, kind: Captured['kind'], fromGallery: boolean) {
  const body: Record<string, string> = { text: '' };
  if (kind === 'video') { body.video = media.img; body.thumbnail = media.thumbnail || ''; }
  else body.image = media.img;
  if (fromGallery) body.statusType = 'ios_gallery';
  return api('api/v1/user/status', { method: 'POST', body });
}
