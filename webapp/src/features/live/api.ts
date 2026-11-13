// Live endpoints (Netwrok/ResponseEnumUrl.swift, InstantLiveViewModel.swift).
import { api } from '../../api/client';

export type LiveSession = { liveId: string; channelId: string; token: string; hostId: string; startDate?: string; raw: any };

const toSession = (d: any): LiveSession => ({
  liveId: String(d?._id ?? ''),
  channelId: String(d?.channelId ?? ''),
  token: String(d?.token ?? ''),
  hostId: typeof d?.user === 'string' ? d.user : String(d?.user?._id ?? ''),
  startDate: d?.startDate,
  raw: d,
});

/** Host: create the session (E1) then start it to get channel + token (E2). */
export async function startLive(): Promise<LiveSession> {
  const created = await api('api/v1/user/live/start', { method: 'POST' });
  const id = created?.data?._id;
  if (!id) throw new Error("Couldn't start the live stream. Please try again.");
  const started = await api(`api/v1/user/live/start/${id}`, { method: 'POST' });
  const s = toSession(started?.data);
  if (!s.channelId || !s.token) throw new Error("Couldn't start the live stream. Please try again.");
  if (!s.liveId) s.liveId = id;
  return s;
}

export const endLive = (liveId: string) => api(`api/v1/user/live/end/${liveId}`, { method: 'POST' }).catch(() => {});

/** Viewer: join (E3). */
export async function joinLive(id: string): Promise<LiveSession> {
  const r = await api(`api/v1/user/live/join/${id}`, { method: 'POST' });
  const s = toSession(r?.data);
  if (!s.channelId || !s.token) throw new Error('This live has ended.');
  return s;
}

export const leaveLive = (liveId: string) => api(`api/v1/user/live/JoinSessionEnd/${liveId}`, { method: 'POST' }).catch(() => {});

/** Poll (E4). Resolves null when the live is gone/ended. */
export async function pollLive(liveId: string): Promise<{ joinUser: any[] } | null> {
  const r = await api(`api/v1/user/live/${liveId}`);
  const d = r?.data;
  if (!d || typeof d !== 'object' || String(d.status ?? '').toLowerCase() === 'end') return null;
  return { joinUser: Array.isArray(d.joinUser) ? d.joinUser : [] };
}

export const sharePoints = (hostId: string, apiKey: string) =>
  api('api/v1/user/share-points', { method: 'POST', body: { userIds: hostId, points: { [apiKey]: 1 } } });

export const fmtCount = (n: number) => (n >= 1000 ? `${Math.floor(n / 1000)}K` : String(n));
export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
