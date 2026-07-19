import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import Reveal from '../components/Reveal'
import { fadeUp, staggerContainer, viewportOnce } from '../lib/motion'

const REVIEWS = [
  {
    name: 'Maya Chen',
    handle: '@mayastreams',
    date: 'Apr 29',
    avatar: 'from-orange-300 to-orange-500',
    title: 'Dual cam changed everything',
    text: 'My audience can see my reaction AND what I\'m filming at the same time. The interface is clean and never lags. Absolute game changer.',
  },
  {
    name: 'Leo Martins',
    handle: '@leocreates',
    date: 'Apr 29',
    avatar: 'from-amber-300 to-orange-400',
    text: 'The AR effects feel like magic and run buttery smooth. I went from 500 to 40k followers in three months on Dually.',
  },
  {
    name: 'Aisha Bello',
    handle: '@aisha.live',
    date: 'Apr 29',
    avatar: 'from-orange-400 to-orange-600',
    title: 'Monetization is finally simple',
    text: 'Tips, subs, and brand deals all in one place. I earn more here than any other platform I\'ve streamed on.',
  },
  {
    name: 'Diego Torres',
    handle: '@diegoirl',
    date: 'Apr 29',
    avatar: 'from-amber-400 to-orange-500',
    text: 'Real-time reactions make every stream feel like a party. My community has never been more engaged.',
  },
  {
    name: 'Priya Nair',
    handle: '@priyavibes',
    date: 'Apr 29',
    avatar: 'from-orange-300 to-amber-500',
    title: 'Live in 30 seconds',
    text: 'The interface is gorgeous and intuitive. I was streaming within 30 seconds of downloading. Absolutely premium feel.',
  },
  {
    name: 'Sam Okafor',
    handle: '@samgoeslive',
    date: 'Apr 29',
    avatar: 'from-orange-500 to-orange-700',
    text: 'Best streaming app I\'ve used, period. The dual-cam plus AR combo is unmatched by anything out there right now.',
  },
  {
    name: 'Nina Ito',
    handle: '@ninaonair',
    date: 'Apr 29',
    avatar: 'from-amber-300 to-orange-500',
    text: 'Switching between front, rear, and split view mid-stream is seamless. My viewers love the behind-the-scenes angle.',
  },
  {
    name: 'Marcus Webb',
    handle: '@marcuslive',
    date: 'Apr 29',
    avatar: 'from-orange-400 to-amber-600',
    title: 'Smooth UI',
    text: 'Fluid animations, instant load times, and a layout that just makes sense. Huge respect to the design team.',
  },
]

function ReviewCard({ name, handle, date, avatar, title, text }) {
  return (
    <motion.figure
      variants={fadeUp}
      className="mb-6 break-inside-avoid rounded-3xl border border-white/10 bg-card p-6 shadow-card"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-0.5 text-orange-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-current" />
          ))}
        </div>
        <span className="text-xs text-white/40">{date}</span>
      </div>

      {title && <p className="mb-1.5 text-sm font-bold text-white">{title}</p>}
      <blockquote className="text-[14px] leading-relaxed text-white/70">
        “{text}”
      </blockquote>

      <figcaption className="mt-5 flex items-center gap-3">
        <span
          className={`h-9 w-9 rounded-full bg-gradient-to-br ${avatar}`}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-xs text-white/40">{handle}</p>
        </div>
      </figcaption>
    </motion.figure>
  )
}

export default function ReviewSection() {
  return (
    <section id="reviews" className="scroll-mt-24 bg-night pb-24 sm:pb-32">
      <div className="container-px">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Reveal as="span" className="pill bg-white text-ink">
            Reviews
          </Reveal>
          <Reveal
            as="h2"
            delay={0.05}
            className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Loved by creators
          </Reveal>
        </div>

        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="columns-1 gap-6 sm:columns-2 lg:columns-3"
        >
          {REVIEWS.map((r) => (
            <ReviewCard key={r.handle} {...r} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
