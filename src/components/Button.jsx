import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

/**
 * Reusable animated button, rendered as an <a> anchor CTA.
 * variant:
 *   "dark"      — black pill (primary), used for downloads / nav CTA
 *   "store"     — black pill with leading icon + trailing chevron (app-store style)
 *   "light"     — cream/white pill on dark backgrounds
 *   "outline"   — bordered pill
 */
export default function Button({
  children,
  variant = 'dark',
  href = '#',
  className = '',
  icon: Icon,
  chevron = false,
  ...props
}) {
  const base =
    'group inline-flex items-center justify-center gap-2.5 font-semibold tracking-tight transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper'

  const variants = {
    dark: 'rounded-full bg-ink text-white px-6 py-3 text-[15px] shadow-btn hover:bg-black',
    // App-store style CTA: 12px radius rounded rectangle (matches reference)
    store:
      'rounded-xl bg-ink text-white px-6 py-3.5 text-[15px] shadow-btn hover:bg-black',
    light:
      'rounded-full bg-white text-ink px-6 py-3 text-[15px] shadow-soft hover:bg-white/90',
    outline:
      'rounded-full border border-black/15 bg-transparent text-ink px-6 py-3 text-[15px] hover:border-black/30',
  }

  return (
    <motion.a
      href={href}
      className={`${base} ${variants[variant]} ${className}`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      {...props}
    >
      {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
      <span>{children}</span>
      {chevron && (
        <ChevronDown
          className="h-4 w-4 opacity-70 transition-transform group-hover:translate-y-0.5"
          aria-hidden="true"
        />
      )}
    </motion.a>
  )
}
