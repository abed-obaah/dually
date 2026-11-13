// Phase 1 camera tab: same chrome as the iOS CameraViewController (rear preview
// full-bleed, front PiP top-left, right control column, Photo/Video/Live pill,
// shutter, gallery). Capture/recording/live arrive in phase 2.
import { useEffect, useRef, useState } from 'react';
import { Img } from '../../ui/icons';
import { showAlert } from '../../ui/overlays';

type Mode = 'Photo' | 'Video' | 'Live';

export default function CameraTab({ active }: { active: boolean }) {
  const mainRef = useRef<HTMLVideoElement>(null);
  const pipRef = useRef<HTMLVideoElement>(null);
  const streams = useRef<MediaStream[]>([]);
  const [mode, setMode] = useState<Mode>('Photo');
  const [state, setState] = useState<'idle' | 'on' | 'denied'>('idle');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');

  const stop = () => { streams.current.forEach((s) => s.getTracks().forEach((t) => t.stop())); streams.current = []; };

  const start = async (main: 'environment' | 'user' = facing) => {
    stop();
    try {
      const s1 = await navigator.mediaDevices.getUserMedia({ video: { facingMode: main }, audio: false });
      streams.current.push(s1);
      if (mainRef.current) mainRef.current.srcObject = s1;
      // Try the opposite camera for the PiP; most browsers only allow one at a time.
      try {
        const s2 = await navigator.mediaDevices.getUserMedia({ video: { facingMode: main === 'environment' ? 'user' : 'environment' }, audio: false });
        if (s2.getVideoTracks()[0]?.getSettings().deviceId !== s1.getVideoTracks()[0]?.getSettings().deviceId) {
          streams.current.push(s2);
          if (pipRef.current) pipRef.current.srcObject = s2;
        } else s2.getTracks().forEach((t) => t.stop());
      } catch { /* single camera only */ }
      setState('on');
    } catch {
      setState('denied');
    }
  };

  // Start automatically when the tab is visible if permission was already granted.
  useEffect(() => {
    if (!active) { stop(); return; }
    let cancelled = false;
    (navigator.permissions?.query({ name: 'camera' as PermissionName }) ?? Promise.reject())
      .then((p) => { if (!cancelled && p.state === 'granted') start(); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(() => stop, []);

  const soon = () => showAlert('Capturing and going live are coming soon on the web.');

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1B1E21]">
      <video ref={mainRef} autoPlay playsInline muted className={`absolute inset-0 h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`} />
      {state !== 'on' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <div className="text-[16px] text-white/70">{state === 'denied' ? 'Camera access was blocked. Allow it in your browser settings to use the camera.' : 'Allow camera access to start capturing.'}</div>
          {state === 'idle' && (
            <button onClick={() => start()} className="mt-4 h-[44px] rounded-full bg-primary px-6 text-[15px] font-bold text-white">Enable camera</button>
          )}
        </div>
      )}

      {/* Front-camera PiP */}
      <div className="absolute left-[16px] overflow-hidden rounded-[16px] bg-black" style={{ top: 'calc(var(--sat) + 120px)', width: 145, height: 208 }}>
        <video ref={pipRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
      </div>

      {/* Right control column */}
      <div className="absolute right-[12px] flex flex-col items-center gap-[16px]" style={{ top: 'calc(var(--sat) + 110px)' }}>
        <button aria-label="Flip camera" onClick={() => { const f = facing === 'environment' ? 'user' : 'environment'; setFacing(f); if (state === 'on') start(f); }}
          className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-black/40">
          <Img name="ic_cameraRotation" size={22} />
        </button>
        <button aria-label="Filters" onClick={soon} className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-black/40">
          <Img name="ic_filter" size={22} />
        </button>
        <div className="flex h-[28px] w-[44px] items-center justify-center rounded-full bg-black/40 text-[13px] font-semibold text-white">1.0x</div>
      </div>

      {/* Mode pill */}
      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-[18px] rounded-full bg-black/45 px-[22px] py-[8px]" style={{ bottom: 'calc(var(--sab) + 190px)' }}>
        {(['Photo', 'Video', 'Live'] as Mode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)} className="text-[18px]" style={{ color: mode === m ? '#07A5DE' : '#FFFFFF' }}>{m}</button>
        ))}
      </div>

      {/* Gallery + shutter */}
      <button aria-label="Gallery" onClick={soon} className="absolute left-[24px]" style={{ bottom: 'calc(var(--sab) + 110px)' }}>
        <Img name="ic_gallery" size={44} />
      </button>
      <button aria-label="Capture" onClick={soon} className="absolute left-1/2 h-[72px] w-[72px] -translate-x-1/2 rounded-full border-[4px] border-white p-[4px]" style={{ bottom: 'calc(var(--sab) + 96px)' }}>
        <span className={`block h-full w-full rounded-full ${mode === 'Photo' ? 'bg-white/90' : 'bg-[#FF3B30]'}`} />
      </button>
    </div>
  );
}
