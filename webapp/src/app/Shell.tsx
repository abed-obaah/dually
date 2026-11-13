// Main container after login (CustomTabbarViewController). Tab roots stay
// mounted (like iOS tab stacks keep state); pushed screens render on top.
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { matchRoutes, useLocation, useNavigate, useRoutes } from 'react-router-dom';
import { session } from '../lib/session';
import { TabBar } from './TabBar';
import { TABS, type AppRoute, type Tab } from './types';
import { routes as homeRoutes } from '../features/home/routes';
import { routes as exploreRoutes } from '../features/explore/routes';
import { routes as cameraRoutes } from '../features/camera/routes';
import { routes as profileRoutes } from '../features/profile/routes';
import { routes as settingsRoutes } from '../features/settings/routes';
import { routes as liveRoutes } from '../features/live/routes';

const ROOTS: Record<Tab, ComponentType<{ active: boolean }>> = {
  home: lazy(() => import('../features/home/HomeTab')),
  explore: lazy(() => import('../features/explore/ExploreTab')),
  camera: lazy(() => import('../features/camera/CameraTab')),
  profile: lazy(() => import('../features/profile/ProfileTab')),
  settings: lazy(() => import('../features/settings/SettingsTab')),
};

export const PUSHED: AppRoute[] = [...homeRoutes, ...exploreRoutes, ...cameraRoutes, ...profileRoutes, ...settingsRoutes, ...liveRoutes];

/** Which tab a URL belongs to. Pushed screens outside a tab prefix keep the last tab. */
function tabFor(path: string, fallback: Tab): Tab {
  const seg = path.split('/')[1] as Tab;
  return TABS.includes(seg) ? seg : fallback;
}

export default function Shell() {
  const loc = useLocation();
  const navigate = useNavigate();
  const lastTab = useRef<Tab>('camera');
  const tab = tabFor(loc.pathname, lastTab.current);
  lastTab.current = tab;
  const [mounted, setMounted] = useState<Set<Tab>>(() => new Set([tab]));
  useEffect(() => { setMounted((m) => (m.has(tab) ? m : new Set(m).add(tab))); }, [tab]);

  useEffect(() => {
    session.loadProfile().catch(() => {});
    session.refreshUnread();
    session.refreshReports();
  }, []);

  const pushed = useMemo(() => {
    const isRoot = TABS.some((t) => loc.pathname === '/' + t || loc.pathname === '/' + t + '/');
    if (isRoot) return null;
    const m = matchRoutes(PUSHED.map((r) => ({ path: r.path })), loc);
    if (!m) return null;
    return PUSHED.find((r) => r.path === m[0].route.path) ?? null;
  }, [loc]);

  const showTabBar = pushed ? pushed.tabBar !== false : true;
  // Render through useRoutes so pushed screens get route params (useParams).
  const pushedElement = useRoutes(PUSHED.map((r) => ({ path: r.path, element: r.element })), loc);

  return (
    <div className="device">
      {TABS.map((t) => {
        if (!mounted.has(t)) return null;
        const Root = ROOTS[t];
        return (
          <div key={t} className="absolute inset-0" style={{ display: t === tab ? 'block' : 'none' }}>
            <Suspense fallback={null}><Root active={t === tab && !pushed} /></Suspense>
          </div>
        );
      })}
      {pushed && (
        <div key={loc.key} className="anim-push absolute inset-0 z-[100]">
          <Suspense fallback={null}>{pushedElement}</Suspense>
        </div>
      )}
      {showTabBar && <TabBar current={tab} onSelect={(t) => navigate('/' + t)} />}
      <div id="modal-root" className="pointer-events-none absolute inset-0 z-[600]" />
    </div>
  );
}
