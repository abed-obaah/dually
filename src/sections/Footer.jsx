import { Twitter, Instagram, Youtube, Github } from 'lucide-react'
import BrandMark from '../components/BrandMark'

const NAV = [
  { label: 'About App', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'FAQ', href: '#faq' },
]

const SOCIALS = [
  { icon: Twitter, label: 'Twitter' },
  { icon: Instagram, label: 'Instagram' },
  { icon: Youtube, label: 'YouTube' },
  { icon: Github, label: 'GitHub' },
]

export default function Footer() {
  return (
    <footer className="bg-night pb-10 pt-24 text-white sm:pt-32">
      <div className="container-px">
        <div className="flex flex-col items-center gap-8 border-b border-white/10 pb-10 text-center">
          <a href="#top" className="flex items-center gap-0">
            <BrandMark className="h-9 w-9" src="/dually-logo-black.20_PM-removebg-preview.png" />
            <span className="text-lg font-extrabold tracking-tight -ml-0.5">Dually</span>
          </a>

          <nav>
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {NAV.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-[15px] text-white/60 transition-colors hover:text-white"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex gap-3">
            {SOCIALS.map(({ icon: Icon, label }) => (
              <a
                key={label}
                href="#"
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
            <a href="#" className="transition-colors hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="transition-colors hover:text-white">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
