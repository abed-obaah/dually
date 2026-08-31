import { Instagram, Facebook } from 'lucide-react'
import BrandMark from '../components/BrandMark'
import RouteLink from '../components/RouteLink'

// lucide still ships the old Twitter bird, so the X wordmark is inlined here to
// match the icon set's 24x24 grid and currentColor styling.
function XIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// Rooted at "/" so they also work from the legal pages, where the landing
// page's sections aren't mounted and a bare "#about" would do nothing.
const NAV = [
  { label: 'About App', href: '/#about' },
  { label: 'Features', href: '/#features' },
  { label: 'Reviews', href: '/#reviews' },
  { label: 'FAQ', href: '/#faq' },
]

const SOCIALS = [
  { icon: XIcon, label: 'X', href: 'https://x.com/duallyapp' },
  {
    icon: Instagram,
    label: 'Instagram',
    href: 'https://www.instagram.com/dually.app',
  },
  {
    icon: Facebook,
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61588459963303',
  },
]

export default function Footer() {
  return (
    <footer className="bg-night pb-10 pt-24 text-white sm:pt-32">
      <div className="container-px">
        <div className="flex flex-col items-center gap-8 border-b border-white/10 pb-10 text-center">
          <a href="/#top" className="flex items-center gap-0">
            <BrandMark className="h-9 w-9" />
            {/* The logo PNG carries ~8.5px of transparent padding on its right
                edge at this size, so the wordmark needs a negative margin to
                sit tight against the mark. */}
            <span className="text-lg font-extrabold tracking-tight text-white -ml-1.5">
              Dually
            </span>
          </a>

          <nav>
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {NAV.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-[0.9375rem] text-white/60 transition-colors hover:text-white"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex gap-3">
            {SOCIALS.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-orange-500 hover:bg-orange-500/10 hover:text-orange-400"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 text-sm text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Dually. All rights reserved.</p>
          <div className="flex gap-6">
            <RouteLink to="/privacy" className="transition-colors hover:text-white">
              Privacy Policy
            </RouteLink>
            <RouteLink to="/terms" className="transition-colors hover:text-white">
              Terms &amp; Conditions
            </RouteLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
