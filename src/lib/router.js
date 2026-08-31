/*
 * A ~40-line path router.
 *
 * The site is one landing page plus two legal documents, so pulling in
 * react-router for three routes isn't worth the bytes. This tracks
 * `location.pathname` and re-renders on both real popstate events (back /
 * forward) and the synthetic one `navigate()` dispatches after a pushState.
 *
 * Deep links work because vercel.json rewrites every unknown path to
 * index.html; on a static host without that rewrite, /privacy would 404.
 */
import { useEffect, useState } from 'react'

// Normalised so '/privacy' and '/privacy/' are the same route, and '/' stays '/'.
export function currentPath() {
  return window.location.pathname.replace(/\/+$/, '') || '/'
}

export function useRoute() {
  const [path, setPath] = useState(currentPath)

  useEffect(() => {
    const onPop = () => setPath(currentPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return path
}

export function navigate(to) {
  const [path, hash] = to.split('#')
  if (currentPath() === path) return

  window.history.pushState(null, '', to)
  // <html> carries `scroll-smooth`, so a default scrollTo here would only
  // *start* an animation that the re-render then cancels, leaving the new page
  // opened at the old page's offset. 'instant' lands it before we swap.
  if (!hash) window.scrollTo({ top: 0, behavior: 'instant' })
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// The title index.html ships with, restored whenever we route back to the
// landing page — otherwise the last legal page's title sticks in the tab.
export const SITE_TITLE = 'Dually — Stream Live From Every Angle'
