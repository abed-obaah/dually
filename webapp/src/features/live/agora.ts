// Agora RTC (same App ID as iOS/Android). Loaded lazily — the SDK is large.
export const AGORA_APP_ID = '4c4bc1e58b874faaa14949793d16b5ec';

let sdk: Promise<typeof import('agora-rtc-sdk-ng').default> | null = null;
export function loadAgora() {
  return (sdk ??= import('agora-rtc-sdk-ng').then((m) => {
    const A = m.default;
    try { A.setLogLevel(3); A.disableLogUpload(); } catch { /* older SDKs */ }
    return A;
  }));
}

/** iOS join-error alert text. */
export function joinErrorText(e: any): string {
  const code = String(e?.code ?? '');
  const msg = String(e?.message ?? '');
  if (/INVALID_TOKEN|DYNAMIC_KEY|invalid token/i.test(code + msg)) return 'Failed to join the channel: Invalid token.';
  if (/EXPIRED/i.test(code + msg)) return 'Failed to join the channel: Token expired.';
  if (/INVALID_CHANNEL/i.test(code + msg)) return 'Failed to join the channel: Invalid channel ID.';
  if (/REJECT|CAN_NOT_GET_GATEWAY/i.test(code + msg)) return 'Failed to join the channel: Join channel rejected.';
  if (code === 'TIMEOUT') return 'Failed to join the channel: Connection timed out. Please check your internet connection.';
  return `An unknown error occurred: ${code || msg || 'unknown'}.`;
}

/** Agora retries a failing join for a long time; give up after `ms` like a timed-out request. */
export function withTimeout<T>(p: Promise<T>, ms = 20000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej({ code: 'TIMEOUT', message: 'timed out' }), ms))]);
}
