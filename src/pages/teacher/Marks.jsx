import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/useAuth.js'
import { ACTIVE_STUDENT, EXAM_TYPES } from '../../lib/constants.js'
import PageHeader from '../../components/PageHeader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Spinner, { PageLoader } from '../../components/ui/Spinner.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

export default function TeacherMarks() {
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)
  const [classes, setClasses] = useState([])

  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [examType, setExamType] = useState('')
  const [subjects, setSubjects] = useState([])

  const [students, setStudents] = useState([]) // [{ student_id, name, roll_no }]
  const [marks, setMarks] = useState({}) // student_id -> { obtained, max }
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadMeta = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [classesRes, sessionRes] = await Promise.all([
        supabase.from('classes').select('id, class_name, sort_order').order('sort_order'),
        supabase.from('academic_sessions').select('id, session_name').eq('status', 'active').maybeSingle(),
      ])
      if (classesRes.error) throw classesRes.error
      setClasses(classesRes.data || [])
      setSession(sessionRes.data || null)
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
    if (!classId || !subjectId || !examType || !session) { setStudents([]); setMarks({}); return }
    setLoadingRoster(true)
    setError('')
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
      setStudents(roster)

      // Existing marks for this exact (class, subject, exam, session).
      const { data: existing } = await supabase
        .from('marks')
        .select('student_id, marks_obtained, max_marks')
        .eq('session_id', session.id)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('exam_type', examType)

      const map = {}
      roster.forEach((s) => { map[s.student_id] = { obtained: '', max: '100' } })
      ;(existing || []).forEach((m) => {
        map[m.student_id] = {
          obtained: m.marks_obtained != null ? String(m.marks_obtained) : '',
          max: m.max_marks != null ? String(m.max_marks) : '100',
        }
      })
      setMarks(map)
    } catch (err) {
      setError(err.message || 'Failed to load students.')
    } finally {
      setLoadingRoster(false)
    }
  }, [classId, subjectId, examType, session])

  useEffect(() => { loadRoster() }, [loadRoster])

  const setMark = (sid, field) => (e) => {
    const value = e.target.value
    setMarks((m) => ({ ...m, [sid]: { ...m[sid], [field]: value } }))
  }

  const ready = classId && subjectId && examType && students.length > 0

  const handleSave = async () => {
    if (!ready || !session) return
    // Only save rows where a mark was entered.
    const rows = []
    for (const s of students) {
      const entry = marks[s.student_id]
      if (!entry || entry.obtained === '' || entry.obtained == null) continue
      const obtained = Number(entry.obtained)
      const max = Number(entry.max || 100)
      if (Number.isNaN(obtained) || Number.isNaN(max)) {
        setError(`Invalid marks for ${s.name}.`); return
      }
      if (obtained < 0 || max <= 0 || obtained > max) {
        setError(`Marks for ${s.name} must be between 0 and ${max}.`); return
      }
      rows.push({
        student_id: s.student_id,
        session_id: session.id,
        class_id: classId,
        subject_id: subjectId,
        exam_type: examType,
        marks_obtained: obtained,
        max_marks: max,
        entered_by: user.id,
      })
    }

    if (rows.length === 0) { setError('Enter marks for at least one student.'); return }
    setError('')
    setSaving(true)
    try {
      const { error: upErr } = await supabase
        .from('marks')
        .upsert(rows, { onConflict: 'student_id,subject_id,exam_type,session_id' })
      if (upErr) throw upErr
      toast.success(`Marks saved for ${rows.length} student(s).`)
    } catch (err) {
      setError(err.message || 'Failed to save marks.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div>
      <PageHeader title="Marks" subtitle={session ? `Active session: ${session.session_name}` : 'No active session'} />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {!session ? (
        <Alert type="warning">No active academic session. Marks cannot be entered until a session is active.</Alert>
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

          {!ready && !loadingRoster ? (
            <div className="card px-6 py-16 text-center text-sm text-slate-500">
              Select class, subject and exam type to enter marks.
            </div>
          ) : loadingRoster ? (
            <PageLoader />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Roll</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3 w-32">Marks Obtained</th>
                      <th className="px-4 py-3 w-32">Max Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => (
                      <tr key={s.student_id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-500">{s.roll_no || '—'}</td>
                        <td className="px-4 py-2 text-slate-700">{s.name}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number" min="0" className="input py-1.5"
                            value={marks[s.student_id]?.obtained ?? ''}
                            onChange={setMark(s.student_id, 'obtained')}
                            disabled={saving}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number" min="1" className="input py-1.5"
                            value={marks[s.student_id]?.max ?? '100'}
                            onChange={setMark(s.student_id, 'max')}
                            disabled={saving}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-200 p-4">
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Spinner label="Saving…" /> : 'Save Marks'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
