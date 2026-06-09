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

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const BUCKET = 'study-materials'

const emptyForm = () => ({ classId: '', subjectId: '', title: '', file: null })

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TeacherStudyMaterials() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [classes, setClasses] = useState([])
  const [rows, setRows] = useState([])

  const [filterClass, setFilterClass] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterSubjectList, setFilterSubjectList] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [formSubjects, setFormSubjects] = useState([])
  const [saving, setSaving] = useState(false)
  const [stage, setStage] = useState(null) // null | 'compressing' | 'uploading' | 'saving'
  const stageLabel =
    stage === 'compressing' ? 'Compressing…' : stage === 'uploading' ? 'Uploading…' : 'Saving…'
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadAll = useCallback(async () => {
    const [classRes, matRes] = await Promise.all([
      supabase.from('classes').select('id, class_name, sort_order').order('sort_order'),
      supabase.from('study_materials')
        .select('id, title, file_url, created_at, class_id, subject_id, classes(class_name), subjects(subject_name)')
        .order('created_at', { ascending: false }),
    ])
    if (classRes.error) throw classRes.error
    if (matRes.error) throw matRes.error
    setClasses(classRes.data || [])
    setRows(matRes.data || [])
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try { await loadAll() }
    catch (err) { setError(err.message || 'Failed to load.') }
    finally { setLoading(false) }
  }, [loadAll])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    setFilterSubject('')
    if (!filterClass) { setFilterSubjectList([]); return }
    supabase.from('class_subjects').select('subject_id, subjects(id, subject_name)').eq('class_id', filterClass)
      .then(({ data }) => setFilterSubjectList(data || []))
  }, [filterClass])

  useEffect(() => {
    setForm(f => ({ ...f, subjectId: '' }))
    if (!form.classId) { setFormSubjects([]); return }
    supabase.from('class_subjects').select('subject_id, subjects(id, subject_name)').eq('class_id', form.classId)
      .then(({ data }) => setFormSubjects(data || []))
  }, [form.classId])

  const filtered = rows.filter(r => {
    if (filterClass && r.class_id !== filterClass) return false
    if (filterSubject && r.subject_id !== filterSubject) return false
    return true
  })

  const openAdd = () => {
    setForm(emptyForm())
    setFormError('')
    setModalOpen(true)
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    if (!form.classId) return 'Please select a class.'
    if (!form.subjectId) return 'Please select a subject.'
    if (!form.title.trim()) return 'Title is required.'
    if (!form.file) return 'Please select a file to upload.'
    if (form.file.size > MAX_FILE_SIZE) return 'File must be under 20 MB.'
    if (!ALLOWED_TYPES.includes(form.file.type)) return 'Only PDF, JPG, PNG files are allowed.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (v) { setFormError(v); return }
    setFormError('')
    setSaving(true)
    try {
      let fileToUpload = form.file
      if (isCompressible(form.file)) {
        setStage('compressing')
        fileToUpload = await compressImage(form.file, 'default')
      }
      setStage('uploading')
      const path = `${form.classId}/${form.subjectId}/${sanitiseFileName(fileToUpload)}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, fileToUpload)
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

      setStage('saving')
      const { error: err } = await supabase.from('study_materials').insert({
        class_id: form.classId,
        subject_id: form.subjectId,
        title: form.title.trim(),
        file_url: urlData.publicUrl,
      })
      if (err) throw err
      toast.success('Study material uploaded.')
      setModalOpen(false)
      await loadAll()
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
      await deleteStorageFile(BUCKET, deleteTarget.file_url)
      const { error: err } = await supabase.from('study_materials').delete().eq('id', deleteTarget.id)
      if (err) throw err
      toast.success('Material deleted.')
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
        title="Study Materials"
        subtitle="Upload and manage study resources for your classes"
        actions={<button className="btn-primary" onClick={openAdd}><Icon name="materials" /> Add Material</button>}
      />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <select className="input sm:w-52" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
        </select>
        <select className="input sm:w-52" value={filterSubject} onChange={e => setFilterSubject(e.target.value)} disabled={!filterClass}>
          <option value="">All Subjects</option>
          {filterSubjectList.map(cs => (
            <option key={cs.subject_id} value={cs.subject_id}>{cs.subjects?.subject_name}</option>
          ))}
        </select>
        {(filterClass || filterSubject) && (
          <button className="btn-outline text-xs" onClick={() => { setFilterClass(''); setFilterSubject('') }}>Clear</button>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">
          {rows.length === 0 ? 'No study materials yet. Click "Add Material" to upload one.' : 'No materials match your filters.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(row => (
            <div key={row.id} className="card flex flex-col p-5">
              <div className="mb-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy">{row.classes?.class_name || '—'}</span>
                <span className="rounded-full bg-royal-50 px-2.5 py-0.5 text-xs font-medium text-royal">{row.subjects?.subject_name || '—'}</span>
              </div>
              <h3 className="font-semibold text-slate-800">{row.title}</h3>
              <p className="mt-1 text-xs text-slate-400">Uploaded: {formatDate(row.created_at)}</p>
              {row.file_url && (
                <a href={row.file_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-royal hover:underline">
                  <Icon name="materials" className="h-4 w-4" /> Download
                </a>
              )}
              <div className="mt-auto flex gap-2 border-t border-slate-100 pt-3 mt-4">
                <button className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(row)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={saving ? () => {} : () => setModalOpen(false)} title="Add Study Material">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <Alert type="error">{formError}</Alert>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Class <span className="text-red-500">*</span></label>
              <select className="input" value={form.classId} onChange={set('classId')} disabled={saving}>
                <option value="">Select class…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject <span className="text-red-500">*</span></label>
              <select className="input" value={form.subjectId} onChange={set('subjectId')} disabled={saving || !form.classId}>
                <option value="">{form.classId ? 'Select subject…' : 'Select class first'}</option>
                {formSubjects.map(cs => (
                  <option key={cs.subject_id} value={cs.subject_id}>{cs.subjects?.subject_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Title <span className="text-red-500">*</span></label>
            <input className="input" value={form.title} onChange={set('title')} disabled={saving} placeholder="e.g. Chapter 4 Notes" />
          </div>
          <div>
            <label className="label">File <span className="text-red-500">*</span></label>
            <input type="file" className="input py-1.5" accept=".pdf,.jpg,.jpeg,.png" disabled={saving}
              onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
            <p className="mt-1 text-xs text-slate-400">Max 20 MB · PDF, JPG, PNG</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner label={stageLabel} /> : 'Upload Material'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete material?"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently deleted along with its file.` : ''}
        confirmLabel="Delete"
      />
    </div>
  )
}
