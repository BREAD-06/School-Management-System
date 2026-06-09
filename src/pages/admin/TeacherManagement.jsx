import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { resetPassword } from '../../lib/api.js'
import { ACTIVE_TEACHER, INACTIVE_TEACHER } from '../../lib/constants.js'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { PageLoader } from '../../components/ui/Spinner.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import TeacherFormModal from '../../components/admin/TeacherFormModal.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

export default function TeacherManagement() {
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('add')
  const [editRecord, setEditRecord] = useState(null)

  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [deactivating, setDeactivating] = useState(false)

  const [resetTarget, setResetTarget] = useState(null)
  const [resetting, setResetting] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('teachers')
        .select('id, user_id, employee_id, name, phone, email, designation, joining_date, status')
        .eq('status', ACTIVE_TEACHER)
        .order('name')
      if (err) throw err
      setRows(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load teachers.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (t) =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.employee_id || '').toLowerCase().includes(q),
    )
  }, [rows, search])

  const openAdd = () => {
    setFormMode('add')
    setEditRecord(null)
    setFormOpen(true)
  }
  const openEdit = (t) => {
    setFormMode('edit')
    setEditRecord(t)
    setFormOpen(true)
  }

  const handleSaved = async (message) => {
    setFormOpen(false)
    toast.success(message)
    await refresh()
  }

  const confirmReset = async () => {
    if (!resetTarget) return
    if (!resetTarget.user_id) {
      toast.error('This teacher has no linked login account to reset.')
      setResetTarget(null)
      return
    }
    setResetting(true)
    try {
      await resetPassword(resetTarget.user_id, resetTarget.employee_id)
      toast.success(`Password reset to ${resetTarget.employee_id}.`)
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
        .from('teachers')
        .update({ status: INACTIVE_TEACHER })
        .eq('id', deactivateTarget.id)
      if (err) throw err
      toast.success('Teacher deactivated.')
      setDeactivateTarget(null)
      await refresh()
    } catch (err) {
      toast.error(err.message || 'Failed to deactivate teacher.')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Teacher Management"
        actions={
          <button className="btn-primary" onClick={openAdd}>
            <Icon name="teachers" /> Add Teacher
          </button>
        }
      />

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="card mb-4 p-4">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </span>
          <input
            className="input pl-9"
            placeholder="Search by name or employee ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">
            {rows.length === 0
              ? 'No active teachers yet. Click “Add Teacher” to create one.'
              : 'No teachers match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Employee ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{t.employee_id}</td>
                    <td className="px-4 py-3 text-slate-700">{t.name}</td>
                    <td className="px-4 py-3 text-slate-600">{t.designation || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-royal hover:bg-royal-50"
                          onClick={() => openEdit(t)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                          onClick={() => setResetTarget(t)}
                        >
                          Reset Password
                        </button>
                        <button
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          onClick={() => setDeactivateTarget(t)}
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
          Showing {filtered.length} of {rows.length} active teacher{rows.length === 1 ? '' : 's'}.
        </p>
      )}

      <TeacherFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        mode={formMode}
        record={editRecord}
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
            ? `Reset password for ${resetTarget.name} to their default password (${resetTarget.employee_id})? They will be asked to set a new password on next login.`
            : ''
        }
        confirmLabel="Reset Password"
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
        loading={deactivating}
        title="Deactivate teacher?"
        message={
          deactivateTarget
            ? `${deactivateTarget.name} (${deactivateTarget.employee_id}) will be set to inactive and hidden from active lists. Their records are preserved and not deleted.`
            : ''
        }
        confirmLabel="Deactivate"
      />
    </div>
  )
}
