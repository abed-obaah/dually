// Preview after capture — PreviewViewController / PreviewViewController2 with
// PreviewScreenAndroidParity: full-bleed media, Back · Text · Download on top,
// "Add Post" / "Your Story" pills at the bottom, and the "New Post" sheet
// (caption, categories, topic, Share).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { api, ApiError } from '../../api/client';
import { useNav } from '../../lib/nav';
import { store } from '../../lib/storage';
import { Img } from '../../ui/icons';
import { Hud, showActions, showAlert } from '../../ui/overlays';
import {
  UPLOAD_FAILED, canRecordVideo, canvas, createPost, createStory, drawText, drawWatermark, getCaptured, loadImage,
  preloadLogo, renderVideo, setCaptured, toBlob, uploadMedia, type Captured, type TextOverlay,
} from './media';

const TEXT_W = 250;
const TEXT_FONT = 16;
const BLUE = 'rgb(4,132,179)';
let reminderShown = false;

type TextState = { text: string; x: number; y: number }; // centre, container px

export default function Preview() {
  const nav = useNav();
  const [media] = useState<Captured | null>(() => getCaptured());
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [text, setText] = useState<TextState | null>(null);
  const [dragging, setDragging] = useState(false);
  const [overTrash, setOverTrash] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [postLock, setPostLock] = useState(false);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('');
  const [topic, setTopic] = useState('');
  const [kb, setKb] = useState(0);

  useEffect(() => { if (!media) nav.replace('/camera'); }, [media, nav]);
  useEffect(() => { preloadLogo(); }, []);

  // One-time content reminder (key "hasShownWarning").
  useEffect(() => {
    if (!media || reminderShown || store.bool('hasShownWarning')) return;
    reminderShown = true;
    store.setBool('hasShownWarning', true);
    showAlert('Before posting, please ensure your content follows our rules. Inappropriate content may be removed, and users who violate the rules could face a ban or permanent removal of their account.', 'Reminder');
  }, [media]);

  useLayoutEffect(() => {
    const m = () => {
      const r = rootRef.current?.getBoundingClientRect();
      if (r) setSize({ w: r.width, h: r.height });
    };
    m();
    window.addEventListener('resize', m);
    return () => window.removeEventListener('resize', m);
  }, []);

  // Keyboard lift for the sheet (visualViewport ≈ keyboardWillShow).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const on = () => setKb(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener('resize', on);
    vv.addEventListener('scroll', on);
    return () => { vv.removeEventListener('resize', on); vv.removeEventListener('scroll', on); };
  }, []);

  // Autoplay with sound; fall back to muted if the browser blocks it.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
  }, [media]);

  // Auto-grow the text box height like the UITextView.
  useEffect(() => {
    const t = textRef.current;
    if (!t) return;
    t.style.height = '40px';
    t.style.height = `${Math.max(40, t.scrollHeight)}px`;
  }, [text?.text]);

  if (!media) return <div className="absolute inset-0 bg-black" />;

  // Displayed media rect (scaleAspectFit inside the screen).
  const fit = (() => {
    const { w, h } = size;
    if (!w || !h || !media.width || !media.height) return { x: 0, y: 0, w, h };
    const s = Math.min(w / media.width, h / media.height);
    const mw = media.width * s, mh = media.height * s;
    return { x: (w - mw) / 2, y: (h - mh) / 2, w: mw, h: mh };
  })();

  const overlay = (): TextOverlay | null => {
    if (!text || !text.text.trim() || !fit.w) return null;
    return { text: text.text, cx: (text.x - fit.x) / fit.w, cy: (text.y - fit.y) / fit.h, boxW: TEXT_W, fontPx: TEXT_FONT, displayW: fit.w };
  };

  // ── text overlay ──
  const addText = () => {
    if (text) { textRef.current?.focus(); return; }
    // Render synchronously so focus() runs inside the tap — iOS Safari only
    // opens the keyboard for focus that happens in the user gesture.
    flushSync(() => setText({ text: '', x: size.w / 2, y: Math.max(80, fit.y + fit.h / 2 - 200) }));
    textRef.current?.focus();
  };

  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const trashZone = (y: number) => y > size.h - 80;
  const onTextDown = (e: React.PointerEvent) => {
    if (!text) return;
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: text.x, oy: text.y, moved: false };
  };
  const onTextMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !text) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    if (!d.moved) {
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      textRef.current?.blur();
      setDragging(true);
    }
    e.preventDefault();
    const nx = d.ox + dx, ny = d.oy + dy;
    setText({ ...text, x: nx, y: ny });
    const r = rootRef.current!.getBoundingClientRect();
    setOverTrash(trashZone(e.clientY - r.top));
  };
  const onTextUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    setDragging(false);
    const r = rootRef.current!.getBoundingClientRect();
    if (trashZone(e.clientY - r.top)) setText(null);
    setOverTrash(false);
  };

  // ── rendering the final media ──
  const renderImage = async (withLogo: boolean): Promise<Blob> => {
    const i = await loadImage(media.url);
    const W = i.naturalWidth, H = i.naturalHeight;
    const c = canvas(W, H);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(i, 0, 0, W, H);
    const t = overlay();
    if (t) drawText(ctx, t, W, H);
    if (withLogo) await drawWatermark(ctx, W, H, size.w);
    return toBlob(c, 'image/jpeg', 0.7);
  };

  const renderVideoWith = async (withLogo: boolean): Promise<Blob> => {
    const logoCanvas = withLogo ? await (async () => {
      const c = canvas(media.width || 720, media.height || 1280);
      await drawWatermark(c.getContext('2d')!, c.width, c.height, size.w);
      return c;
    })() : null;
    const t = overlay();
    videoRef.current?.pause();
    try {
      return await renderVideo(media.url, (ctx, W, H) => {
        if (t) drawText(ctx, t, W, H);
        if (logoCanvas) ctx.drawImage(logoCanvas, 0, 0, W, H);
      });
    } finally {
      videoRef.current?.play().catch(() => {});
    }
  };

  /** The blob that gets uploaded (text burned in; never the logo). */
  const finalMedia = async (): Promise<{ blob: Blob; kind: Captured['kind'] }> => {
    const hasText = !!overlay();
    if (media.kind === 'image') return { blob: await renderImage(false), kind: 'image' };
    if (media.kind === 'gif') return hasText ? { blob: await renderImage(false), kind: 'image' } : { blob: media.blob, kind: 'gif' };
    if (!hasText) return { blob: media.blob, kind: 'video' };
    if (!canRecordVideo()) throw new Error('Video processing is not supported in this browser.');
    Hud.show('Processing video...');
    try { return { blob: await renderVideoWith(false), kind: 'video' }; } finally { Hud.dismiss(); }
  };

  // ── Download (with the Dually logo) ──
  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let blob: Blob, name: string;
      if (media.kind === 'video') {
        if (!canRecordVideo()) { await saveBlob(media.blob, `Dually-${Date.now()}.mp4`); return; }
        Hud.show('Processing Video for Gallery...');
        try { blob = await renderVideoWith(true); } finally { Hud.dismiss(); }
        name = `Dually-${Date.now()}.mp4`;
      } else {
        blob = await renderImage(true);
        name = `Dually-${Date.now()}.jpg`;
      }
      const how = await saveBlob(blob, name);
      if (how === 'download') showAlert(media.kind === 'video' ? 'Video saved to gallery.' : 'Photo saved to gallery.');
    } catch (e: any) {
      Hud.dismiss();
      showAlert(media.kind === 'video' ? 'Unable to save the video.' : `Error saving photo: ${e?.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  // ── upload (post / story) ──
  const finish = () => {
    videoRef.current?.pause();
    setCaptured(null);
    nav.reset('/home');
  };

  const publish = async (as: 'post' | 'story') => {
    if (busy) return;
    setBusy(true);
    let stage: 'prepare' | 'upload' | 'create' = 'prepare';
    try {
      const m = await finalMedia();
      stage = 'upload';
      Hud.show(m.kind === 'video' ? 'Uploading video...' : 'Uploading image...');
      const up = await uploadMedia(m.blob, m.kind);
      stage = 'create';
      Hud.show();
      if (as === 'post') await createPost(up, m.kind, media.fromGallery, { caption, category, topic });
      else await createStory(up, m.kind, media.fromGallery);
      Hud.dismiss();
      finish();
    } catch (e: any) {
      Hud.dismiss();
      setBusy(false);
      if (stage === 'upload' && !(e instanceof ApiError && e.status === 401)) showAlert(UPLOAD_FAILED);
      else if (stage === 'prepare') showAlert(e?.message && !(e instanceof DOMException) ? e.message : 'Video processing failed.');
      else showAlert(e?.message || 'Upload failed. Please try again.');
    }
  };

  const openSheet = () => {
    if (busy || postLock) return;
    setPostLock(true);
    setTimeout(() => setPostLock(false), 10_000);
    videoRef.current?.pause();
    setSheet(true);
  };
  const closeSheet = () => {
    setSheet(false);
    setPostLock(false);
    (document.activeElement as HTMLElement | null)?.blur();
    videoRef.current?.play().catch(() => {});
  };

  const pickCategory = async () => {
    (document.activeElement as HTMLElement | null)?.blur();
    let names: string[] = [];
    try {
      Hud.show();
      const r = await api('api/v1/user/category/getAllCategories');
      names = (Array.isArray(r?.data) ? r.data : []).map((c: any) => String(c?.name ?? '')).filter(Boolean);
    } catch (e: any) {
      Hud.dismiss();
      showAlert(e?.message || 'Network request failed');
      return;
    }
    Hud.dismiss();
    const i = await showActions('Categories', '', [...names.map((n) => ({ title: n })), { title: 'Cancel', style: 'cancel' as const }]);
    if (i >= 0 && i < names.length) setCategory(names[i]);
  };

  const back = () => {
    videoRef.current?.pause();
    nav.back('/camera');
  };

  const fieldBox = 'flex h-[50px] items-center rounded-[25px] border border-[#808080]/50 bg-white px-[15px]';

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden bg-black">
      {/* Media */}
      {media.kind === 'video' ? (
        <video ref={videoRef} src={media.url} autoPlay loop playsInline className="absolute inset-0 h-full w-full object-contain" />
      ) : (
        <img src={media.url} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain" />
      )}

      {/* Text overlay */}
      {text && (
        <div className="absolute z-10" style={{ left: text.x - TEXT_W / 2, top: text.y - 20, width: TEXT_W, touchAction: 'none' }}
          onPointerDown={onTextDown} onPointerMove={onTextMove} onPointerUp={onTextUp} onPointerCancel={onTextUp}>
          <textarea ref={textRef} value={text.text} maxLength={180} rows={1}
            onChange={(e) => setText({ ...text, text: e.target.value.slice(0, 180) })}
            onBlur={() => { if (!text.text.trim()) setText(null); }}
            className="block w-full resize-none overflow-hidden bg-white px-2 py-[9px] text-center text-[16px] font-medium leading-[1.2] text-black outline-none"
            style={{ height: 40, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', opacity: overTrash ? 0.5 : 1 }} />
        </div>
      )}

      {/* Top icon row */}
      {!dragging && (
        <>
          <button aria-label="Back" onClick={back} className="absolute left-[20px] h-[36px] w-[36px]" style={{ top: 'calc(var(--sat) + 12px)' }}>
            <Img name="i_back" size={36} />
          </button>
          <button aria-label="Text" onClick={addText} className="absolute h-[36px] w-[35px]" style={{ top: 'calc(var(--sat) + 12px)', right: 64 }}>
            <Img name="Text" size={35} />
          </button>
          <button aria-label="Download" onClick={download} className="absolute right-[20px] h-[37px] w-[36px]" style={{ top: 'calc(var(--sat) + 12px)' }}>
            <Img name="save_img" size={36} />
          </button>
        </>
      )}

      {/* Bottom pills / trash */}
      {dragging ? (
        <div className="absolute left-1/2 flex h-[60px] w-[60px] -translate-x-1/2 items-center justify-center rounded-full transition-transform"
          style={{ bottom: 'calc(var(--sab) + 12px)', transform: `translateX(-50%) scale(${overTrash ? 1.2 : 1})` }}>
          <Img name="deleteStoryNew" size={60} />
        </div>
      ) : !sheet && (
        <div className="absolute left-[40px] right-[40px] flex gap-[20px]" style={{ bottom: 'calc(var(--sab) + 20px)' }}>
          <button aria-label="Add Post" disabled={busy || postLock} onClick={openSheet} className="h-[47px] flex-1 overflow-hidden rounded-[15px] disabled:opacity-60">
            <Img name="ic_addPost" className="h-full w-full" style={{ objectFit: 'contain' }} />
          </button>
          <button aria-label="Your Story" disabled={busy} onClick={() => publish('story')} className="h-[47px] flex-1 overflow-hidden rounded-[15px] disabled:opacity-60">
            <Img name="ic_story" className="h-full w-full" style={{ objectFit: 'contain' }} />
          </button>
        </div>
      )}

      {/* "New Post" sheet */}
      {sheet && (
        <div className="absolute inset-0 z-20 flex flex-col bg-black/40 backdrop-blur-[6px] anim-fade">
          <div className="flex h-[48px] items-center bg-black/20 px-[20px]" style={{ marginTop: 'var(--sat)' }}>
            <button aria-label="Close" onClick={closeSheet} className="-ml-[6px] h-[45px] w-[45px]">
              <Img name="charm_cross" size={45} />
            </button>
            <div className="ml-[4px] text-[20px] font-medium text-white" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>New Post</div>
          </div>
          <div className="flex-1" onClick={closeSheet} />
          <div className="anim-sheet relative rounded-t-[20px] bg-white px-[20px] pt-[20px]"
            style={{ paddingBottom: kb ? 20 : 'calc(var(--sab) + 10px)', marginBottom: kb ? Math.max(0, kb - 20) : 0 }}>
            <div className="absolute left-1/2 top-[8px] h-[5px] w-[36px] -translate-x-1/2 rounded-[2.5px] bg-black/20" />
            <div className={fieldBox}>
              <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write a caption....."
                className="h-[30px] w-full bg-transparent text-[16px] font-medium text-black outline-none placeholder:text-[#C4C4C6]"
                style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }} />
            </div>
            <button onClick={pickCategory}
              className="mt-[13px] flex h-[50px] w-full items-center rounded-[5px] border border-[#CCCCCC] bg-white px-[8px] text-left text-[14px]">
              <span className={category ? 'text-black' : 'text-[#C4C4C6]'}>{category || 'Categories'}</span>
            </button>
            <div className={`${fieldBox} mt-[12px]`}>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic"
                className="h-[30px] w-full bg-transparent text-[16px] font-medium text-black outline-none placeholder:text-[#C4C4C6]"
                style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }} />
            </div>
            <button disabled={busy} onClick={() => { (document.activeElement as HTMLElement | null)?.blur(); setSheet(false); publish('post'); }}
              className="mt-[15px] h-[50px] w-full rounded-[7px] text-[20px] font-bold text-white disabled:opacity-60"
              style={{ background: BLUE, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
              Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Save a file: the share sheet on phones (→ "Save Image/Video"), a download elsewhere. */
async function saveBlob(blob: Blob, name: string): Promise<'share' | 'download' | 'cancelled'> {
  const file = new File([blob], name, { type: blob.type || (name.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg') });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (mobile && typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file] }); return 'share'; }
    catch (e: any) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'download';
}
