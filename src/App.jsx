import Navbar from './components/Navbar'
import HeroSection from './sections/HeroSection'
import StatsSection from './sections/StatsSection'
import AboutSection from './sections/AboutSection'
import FeatureSection from './sections/FeatureSection'
import ReviewSection from './sections/ReviewSection'
import FAQSection from './sections/FAQSection'
import DownloadSection from './sections/DownloadSection'
import Footer from './sections/Footer'
import LegalPage from './sections/LegalPage'
import { useEffect } from 'react'
import { useRoute, SITE_TITLE } from './lib/router'

function LandingPage() {
  useEffect(() => {
    document.title = SITE_TITLE
  }, [])

  return (
    <div className="relative min-h-screen bg-paper">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <AboutSection />
        <FeatureSection />
        <ReviewSection />
        <FAQSection />
        <DownloadSection />
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  const path = useRoute()

  if (path === '/privacy') return <LegalPage slug="privacy" />
  if (path === '/terms') return <LegalPage slug="terms" />

  // Anything else falls back to the landing page rather than a 404 — the site
  // has no other real routes, and Vercel rewrites every path here anyway.
  return <LandingPage />
}
