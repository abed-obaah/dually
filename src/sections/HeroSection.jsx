import { motion } from 'framer-motion'
import { Apple, Play } from 'lucide-react'
import Button from '../components/Button'
import AppMockup from '../components/AppMockup'
import BrandMark from '../components/BrandMark'
import { fadeUp, staggerContainer, EASE } from '../lib/motion'

export default function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden pt-28 sm:pt-32">
      {/* Soft radial glow at the base of the hero */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-40 hero-glow" />

      <div className="container-px relative">
        <motion.div
          variants={staggerContainer(0.12)}
          initial="hidden"
          animate="show"
          className="mx-auto flex max-w-3xl flex-col items-center text-center"
        >
          {/* App icon */}
          <motion.div variants={fadeUp}>
            <BrandMark className="h-16 w-16 rounded-2xl shadow-soft" />
          </motion.div>

          {/* Availability pill */}
          <motion.span
            variants={fadeUp}
            className="pill mt-6 border border-black/10 bg-white/70 text-ink shadow-sm backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Now available on iOS &amp; Android
          </motion.span>

          {/* Headline — reveals line by line */}
          <motion.h1
            variants={staggerContainer(0.12)}
            className="mt-7 text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl"
          >
            <motion.span variants={fadeUp} className="block text-orange-500">
              Stream Life From
            </motion.span>
            <motion.span variants={fadeUp} className="block text-ink">
              Every Angle
            </motion.span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-muted"
          >
            Go live with dual cameras, immersive AR effects, and next-generation
            audience engagement.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Button href="#download" variant="store" icon={Apple} chevron>
              Download for iOS
            </Button>
            <Button href="#download" variant="store" icon={Play} chevron>
              Download for Android
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Dual phone mockups fanned out, dissolving into the page */}
      <div className="container-px relative">
        <div
          className="relative mx-auto mt-16 h-[400px] max-w-4xl sm:h-[480px] lg:h-[560px]"
          style={{
            WebkitMaskImage:
              'linear-gradient(to bottom, #000 80%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, #000 80%, transparent 100%)',
          }}
        >
          {/* Soft blur glow behind the phones */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div
              className="absolute left-[32%] top-[22%] h-56 w-56 rounded-full bg-orange-400/25 blur-3xl"
              style={{ transform: 'skewY(14deg)' }}
            />
            <div
              className="absolute right-[30%] top-[8%] h-64 w-64 rounded-full bg-orange-300/20 blur-3xl"
              style={{ transform: 'rotate(-150deg) skewY(16deg)' }}
            />
          </div>

          {/* Single centered phone for all viewports */}
          <div className="absolute left-1/2 top-6 w-[min(92vw,380px)] -translate-x-1/2">
            <motion.div
              initial={{ opacity: 0, y: 90, filter: 'blur(12px)', rotate: 0 }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', rotate: 0 }}
              transition={{ duration: 1, delay: 0.5, ease: EASE }}
            >
              <AppMockup className="w-full rotate-0 transform-none" videoOverlay={true} />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
