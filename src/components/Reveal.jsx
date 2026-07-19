import { motion } from 'framer-motion'
import { fadeUp, viewportOnce } from '../lib/motion'

/**
 * Convenience wrapper: fades + rises its children when scrolled into view.
 * Pass `delay` to offset, or `variants` to override the default fade-up.
 */
export default function Reveal({
  children,
  as = 'div',
  delay = 0,
  variants = fadeUp,
  className = '',
  ...props
}) {
  const MotionTag = motion[as] || motion.div
  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      transition={{ delay }}
      {...props}
    >
      {children}
    </MotionTag>
  )
}
