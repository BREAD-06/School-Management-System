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
const BUCKET = 'homework-attachments'

const emptyForm = () => ({
  classId: '',
  subjectId: '',
  title: '',
  description: '',
  dueDate: '',
  file: null,
})

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TeacherHomework() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [classes, setClasses] = useState([])
  const [rows, setRows] = useState([])

  const [filterClass, setFilterClass] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterSubjectList, setFilterSubjectList] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [formSubjects, setFormSubjects] = useState([])
  const [saving, setSaving] = useState(false)
  const [stage, setStage] = useState(null) // null | 'compressing' | 'uploading' | 'saving'
  const stageLabel =
    stage === 'compressing' ? 'Compressing…' : stage === 'uploading' ? 'Uploading…' : 'Saving…'
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadClasses = useCallback(async () => {
    const { data } = await supabase.from('classes').select('id, class_name, sort_order').order('sort_order')
    setClasses(data || [])
  }, [])

  const loadHomework = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('homework')
      .select('id, title, description, due_date, attachment_url, created_at, class_id, subject_id, classes(class_name), subjects(subject_name)')
      .order('created_at', { ascending: false })
    if (err) throw err
    setRows(data || [])
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await Promise.all([loadClasses(), loadHomework()])
    } catch (err) {
      setError(err.message || 'Failed to load homework.')
    } finally {
      setLoading(false)
    }
  }, [loadClasses, loadHomework])

  useEffect(() => { refresh() }, [refresh])

  // Load subjects for filter class
  useEffect(() => {
    setFilterSubject('')
    if (!filterClass) { setFilterSubjectList([]); return }
    supabase.from('class_subjects')
      .select('subject_id, subjects(id, subject_name)')
      .eq('class_id', filterClass)
      .then(({ data }) => setFilterSubjectList(data || []))
  }, [filterClass])

  // Load subjects when form class changes
  useEffect(() => {
    setForm(f => ({ ...f, subjectId: '' }))
    if (!form.classId) { setFormSubjects([]); return }
    supabase.from('class_subjects')
      .select('subject_id, subjects(id, subject_name)')
      .eq('class_id', form.classId)
      .then(({ data }) => setFormSubjects(data || []))
  }, [form.classId])

  const filtered = rows.filter(r => {
    if (filterClass && r.class_id !== filterClass) return false
    if (filterSubject && r.subject_id !== filterSubject) return false
    return true
  })

  const openAdd = () => {
    setEditRecord(null)
    setForm(emptyForm())
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditRecord(row)
    setForm({
      classId: row.class_id || '',
      subjectId: row.subject_id || '',
      title: row.title || '',
      description: row.description || '',
      dueDate: row.due_date || '',
      file: null,
    })
    setFormError('')
    setModalOpen(true)
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    if (!form.classId) return 'Please select a class.'
    if (!form.subjectId) return 'Please select a subject.'
    if (!form.title.trim()) return 'Title is required.'
    if (!form.dueDate) return 'Due date is required.'
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
      let attachment_url = editRecord?.attachment_url || null

      if (form.file) {
        // Delete the old attachment before uploading the replacement.
        if (editRecord?.attachment_url) await deleteStorageFile(BUCKET, editRecord.attachment_url)

        let fileToUpload = form.file
        if (isCompressible(form.file)) {
          setStage('compressing')
          fileToUpload = await compressImage(form.file, 'default')
        }
        setStage('uploading')
        const path = `${form.classId}/${sanitiseFileName(fileToUpload)}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, fileToUpload)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
        attachment_url = urlData.publicUrl
      }

      setStage('saving')
      const payload = {
        class_id: form.classId,
        subject_id: form.subjectId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_date: form.dueDate,
        attachment_url,
      }

      if (editRecord) {
        const { error: err } = await supabase.from('homework').update(payload).eq('id', editRecord.id)
        if (err) throw err
        toast.success('Homework updated.')
      } else {
        const { error: err } = await supabase.from('homework').insert(payload)
        if (err) throw err
        toast.success('Homework added.')
      }
      setModalOpen(false)
      await loadHomework()
    } catch (err) {
      setFormError(err.message || 'Failed to save.')
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
      const { error: err } = await supabase.from('homework').delete().eq('id', deleteTarget.id)
      if (err) throw err
      toast.success('Homework deleted.')
      setDeleteTarget(null)
      await loadHomework()
    } catch (err) {
      toast.error(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Homework"
        subtitle="Manage homework assignments for your classes"
        actions={
          <button className="btn-primary" onClick={openAdd}>
            <Icon name="homework" /> Add Homework
          </button>
        }
      />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {/* Filters */}
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
          <button className="btn-outline text-xs" onClick={() => { setFilterClass(''); setFilterSubject('') }}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">
          {rows.length === 0 ? 'No homework yet. Click "Add Homework" to create one.' : 'No homework matches your filters.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(row => (
            <div key={row.id} className="card flex flex-col p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy">{row.classes?.class_name || '—'}</span>
                  <span className="rounded-full bg-royal-50 px-2.5 py-0.5 text-xs font-medium text-royal">{row.subjects?.subject_name || '—'}</span>
                </div>
              </div>
              <h3 className="font-semibold text-slate-800">{row.title}</h3>
              {row.description && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{row.description}</p>}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Icon name="timetable" className="h-3.5 w-3.5" />
                <span>Due: <span className="font-medium text-slate-700">{formatDate(row.due_date)}</span></span>
              </div>
              {row.attachment_url && (
                <a href={row.attachment_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-royal hover:underline">
                  <Icon name="materials" className="h-3.5 w-3.5" /> Download attachment
                </a>
              )}
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                <button className="rounded-md px-2.5 py-1 text-xs font-medium text-royal hover:bg-royal-50" onClick={() => openEdit(row)}>Edit</button>
                <button className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(row)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={saving ? () => {} : () => setModalOpen(false)} title={editRecord ? 'Edit Homework' : 'Add Homework'}>
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
            <input className="input" value={form.title} onChange={set('title')} disabled={saving} placeholder="e.g. Chapter 3 Exercise" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={set('description')} disabled={saving} placeholder="Instructions or details…" />
          </div>
          <div>
            <label className="label">Due Date <span className="text-red-500">*</span></label>
            <input type="date" className="input" value={form.dueDate} onChange={set('dueDate')} disabled={saving} />
          </div>
          <div>
            <label className="label">Attachment {editRecord?.attachment_url ? '(replace existing)' : '(optional)'}</label>
            <input
              type="file"
              className="input py-1.5"
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={saving}
              onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
            />
            <p className="mt-1 text-xs text-slate-400">Max 10 MB · PDF, JPG, PNG</p>
            {editRecord?.attachment_url && !form.file && (
              <p className="mt-1 text-xs text-royal">Current file attached — uploading a new file will replace it.</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner label={stageLabel} /> : editRecord ? 'Save Changes' : 'Add Homework'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete homework?"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently deleted.${deleteTarget.attachment_url ? ' The attached file will also be removed.' : ''}` : ''}
        confirmLabel="Delete"
      />
    </div>
  )
}
