import { navigate } from '../lib/router'

/*
 * An <a> that routes client-side but stays a real link: the href is always
 * present for crawlers and for "open in new tab", and modified clicks
 * (cmd/ctrl/shift/alt, middle-click) fall through to the browser.
 */
export default function RouteLink({ to, children, onClick, ...props }) {
  const handleClick = (e) => {
    onClick?.(e)
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return
    }
    e.preventDefault()
    navigate(to)
  }

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}
