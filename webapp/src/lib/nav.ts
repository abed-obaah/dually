// Navigation helpers mimicking UINavigationController push/pop on top of react-router.
import { useLocation, useNavigate } from 'react-router-dom';

export function useNav() {
  const navigate = useNavigate();
  const loc = useLocation();
  return {
    push: (to: string, state?: unknown) => navigate(to, { state }),
    replace: (to: string, state?: unknown) => navigate(to, { replace: true, state }),
    /** Pop; falls back to the tab root (first path segment) when there is no history. */
    back: (fallback?: string) => {
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) navigate(-1);
      else navigate(fallback ?? '/' + (loc.pathname.split('/')[1] || 'camera'), { replace: true });
    },
    /** Reset to a root, e.g. after logout → '/login'. */
    reset: (to: string) => navigate(to, { replace: true }),
    location: loc,
  };
}
