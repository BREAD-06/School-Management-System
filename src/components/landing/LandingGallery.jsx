import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal, { SectionHeading } from './Reveal.jsx'
import LandingIcon from './LandingIcon.jsx'

const AUTOPLAY_MS = 4500

export default function LandingGallery({ photos }) {
  const [index, setIndex] = useState(0)
  const count = photos.length
  const touchX = useRef(null)
  const paused = useRef(false)

  const go = useCallback((next) => setIndex((i) => (next + count) % count), [count])

  // Auto-advance (paused on hover / touch).
  useEffect(() => {
    if (count <= 1) return
    const id = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % count)
    }, AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [count])

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; paused.current = true }
  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1))
    touchX.current = null
    paused.current = false
  }

  return (
    <section id="gallery" className="bg-navy-900 py-14 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Gallery"
          title="School Life & Recent Events"
          subtitle="Moments from classrooms, celebrations and the playground."
          light
        />

        <Reveal direction="fade" className="mt-8">
          <div
            className="relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
            onMouseEnter={() => { paused.current = true }}
            onMouseLeave={() => { paused.current = false }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {photos.map((p) => (
                <div key={p.id} className="relative h-[300px] w-full shrink-0 bg-navy-800 sm:h-[500px]">
                  <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
                    {p.event_type && (
                      <span className="inline-block rounded-full bg-gold px-3 py-0.5 text-xs font-semibold text-navy">
                        {p.event_type}
                      </span>
                    )}
                    <h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">{p.title}</h3>
                  </div>
                </div>
              ))}
            </div>

            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  aria-label="Previous"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 text-navy shadow transition hover:bg-white"
                >
                  <LandingIcon name="chevronLeft" className="h-5 w-5" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  aria-label="Next"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 text-navy shadow transition hover:bg-white"
                >
                  <LandingIcon name="chevronRight" className="h-5 w-5" strokeWidth={2} />
                </button>
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                  {photos.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-gold' : 'w-2 bg-white/60 hover:bg-white'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </Reveal>

        <div className="mt-8 text-center">
          <Link
            to="/gallery"
            className="inline-flex items-center gap-2 rounded-lg border border-gold px-6 py-3 text-sm font-semibold text-gold-100 transition hover:bg-gold hover:text-navy"
          >
            View Full Gallery <LandingIcon name="arrowRight" className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  )
}
