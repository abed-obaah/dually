// "Install Dually" prompt. Shown when the app is opened in a normal browser tab
// (not installed) — always when arriving from the landing page with ?install=1,
// otherwise once until dismissed. Android/desktop: native install sheet.
// iOS Safari: Share → Add to Home Screen instructions (no install API exists).
import { useEffect, useState } from 'react';
import { canPromptInstall, isIOS, isStandalone, onInstallChange, promptInstall } from '../lib/install';
import { store } from '../lib/storage';

export function InstallBanner() {
  const fromLanding = new URLSearchParams(location.search).has('install');
  const [open, setOpen] = useState(() => !isStandalone() && (fromLanding || !store.bool('installDismissed')));
  const [canPrompt, setCanPrompt] = useState(canPromptInstall());
  useEffect(() => onInstallChange(() => setCanPrompt(canPromptInstall())), []);

  if (!open || isStandalone()) return null;
  const ios = isIOS();
  if (!ios && !canPrompt && !fromLanding) return null; // nothing actionable yet

  const close = () => { store.setBool('installDismissed', true); setOpen(false); };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[950] flex justify-center p-3 pb-safe anim-sheet">
      <div className="w-full max-w-[402px] rounded-[20px] bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,.35)]">
        <div className="flex items-center gap-3">
          <img src="/app/icons/icon-192.png" alt="" className="h-12 w-12 rounded-[12px] border border-black/5" />
          <div className="flex-1">
            <div className="text-[16px] font-bold text-ink">Install Dually</div>
            <div className="text-[13px] text-muted">Add the app to your home screen for the full-screen experience.</div>
          </div>
          <button onClick={close} aria-label="Close" className="self-start p-1 text-[22px] leading-none text-caption">×</button>
        </div>
        {ios ? (
          <ol className="mt-3 space-y-2 rounded-[14px] bg-page p-3 text-[14px] text-label">
            <li className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">1</span>
              Tap
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
              <b>Share</b> in Safari's toolbar
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">2</span>
              Choose <b>Add to Home Screen</b>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">3</span>
              Tap <b>Add</b>, then open Dually from your home screen
            </li>
          </ol>
        ) : canPrompt ? (
          <button onClick={async () => { if (await promptInstall()) setOpen(false); }}
            className="mt-3 h-[48px] w-full rounded-[12px] bg-primary text-[16px] font-bold text-white">Install app</button>
        ) : (
          <div className="mt-3 rounded-[14px] bg-page p-3 text-[14px] text-label">
            Open your browser menu <b>⋮</b> and choose <b>Install app</b> or <b>Add to Home screen</b>.
          </div>
        )}
      </div>
    </div>
  );
}
