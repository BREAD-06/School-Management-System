import { IMAGES } from '../../lib/landingContent.js'
import LandingIcon from './LandingIcon.jsx'

export default function LandingHero({ hero, image = IMAGES.hero }) {
  return (
    <section id="home" className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background image */}
      <img
        src={image}
        alt="Students at Bala Ji Public School"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Dark overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900/80 via-navy-900/60 to-navy-900/80" />

      <div className="relative mx-auto max-w-4xl animate-fade-up px-4 pt-24 text-center sm:px-6">
        <p className="mb-4 inline-block rounded-full border border-gold/40 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold-100 backdrop-blur-sm">
          Bala Ji Public School · Yamunanagar
        </p>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-sm sm:text-5xl md:text-6xl">
          {hero.headline}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-white/85 sm:text-lg">
          {hero.subheadline}
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#contact"
            className="w-full rounded-lg bg-gold px-7 py-3 text-sm font-semibold text-navy shadow-lg transition duration-200 hover:scale-[1.02] hover:bg-gold-600 hover:text-white active:scale-100 sm:w-auto"
          >
            Apply for Admission
          </a>
          <a
            href="#about"
            className="w-full rounded-lg border border-white/70 bg-white/5 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition duration-200 hover:scale-[1.02] hover:bg-white hover:text-navy active:scale-100 sm:w-auto"
          >
            Learn More
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#about"
        aria-label="Scroll to content"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 transition hover:text-gold-400"
      >
        <span className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-current p-1">
          <span className="h-2 w-1 animate-scroll-bounce rounded-full bg-current" />
        </span>
      </a>
    </section>
  )
}
