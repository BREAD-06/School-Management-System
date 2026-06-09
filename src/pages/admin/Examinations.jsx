import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/useAuth.js'
import PageHeader from '../../components/PageHeader.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Spinner, { PageLoader } from '../../components/ui/Spinner.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { sanitiseFileName, slugSegment, deleteStorageFile } from '../../lib/fileUtils.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const BUCKET = 'datesheets'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminExaminations() {
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [sessions, setSessions] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState('add') // add | replace
  const [target, setTarget] = useState(null)
  const [examName, setExamName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [file, setFile] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [stage, setStage] = useState(null) // null | 'uploading' | 'saving'
  const stageLabel = stage === 'uploading' ? 'Uploading…' : 'Saving…'

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [examRes, sessRes] = await Promise.all([
        supabase
          .from('examinations')
          .select('id, exam_name, datesheet_file_url, created_at, session_id, academic_sessions(session_name)')
          .order('created_at', { ascending: false }),
        supabase.from('academic_sessions').select('id, session_name, status').order('start_date', { ascending: false }),
      ])
      if (examRes.error) throw examRes.error
      if (sessRes.error) throw sessRes.error
      setRows(examRes.data || [])
      setSessions(sessRes.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load examinations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setMode('add'); setTarget(null)
    setExamName(''); setSessionId(sessions.find((s) => s.status === 'active')?.id || '')
    setFile(null); setFormError(''); setModalOpen(true)
  }

  const openReplace = (row) => {
    setMode('replace'); setTarget(row)
    setExamName(row.exam_name); setSessionId(row.session_id)
    setFile(null); setFormError(''); setModalOpen(true)
  }

  const validate = () => {
    if (!examName.trim()) return 'Exam name is required.'
    if (!sessionId) return 'Please select a session.'
    if (mode === 'add' && !file) return 'Please choose a PDF file.'
    if (file) {
      if (file.type !== 'application/pdf') return 'Only PDF files are allowed.'
      if (file.size > MAX_FILE_SIZE) return 'File must be under 5 MB.'
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
      let datesheet_file_url = target?.datesheet_file_url || null
      if (file) {
        // Delete the old datesheet before uploading the replacement.
        if (mode === 'replace') await deleteStorageFile(BUCKET, target?.datesheet_file_url)

        setStage('uploading')
        const sessionName = sessions.find((s) => s.id === sessionId)?.session_name
        const path = `${slugSegment(sessionName)}/${sanitiseFileName(file)}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf' })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
        datesheet_file_url = urlData.publicUrl
      }

      setStage('saving')
      if (mode === 'replace') {
        const { error: updErr } = await supabase
          .from('examinations')
          .update({ exam_name: examName.trim(), session_id: sessionId, datesheet_file_url })
          .eq('id', target.id)
        if (updErr) throw updErr
        toast.success('Datesheet replaced.')
      } else {
        const { error: insErr } = await supabase.from('examinations').insert({
          exam_name: examName.trim(),
          session_id: sessionId,
          datesheet_file_url,
          uploaded_by: user.id,
        })
        if (insErr) throw insErr
        toast.success('Datesheet uploaded.')
      }
      setModalOpen(false)
      await load()
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
      await deleteStorageFile(BUCKET, deleteTarget.datesheet_file_url)
      const { error: delErr } = await supabase.from('examinations').delete().eq('id', deleteTarget.id)
      if (delErr) throw delErr
      toast.success('Datesheet deleted.')
      setDeleteTarget(null)
      setRows((rs) => rs.filter((r) => r.id !== deleteTarget.id))
    } catch (err) {
      toast.error(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Examinations"
        subtitle="Upload and manage exam datesheets"
        actions={<button className="btn-primary" onClick={openAdd}><Icon name="exam" /> Upload Datesheet</button>}
      />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">
          No datesheets uploaded yet. Click "Upload Datesheet" to add one.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Exam Name</th>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{r.exam_name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.academic_sessions?.session_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {r.datesheet_file_url && (
                          <a href={r.datesheet_file_url} target="_blank" rel="noreferrer"
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-royal hover:bg-royal-50">
                            Download
                          </a>
                        )}
                        <button className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100" onClick={() => openReplace(r)}>
                          Replace
                        </button>
                        <button className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(r)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={saving ? () => {} : () => setModalOpen(false)} title={mode === 'replace' ? 'Replace Datesheet' : 'Upload Datesheet'} maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <Alert type="error">{formError}</Alert>}
          <div>
            <label className="label">Exam Name <span className="text-red-500">*</span></label>
            <input className="input" value={examName} onChange={(e) => setExamName(e.target.value)} disabled={saving}
              placeholder="e.g. Mid Term Examination 2025-26" />
          </div>
          <div>
            <label className="label">Session <span className="text-red-500">*</span></label>
            <select className="input" value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={saving}>
              <option value="">Select session…</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.session_name}{s.status === 'active' ? ' (active)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Datesheet PDF {mode === 'replace' ? '(choose a new file)' : <span className="text-red-500">*</span>}</label>
            <input type="file" className="input py-1.5" accept="application/pdf,.pdf" disabled={saving}
              onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <p className="mt-1 text-xs text-slate-400">Max 5 MB · PDF only</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner label={stageLabel} /> : mode === 'replace' ? 'Replace' : 'Upload'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete datesheet?"
        message={deleteTarget ? `"${deleteTarget.exam_name}" and its PDF will be permanently deleted.` : ''}
        confirmLabel="Delete"
      />
    </div>
  )
}
