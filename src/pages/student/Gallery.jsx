import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import PageHeader from '../../components/PageHeader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { PageLoader } from '../../components/ui/Spinner.jsx'

const EVENT_TYPES = [
  'Annual Day', 'Sports Day', 'Cultural Program',
  'Science Exhibition', 'Academic Achievement', 'Campus Life', 'Special Function',
]

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function StudentGallery() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState([])
  const [filterType, setFilterType] = useState('')
  const [lightbox, setLightbox] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('gallery')
        .select('id, title, event_type, event_date, image_url, created_at')
        .order('event_date', { ascending: false })
      if (err) throw err
      setPhotos(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load gallery.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightbox) return
    const handler = (e) => { if (e.key === 'Escape') setLightbox(null) }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [lightbox])

  const filtered = filterType ? photos.filter(p => p.event_type === filterType) : photos

  return (
    <div>
      <PageHeader title="Gallery" subtitle="School events and memories" />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <select className="input sm:w-56" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Events</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {filterType && (
          <button className="btn-outline text-xs" onClick={() => setFilterType('')}>Clear</button>
        )}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} photo{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">
          {photos.length === 0 ? 'No photos in the gallery yet.' : 'No photos for the selected event type.'}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map(photo => (
            <div
              key={photo.id}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100 aspect-square"
              onClick={() => setLightbox(photo)}
            >
              <img
                src={photo.image_url}
                alt={photo.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-xs font-semibold text-white leading-tight">{photo.title}</p>
                  <p className="text-xs text-white/70">{photo.event_type}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <img
              src={lightbox.image_url}
              alt={lightbox.title}
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
            <div className="mt-3 text-center text-white">
              <p className="font-semibold">{lightbox.title}</p>
              <p className="text-sm text-white/70">{lightbox.event_type}{lightbox.event_date ? ` · ${formatDate(lightbox.event_date)}` : ''}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
