import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { PageLoader } from '../../components/ui/Spinner.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import SessionFormModal from '../../components/admin/SessionFormModal.jsx'
import PromotionModal from '../../components/admin/PromotionModal.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

// Format "2025-04-01" → "1 Apr 2025"
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function SessionManagement() {
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState([])

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('add')
  const [editRecord, setEditRecord] = useState(null)

  const [activateTarget, setActivateTarget] = useState(null)
  const [activating, setActivating] = useState(false)

  const [promoteTarget, setPromoteTarget] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('academic_sessions')
        .select('id, session_name, start_date, end_date, status')
        .order('start_date', { ascending: false })
      if (err) throw err
      setSessions(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load sessions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleSaved = async (message) => {
    setFormOpen(false)
    toast.success(message)
    await refresh()
  }

  // Make one session active and all others inactive. Done in two steps:
  //   1. Set ALL sessions inactive (safe — won't break existing data).
  //   2. Set the target session active.
  // This is intentionally sequential so there is never a moment with two
  // active sessions; the worst failure case leaves everything inactive
  // (which shows a clear "no active session" warning everywhere).
  const confirmActivate = async () => {
    if (!activateTarget) return
    setActivating(true)
    try {
      // Step 1 — clear any existing active session.
      const { error: clearErr } = await supabase
        .from('academic_sessions')
        .update({ status: 'inactive' })
        .neq('id', '00000000-0000-0000-0000-000000000000') // matches all rows
      if (clearErr) throw clearErr

      // Step 2 — mark the chosen session active.
      const { error: setErr } = await supabase
        .from('academic_sessions')
        .update({ status: 'active' })
        .eq('id', activateTarget.id)
      if (setErr) throw setErr

      toast.success(`"${activateTarget.session_name}" is now the active session.`)
      setActivateTarget(null)
      await refresh()
    } catch (err) {
      toast.error(err.message || 'Failed to activate session.')
    } finally {
      setActivating(false)
    }
  }

  const activeSession = sessions.find((s) => s.status === 'active')

  return (
    <div>
      <PageHeader
        title="Academic Sessions"
        subtitle="Manage academic years. Only one session can be active at a time."
        actions={
          <button className="btn-primary" onClick={() => { setFormMode('add'); setEditRecord(null); setFormOpen(true) }}>
            <Icon name="session" /> New Session
          </button>
        }
      />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {/* Active session banner */}
      {!loading && (
        activeSession ? (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-emerald-800">
                Active session: {activeSession.session_name}
              </p>
              <p className="text-sm text-emerald-700">
                {fmtDate(activeSession.start_date)} — {fmtDate(activeSession.end_date)}
              </p>
            </div>
          </div>
        ) : (
          <Alert type="warning" className="mb-5">
            <strong>No active session.</strong> Create a session and click{' '}
            <strong>Set Active</strong> before enrolling students. The Student
            Management page will block enrollment until this is done.
          </Alert>
        )
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : sessions.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">
            No academic sessions yet.{' '}
            <button
              className="font-medium text-royal underline"
              onClick={() => { setFormMode('add'); setEditRecord(null); setFormOpen(true) }}
            >
              Create your first session
            </button>{' '}
            to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Session</th>
                  <th className="px-5 py-3">Start Date</th>
                  <th className="px-5 py-3">End Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => {
                  const isActive = s.status === 'active'
                  return (
                    <tr key={s.id} className={`hover:bg-slate-50 ${isActive ? 'bg-emerald-50/40' : ''}`}>
                      <td className="px-5 py-3.5 font-semibold text-navy">
                        {s.session_name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{fmtDate(s.start_date)}</td>
                      <td className="px-5 py-3.5 text-slate-600">{fmtDate(s.end_date)}</td>
                      <td className="px-5 py-3.5">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-2">
                          {!isActive && (
                            <>
                              <button
                                className="rounded-md bg-navy px-3 py-1 text-xs font-semibold text-white hover:bg-navy-800 transition"
                                onClick={() => setActivateTarget(s)}
                              >
                                Set Active
                              </button>
                              <button
                                className="rounded-md border border-royal px-3 py-1 text-xs font-semibold text-royal hover:bg-royal-50 transition disabled:opacity-50"
                                onClick={() => setPromoteTarget(s)}
                                disabled={!activeSession}
                                title={activeSession ? 'Promote active-session students into this session' : 'Activate a session first'}
                              >
                                Promote Students
                              </button>
                            </>
                          )}
                          <button
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-royal hover:bg-royal-50"
                            onClick={() => { setFormMode('edit'); setEditRecord(s); setFormOpen(true) }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help text */}
      {!loading && sessions.length > 0 && (
        <div className="mt-4 space-y-1 text-xs text-slate-400">
          <p>• Only one session can be active. Clicking <strong>Set Active</strong> automatically deactivates the current one.</p>
          <p>• Session dates are used for display only — they do not auto-activate or auto-deactivate.</p>
          <p>• Students are enrolled into the active session when added. Change the active session before the new year's admissions.</p>
        </div>
      )}

      {/* Activate confirm */}
      <ConfirmDialog
        open={!!activateTarget}
        onClose={() => setActivateTarget(null)}
        onConfirm={confirmActivate}
        loading={activating}
        title="Set active session?"
        message={
          activateTarget
            ? `"${activateTarget.session_name}" will become the active session. ${
                activeSession
                  ? `"${activeSession.session_name}" will be set to inactive.`
                  : ''
              } New student enrollments will be linked to "${activateTarget?.session_name}".`
            : ''
        }
        confirmLabel="Set Active"
        danger={false}
      />

      {/* Create / Edit form */}
      <SessionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        mode={formMode}
        record={editRecord}
      />

      {/* Promotion */}
      <PromotionModal
        open={!!promoteTarget}
        onClose={() => setPromoteTarget(null)}
        targetSession={promoteTarget}
        activeSession={activeSession}
        onDone={async () => { toast.success('Promotion complete.'); await refresh() }}
      />
    </div>
  )
}
