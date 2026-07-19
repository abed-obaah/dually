import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, viewportOnce } from '../lib/motion'

const STATS = [
  { value: '30K+', label: 'Active Creators' },
  { value: '4.9', label: 'App Store Rating' },
  { value: '12+', label: 'Countries' },
  { value: '99%', label: 'Satisfied Creators' },
]

export default function StatsSection() {
  return (
    <section className="relative pt-8 pb-20 sm:pb-28">
      <div className="container-px">
        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mx-auto max-w-4xl rounded-4xl border border-black/5 bg-white/60 px-6 py-8 shadow-soft backdrop-blur-sm sm:px-10"
        >
          <motion.p
            variants={fadeUp}
            className="mb-6 text-center text-sm font-medium text-ink-muted"
          >
            Results at a glance
          </motion.p>
          <div className="grid grid-cols-2 gap-y-8 sm:grid-cols-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                className={`text-center ${
                  i > 0 ? 'sm:border-l sm:border-black/10' : ''
                }`}
              >
                <p className="text-[28px] font-bold leading-none tracking-tight text-ink sm:text-[32px]">
                  {s.value}
                </p>
                <p className="mt-2 text-sm text-ink-muted">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
