import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { resetPassword } from '../../lib/api.js'
import { deleteStorageFile } from '../../lib/fileUtils.js'
import { ACTIVE_STUDENT, DEACTIVATED_STUDENT } from '../../lib/constants.js'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Spinner, { PageLoader } from '../../components/ui/Spinner.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import StudentFormModal from '../../components/admin/StudentFormModal.jsx'
import ImportStudentsModal from '../../components/admin/ImportStudentsModal.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

export default function StudentManagement() {
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)
  const [classes, setClasses] = useState([])
  const [rows, setRows] = useState([])

  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('add')
  const [editRecord, setEditRecord] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [deactivating, setDeactivating] = useState(false)

  const [resetTarget, setResetTarget] = useState(null)
  const [resetting, setResetting] = useState(false)

  // Load classes + active session once.
  const loadMeta = useCallback(async () => {
    const [classesRes, sessionRes] = await Promise.all([
      supabase.from('classes').select('id, class_name, sort_order').order('sort_order'),
      supabase
        .from('academic_sessions')
        .select('id, session_name')
        .eq('status', 'active')
        .maybeSingle(),
    ])
    if (classesRes.error) throw classesRes.error
    setClasses(classesRes.data || [])
    setSession(sessionRes.data || null)
    return sessionRes.data || null
  }, [])

  // Load students enrolled in the active session.
  const loadStudents = useCallback(async (activeSession) => {
    if (!activeSession) {
      setRows([])
      return
    }
    const { data, error: err } = await supabase
      .from('student_enrollments')
      .select(
        `id, roll_no, class_id, status,
         student:students!inner (
           id, user_id, admission_no, first_name, last_name, dob, gender,
           father_name, mother_name, parent_phone, address, admission_date, status,
           profile_photo_url
         ),
         class:classes ( id, class_name, sort_order )`,
      )
      .eq('session_id', activeSession.id)
    if (err) throw err
    // Only show active students; sort by class then roll/name.
    const active = (data || []).filter((r) => r.student?.status === ACTIVE_STUDENT)
    active.sort((a, b) => {
      const c = (a.class?.sort_order ?? 0) - (b.class?.sort_order ?? 0)
      if (c !== 0) return c
      return (a.roll_no || '').localeCompare(b.roll_no || '', undefined, { numeric: true })
    })
    setRows(active)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const s = await loadMeta()
      await loadStudents(s)
    } catch (err) {
      setError(err.message || 'Failed to load students.')
    } finally {
      setLoading(false)
    }
  }, [loadMeta, loadStudents])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (classFilter && r.class_id !== classFilter) return false
      if (!q) return true
      const s = r.student
      const name = `${s.first_name} ${s.last_name}`.toLowerCase()
      return name.includes(q) || (s.admission_no || '').toLowerCase().includes(q)
    })
  }, [rows, search, classFilter])

  const openAdd = () => {
    setFormMode('add')
    setEditRecord(null)
    setFormOpen(true)
  }
  const openEdit = (row) => {
    setFormMode('edit')
    setEditRecord(row)
    setFormOpen(true)
  }

  const handleSaved = async (message) => {
    setFormOpen(false)
    toast.success(message)
    await refresh()
  }

  const confirmReset = async () => {
    if (!resetTarget) return
    const { user_id, admission_no } = resetTarget.student
    if (!user_id) {
      toast.error('This student has no linked login account to reset.')
      setResetTarget(null)
      return
    }
    setResetting(true)
    try {
      await resetPassword(user_id, admission_no)
      toast.success(`Password reset to ${admission_no}.`)
      setResetTarget(null)
    } catch (err) {
      toast.error(err.message || 'Failed to reset password.')
    } finally {
      setResetting(false)
    }
  }

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      const { error: err } = await supabase
        .from('students')
        .update({ status: DEACTIVATED_STUDENT, profile_photo_url: null })
        .eq('id', deactivateTarget.student.id)
      if (err) throw err
      // Free the storage object — the record is preserved but the photo is removed.
      await deleteStorageFile('profile-photos', deactivateTarget.student.profile_photo_url)
      toast.success('Student deactivated.')
      setDeactivateTarget(null)
      await refresh()
    } catch (err) {
      toast.error(err.message || 'Failed to deactivate student.')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Student Management"
        subtitle={session ? `Active session: ${session.session_name}` : undefined}
        actions={
          <>
            <button className="btn-outline" onClick={() => setImportOpen(true)} disabled={!session}>
              <Icon name="materials" /> Import Students
            </button>
            <button className="btn-primary" onClick={openAdd} disabled={!session}>
              <Icon name="students" /> Add Student
            </button>
          </>
        }
      />

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {!loading && !session && (
        <Alert type="warning" className="mb-4">
          No active academic session exists. You must create and activate a session in{' '}
          <Link to="/admin/sessions" className="font-semibold underline">
            Academic Sessions
          </Link>{' '}
          before adding or viewing enrolled students.
        </Alert>
      )}

      {/* Filters */}
      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </span>
          <input
            className="input pl-9"
            placeholder="Search by name or admission no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-56"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.class_name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">
            {rows.length === 0
              ? 'No active students yet. Click “Add Student” to create one.'
              : 'No students match your filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Admission No</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Parent Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{r.student.admission_no}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.student.first_name} {r.student.last_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.class?.class_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.roll_no || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.student.parent_phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-royal hover:bg-royal-50"
                          onClick={() => openEdit(r)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                          onClick={() => setResetTarget(r)}
                        >
                          Reset Password
                        </button>
                        <button
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          onClick={() => setDeactivateTarget(r)}
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          Showing {filtered.length} of {rows.length} active student{rows.length === 1 ? '' : 's'}.
        </p>
      )}

      <StudentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        classes={classes}
        mode={formMode}
        record={editRecord}
      />

      <ImportStudentsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={async () => { toast.success('Import finished.'); await refresh() }}
        classes={classes}
        session={session}
      />

      <ConfirmDialog
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        onConfirm={confirmReset}
        loading={resetting}
        danger={false}
        title="Reset password?"
        message={
          resetTarget
            ? `Reset password for ${resetTarget.student.first_name} ${resetTarget.student.last_name} to their default password (${resetTarget.student.admission_no})? They will be asked to set a new password on next login.`
            : ''
        }
        confirmLabel="Reset Password"
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
        loading={deactivating}
        title="Deactivate student?"
        message={
          deactivateTarget
            ? `${deactivateTarget.student.first_name} ${deactivateTarget.student.last_name} (${deactivateTarget.student.admission_no}) will be marked as transferred and hidden from active lists. Their records are preserved and not deleted.`
            : ''
        }
        confirmLabel="Deactivate"
      />
    </div>
  )
}
