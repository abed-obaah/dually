import { motion } from 'framer-motion'
import { Apple, Play } from 'lucide-react'
import Reveal from '../components/Reveal'
import QRCode from '../components/QRCode'
import { scaleIn } from '../lib/motion'

function StoreCard({ platform, icon: Icon, storeLabel, storeName, seed }) {
  return (
    <motion.div
      variants={scaleIn}
      className="flex flex-col items-center rounded-4xl border border-white/10 bg-card p-6 text-center"
    >
      <p className="mb-4 text-sm font-semibold text-white/60">{platform}</p>
      <QRCode seed={seed} className="h-32 w-32" />
      <p className="mt-4 mb-4 max-w-[10rem] text-xs text-white/50">
        Scan the QR code to download on {platform}
      </p>
      <motion.a
        href="#"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className="inline-flex items-center gap-2.5 rounded-full bg-white px-5 py-3 text-left text-ink"
      >
        <Icon className="h-6 w-6" />
        <span className="leading-tight">
          <span className="block text-[10px] font-medium text-ink-muted">
            {storeLabel}
          </span>
          <span className="block text-sm font-bold">{storeName}</span>
        </span>
      </motion.a>
    </motion.div>
  )
}

export default function DownloadSection() {
  return (
    <section id="download" className="scroll-mt-24 bg-night pt-24 sm:pt-32">
      <div className="container-px">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal
            as="h2"
            className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Download Dually today and stream from{' '}
            <span className="text-orange-500">every angle</span>
          </Reveal>
          <Reveal
            as="p"
            delay={0.08}
            className="mx-auto mt-5 max-w-lg text-lg text-white/60"
          >
            Scan the QR code or tap below to get early access, exclusive AR packs,
            and creator perks.
          </Reveal>
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={{ show: { transition: { staggerChildren: 0.12 } } }}
          className="mx-auto mt-14 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2"
        >
          <StoreCard
            platform="iOS"
            icon={Apple}
            storeLabel="Download on the"
            storeName="App Store"
            seed={7}
          />
          <StoreCard
            platform="Android"
            icon={Play}
            storeLabel="Get it on"
            storeName="Google Play"
            seed={13}
          />
        </motion.div>
      </div>
    </section>
  )
}
