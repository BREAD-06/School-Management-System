import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import PageHeader from '../../components/PageHeader.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Spinner, { PageLoader } from '../../components/ui/Spinner.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { compressImage, isCompressible } from '../../lib/imageUtils.js'
import { sanitiseFileName, deleteStorageFile } from '../../lib/fileUtils.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const BUCKET = 'announcements'

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone (Students & Teachers)' },
  { value: 'students', label: 'Students Only' },
  { value: 'teachers', label: 'Teachers Only' },
]

const AUDIENCE_BADGE = {
  all: { label: 'Everyone', cls: 'bg-emerald-50 text-emerald-700' },
  students: { label: 'Students', cls: 'bg-royal-50 text-royal' },
  teachers: { label: 'Teachers', cls: 'bg-amber-50 text-amber-700' },
}

const emptyForm = () => ({ title: '', description: '', audience: 'all', file: null })

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminAnnouncements() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
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
        .from('announcements')
        .select('id, title, description, audience, attachment_url, created_at')
        .order('created_at', { ascending: false })
      if (err) throw err
      setRows(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load announcements.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    if (!form.title.trim()) return 'Title is required.'
    if (!form.description.trim()) return 'Description is required.'
    if (!form.audience) return 'Please select an audience.'
    if (form.file) {
      if (form.file.size > MAX_FILE_SIZE) return 'File must be under 10 MB.'
      if (!ALLOWED_TYPES.includes(form.file.type)) return 'Only PDF, JPG, PNG files are allowed.'
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
      // Required by RLS / NOT NULL: stamp the row with the current user's id.
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) throw new Error('Your session has expired. Please log in again.')

      let attachment_url = null
      if (form.file) {
        // Compress images only; PDFs are uploaded as-is.
        let fileToUpload = form.file
        if (isCompressible(form.file)) {
          setStage('compressing')
          fileToUpload = await compressImage(form.file, 'default')
        }
        setStage('uploading')
        const year = new Date().getFullYear()
        const path = `${year}/${sanitiseFileName(fileToUpload)}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, fileToUpload)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
        attachment_url = urlData.publicUrl
      }

      setStage('saving')
      const { error: err } = await supabase.from('announcements').insert({
        title: form.title.trim(),
        description: form.description.trim(),
        audience: form.audience, // 'all' | 'students' | 'teachers' (DB values, not labels)
        attachment_url,
        created_by: user.id,
      })
      if (err) throw err
      toast.success('Announcement published.')
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(err.message || 'Failed to publish.')
    } finally {
      setSaving(false)
      setStage(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteStorageFile(BUCKET, deleteTarget.attachment_url)
      const { error: err } = await supabase.from('announcements').delete().eq('id', deleteTarget.id)
      if (err) throw err
      toast.success('Announcement deleted.')
      setDeleteTarget(null)
      setRows(r => r.filter(x => x.id !== deleteTarget.id))
    } catch (err) {
      toast.error(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Publish notices to students and teachers"
        actions={
          <button className="btn-primary" onClick={() => { setForm(emptyForm()); setFormError(''); setModalOpen(true) }}>
            <Icon name="announce" /> New Announcement
          </button>
        }
      />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">
          No announcements yet. Click "New Announcement" to publish one.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(row => {
            const badge = AUDIENCE_BADGE[row.audience] || { label: row.audience, cls: 'bg-slate-100 text-slate-600' }
            return (
              <div key={row.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                      <span className="text-xs text-slate-400">{formatDate(row.created_at)}</span>
                    </div>
                    <h3 className="font-semibold text-navy">{row.title}</h3>
                    <p className="mt-1.5 text-sm text-slate-600 line-clamp-3 whitespace-pre-line">{row.description}</p>
                    {row.attachment_url && (
                      <a href={row.attachment_url} target="_blank" rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-sm text-royal hover:underline">
                        <Icon name="materials" className="h-4 w-4" />
                        Download attachment
                      </a>
                    )}
                  </div>
                  <button
                    className="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteTarget(row)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={saving ? () => {} : () => setModalOpen(false)} title="New Announcement">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <Alert type="error">{formError}</Alert>}
          <div>
            <label className="label">Title <span className="text-red-500">*</span></label>
            <input className="input" value={form.title} onChange={set('title')} disabled={saving} placeholder="e.g. School Closed on Monday" />
          </div>
          <div>
            <label className="label">Description <span className="text-red-500">*</span></label>
            <textarea className="input" rows={4} value={form.description} onChange={set('description')} disabled={saving}
              placeholder="Full announcement text…" />
          </div>
          <div>
            <label className="label">Audience <span className="text-red-500">*</span></label>
            <select className="input" value={form.audience} onChange={set('audience')} disabled={saving}>
              {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Attachment (optional)</label>
            <input type="file" className="input py-1.5" accept=".pdf,.jpg,.jpeg,.png" disabled={saving}
              onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
            <p className="mt-1 text-xs text-slate-400">Max 10 MB · PDF, JPG, PNG</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner label={stageLabel} /> : 'Publish'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete announcement?"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently deleted.` : ''}
        confirmLabel="Delete"
      />
    </div>
  )
}
