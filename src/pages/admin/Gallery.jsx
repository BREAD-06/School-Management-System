import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import PageHeader from '../../components/PageHeader.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Spinner, { PageLoader } from '../../components/ui/Spinner.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { compressImage } from '../../lib/imageUtils.js'
import { sanitiseFileName, slugSegment, deleteStorageFile } from '../../lib/fileUtils.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const BUCKET = 'gallery'

const EVENT_TYPES = [
  'Annual Day', 'Sports Day', 'Cultural Program',
  'Science Exhibition', 'Academic Achievement', 'Campus Life', 'Special Function',
]

const emptyForm = () => ({ title: '', eventType: '', eventDate: '', file: null })

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminGallery() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [stage, setStage] = useState(null) // null | 'compressing' | 'uploading' | 'saving'
  const stageLabel =
    stage === 'compressing' ? 'Compressing…' : stage === 'uploading' ? 'Uploading…' : 'Saving…'
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('gallery')
        .select('id, title, event_type, event_date, image_url, created_at')
        .order('created_at', { ascending: false })
      if (err) throw err
      setPhotos(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load gallery.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setForm(f => ({ ...f, file }))
    setPreview(URL.createObjectURL(file))
  }

  const openAdd = () => {
    setForm(emptyForm())
    setPreview(null)
    setFormError('')
    setModalOpen(true)
  }

  const validate = () => {
    if (!form.title.trim()) return 'Title is required.'
    if (!form.eventType) return 'Please select an event type.'
    if (!form.file) return 'Please select an image to upload.'
    if (form.file.size > MAX_FILE_SIZE) return 'Image must be under 5 MB.'
    if (!ALLOWED_TYPES.includes(form.file.type)) return 'Only JPG and PNG images are allowed.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (v) { setFormError(v); return }
    setFormError('')
    setSaving(true)
    try {
      // Required by RLS / NOT NULL: stamp the row with the current user's id.
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) throw new Error('Your session has expired. Please log in again.')

      setStage('compressing')
      const fileToUpload = await compressImage(form.file, 'gallery')

      setStage('uploading')
      const path = `${slugSegment(form.eventType)}/${sanitiseFileName(fileToUpload)}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, fileToUpload)
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

      setStage('saving')
      const { error: err } = await supabase.from('gallery').insert({
        title: form.title.trim(),
        event_type: form.eventType,
        event_date: form.eventDate || null,
        image_url: urlData.publicUrl,
        uploaded_by: user.id,
      })
      if (err) throw err
      toast.success('Photo added to gallery.')
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(err.message || 'Upload failed.')
    } finally {
      setSaving(false)
      setStage(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteStorageFile(BUCKET, deleteTarget.image_url)
      const { error: err } = await supabase.from('gallery').delete().eq('id', deleteTarget.id)
      if (err) throw err
      toast.success('Photo deleted.')
      setDeleteTarget(null)
      setPhotos(p => p.filter(x => x.id !== deleteTarget.id))
    } catch (err) {
      toast.error(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Gallery Management"
        subtitle="Upload and manage school event photos"
        actions={<button className="btn-primary" onClick={openAdd}><Icon name="gallery" /> Upload Photo</button>}
      />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : photos.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">
          No photos yet. Click "Upload Photo" to add one.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map(photo => (
            <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 aspect-square">
              <img src={photo.image_url} alt={photo.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-xs font-semibold text-white leading-tight">{photo.title}</p>
                  <p className="text-xs text-white/70">{photo.event_type}</p>
                  {photo.event_date && <p className="text-xs text-white/60">{formatDate(photo.event_date)}</p>}
                </div>
                <button
                  className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700"
                  onClick={() => setDeleteTarget(photo)}
                  title="Delete photo"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={saving ? () => {} : () => setModalOpen(false)} title="Upload Photo" maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <Alert type="error">{formError}</Alert>}
          <div>
            <label className="label">Title <span className="text-red-500">*</span></label>
            <input className="input" value={form.title} onChange={set('title')} disabled={saving} placeholder="e.g. Annual Sports Day 2025" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Event Type <span className="text-red-500">*</span></label>
              <select className="input" value={form.eventType} onChange={set('eventType')} disabled={saving}>
                <option value="">Select type…</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Event Date</label>
              <input type="date" className="input" value={form.eventDate} onChange={set('eventDate')} disabled={saving} />
            </div>
          </div>
          <div>
            <label className="label">Image <span className="text-red-500">*</span></label>
            <input type="file" className="input py-1.5" accept=".jpg,.jpeg,.png" disabled={saving} onChange={handleFileChange} />
            <p className="mt-1 text-xs text-slate-400">Max 5 MB · JPG or PNG</p>
          </div>
          {preview && (
            <img src={preview} alt="Preview" className="h-40 w-full rounded-lg object-cover border border-slate-200" />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner label={stageLabel} /> : 'Upload Photo'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete photo?"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently deleted from the gallery.` : ''}
        confirmLabel="Delete"
      />
    </div>
  )
}
