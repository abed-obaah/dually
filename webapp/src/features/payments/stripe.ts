// Stripe.js singleton. iOS/Android use the same live publishable key
// (AppDelegate.swift:38, MyApplication.kt:46); it must match the backend's
// secret-key mode, so it is overridable with VITE_STRIPE_PK for test backends.
import { loadStripe, type Stripe } from '@stripe/stripe-js';

const PK = import.meta.env.VITE_STRIPE_PK
  || 'pk_live_51PEDdxESrtefT2fMWdfPB3Gcwisu9Fl87tt0NXDTdoySUWkgJUg07eX1m633OEHfy8Bc9IO1pW6wfuDUAcLqLnUf00iTu5glkQ';

let promise: Promise<Stripe | null> | null = null;
export const getStripe = () => (promise ??= loadStripe(PK));

export const STRIPE_APPEARANCE = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#0384B3',
    colorText: '#0F1A22',
    borderRadius: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  },
};
