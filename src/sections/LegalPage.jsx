import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import BrandMark from '../components/BrandMark'
import RouteLink from '../components/RouteLink'
import Footer from './Footer'
import { LEGAL_DOCS } from '../content/legal'

const sectionId = (num) => `section-${num.replace('.', '-')}`

/*
 * Turns the flat block list from content/legal.js into elements, coalescing
 * each run of `li` blocks into a single <ul> so bullets share one list.
 */
function renderBlocks(blocks) {
  const out = []
  let bullets = []

  const flushBullets = () => {
    if (!bullets.length) return
    out.push(
      <ul key={`ul-${out.length}`} className="mt-4 space-y-2.5 pl-1">
        {bullets.map((text, i) => (
          <li key={i} className="flex gap-3 text-ink-muted">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
            <span>{text}</span>
          </li>
        ))}
      </ul>,
    )
    bullets = []
  }

  blocks.forEach((b, i) => {
    if (b.type === 'li') {
      bullets.push(b.text)
      return
    }
    flushBullets()

    if (b.type === 'h2') {
      out.push(
        <h2
          key={i}
          id={sectionId(b.num)}
          className="scroll-mt-28 pt-10 text-xl font-extrabold tracking-tight text-ink sm:text-2xl"
        >
          <span className="text-orange-500">{b.num}.</span> {b.text}
        </h2>,
      )
      return
    }

    if (b.type === 'h3') {
      out.push(
        <h3 key={i} className="pt-6 text-base font-bold text-ink sm:text-lg">
          {b.num} {b.text}
        </h3>,
      )
      return
    }

    out.push(
      <p key={i} className="mt-4 text-ink-muted">
        {b.label && <span className="font-semibold text-ink">{b.label}: </span>}
        {b.text}
      </p>,
    )
  })

  flushBullets()
  return out
}

export default function LegalPage({ slug }) {
  const doc = LEGAL_DOCS[slug]
  const other = slug === 'privacy' ? LEGAL_DOCS.terms : LEGAL_DOCS.privacy
  const sections = doc.blocks.filter((b) => b.type === 'h2')

  useEffect(() => {
    document.title = `${doc.title} — Dually`
  }, [doc])

  return (
    <div className="relative min-h-screen bg-paper">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-paper/85 backdrop-blur-xl">
        <div className="container-px flex items-center justify-between gap-4 py-3">
          <RouteLink to="/" className="flex shrink-0 items-center gap-0">
            <BrandMark className="h-9 w-9" />
            {/* Matches the navbar lockup: the PNG's transparent right edge
                needs a negative margin to sit tight against the wordmark. */}
            <span className="-ml-1.5 text-lg font-extrabold tracking-tight text-ink">
              Dually
            </span>
          </RouteLink>

          <RouteLink
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-black/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </RouteLink>
        </div>
      </header>

      <main>
        <div className="container-px pb-20 pt-12 sm:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="pill bg-peach text-orange-700">Legal</span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
              {doc.title}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-ink-muted">{doc.intro}</p>
            <p className="mt-4 text-sm text-ink-muted/80">
              Last updated {doc.updated}
            </p>
          </div>

          <div className="mt-12 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
            {/* Contents — sticky beside the document on large screens, and
                skipped entirely on small ones where it would just be a wall of
                links above the text. */}
            <nav
              aria-label="Contents"
              className="hidden w-64 shrink-0 lg:sticky lg:top-24 lg:block"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-ink-muted/70">
                Contents
              </p>
              <ul className="mt-4 space-y-1">
                {sections.map((s) => (
                  <li key={s.num}>
                    <a
                      href={`#${sectionId(s.num)}`}
                      className="block rounded-xl px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-black/5 hover:text-ink"
                    >
                      {s.num}. {s.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <article className="min-w-0 flex-1 rounded-4xl bg-white/70 p-6 shadow-soft ring-1 ring-black/5 sm:p-10">
              {/* The first block is the document's preamble, so it gets lead
                  styling and the numbered sections start after it. */}
              <div className="[&>h2:first-child]:pt-0 [&>p:first-child]:mt-0 [&>p:first-child]:text-lg [&>p:first-child]:text-ink">
                {renderBlocks(doc.blocks)}
              </div>

              <div className="mt-12 border-t border-black/10 pt-6">
                <RouteLink
                  to={`/${other.slug}`}
                  className="text-sm font-semibold text-orange-600 transition-colors hover:text-orange-700"
                >
                  Read our {other.title} →
                </RouteLink>
              </div>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
