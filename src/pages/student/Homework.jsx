import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/useAuth.js'
import PageHeader from '../../components/PageHeader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { PageLoader } from '../../components/ui/Spinner.jsx'
import Icon from '../../components/ui/Icon.jsx'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(dueDate) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

export default function StudentHomework() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [homework, setHomework] = useState([])
  const [subjects, setSubjects] = useState([])
  const [filterSubject, setFilterSubject] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Find the student's active enrollment
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!studentData) throw new Error('Student record not found.')

      const { data: enrollData } = await supabase
        .from('student_enrollments')
        .select('class_id, academic_sessions!inner(status)')
        .eq('student_id', studentData.id)
        .eq('academic_sessions.status', 'active')
        .maybeSingle()
      if (!enrollData) throw new Error('No active enrollment found. Please contact the administrator.')

      const classId = enrollData.class_id

      // Fetch homework for this class
      const { data: hwData, error: hwErr } = await supabase
        .from('homework')
        .select('id, title, description, due_date, attachment_url, created_at, subject_id, subjects(subject_name)')
        .eq('class_id', classId)
        .order('due_date', { ascending: true })
      if (hwErr) throw hwErr

      setHomework(hwData || [])

      // Collect unique subjects from homework
      const seen = new Map()
      ;(hwData || []).forEach(h => {
        if (h.subject_id && h.subjects?.subject_name) seen.set(h.subject_id, h.subjects.subject_name)
      })
      setSubjects([...seen.entries()].map(([id, name]) => ({ id, name })))
    } catch (err) {
      setError(err.message || 'Failed to load homework.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  const filtered = useMemo(() => {
    if (!filterSubject) return homework
    return homework.filter(h => h.subject_id === filterSubject)
  }, [homework, filterSubject])

  return (
    <div>
      <PageHeader title="Homework" subtitle="Assignments for your class" />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <select className="input sm:w-52" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {filterSubject && (
          <button className="btn-outline text-xs" onClick={() => setFilterSubject('')}>Clear</button>
        )}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} assignment{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">
          {homework.length === 0 ? 'No homework assigned yet.' : 'No homework for the selected subject.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(hw => {
            const overdue = isOverdue(hw.due_date)
            return (
              <div key={hw.id} className={`card flex flex-col p-5 ${overdue ? 'border-red-200' : ''}`}>
                <div className="mb-2">
                  <span className="rounded-full bg-royal-50 px-2.5 py-0.5 text-xs font-medium text-royal">
                    {hw.subjects?.subject_name || '—'}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800">{hw.title}</h3>
                {hw.description && <p className="mt-1 text-sm text-slate-500">{hw.description}</p>}
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Icon name="session" className="h-3.5 w-3.5" />
                    <span>Assigned: {formatDate(hw.created_at)}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${overdue ? 'text-red-600' : 'text-slate-600'}`}>
                    <Icon name="timetable" className="h-3.5 w-3.5" />
                    <span>Due: {formatDate(hw.due_date)}{overdue ? ' · Overdue' : ''}</span>
                  </div>
                </div>
                {hw.attachment_url && (
                  <a href={hw.attachment_url} target="_blank" rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-royal hover:underline">
                    <Icon name="materials" className="h-4 w-4" /> Download Attachment
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
