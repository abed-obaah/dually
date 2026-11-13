// Saved Posts (SavedPostsViewController + DetailScreensAndroidParity, specs/03 §8).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useSession } from '../../lib/session';
import { Hud, showAlert } from '../../ui/overlays';
import { EmptyState } from '../../ui/chrome';
import { Bar, Sym, TileGrid, errMsg, toTile, useMediaViewer } from './ui';

export default function Saved() {
  const { reportedIds } = useSession();
  const [posts, setPosts] = useState<any[] | null>(null);
  const page = useRef(1);
  const more = useRef(false);
  const busy = useRef(false);
  const viewer = useMediaViewer();

  const load = useCallback(async (p: number) => {
    if (busy.current) return;
    busy.current = true;
    if (p === 1) Hud.show();
    try {
      const r = await api('api/v1/user/posts/bookmarks/get', { query: { page: p, limit: 10 } });
      const list: any[] = Array.isArray(r?.data) ? r.data : [];
      const pg = r?.pagination;
      more.current = Number(pg?.currentPage ?? p) < Number(pg?.totalPages ?? 0);
      page.current = p;
      setPosts((prev) => {
        const base = p === 1 ? [] : prev ?? [];
        const seen = new Set(base.map((x) => x?._id));
        return [...base, ...list.filter((x) => x && !seen.has(x._id))];
      });
    } catch (e) {
      if (p === 1) setPosts([]);
      showAlert(errMsg(e));
    } finally {
      busy.current = false;
      if (p === 1) Hud.dismiss();
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const tiles = useMemo(() => (posts ?? [])
    .filter((p) => !reportedIds.has(p._id))
    .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
    .map((p) => toTile(p, true)), [posts, reportedIds]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (more.current && !busy.current && el.scrollTop + el.clientHeight > el.scrollHeight - 300) load(page.current + 1);
  };

  // If the first page doesn't fill the viewport, keep loading.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el && more.current && !busy.current && el.scrollHeight <= el.clientHeight + 10) load(page.current + 1);
  }, [posts, load]);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-white">
      <Bar title="Saved Posts" fallback="/settings" />
      <div ref={scroller} onScroll={onScroll} className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto pb-tabbar pt-[10px]">
        {tiles.length > 0 && <TileGrid tiles={tiles} onOpen={(t) => viewer.open(t)} />}
        {posts && tiles.length === 0 && (
          <EmptyState glyph={<Sym.bookmark size={60} />} title="No saved posts" body="Posts you bookmark will appear here." className="absolute inset-0" />
        )}
      </div>
      {viewer.node}
    </div>
  );
}
