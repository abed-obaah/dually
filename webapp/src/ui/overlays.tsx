// iOS-style alert (UIAlertController .alert) and SVProgressHUD equivalents.
// Imperative API so screens can mirror iOS calls: `await showAlert('msg')`.
import { useEffect, useState } from 'react';

type Btn = { title: string; style?: 'default' | 'cancel' | 'destructive' };
type AlertReq = {
  id: number; title?: string; message?: string; buttons: Btn[];
  input?: { placeholder?: string; value?: string };
  resolve: (r: { index: number; text: string }) => void;
};
type HudState = { visible: boolean; status?: string };

let alertSeq = 0;
let alerts: AlertReq[] = [];
let hud: HudState = { visible: false };
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export function showAlert(message: string, title = ''): Promise<void> {
  if (!message && !title) return Promise.resolve();
  return new Promise((res) => {
    alerts = [...alerts, { id: ++alertSeq, title, message, buttons: [{ title: 'OK' }], resolve: () => res() }];
    emit();
  });
}

/** Resolves with the index of the tapped button. */
export function showActions(title: string, message: string, buttons: Btn[]): Promise<number> {
  return new Promise((res) => {
    alerts = [...alerts, { id: ++alertSeq, title, message, buttons, resolve: (r) => res(r.index) }];
    emit();
  });
}

/** Alert with one text field (e.g. report reason). Resolves null on cancel. */
export function showPrompt(title: string, message: string, placeholder: string, buttons: [string, string] = ['Cancel', 'Submit']): Promise<string | null> {
  return new Promise((res) => {
    alerts = [...alerts, {
      id: ++alertSeq, title, message, input: { placeholder, value: '' },
      buttons: [{ title: buttons[0], style: 'cancel' }, { title: buttons[1] }],
      resolve: (r) => res(r.index === 1 ? r.text : null),
    }];
    emit();
  });
}

export const Hud = {
  show(status?: string) { hud = { visible: true, status }; emit(); },
  dismiss() { hud = { visible: false }; emit(); },
};

/** Run an async task with the HUD showing (mirrors ApiHandler's SVProgressHUD.show()). */
export async function withHud<T>(fn: () => Promise<T>, status?: string): Promise<T> {
  Hud.show(status);
  try { return await fn(); } finally { Hud.dismiss(); }
}

function AlertView({ a }: { a: AlertReq }) {
  const [text, setText] = useState(a.input?.value ?? '');
  const close = (index: number) => {
    alerts = alerts.filter((x) => x.id !== a.id);
    emit();
    a.resolve({ index, text });
  };
  const horizontal = a.buttons.length === 2;
  return (
    <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/40 anim-fade">
      <div className="w-[270px] overflow-hidden rounded-[14px] bg-[#F2F2F2]/95 text-center backdrop-blur-xl" style={{ animation: 'alert-in .2s ease-out' }}>
        <div className="px-4 pb-4 pt-[19px]">
          {a.title ? <div className="text-[17px] font-semibold leading-[22px] text-black">{a.title}</div> : null}
          {a.message ? <div className={`text-[13px] leading-[18px] text-black ${a.title ? 'mt-0.5' : 'text-[15px] font-normal'}`}>{a.message}</div> : null}
          {a.input && (
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={a.input.placeholder}
              className="mt-3 h-[28px] w-full rounded-[7px] border border-black/10 bg-white px-1.5 text-[13px] outline-none" />
          )}
        </div>
        <div className={horizontal ? 'flex border-t border-black/15' : 'border-t border-black/15'}>
          {a.buttons.map((b, i) => (
            <button key={i} onClick={() => close(i)}
              className={`h-[44px] flex-1 text-[17px] active:bg-black/10 ${horizontal && i === 1 ? 'border-l border-black/15' : ''} ${!horizontal && i > 0 ? 'block w-full border-t border-black/15' : 'w-full'} ${b.style === 'destructive' ? 'text-[#FF3B30]' : 'text-[#007AFF]'} ${b.style === 'cancel' || (b.style !== 'destructive' && a.buttons.length === 1) ? 'font-semibold' : ''}`}>
              {b.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OverlayHost() {
  const [, force] = useState(0);
  useEffect(() => {
    const s = () => force((n) => n + 1);
    subs.add(s);
    return () => { subs.delete(s); };
  }, []);
  return (
    <>
      {hud.visible && (
        <div className="pointer-events-auto absolute inset-0 z-[999] flex items-center justify-center">
          <div className="flex min-h-[80px] min-w-[80px] flex-col items-center justify-center rounded-[10px] bg-white px-4 py-4 shadow-[0_2px_12px_rgba(0,0,0,.15)]">
            <div className="h-[28px] w-[28px] rounded-full border-2 border-black/15 border-t-black/80" style={{ animation: 'hud-spin .8s linear infinite' }} />
            {hud.status && <div className="mt-2 max-w-[200px] text-center text-[14px] text-black/80">{hud.status}</div>}
          </div>
        </div>
      )}
      {alerts.length > 0 && <AlertView key={alerts[0].id} a={alerts[0]} />}
    </>
  );
}
