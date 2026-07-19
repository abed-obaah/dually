/**
 * Decorative placeholder QR code (deterministic SVG pattern).
 * Replace with a real QR image (<img src="/qr-ios.png" />) for production.
 */
export default function QRCode({ seed = 1, className = 'h-28 w-28' }) {
  const size = 11
  const cells = []
  let x = seed * 9301 + 49297
  const rand = () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Keep the three finder squares in the corners solid.
      const inFinder =
        (r < 3 && c < 3) || (r < 3 && c >= size - 3) || (r >= size - 3 && c < 3)
      const on = inFinder ? true : rand() > 0.5
      if (on) cells.push(`${c},${r}`)
    }
  }

  return (
    <div
      className={`rounded-2xl bg-white p-2.5 ${className}`}
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
        {cells.map((k) => {
          const [c, r] = k.split(',')
          return <rect key={k} x={c} y={r} width="1" height="1" fill="#0C0B0A" />
        })}
        {/* Finder square rings (white centers) */}
        {[
          [0, 0],
          [size - 3, 0],
          [0, size - 3],
        ].map(([fx, fy]) => (
          <rect
            key={`${fx}-${fy}`}
            x={fx + 1}
            y={fy + 1}
            width="1"
            height="1"
            fill="#fff"
          />
        ))}
      </svg>
    </div>
  )
}
