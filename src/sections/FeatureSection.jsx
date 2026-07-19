import Reveal from '../components/Reveal'
import FeatureCards from '../components/FeatureCards'

export default function FeatureSection() {
  return (
    <section id="features" className="scroll-mt-24 bg-night pb-24 sm:pb-32">
      <div className="container-px">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal as="span" className="pill bg-white text-ink">
            Features
          </Reveal>
          <Reveal
            as="h2"
            delay={0.05}
            className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Smart Features.
            <br />
            Effortless Streaming
          </Reveal>
        </div>

        <div className="mt-14">
          <FeatureCards />
        </div>
      </div>
    </section>
  )
}
