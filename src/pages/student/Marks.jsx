import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/useAuth.js'
import { EXAM_TYPES } from '../../lib/constants.js'
import PageHeader from '../../components/PageHeader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { PageLoader } from '../../components/ui/Spinner.jsx'

const PASS_PCT = 33

function pct(obtained, max) {
  if (!max) return 0
  return Math.round((obtained / max) * 1000) / 10
}

export default function StudentResults() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [className, setClassName] = useState('')
  const [marks, setMarks] = useState([]) // { subject, exam_type, obtained, max }
  const [activeTab, setActiveTab] = useState(EXAM_TYPES[0].value)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: student } = await supabase
        .from('students').select('id').eq('user_id', user.id).maybeSingle()
      if (!student) throw new Error('Student record not found.')

      const { data: enroll } = await supabase
        .from('student_enrollments')
        .select('class_id, session_id, classes(class_name), academic_sessions!inner(status)')
        .eq('student_id', student.id)
        .eq('academic_sessions.status', 'active')
        .maybeSingle()
      if (!enroll) throw new Error('No active enrollment found.')
      setClassName(enroll.classes?.class_name || '')

      const { data, error: err } = await supabase
        .from('marks')
        .select('subject_id, exam_type, marks_obtained, max_marks, subjects(subject_name)')
        .eq('student_id', student.id)
        .eq('session_id', enroll.session_id)
      if (err) throw err
      setMarks(
        (data || []).map((m) => ({
          subject: m.subjects?.subject_name || '—',
          exam_type: m.exam_type,
          obtained: Number(m.marks_obtained) || 0,
          max: Number(m.max_marks) || 0,
        })),
      )
    } catch (err) {
      setError(err.message || 'Failed to load results.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const rows = useMemo(
    () => marks.filter((m) => m.exam_type === activeTab).sort((a, b) => a.subject.localeCompare(b.subject)),
    [marks, activeTab],
  )

  const totals = useMemo(() => {
    const obtained = rows.reduce((s, r) => s + r.obtained, 0)
    const max = rows.reduce((s, r) => s + r.max, 0)
    return { obtained, max, percentage: pct(obtained, max) }
  }, [rows])

  const overallPass = totals.max > 0 && totals.percentage >= PASS_PCT

  if (loading) return <PageLoader />

  return (
    <div>
      <PageHeader title="Results" subtitle={className ? `Class ${className} · academic results` : 'Your examination results'} />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {/* Exam type tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {EXAM_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === t.value ? 'bg-navy text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">
          No results published for this examination yet.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3 text-center">Marks Obtained</th>
                  <th className="px-4 py-3 text-center">Max Marks</th>
                  <th className="px-4 py-3 text-center">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => {
                  const p = pct(r.obtained, r.max)
                  const pass = p >= PASS_PCT
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">{r.subject}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{r.obtained}</td>
                      <td className="px-4 py-3 text-center text-slate-500">{r.max}</td>
                      <td className={`px-4 py-3 text-center font-semibold ${pass ? 'text-emerald-600' : 'text-red-600'}`}>{p}%</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-navy">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-center">{totals.obtained}</td>
                  <td className="px-4 py-3 text-center">{totals.max}</td>
                  <td className="px-4 py-3 text-center">{totals.percentage}%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-4">
            <div className="text-sm text-slate-600">
              Overall Percentage: <span className="font-bold text-navy">{totals.percentage}%</span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${
                overallPass ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {overallPass ? '✓ Pass' : '✕ Fail'}
            </span>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">Pass mark is {PASS_PCT}%. Results are shown for the active academic session.</p>
    </div>
  )
}
