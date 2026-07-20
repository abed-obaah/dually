import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import Reveal from '../components/Reveal'
import { fadeUp, staggerContainer, viewportOnce } from '../lib/motion'

const FAQS = [
  {
    q: 'Is Dually free to download and use?',
    a: 'Yes, absolutely! Dually is completely free to download on both iOS and Android. There are no hidden subscription fees to go live — creators only pay standard platform fees on the earnings they make.',
  },
  {
    q: 'Which devices support dual-camera streaming?',
    a: 'Dually runs on iOS 15+ and Android 11+. Simultaneous front-and-rear streaming requires a device with multi-cam support, which includes most phones released in the last few years.',
  },
  // {
  //   q: 'How does creator monetization work?',
  //   a: 'Creators earn through live tipping, monthly subscriptions, and brand collaborations. Payouts are handled securely in-app, and you keep the majority of everything you earn — no surprise deductions.',
  // },
  {
    q: 'Are the AR effects free to use?',
    a: 'Every creator gets access to our full library of 120+ AR filters and effects at no cost. New effects are added every week, and premium seasonal packs are unlocked as you grow your audience.',
  },
  {
    q: 'Can I switch camera angles mid-stream?',
    a: 'Yes! Tap to switch between front, rear, or split-screen dual view instantly while live — your viewers see the transition seamlessly with no drop in quality.',
  },
  {
    q: 'When does Dually launch publicly?',
    a: 'We\'re currently in early access. Download today to secure priority access, exclusive AR packs, and creator perks before we open the doors fully in your region.',
  },
]

function FaqItem({ q, a, isOpen, onToggle, index }) {
  return (
    <motion.div
      variants={fadeUp}
      className="mb-6 break-inside-avoid rounded-3xl bg-peach"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left"
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${index}`}
      >
        <span className="text-base font-bold text-ink sm:text-[17px]">{q}</span>
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-ink">
          {isOpen ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-panel-${index}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-6 text-[15px] leading-relaxed text-ink-muted">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQSection() {
  // First item in each column open by default (mirrors the reference feel).
  const [openSet, setOpenSet] = useState(new Set([0, 1]))

  const toggle = (i) => {
    setOpenSet((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <section id="faq" className="scroll-mt-24 py-24 sm:py-32">
      <div className="container-px">
        <Reveal
          as="h2"
          className="mb-14 text-center text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl"
        >
          Common questions
        </Reveal>

        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mx-auto max-w-4xl gap-6 sm:columns-2"
        >
          {FAQS.map((f, i) => (
            <FaqItem
              key={f.q}
              index={i}
              q={f.q}
              a={f.a}
              isOpen={openSet.has(i)}
              onToggle={() => toggle(i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
