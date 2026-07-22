import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Download } from 'lucide-react'
import BrandMark from './BrandMark'

const NAV_LINKS = [
  { label: 'About App', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'FAQ', href: '#faq' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const headerRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleMobileNav = (e, href) => {
    e.preventDefault()
    const target = document.querySelector(href)
    const headerHeight = headerRef.current?.offsetHeight ?? 60

    if (target) {
      const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 32
      window.scrollTo({ top, behavior: 'smooth' })
    } else {
      window.location.hash = href
    }

    window.setTimeout(() => setOpen(false), 120)
  }

  return (
    <motion.header
      ref={headerRef}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <nav className="container-px py-4">
        <div
          className={`flex items-center justify-between gap-4 rounded-full py-2 pl-3 pr-2 transition-all duration-300 ${
            scrolled ? 'glass shadow-soft' : 'bg-transparent'
          }`}
        >
          {/* Logo */}
          <a href="#top" className="flex shrink-0 items-center gap-2.5">
            <BrandMark className="h-9 w-9" />
            <span className="text-lg font-extrabold tracking-tight text-ink">
              Dually
            </span>
          </a>

          {/* Desktop links — centered */}
          <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-[15px] font-medium text-ink/80 transition-colors hover:text-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Desktop CTA */}
          <motion.a
            href="#download"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="hidden items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[15px] font-semibold text-white shadow-btn hover:bg-black md:inline-flex"
          >
            Download <Download className="h-4 w-4" />
          </motion.a>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-2 overflow-hidden rounded-3xl glass p-4 shadow-soft md:hidden"
            >
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={(e) => handleMobileNav(e, link.href)}
                      className="block rounded-2xl px-4 py-3 text-base font-medium text-ink transition-colors hover:bg-black/5"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              <a
                href="#download"
                onClick={(e) => handleMobileNav(e, '#download')}
                className="mt-3 flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-white"
              >
                Download <Download className="h-4 w-4" />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  )
}
