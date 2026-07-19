import Reveal from '../components/Reveal'

export default function AboutSection() {
  return (
    <section id="about" className="scroll-mt-24 bg-night py-24 sm:py-32">
      <div className="container-px">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal
            as="span"
            className="pill bg-white text-ink"
          >
            About App
          </Reveal>

          <Reveal
            as="h2"
            delay={0.05}
            className="mt-8 text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[3.25rem] lg:leading-[1.12]"
          >
            A streaming studio that fits in your pocket — capturing every angle
            with immersive AR.{' '}
            <span className="text-orange-500">
              Dual cameras, real-time effects, and a community that pays — all in
              one app.
            </span>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
