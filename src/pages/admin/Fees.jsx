import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/useAuth.js'
import { ACTIVE_STUDENT, FEE_STATUS, SCHOOL_NAME } from '../../lib/constants.js'
import { sendSmsBatch, smsConfigured } from '../../lib/sms.js'
import { sendWhatsAppBatch, WA_TEMPLATE_FEE } from '../../utils/whatsapp.js'
import PageHeader from '../../components/PageHeader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Spinner, { PageLoader } from '../../components/ui/Spinner.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

function monthLabel(val) {
  if (!val) return ''
  const [y, m] = val.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export default function AdminFees() {
  const { user } = useAuth()
  const toast = useToast()

  const monthOptions = useMemo(() => {
    const opts = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      opts.push({ val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
    }
    return opts
  }, [])

  const [month, setMonth] = useState(monthOptions[0].val)
  const [classFilter, setClassFilter] = useState('')
  const [classes, setClasses] = useState([])
  const [session, setSession] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([]) // [{ student_id, name, class_id, class_name, roll_no, parent_phone, status }]
  const [savingId, setSavingId] = useState(null)
  const [confirmReminders, setConfirmReminders] = useState(false)
  const [sending, setSending] = useState(false)

  const loadMeta = useCallback(async () => {
    const [classesRes, sessionRes] = await Promise.all([
      supabase.from('classes').select('id, class_name, sort_order').order('sort_order'),
      supabase.from('academic_sessions').select('id, session_name').eq('status', 'active').maybeSingle(),
    ])
    if (classesRes.error) throw classesRes.error
    setClasses(classesRes.data || [])
    setSession(sessionRes.data || null)
    return sessionRes.data || null
  }, [])

  // Load roster + fees for the month, auto-creating any missing unpaid records.
  const loadFees = useCallback(async (activeSession, mon) => {
    if (!activeSession || !mon) { setRows([]); return }

    const { data: enrollments, error: enrErr } = await supabase
      .from('student_enrollments')
      .select('roll_no, class_id, student_id, students!inner(id, first_name, last_name, parent_phone, status), classes(class_name, sort_order)')
      .eq('session_id', activeSession.id)
    if (enrErr) throw enrErr

    const roster = (enrollments || [])
      .filter((e) => e.students?.status === ACTIVE_STUDENT)
      .map((e) => ({
        student_id: e.student_id,
        name: `${e.students.first_name} ${e.students.last_name}`,
        class_id: e.class_id,
        class_name: e.classes?.class_name || '—',
        sort_order: e.classes?.sort_order ?? 0,
        roll_no: e.roll_no || '',
        parent_phone: e.students.parent_phone || '',
      }))

    // Existing fee rows for this session + month.
    const { data: feeRows, error: feeErr } = await supabase
      .from('fees')
      .select('student_id, status')
      .eq('session_id', activeSession.id)
      .eq('month', mon)
    if (feeErr) throw feeErr

    const feeMap = new Map((feeRows || []).map((f) => [f.student_id, f.status]))

    // Auto-create missing unpaid records.
    const missing = roster
      .filter((s) => !feeMap.has(s.student_id))
      .map((s) => ({
        student_id: s.student_id,
        session_id: activeSession.id,
        month: mon,
        status: FEE_STATUS.UNPAID,
      }))
    if (missing.length) {
      const { error: insErr } = await supabase
        .from('fees')
        .upsert(missing, { onConflict: 'student_id,session_id,month' })
      if (insErr) throw insErr
      missing.forEach((m) => feeMap.set(m.student_id, FEE_STATUS.UNPAID))
    }

    const merged = roster
      .map((s) => ({ ...s, status: feeMap.get(s.student_id) || FEE_STATUS.UNPAID }))
      .sort((a, b) => {
        const c = a.sort_order - b.sort_order
        if (c !== 0) return c
        return (a.roll_no || '').localeCompare(b.roll_no || '', undefined, { numeric: true })
      })
    setRows(merged)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const s = await loadMeta()
      await loadFees(s, month)
    } catch (err) {
      setError(err.message || 'Failed to load fees.')
    } finally {
      setLoading(false)
    }
  }, [loadMeta, loadFees, month])

  useEffect(() => { refresh() }, [refresh])

  const toggleStatus = async (row) => {
    if (!session) return
    const newStatus = row.status === FEE_STATUS.PAID ? FEE_STATUS.UNPAID : FEE_STATUS.PAID
    setSavingId(row.student_id)
    // Optimistic update.
    setRows((rs) => rs.map((r) => (r.student_id === row.student_id ? { ...r, status: newStatus } : r)))
    try {
      const { error: upErr } = await supabase
        .from('fees')
        .upsert(
          {
            student_id: row.student_id,
            session_id: session.id,
            month,
            status: newStatus,
            marked_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id,session_id,month' },
        )
      if (upErr) throw upErr
    } catch (err) {
      // Revert on failure.
      setRows((rs) => rs.map((r) => (r.student_id === row.student_id ? { ...r, status: row.status } : r)))
      toast.error(err.message || 'Failed to update fee status.')
    } finally {
      setSavingId(null)
    }
  }

  const visible = classFilter ? rows.filter((r) => r.class_id === classFilter) : rows
  const unpaid = visible.filter((r) => r.status === FEE_STATUS.UNPAID)

  const sendReminders = async () => {
    setConfirmReminders(false)
    const targets = unpaid.filter((r) => r.parent_phone)
    if (targets.length === 0) {
      toast.info('No unpaid students with a phone number to remind.')
      return
    }
    setSending(true)
    try {
      // Priority: WhatsApp (if configured server-side) → SMS → neither.
      const wa = await sendWhatsAppBatch(
        targets.map((s) => ({
          key: s.student_id,
          phone: s.parent_phone,
          variables: [s.name, s.class_name, monthLabel(month)],
        })),
        WA_TEMPLATE_FEE,
      )
      if (wa.configured) {
        toast.success(`WhatsApp reminders sent to ${wa.sent} parent(s).`)
      } else if (smsConfigured()) {
        const res = await sendSmsBatch(
          targets.map((s) => ({
            key: s.student_id,
            phone: s.parent_phone,
            message: `Dear Parent, monthly fee for ${s.name} of ${s.class_name} is due for ${monthLabel(month)}. Please submit at the earliest. - ${SCHOOL_NAME}`,
          })),
        )
        toast.success(`SMS reminders sent to ${res.sent} parent(s).`)
      } else {
        toast.info('Messaging not configured — no reminders sent.')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send reminders.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Fee Management"
        subtitle={session ? `Active session: ${session.session_name}` : 'No active session'}
        actions={
          <button
            className="btn-primary"
            onClick={() => setConfirmReminders(true)}
            disabled={!session || unpaid.length === 0 || sending}
          >
            {sending ? <Spinner label="Sending…" /> : <><Icon name="announce" /> Send Reminders ({unpaid.length})</>}
          </button>
        }
      />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {!loading && !session && (
        <Alert type="warning" className="mb-4">No active academic session. Fees are tracked per active session.</Alert>
      )}

      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div>
          <label className="label">Month</label>
          <select className="input sm:w-48" value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthOptions.map((o) => <option key={o.val} value={o.val}>{monthLabel(o.val)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Class</label>
          <select className="input sm:w-48" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
        </div>
      </div>

      {!smsConfigured() && (
        <p className="mb-3 text-xs text-slate-400">SMS reminders are not configured (set VITE_MSG91_API_KEY).</p>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : visible.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">No active students for this selection.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Roll</th>
                  <th className="px-4 py-3 text-right">Fee Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => {
                  const paid = r.status === FEE_STATUS.PAID
                  return (
                    <tr key={r.student_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{r.name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.class_name}</td>
                      <td className="px-4 py-3 text-slate-500">{r.roll_no || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggleStatus(r)}
                          disabled={savingId === r.student_id}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                            paid
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {savingId === r.student_id ? '…' : paid ? 'Paid' : 'Unpaid'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && visible.length > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          {monthLabel(month)} · {visible.length - unpaid.length} paid, {unpaid.length} unpaid. Tap a status to toggle — saved automatically.
        </p>
      )}

      <ConfirmDialog
        open={confirmReminders}
        onClose={() => setConfirmReminders(false)}
        onConfirm={sendReminders}
        title="Send fee reminders?"
        message={`An SMS reminder will be sent to the parents of ${unpaid.filter((r) => r.parent_phone).length} unpaid student(s) for ${monthLabel(month)}.`}
        confirmLabel="Send Reminders"
        danger={false}
      />
    </div>
  )
}
