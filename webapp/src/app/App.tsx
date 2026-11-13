import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { onSessionExpired } from '../api/client';
import { session } from '../lib/session';
import { store } from '../lib/storage';
import { OverlayHost } from '../ui/overlays';
import { InstallBanner } from './InstallBanner';
import { authRoutes } from '../features/auth/routes';

const Shell = lazy(() => import('./Shell'));

/** Only signed-in users reach the tab shell (iOS routes on isUserLoggedIn). */
function RequireAuth() {
  const loc = useLocation();
  if (!store.loggedIn || !store.token) {
    // Remember a deep link (e.g. /post/123) to replay after login, like iOS pendingDeepLink.
    if (loc.pathname.startsWith('/post/')) sessionStorage.setItem('pendingDeepLink', loc.pathname);
    return <Navigate to="/" replace />;
  }
  return (
    <Suspense fallback={<div className="device" />}>
      <Shell />
    </Suspense>
  );
}

function SessionWatcher() {
  const navigate = useNavigate();
  useEffect(() => onSessionExpired(() => { session.clear(); navigate('/login', { replace: true }); }), [navigate]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <SessionWatcher />
      <Routes>
        {authRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={<div className="device">{r.element}</div>} />
        ))}
        <Route path="/api/post/:id" element={<PostLinkRedirect />} />
        <Route path="*" element={<RequireAuth />} />
      </Routes>
      {/* Overlays are positioned inside .device via a portal-free absolute layer. */}
      <div className="pointer-events-none fixed inset-0 z-[900] flex items-center justify-center">
        <div className="device pointer-events-none !bg-transparent" style={{ boxShadow: 'none' }}>
          <div className="pointer-events-auto contents"><OverlayHost /></div>
        </div>
      </div>
      <InstallBanner />
    </BrowserRouter>
  );
}

function PostLinkRedirect() {
  const id = useLocation().pathname.split('/').pop();
  return <Navigate to={`/post/${id}`} replace />;
}
