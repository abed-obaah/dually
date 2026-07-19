// Shared Framer Motion variants used across sections.
// These mirror the reference site's signature entrance feel:
// fade in + rise + blur-in (soft → sharp), gently staggered.

// Smooth easeOutExpo-like curve — the classic "Framer" settle.
export const EASE = [0.16, 1, 0.3, 1]

// Fade + rise + blur-in. Ideal for headings & blocks entering the viewport.
export const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: 'blur(10px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.75, ease: EASE },
  },
}

// Same feel, smaller travel — for finer/inline elements.
export const fadeUpSmall = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: EASE },
  },
}

export const fadeIn = {
  hidden: { opacity: 0, filter: 'blur(8px)' },
  show: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.8, ease: EASE } },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92, filter: 'blur(10px)' },
  show: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.75, ease: EASE },
  },
}

// Parent container that staggers its children as they enter.
export const staggerContainer = (stagger = 0.12, delay = 0) => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
})

// Default viewport config: animate once, a little before fully in view.
export const viewportOnce = { once: true, amount: 0.25 }
