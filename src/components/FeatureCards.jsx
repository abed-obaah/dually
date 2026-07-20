import { motion } from 'framer-motion'
import {
  Camera,
  Sparkles,
  DollarSign,
  MessageSquare,
  Heart,
  TrendingUp,
} from 'lucide-react'
import { fadeUp, staggerContainer, viewportOnce } from '../lib/motion'

/* ---- Per-feature placeholder illustrations (pure CSS/SVG) ---- */

function DualCamMock() {
  return (
    <div className="flex h-full items-center justify-center gap-3">
      <div className="relative h-32 w-20 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-orange-500/40 to-night">
        <span className="absolute left-1.5 top-1.5 rounded bg-black/40 px-1 text-[8px] text-white">
          Rear
        </span>
        <div className="absolute bottom-2 right-1.5 h-10 w-7 rounded-lg border border-white/50 bg-gradient-to-br from-amber-200 to-orange-500" />
      </div>
      <div className="rounded-full bg-orange-500 p-2 text-white shadow-glow">
        <Camera className="h-4 w-4" />
      </div>
      <div className="relative h-32 w-20 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-amber-300/40 to-night">
        <span className="absolute left-1.5 top-1.5 rounded bg-black/40 px-1 text-[8px] text-white">
          Front
        </span>
      </div>
    </div>
  )
}

function ArMock() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <motion.div
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-orange-400/70"
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      >
        <Sparkles className="h-6 w-6 text-orange-400" />
      </motion.div>
      <div className="flex gap-2">
        {['Neon', 'Aura', 'Glow'].map((f) => (
          <span
            key={f}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/80"
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}

function MoneyMock() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2.5">
      <div className="w-full max-w-[190px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-extrabold text-white">$1,240</p>
            <p className="text-[10px] text-white/50">Earned this stream</p>
          </div>
          <span className="rounded-full bg-orange-500/20 p-2 text-orange-400">
            <TrendingUp className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-orange-400 to-orange-600" />
        </div>
      </div>
      <div className="flex gap-2 text-[10px] text-white/60">
        <span className="rounded-full bg-white/5 px-2 py-0.5">Tips</span>
        <span className="rounded-full bg-white/5 px-2 py-0.5">Subs</span>
        <span className="rounded-full bg-white/5 px-2 py-0.5">Collabs</span>
      </div>
    </div>
  )
}

function EngageMock() {
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div className="w-max max-w-[80%] rounded-2xl rounded-bl-sm bg-white/10 px-3 py-1.5 text-[11px] text-white/90">
        <span className="font-semibold text-orange-300">@maya</span> loving this 🔥
      </div>
      <div className="ml-auto flex items-center gap-1.5 rounded-full bg-orange-500/20 px-3 py-1.5 text-[11px] text-orange-200">
        <Heart className="h-3.5 w-3.5 fill-current" /> 8.2k reactions
      </div>
      <div className="w-max max-w-[80%] rounded-2xl rounded-bl-sm bg-white/10 px-3 py-1.5 text-[11px] text-white/90">
        <span className="font-semibold text-amber-300">@leo</span> dual cam!!
      </div>
    </div>
  )
}

const FEATURES = [
  {
    icon: Camera,
    title: 'Dual Camera Streaming',
    description:
      'Broadcast from your front and rear cameras simultaneously.',
    Mock: DualCamMock,
  },
  // {
  //   icon: Sparkles,
  //   title: 'Augmented Reality Effects',
  //   description: 'Add interactive AR filters and effects while streaming live.',
  //   Mock: ArMock,
  // },
  // {
  //   icon: DollarSign,
  //   title: 'Creator Monetization',
  //   description: 'Turn your audience into a thriving community.',
  //   Mock: MoneyMock,
  // },
  {
    icon: MessageSquare,
    title: 'Real-Time Engagement',
    description:
      'Interact with viewers instantly through live reactions and chat.',
    Mock: EngageMock,
  },
]

function FeatureCard({ icon: Icon, title, description, Mock }) {
  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group overflow-hidden rounded-4xl border border-white/10 bg-card p-6 shadow-card"
    >
      {/* Illustration */}
      <div className="relative mb-6 h-44 overflow-hidden rounded-3xl border border-white/5 bg-[radial-gradient(circle_at_50%_0%,rgba(242,102,28,0.18),transparent_60%)]">
        <Mock />
      </div>

      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-lg font-bold tracking-tight text-white">{title}</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/60">
            {description}
          </p>
        </div>
      </div>
    </motion.article>
  )
}

export default function FeatureCards() {
  return (
    <motion.div
      variants={staggerContainer(0.12)}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      className="grid grid-cols-1 gap-6 md:grid-cols-2"
    >
      {FEATURES.map((f) => (
        <FeatureCard key={f.title} {...f} />
      ))}
    </motion.div>
  )
}
