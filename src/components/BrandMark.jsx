/**
 * Dually app icon. Reused in the navbar, hero, and footer.
 * Pass `src` to choose a logo variant (white on dark surfaces,
 * black on light surfaces). Defaults to the white logo.
 */
export default function BrandMark({
  className = 'h-9 w-9',
  alt = 'Dually logo',
  src = '/dually-logo-white-removebg-preview.png',
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={`inline-block object-contain ${className}`}
    />
  )
}
