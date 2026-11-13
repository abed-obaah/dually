// Cart (CartViewController layout + Android SubscriptionFragment flow).
// iOS buys each tile through StoreKit; the web uses the Android path instead:
// server cart kept in sync tile-by-tile → Cart/checkout → Stripe Payment
// Element → Cart/placeOrder. "Proceed to pay" is gated until the server cart
// matches the ticked tiles.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useNav } from '../../lib/nav';
import { DetailPage } from '../../ui/chrome';
import { Img } from '../../ui/icons';
import { ModalPortal } from '../../ui/portal';
import { Hud, showActions, showAlert, withHud } from '../../ui/overlays';
import { errMsg, SFX } from '../settings/shared';
import { addToCart, cartIds, checkout, clearCart, getCart, getProducts, placeOrder, removeFromCart, type Checkout } from './cartApi';
import { getStripe, STRIPE_APPEARANCE } from './stripe';

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const GIFT_ART: Record<string, string> = { King: 'King2_2000', Queen: 'Queen2000', Rook: 'Queen2000', Pawn: 'Man2000', Knight: 'Horse2000', Bishop: 'Camel2000' };
const PIECE_ORDER = ['King', 'Queen', 'Rook', 'Pawn', 'Knight', 'Bishop'];
const pieceName = (p: any) => {
  const n = String(p?.name ?? '').trim().toLowerCase();
  return PIECE_ORDER.find((x) => x.toLowerCase() === n);
};
const PENDING_KEY = 'dually.pendingCheckout';

function Check({ on }: { on: boolean }) {
  return (
    <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] ${on ? 'border-primary bg-primary text-white' : 'border-caption bg-white'}`}>
      {on && <SFX.check size={13} weight={3} />}
    </span>
  );
}

/** Serialised server-cart sync (port of Android pumpCartQueue/refreshSelectionState). */
function useServerCart() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [serverIds, setServerIds] = useState<Set<string>>(new Set());
  const [primed, setPrimed] = useState(false);
  const [pending, setPending] = useState(0);
  const chain = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback((fn: () => Promise<void>) => {
    setPending((n) => n + 1);
    chain.current = chain.current.then(fn).catch(() => {}).finally(() => setPending((n) => n - 1));
  }, []);

  const prime = useCallback(() => {
    setPrimed(false);
    enqueue(async () => {
      let stale = true;
      try { stale = cartIds(await getCart()).length > 0; } catch { stale = true; }
      if (stale) { try { await clearCart(); } catch { /* best effort, like Android */ } }
      setServerIds(new Set());
      setSelected(new Set());
      setPrimed(true);
    });
  }, [enqueue]);

  useEffect(() => { prime(); }, [prime]);

  const toggle = useCallback((id: string) => {
    let adding = false;
    setSelected((s) => {
      const n = new Set(s);
      adding = !n.has(id);
      adding ? n.add(id) : n.delete(id);
      return n;
    });
    enqueue(async () => {
      try {
        const r = adding ? await addToCart(id) : await removeFromCart(id);
        setServerIds(new Set(cartIds(r)));
      } catch (e) {
        setSelected((s) => { const n = new Set(s); adding ? n.delete(id) : n.add(id); return n; });
        showAlert(`Couldn't ${adding ? 'add' : 'remove'} that item: ${errMsg(e)}`);
      }
    });
  }, [enqueue]);

  const inSync = primed && pending === 0 && selected.size === serverIds.size && [...selected].every((id) => serverIds.has(id));
  return { selected, toggle, inSync };
}

export function Cart() {
  const nav = useNav();
  const [products, setProducts] = useState<any[]>([]);
  const { selected, toggle, inSync } = useServerCart();
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<Checkout | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let alive = true;
    withHud(getProducts)
      .then((p) => { if (alive) setProducts(p.filter((x) => x?.status !== false)); })
      .catch((e) => { if (alive) showAlert(errMsg(e)); });
    return () => { alive = false; };
  }, []);

  const finishOrder = useCallback(async (c: { orderId: string; piId: string }) => {
    for (;;) {
      try {
        await withHud(() => placeOrder(c.orderId, c.piId));
        try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
        setSuccess(true);
        return;
      } catch {
        const i = await showActions('Payment received', "Your payment went through but we couldn't confirm your order. Please tap Retry to complete it.",
          [{ title: 'Dismiss', style: 'cancel' }, { title: 'Retry' }]);
        if (i !== 1) return;
      }
    }
  }, []);

  // Resume after a redirect-based payment method (3DS, bank redirect).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const secret = q.get('payment_intent_client_secret');
    if (!secret) return;
    window.history.replaceState(window.history.state, '', window.location.pathname);
    let saved: { orderId: string; piId: string } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null'); } catch { /* ignore */ }
    (async () => {
      const stripe = await getStripe();
      const { paymentIntent } = stripe ? await stripe.retrievePaymentIntent(secret) : { paymentIntent: null };
      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        const orderId = saved?.piId === paymentIntent.id ? saved.orderId : saved?.orderId;
        if (orderId) await finishOrder({ orderId, piId: paymentIntent.id });
      } else {
        showAlert('Payment failed. Please try again.');
      }
    })();
  }, [finishOrder]);

  const badges = products.filter((p) => /verified badge/i.test(String(p?.name ?? '')));
  const gifts = PIECE_ORDER.map((n) => products.find((p) => pieceName(p) === n)).filter(Boolean) as any[];
  const hasGiftDivider = products.some((p) => /buy more gifts to send/i.test(String(p?.name ?? '')));
  const { total, count } = useMemo(() => {
    let t = 0, c = 0;
    products.forEach((p) => { if (selected.has(p?._id)) { t += num(p?.priceUsd); c += 1; } });
    return { total: Math.round(t * 100) / 100, count: c };
  }, [products, selected]);

  const proceed = async () => {
    if (!inSync || busy) return;
    setBusy(true);
    try {
      const c = await withHud(checkout);
      if (!c.clientSecret || !c.orderId) { showAlert('Payment is temporarily unavailable. Please try again later.'); return; }
      try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ orderId: c.orderId, piId: c.piId })); } catch { /* ignore */ }
      setSheet({ ...c, amount: c.amount || total });
    } catch (e) {
      showAlert(`Checkout failed: ${errMsg(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const tile = (p: any, on: boolean, art: React.ReactNode, wide: boolean) => (
    <button key={p._id} onClick={() => toggle(p._id)}
      className={wide
        ? `relative flex flex-col items-center rounded-[16px] border p-[12px] text-center ${on ? 'border-[1.5px] border-primary bg-[#F2FAFD]' : 'border-cardstroke bg-white'}`
        : `relative flex flex-col items-center rounded-[12px] border py-[8px] ${on ? 'border-primary bg-[#F2FAFD]' : 'border-transparent'}`}>
      {art}
      <span className={`mt-[6px] line-clamp-2 font-semibold text-ink ${wide ? 'text-[14px]' : 'text-[13px]'}`}>{p.name}</span>
      <span className={`font-bold text-primary ${wide ? 'mt-[2px] text-[14px]' : 'text-[12px]'}`}>$ {num(p.priceUsd).toFixed(2)}</span>
      <span className={`absolute ${wide ? 'right-[6px] top-[6px]' : 'right-[4px] top-[4px] scale-[.8]'}`}><Check on={on} /></span>
    </button>
  );

  return (
    <DetailPage title="Cart">
      <div className="mt-[14px] flex flex-col items-center gap-[4px] px-[20px]">
        <div className="text-[11px] text-caption">Order total</div>
        <div className="text-[24px] font-bold text-ink">$ {total.toFixed(2)}</div>
        <div className="mt-[2px] flex h-[24px] min-w-[90px] items-center justify-center rounded-[12px] bg-page px-[10px] text-[12px] text-label">
          {count} item{count === 1 ? '' : 's'} selected
        </div>
      </div>
      <div className="px-[16px] pb-[110px] pt-[16px]">
        {badges.length > 0 && (
          <>
            <div className="mb-[10px] text-[16px] font-bold text-ink">Suggested Items to Buy</div>
            <div className="grid grid-cols-2 gap-[12px]">
              {badges.map((p) => tile(p, selected.has(p._id),
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-[#D3E8F2] bg-[#E8F4FA]"><Img name="ic_verified" size={20} /></span>, true))}
            </div>
          </>
        )}
        {gifts.length > 0 && (
          <>
            <div className="mb-[10px] mt-[18px] text-[16px] font-bold text-ink">{hasGiftDivider ? 'Buy more gifts to send' : 'Gifts'}</div>
            <div className="grid grid-cols-3 gap-[8px] rounded-[18px] border border-cardstroke bg-white p-[10px]">
              {gifts.map((p) => tile(p, selected.has(p._id),
                <span className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#F6E4B8] bg-[#FFF6E2]">
                  <Img name={GIFT_ART[pieceName(p)!]} className="h-[38px] w-[30px]" />
                </span>, false))}
            </div>
          </>
        )}
      </div>
      {count > 0 && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[480px] bg-white px-[16px] pt-[12px] shadow-[0_-2px_10px_rgba(0,0,0,.06)]">
          <button onClick={proceed} disabled={!inSync || busy}
            className="mb-[12px] h-[56px] w-full rounded-[12px] bg-primary text-[16px] font-bold text-white disabled:opacity-50">
            Proceed to pay
          </button>
        </div>
      )}
      {sheet && (
        <CheckoutSheet c={sheet}
          onClose={() => { setSheet(null); }}
          onPaid={(c) => { setSheet(null); finishOrder(c); }} />
      )}
      {success && (
        <SuccessPopup onContinue={() => { setSuccess(false); nav.back('/settings'); }} />
      )}
    </DetailPage>
  );
}

function CheckoutSheet({ c, onClose, onPaid }: { c: Checkout; onClose: () => void; onPaid: (c: Checkout) => void }) {
  return (
    <ModalPortal>
      <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/40 anim-fade" onClick={onClose}>
        <div className="anim-sheet max-h-[92%] overflow-y-auto rounded-t-[20px] bg-white px-[16px] pb-safe pt-[14px]" onClick={(e) => e.stopPropagation()}>
          <div className="mb-[12px] flex items-center justify-between">
            <div className="text-[18px] font-bold text-ink">Dually</div>
            <button onClick={onClose} aria-label="Close" className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-page text-[18px] text-label">×</button>
          </div>
          <Elements stripe={getStripe()} options={{ clientSecret: c.clientSecret!, appearance: STRIPE_APPEARANCE }}>
            <PayForm c={c} onPaid={onPaid} />
          </Elements>
        </div>
      </div>
    </ModalPortal>
  );
}

function PayForm({ c, onPaid }: { c: Checkout; onPaid: (c: Checkout) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [ready, setReady] = useState(false);

  const pay = async () => {
    if (!stripe || !elements || paying) return;
    setPaying(true);
    Hud.show();
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: `${window.location.origin}/app/settings/cart` },
      });
      if (error) { showAlert(error.message || 'Payment failed. Please try again.'); return; }
      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        onPaid({ ...c, piId: paymentIntent.id || c.piId });
      } else {
        showAlert('Payment failed. Please try again.');
      }
    } finally {
      Hud.dismiss();
      setPaying(false);
    }
  };

  return (
    <div className="pb-[16px]">
      <PaymentElement onReady={() => setReady(true)} />
      <button onClick={pay} disabled={!stripe || !ready || paying}
        className="mt-[18px] h-[52px] w-full rounded-[12px] bg-primary text-[16px] font-bold text-white disabled:opacity-50">
        Pay $ {c.amount.toFixed(2)}
      </button>
    </div>
  );
}

function SuccessPopup({ onContinue }: { onContinue: () => void }) {
  return (
    <ModalPortal>
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-[28px] anim-fade">
        <div className="relative w-full max-w-[320px] rounded-[10px] bg-white px-[20px] pb-[22px] pt-[26px] text-center shadow-[0_4px_20px_rgba(0,0,0,.2)]">
          <button onClick={onContinue} aria-label="Close" className="absolute right-[10px] top-[8px] text-[22px] text-caption">×</button>
          <Img name="card" className="mx-auto h-[110px] w-auto" />
          <div className="mt-[14px] text-[20px] font-bold text-ink">Payment Successful!</div>
          <div className="mt-[6px] text-[14px] text-muted">Congratulations for New Purchase</div>
          <button onClick={onContinue} className="mt-[20px] h-[44px] w-full rounded-[22px] text-[16px] font-semibold text-white"
            style={{ background: 'linear-gradient(90deg,#77D985,#15BE2E)' }}>
            Continue
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
