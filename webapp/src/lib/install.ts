// PWA install helpers shared by the in-app banner.
// Android / desktop Chrome & Edge fire `beforeinstallprompt`; we stash it so a
// button can trigger the native install sheet later. iOS Safari has no API —
// users must use Share → Add to Home Screen, so we show instructions instead.

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BIPEvent;
  listeners.forEach((l) => l());
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  listeners.forEach((l) => l());
});

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const canPromptInstall = () => deferred !== null;

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  listeners.forEach((l) => l());
  return outcome === 'accepted';
}

export function onInstallChange(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
