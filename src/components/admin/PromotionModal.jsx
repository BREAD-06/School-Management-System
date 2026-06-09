import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { ACTIVE_STUDENT, STUDENT_STATUS } from '../../lib/constants.js'
import Modal from '../ui/Modal.jsx'
import Alert from '../ui/Alert.jsx'
import Spinner, { PageLoader } from '../ui/Spinner.jsx'

const GRADUATED_LABEL = 'Graduated'

export default function PromotionModal({ open, onClose, targetSession, activeSession, onDone }) {
  const [step, setStep] = useState('preview') // preview | confirming | done
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [blocker, setBlocker] = useState('') // a hard reason promotion cannot proceed
  const [preview, setPreview] = useState([]) // [{ fromName, toName, count }]
  const [plan, setPlan] = useState(null) // internal { enrollments, gradIds }
  const [result, setResult] = useState({ promoted: 0, graduated: 0 })

  const build = useCallback(async () => {
    setLoading(true)
    setError(''); setBlocker(''); setPreview([]); setPlan(null)
    try {
      if (!activeSession) { setBlocker('There is no active session to promote from.'); return }
      if (targetSession.id === activeSession.id) {
        setBlocker('You cannot promote into the currently active session. Choose a different (inactive) session.')
        return
      }

      // Target must be empty.
      const { count: targetCount, error: tcErr } = await supabase
        .from('student_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', targetSession.id)
      if (tcErr) throw tcErr
      if (targetCount && targetCount > 0) {
        setBlocker(`"${targetSession.session_name}" already has ${targetCount} enrollment(s). Promotion can only target an empty session.`)
        return
      }

      // Classes ordered by sort_order to derive "next class up".
      const { data: classes, error: clsErr } = await supabase
        .from('classes')
        .select('id, class_name, sort_order')
        .order('sort_order')
      if (clsErr) throw clsErr
      const ordered = classes || []
      const nextOf = (sortOrder) => ordered.find((c) => c.sort_order > sortOrder) || null

      // Active enrollments of active students in the current session.
      const { data: enrollments, error: enErr } = await supabase
        .from('student_enrollments')
        .select('roll_no, class_id, student_id, students!inner(status), classes(class_name, sort_order)')
        .eq('session_id', activeSession.id)
      if (enErr) throw enErr

      const active = (enrollments || []).filter((e) => e.students?.status === ACTIVE_STUDENT)
      if (active.length === 0) {
        setBlocker('There are no active students in the current session to promote.')
        return
      }

      // Build plan + grouped preview.
      const groups = new Map() // key fromName||toName -> count
      const newEnrollments = []
      const gradIds = []

      for (const e of active) {
        const fromName = e.classes?.class_name || '—'
        const sortOrder = e.classes?.sort_order ?? 0
        const next = nextOf(sortOrder)
        const toName = next ? next.class_name : GRADUATED_LABEL

        if (next) {
          newEnrollments.push({
            student_id: e.student_id,
            session_id: targetSession.id,
            class_id: next.id,
            roll_no: e.roll_no || null,
            status: 'active',
          })
        } else {
          // Highest class → graduate. Keep their current class on the record.
          newEnrollments.push({
            student_id: e.student_id,
            session_id: targetSession.id,
            class_id: e.class_id,
            roll_no: e.roll_no || null,
            status: STUDENT_STATUS.GRADUATED,
          })
          gradIds.push(e.student_id)
        }

        const key = `${fromName}||${toName}`
        groups.set(key, (groups.get(key) || 0) + 1)
      }

      const previewRows = [...groups.entries()]
        .map(([key, count]) => {
          const [fromName, toName] = key.split('||')
          return { fromName, toName, count }
        })
        .sort((a, b) => a.fromName.localeCompare(b.fromName, undefined, { numeric: true }))

      setPreview(previewRows)
      setPlan({ enrollments: newEnrollments, gradIds })
    } catch (err) {
      setError(err.message || 'Failed to build promotion preview.')
    } finally {
      setLoading(false)
    }
  }, [activeSession, targetSession])

  useEffect(() => {
    if (open && targetSession) {
      setStep('preview')
      build()
    }
  }, [open, targetSession, build])

  const total = preview.reduce((sum, r) => sum + r.count, 0)

  const confirm = async () => {
    if (!plan) return
    setStep('confirming')
    setError('')
    try {
      // 1) Insert all new enrollments for the target session.
      const { error: insErr } = await supabase.from('student_enrollments').insert(plan.enrollments)
      if (insErr) throw insErr

      // 2) Mark graduating students as graduated.
      let graduated = 0
      if (plan.gradIds.length) {
        const { error: updErr } = await supabase
          .from('students')
          .update({ status: STUDENT_STATUS.GRADUATED })
          .in('id', plan.gradIds)
        if (updErr) throw updErr
        graduated = plan.gradIds.length
      }

      setResult({ promoted: plan.enrollments.length - graduated, graduated })
      setStep('done')
    } catch (err) {
      setError(err.message || 'Promotion failed.')
      setStep('preview')
    }
  }

  const close = () => {
    if (step === 'confirming') return
    onClose()
  }

  return (
    <Modal open={open} onClose={close} title={`Promote Students → ${targetSession?.session_name || ''}`} maxWidth="max-w-xl">
      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {step === 'done' ? (
        <div className="space-y-4">
          <Alert type="success">
            {result.promoted} student{result.promoted === 1 ? '' : 's'} promoted successfully.
            {result.graduated > 0 && ` ${result.graduated} student${result.graduated === 1 ? '' : 's'} graduated.`}
          </Alert>
          <p className="text-sm text-slate-600">
            Now go to the sessions list and click <strong>Set Active</strong> on
            "{targetSession?.session_name}" to make it the current session.
          </p>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => { onDone?.(); onClose() }}>Done</button>
          </div>
        </div>
      ) : loading ? (
        <PageLoader />
      ) : blocker ? (
        <div className="space-y-4">
          <Alert type="warning">{blocker}</Alert>
          <div className="flex justify-end">
            <button className="btn-outline" onClick={close}>Close</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Alert type="warning">
            <strong>This action cannot be undone.</strong> Each active student in
            "{activeSession?.session_name}" will be enrolled into "{targetSession?.session_name}" one class higher.
          </Alert>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Current Class</th>
                  <th className="px-4 py-2">New Class</th>
                  <th className="px-4 py-2 text-right">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((r, i) => (
                  <tr key={i} className={r.toName === GRADUATED_LABEL ? 'bg-amber-50/50' : ''}>
                    <td className="px-4 py-2 text-slate-700">{r.fromName}</td>
                    <td className="px-4 py-2 font-medium text-navy">
                      {r.toName === GRADUATED_LABEL ? <span className="text-amber-700">Graduated</span> : r.toName}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm font-medium text-slate-700">Total students to be promoted: {total}</p>

          <div className="flex justify-end gap-3">
            <button className="btn-outline" onClick={close} disabled={step === 'confirming'}>Cancel</button>
            <button className="btn-primary" onClick={confirm} disabled={step === 'confirming' || total === 0}>
              {step === 'confirming' ? <Spinner label="Promoting…" /> : 'Confirm Promotion'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
