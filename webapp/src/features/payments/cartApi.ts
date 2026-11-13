// Cart / order endpoints (CartViewController.swift, Android SubscriptionFragment).
import { api, ApiError } from '../../api/client';

const idOf = (p: any): string => (typeof p === 'string' ? p : String(p?._id ?? ''));

/** Product ids present in a cart payload (`data`, `cart` or the root object). */
export function cartIds(r: any): string[] {
  const cart = r?.data ?? r?.cart ?? r;
  const items: any[] = Array.isArray(cart?.items) ? cart.items : [];
  return items.map((i) => idOf(i?.productId)).filter(Boolean);
}

export const getProducts = () => api('api/v1/user/product').then((r) => (Array.isArray(r?.data) ? r.data : []) as any[]);
export const getCart = () => api('api/v1/user/cart');
export const clearCart = () => api('api/v1/user/cart/clear', { method: 'DELETE' });
export const addToCart = (productId: string) =>
  api('api/v1/user/cart/add', { method: 'POST', body: { productId, quantity: 1, currency: 'USD' } });
export const removeFromCart = (productId: string) =>
  api('api/v1/user/cart/item', { method: 'DELETE', body: { productId } });

export type Checkout = { orderId: string; piId: string; clientSecret: string | null; amount: number };

export async function checkout(): Promise<Checkout> {
  const r = await api('api/v1/user/Cart/checkout', { method: 'POST', body: {} });
  const pi = r?.data?.clientSecret;
  const order = r?.data?.order ?? {};
  return {
    orderId: String(order.orderId ?? order._id ?? ''),
    piId: String(pi?.id ?? ''),
    clientSecret: pi?.client_secret ? String(pi.client_secret) : null,
    amount: Number(order.totalAmount ?? (pi?.amount ? pi.amount / 100 : 0)) || 0,
  };
}

/** Marks the order paid. A 400 "already completed" means the Stripe webhook won the race: success. */
export async function placeOrder(orderId: string, piId: string): Promise<void> {
  try {
    await api(`api/v1/user/Cart/placeOrder/${encodeURIComponent(orderId)}`, {
      method: 'POST', body: { paymentStatus: 'Paid', paymentMethod: 'Online', transctionId: piId },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 400 && /already completed/i.test(e.message)) return;
    throw e;
  }
}
