import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { GALLERY_FALLBACK } from '../lib/landingContent.js'
import LandingHeader from '../components/landing/LandingHeader.jsx'
import LandingFooter from '../components/landing/LandingFooter.jsx'
import LandingIcon from '../components/landing/LandingIcon.jsx'

// Public, unauthenticated full gallery page. Reads all rows from the `gallery`
// table via the anon key. Any fetch failure falls back to the hardcoded
// placeholders so the page always renders for visitors.
export default function PublicGallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [lightbox, setLightbox] = useState(null) // photo object or null

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data, error } = await supabase
        .from('gallery')
        .select('id, title, event_type, image_url, created_at')
        .order('created_at', { ascending: false })
      if (!active) return
      if (!error && data?.length) setPhotos(data)
      else setPhotos(GALLERY_FALLBACK)
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  // Distinct event types present in the data, for the filter chips.
  const eventTypes = useMemo(() => {
    const set = new Set(photos.map(p => p.event_type).filter(Boolean))
    return ['All', ...Array.from(set)]
  }, [photos])

  const visible = filter === 'All' ? photos : photos.filter(p => p.event_type === filter)

  // Close the lightbox on Escape.
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      <main>
        {/* Page header band (sits below the fixed site header) */}
        <section className="bg-navy pt-28 pb-12 text-white sm:pt-32 sm:pb-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-gold-100 transition hover:text-gold-400">
              <LandingIcon name="chevronLeft" className="h-4 w-4" strokeWidth={2} /> Back to Home
            </Link>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Photo Gallery</h1>
            <p className="mt-2 text-sm text-white/75 sm:text-base">
              Moments from classrooms, celebrations, sports and the everyday life of Bala Ji Public School.
            </p>
          </div>
        </section>

        <section className="bg-slate-50 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {/* Filter chips */}
            {eventTypes.length > 1 && (
              <div className="mb-8 flex flex-wrap gap-2">
                {eventTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilter(type)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      filter === type
                        ? 'bg-navy text-white'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="py-20 text-center text-sm text-slate-500">Loading photos…</div>
            ) : visible.length === 0 ? (
              <div className="rounded-2xl bg-white px-6 py-16 text-center text-sm text-slate-500 ring-1 ring-slate-200">
                No photos found for this category.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {visible.map(photo => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setLightbox(photo)}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    <img
                      src={photo.image_url}
                      alt={photo.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                        {photo.event_type && (
                          <span className="inline-block rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-navy">
                            {photo.event_type}
                          </span>
                        )}
                        <p className="mt-1 text-xs font-semibold leading-tight text-white">{photo.title}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <LandingFooter />

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <LandingIcon name="close" className="h-6 w-6" strokeWidth={2} />
          </button>
          <figure className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.image_url}
              alt={lightbox.title}
              className="mx-auto max-h-[80vh] w-auto rounded-lg object-contain"
            />
            <figcaption className="mt-4 text-center text-white">
              {lightbox.event_type && (
                <span className="inline-block rounded-full bg-gold px-3 py-0.5 text-xs font-semibold text-navy">
                  {lightbox.event_type}
                </span>
              )}
              <p className="mt-2 text-lg font-semibold">{lightbox.title}</p>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  )
}
