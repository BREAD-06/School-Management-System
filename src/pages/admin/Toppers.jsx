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
import { sanitiseFileName, deleteStorageFile } from '../../lib/fileUtils.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const BUCKET = 'profile-photos'

const ACHIEVEMENT_TYPES = [
  { value: 'academic', label: 'Academic' },
  { value: 'sports', label: 'Sports' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'other', label: 'Other' },
]

const emptyForm = () => ({
  studentName: '', className: '', percentage: '', sessionName: '', achievementType: 'academic', file: null,
})

export default function AdminToppers() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toppers, setToppers] = useState([])

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
        .from('toppers')
        .select('id, student_name, class_name, percentage, session_name, photo_url, achievement_type, created_at')
        .order('percentage', { ascending: false })
      if (err) throw err
      setToppers(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load toppers.')
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
    if (!form.studentName.trim()) return 'Student name is required.'
    if (!form.className.trim()) return 'Class is required.'
    const pct = Number(form.percentage)
    if (!form.percentage || Number.isNaN(pct) || pct < 0 || pct > 100) return 'Enter a valid percentage (0–100).'
    if (!form.sessionName.trim()) return 'Session is required.'
    if (form.file) {
      if (form.file.size > MAX_FILE_SIZE) return 'Image must be under 5 MB.'
      if (!ALLOWED_TYPES.includes(form.file.type)) return 'Only JPG and PNG images are allowed.'
    }
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (v) { setFormError(v); return }
    setFormError('')
    setSaving(true)
    try {
      let photoUrl = null
      if (form.file) {
        setStage('compressing')
        const fileToUpload = await compressImage(form.file, 'profile')

        setStage('uploading')
        const path = `toppers/${sanitiseFileName(fileToUpload)}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, fileToUpload)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
        photoUrl = urlData.publicUrl
      }

      setStage('saving')
      const { error: err } = await supabase.from('toppers').insert({
        student_name: form.studentName.trim(),
        class_name: form.className.trim(),
        percentage: Number(form.percentage),
        session_name: form.sessionName.trim(),
        achievement_type: form.achievementType,
        photo_url: photoUrl,
      })
      if (err) throw err
      toast.success('Topper added.')
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(err.message || 'Failed to add topper.')
    } finally {
      setSaving(false)
      setStage(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.photo_url) await deleteStorageFile(BUCKET, deleteTarget.photo_url)
      const { error: err } = await supabase.from('toppers').delete().eq('id', deleteTarget.id)
      if (err) throw err
      toast.success('Topper deleted.')
      setDeleteTarget(null)
      setToppers(t => t.filter(x => x.id !== deleteTarget.id))
    } catch (err) {
      toast.error(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Toppers & Achievers"
        subtitle="Showcase top-performing students on the public landing page"
        actions={<button className="btn-primary" onClick={openAdd}><Icon name="trophy" /> Add Topper</button>}
      />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : toppers.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">
          No toppers yet. Click "Add Topper" to add one.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {toppers.map(t => (
            <div key={t.id} className="card group relative flex flex-col items-center p-5 text-center">
              <button
                className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white opacity-0 transition hover:bg-red-700 group-hover:opacity-100"
                onClick={() => setDeleteTarget(t)}
                title="Delete topper"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-100 ring-2 ring-gold">
                {t.photo_url ? (
                  <img src={t.photo_url} alt={t.student_name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
                    {t.student_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-navy leading-tight">{t.student_name}</p>
              <p className="text-xs text-slate-500">{t.class_name}</p>
              <p className="mt-1 text-lg font-bold text-gold-600">{Number(t.percentage)}%</p>
              <p className="text-xs text-slate-400">{t.session_name}</p>
              <span className="mt-2 inline-block rounded-full bg-navy/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy">
                {t.achievement_type}
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={saving ? () => {} : () => setModalOpen(false)} title="Add Topper" maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <Alert type="error">{formError}</Alert>}
          <div>
            <label className="label">Student Name <span className="text-red-500">*</span></label>
            <input className="input" value={form.studentName} onChange={set('studentName')} disabled={saving} placeholder="e.g. Riya Sharma" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Class <span className="text-red-500">*</span></label>
              <input className="input" value={form.className} onChange={set('className')} disabled={saving} placeholder="e.g. Class 10" />
            </div>
            <div>
              <label className="label">Percentage <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0" max="100" className="input" value={form.percentage} onChange={set('percentage')} disabled={saving} placeholder="e.g. 96.5" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Session <span className="text-red-500">*</span></label>
              <input className="input" value={form.sessionName} onChange={set('sessionName')} disabled={saving} placeholder="e.g. 2024-25" />
            </div>
            <div>
              <label className="label">Achievement Type</label>
              <select className="input" value={form.achievementType} onChange={set('achievementType')} disabled={saving}>
                {ACHIEVEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Photo</label>
            <input type="file" className="input py-1.5" accept=".jpg,.jpeg,.png" disabled={saving} onChange={handleFileChange} />
            <p className="mt-1 text-xs text-slate-400">Optional · Max 5 MB · JPG or PNG</p>
          </div>
          {preview && (
            <img src={preview} alt="Preview" className="mx-auto h-28 w-28 rounded-full object-cover border border-slate-200" />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner label={stageLabel} /> : 'Add Topper'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete topper?"
        message={deleteTarget ? `"${deleteTarget.student_name}" will be permanently removed from the achievers list.` : ''}
        confirmLabel="Delete"
      />
    </div>
  )
}
