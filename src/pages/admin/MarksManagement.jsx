import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/useAuth.js'
import { ACTIVE_STUDENT, EXAM_TYPES } from '../../lib/constants.js'
import PageHeader from '../../components/PageHeader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Spinner, { PageLoader } from '../../components/ui/Spinner.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function pct(obtained, max) {
  const o = Number(obtained)
  const m = Number(max)
  if (!m || Number.isNaN(o) || Number.isNaN(m)) return null
  return Math.round((o / m) * 1000) / 10
}

export default function MarksManagement() {
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)
  const [classes, setClasses] = useState([])
  const [teacherMap, setTeacherMap] = useState({}) // user_id -> name

  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [examType, setExamType] = useState('')
  const [subjects, setSubjects] = useState([])

  const [rows, setRows] = useState([]) // { student_id, name, roll_no, mark_id, obtained, max, entered_by, updated_at }
  const [dirty, setDirty] = useState(() => new Set())
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadMeta = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [classesRes, sessionRes, teachersRes] = await Promise.all([
        supabase.from('classes').select('id, class_name, sort_order').order('sort_order'),
        supabase.from('academic_sessions').select('id, session_name').eq('status', 'active').maybeSingle(),
        supabase.from('teachers').select('user_id, name'),
      ])
      if (classesRes.error) throw classesRes.error
      setClasses(classesRes.data || [])
      setSession(sessionRes.data || null)
      const map = {}
      ;(teachersRes.data || []).forEach((t) => { if (t.user_id) map[t.user_id] = t.name })
      setTeacherMap(map)
    } catch (err) {
      setError(err.message || 'Failed to load.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMeta() }, [loadMeta])

  // Subjects for the chosen class.
  useEffect(() => {
    setSubjectId('')
    if (!classId) { setSubjects([]); return }
    supabase.from('class_subjects').select('subject_id, subjects(id, subject_name)').eq('class_id', classId)
      .then(({ data }) => setSubjects(data || []))
  }, [classId])

  const loadRoster = useCallback(async () => {
    if (!classId || !subjectId || !examType || !session) { setRows([]); return }
    setLoadingRoster(true)
    setError('')
    setDirty(new Set())
    try {
      const { data: enrollments, error: enrErr } = await supabase
        .from('student_enrollments')
        .select('roll_no, student_id, students!inner(id, first_name, last_name, status)')
        .eq('session_id', session.id)
        .eq('class_id', classId)
      if (enrErr) throw enrErr

      const roster = (enrollments || [])
        .filter((e) => e.students?.status === ACTIVE_STUDENT)
        .map((e) => ({
          student_id: e.student_id,
          name: `${e.students.first_name} ${e.students.last_name}`,
          roll_no: e.roll_no || '',
        }))
        .sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || '', undefined, { numeric: true }))

      const { data: marks, error: mErr } = await supabase
        .from('marks')
        .select('id, student_id, marks_obtained, max_marks, entered_by, updated_at')
        .eq('session_id', session.id)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('exam_type', examType)
      if (mErr) throw mErr
      const markMap = new Map((marks || []).map((m) => [m.student_id, m]))

      setRows(roster.map((s) => {
        const m = markMap.get(s.student_id)
        return {
          ...s,
          mark_id: m?.id || null,
          obtained: m?.marks_obtained != null ? String(m.marks_obtained) : '',
          max: m?.max_marks != null ? String(m.max_marks) : '100',
          entered_by: m?.entered_by || null,
          updated_at: m?.updated_at || null,
        }
      }))
    } catch (err) {
      setError(err.message || 'Failed to load marks.')
    } finally {
      setLoadingRoster(false)
    }
  }, [classId, subjectId, examType, session])

  useEffect(() => { loadRoster() }, [loadRoster])

  const setField = (sid, field) => (e) => {
    const value = e.target.value
    setRows((rs) => rs.map((r) => (r.student_id === sid ? { ...r, [field]: value } : r)))
    setDirty((d) => new Set(d).add(sid))
  }

  const ready = classId && subjectId && examType
  const dirtyCount = dirty.size

  const handleSave = async () => {
    if (!session) return
    const toUpdate = []
    const toInsert = []
    for (const r of rows) {
      if (!dirty.has(r.student_id)) continue
      if (r.obtained === '' || r.obtained == null) continue // skip blanks
      const obtained = Number(r.obtained)
      const max = Number(r.max || 100)
      if (Number.isNaN(obtained) || Number.isNaN(max)) { setError(`Invalid marks for ${r.name}.`); return }
      if (obtained < 0 || max <= 0 || obtained > max) { setError(`Marks for ${r.name} must be between 0 and ${max}.`); return }
      if (r.mark_id) {
        // Preserve the original "entered by" on a correction; just update values.
        toUpdate.push({ id: r.mark_id, marks_obtained: obtained, max_marks: max, updated_at: new Date().toISOString() })
      } else {
        toInsert.push({
          student_id: r.student_id, session_id: session.id, class_id: classId,
          subject_id: subjectId, exam_type: examType, marks_obtained: obtained, max_marks: max,
          entered_by: user.id,
        })
      }
    }
    if (toUpdate.length === 0 && toInsert.length === 0) { setError('No changes to save.'); return }
    setError('')
    setSaving(true)
    try {
      for (const u of toUpdate) {
        const { error: upErr } = await supabase
          .from('marks').update({ marks_obtained: u.marks_obtained, max_marks: u.max_marks, updated_at: u.updated_at })
          .eq('id', u.id)
        if (upErr) throw upErr
      }
      if (toInsert.length) {
        const { error: insErr } = await supabase.from('marks').insert(toInsert)
        if (insErr) throw insErr
      }
      toast.success(`Saved marks for ${toUpdate.length + toInsert.length} student(s).`)
      await loadRoster()
    } catch (err) {
      setError(err.message || 'Failed to save marks.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Marks Management"
        subtitle={session ? `Active session: ${session.session_name}` : 'No active session'}
      />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {!session ? (
        <Alert type="warning">No active academic session. Marks are tracked per active session.</Alert>
      ) : (
        <>
          <div className="card mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
            <div>
              <label className="label">Class</label>
              <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Select class…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject</label>
              <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!classId}>
                <option value="">{classId ? 'Select subject…' : 'Select class first'}</option>
                {subjects.map((cs) => <option key={cs.subject_id} value={cs.subject_id}>{cs.subjects?.subject_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Exam Type</label>
              <select className="input" value={examType} onChange={(e) => setExamType(e.target.value)}>
                <option value="">Select exam…</option>
                {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {!ready ? (
            <div className="card px-6 py-16 text-center text-sm text-slate-500">
              Select a class, subject and exam type to view and correct marks.
            </div>
          ) : loadingRoster ? (
            <PageLoader />
          ) : rows.length === 0 ? (
            <div className="card px-6 py-16 text-center text-sm text-slate-500">No active students in this class.</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Roll</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3 w-28">Obtained</th>
                      <th className="px-4 py-3 w-28">Max</th>
                      <th className="px-4 py-3">Percentage</th>
                      <th className="px-4 py-3">Entered By</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => {
                      const p = pct(r.obtained, r.max)
                      return (
                        <tr key={r.student_id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-500">{r.roll_no || '—'}</td>
                          <td className="px-4 py-2 text-slate-700">{r.name}</td>
                          <td className="px-4 py-2">
                            <input type="number" min="0" className="input py-1.5" value={r.obtained}
                              onChange={setField(r.student_id, 'obtained')} disabled={saving} />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" min="1" className="input py-1.5" value={r.max}
                              onChange={setField(r.student_id, 'max')} disabled={saving} />
                          </td>
                          <td className="px-4 py-2 text-slate-600">{p == null ? '—' : `${p}%`}</td>
                          <td className="px-4 py-2 text-slate-500">
                            {r.entered_by ? (teacherMap[r.entered_by] || 'Administrator') : '—'}
                          </td>
                          <td className="px-4 py-2 text-slate-500">{fmtDate(r.updated_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 p-4">
                <span className="text-xs text-slate-400">
                  {dirtyCount > 0 ? `${dirtyCount} row(s) changed` : 'Edit any cell to make a correction.'}
                </span>
                <button className="btn-primary" onClick={handleSave} disabled={saving || dirtyCount === 0}>
                  {saving ? <Spinner label="Saving…" /> : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
