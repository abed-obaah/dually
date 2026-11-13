// Formatting helpers ported from DuallyTimeAgo & friends (specs/02 §9).

export function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** DuallyTimeAgo — exact plurals kept ("1 days ago" etc). */
export function timeAgo(iso?: string | null): string {
  const d = parseDate(iso);
  if (!d) return 'Just now';
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  const m = Math.floor(s / 60), h = Math.floor(m / 60), days = Math.floor(h / 24);
  if (s < 60) return `${s} sec ago`;
  if (m <= 1) return `${m} min ago`;
  if (m < 60) return `${m} mins ago`;
  if (h <= 1) return `${h} hr ago`;
  if (h < 24) return `${h} hrs ago`;
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export const firstName = (full?: string | null) => (full ?? '').trim().split(/\s+/)[0] ?? '';

/** Mongo ids may come as a string or a populated object. */
export const idOf = (v: any): string => (typeof v === 'string' ? v : v?._id ?? v?.id ?? '');

export const isVideoUrl = (u?: string | null) => !!u && /\.(mp4|mov|m4v|webm)(\?|$)/i.test(u);
