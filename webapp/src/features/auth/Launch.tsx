// LaunchScreenViewController: plays the brand video full-screen (aspect fill) on white,
// then routes to the tabs (logged in) or onboarding (specs/01-auth §2).
import { useEffect, useRef } from 'react';
import { useNav } from '../../lib/nav';
import { store } from '../../lib/storage';
import { enterApp } from './flow';
import { useThemeColor } from './ui';

const VIDEO_MS = 4930;

export default function Launch() {
  const nav = useNav();
  const ref = useRef<HTMLVideoElement>(null);
  const done = useRef(false);
  useThemeColor('#FFFFFF');

  const route = () => {
    if (done.current) return;
    done.current = true;
    if (store.loggedIn && store.token) enterApp(nav);
    else nav.reset('/welcome'); // instant cut, no push animation
  };

  useEffect(() => {
    const v = ref.current;
    // Safety net if `ended` never fires (stalled load, background tab…).
    const safety = window.setTimeout(route, VIDEO_MS + 3000);
    let fallback: number | undefined;
    if (v) {
      v.muted = true;
      v.play()?.catch(() => {
        // Autoplay blocked: keep the first frame up for the video's duration.
        fallback = window.setTimeout(route, VIDEO_MS);
      });
    }
    return () => { window.clearTimeout(safety); if (fallback) window.clearTimeout(fallback); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 bg-white">
      <video
        ref={ref}
        src="/app/media/launch.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controls={false}
        onEnded={route}
        onError={() => window.setTimeout(route, 600)}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
