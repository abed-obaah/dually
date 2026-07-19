import Navbar from './components/Navbar'
import HeroSection from './sections/HeroSection'
import StatsSection from './sections/StatsSection'
import AboutSection from './sections/AboutSection'
import FeatureSection from './sections/FeatureSection'
import ReviewSection from './sections/ReviewSection'
import FAQSection from './sections/FAQSection'
import DownloadSection from './sections/DownloadSection'
import Footer from './sections/Footer'

export default function App() {
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
