/**
 * Dually app icon — uses the real logo from /public/logo.png.
 * Reused in the navbar, hero, and footer. To change the logo,
 * replace public/logo.png (keeps the same import path).
 */
export default function BrandMark({ className = 'h-9 w-9', alt = 'Dually logo' }) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      className={`inline-block rounded-2xl object-cover ${className}`}
    />
  )
}
