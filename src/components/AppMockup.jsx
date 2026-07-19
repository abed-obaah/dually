import { Heart, MessageCircle, Share2, Radio, Camera, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * Detailed, realistic iPhone mockup (titanium frame + Dynamic Island +
 * side buttons + status bar + home indicator) showing a dual-camera
 * livestream screen. Built entirely from CSS + SVG — no image asset.
 *
 * Reused for every phone on the page. To drop in a real screenshot,
 * replace the contents of `.screen` below with <img src="..." />.
 */
export default function AppMockup({ className = '', reactions = true }) {
  return (
    <div className={`relative ${className}`}>
      {/* Titanium metal frame */}
      <div className="relative rounded-[3rem] bg-gradient-to-br from-[#efeadd] via-[#d6d1bf] to-[#b1ac99] p-[4px] shadow-[0_45px_90px_-28px_rgba(24,24,27,0.45)]">
        {/* Side buttons */}
        <span className="absolute -left-[3px] top-[20%] h-9 w-[3px] rounded-l-sm bg-[#a9a48f]" />
        <span className="absolute -left-[3px] top-[31%] h-14 w-[3px] rounded-l-sm bg-[#a9a48f]" />
        <span className="absolute -left-[3px] top-[45%] h-14 w-[3px] rounded-l-sm bg-[#a9a48f]" />
        <span className="absolute -right-[3px] top-[28%] h-20 w-[3px] rounded-r-sm bg-[#a9a48f]" />

        {/* Black bezel */}
        <div className="relative rounded-[2.72rem] bg-black p-[9px]">
          {/* Screen */}
          <div className="screen relative aspect-[9/19.5] overflow-hidden rounded-[2.2rem] bg-gradient-to-b from-orange-500 via-orange-600 to-night">
            {/* Rear-camera "scene" */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_50%)]" />
            <div className="absolute inset-0 bg-[conic-gradient(from_200deg_at_65%_30%,rgba(253,186,116,0.45),rgba(234,88,12,0.25),transparent)]" />

            {/* Dynamic Island */}
            <div className="absolute left-1/2 top-2.5 z-40 flex h-[26px] w-[86px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#191527] ring-1 ring-white/5" />
            </div>

            {/* Status row */}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[42px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                <Radio className="h-3 w-3" /> LIVE
              </span>
              <span className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
                02:14
              </span>
            </div>

            {/* Front-camera picture-in-picture (dual camera) */}
            <div className="absolute right-3 top-[88px] h-28 w-20 overflow-hidden rounded-2xl border-2 border-white/70 shadow-lg">
              <div className="h-full w-full bg-gradient-to-br from-amber-200 via-orange-300 to-orange-500" />
              <span className="absolute bottom-1 left-1 rounded bg-black/40 px-1 text-[8px] font-medium text-white">
                Front
              </span>
            </div>
            <span className="absolute left-3 top-[88px] rounded bg-black/30 px-1.5 py-0.5 text-[8px] font-medium text-white backdrop-blur">
              Rear
            </span>

            {/* AR overlay ring */}
            <motion.div
              className="absolute right-6 top-[104px] h-16 w-16 rounded-full border-2 border-dashed border-white/70"
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            />

            {/* Floating reaction hearts */}
            {reactions &&
              [0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute bottom-28 left-6 text-white"
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], y: [-4, -70] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.9,
                    ease: 'easeOut',
                  }}
                >
                  <Heart className="h-5 w-5 fill-current" />
                </motion.div>
              ))}

            {/* Chat bubbles */}
            <div className="absolute inset-x-3 bottom-[88px] space-y-1.5">
              <div className="w-max max-w-[80%] rounded-2xl bg-black/35 px-3 py-1.5 text-[10px] text-white backdrop-blur">
                <span className="font-semibold text-orange-200">@maya</span> this AR
                filter is 🔥
              </div>
              <div className="w-max max-w-[80%] rounded-2xl bg-black/35 px-3 py-1.5 text-[10px] text-white backdrop-blur">
                <span className="font-semibold text-amber-200">@leo</span> dual cam is
                insane
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 pb-7">
              <div className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-300 to-orange-500" />
                <span className="text-[10px] font-semibold text-white">@dually</span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <Camera className="h-5 w-5" />
                <Sparkles className="h-5 w-5" />
                <MessageCircle className="h-5 w-5" />
                <Share2 className="h-5 w-5" />
              </div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-2 left-1/2 z-40 h-1 w-1/3 -translate-x-1/2 rounded-full bg-white/60" />
          </div>
        </div>
      </div>
    </div>
  )
}
