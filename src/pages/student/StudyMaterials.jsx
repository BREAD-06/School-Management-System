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

export default function StudentStudyMaterials() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [materials, setMaterials] = useState([])
  const [subjects, setSubjects] = useState([])
  const [filterSubject, setFilterSubject] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: studentData } = await supabase
        .from('students').select('id').eq('user_id', user.id).maybeSingle()
      if (!studentData) throw new Error('Student record not found.')

      const { data: enrollData } = await supabase
        .from('student_enrollments')
        .select('class_id, academic_sessions!inner(status)')
        .eq('student_id', studentData.id)
        .eq('academic_sessions.status', 'active')
        .maybeSingle()
      if (!enrollData) throw new Error('No active enrollment found.')

      const { data, error: err } = await supabase
        .from('study_materials')
        .select('id, title, file_url, created_at, subject_id, subjects(subject_name)')
        .eq('class_id', enrollData.class_id)
        .order('created_at', { ascending: false })
      if (err) throw err

      setMaterials(data || [])
      const seen = new Map()
      ;(data || []).forEach(m => {
        if (m.subject_id && m.subjects?.subject_name) seen.set(m.subject_id, m.subjects.subject_name)
      })
      setSubjects([...seen.entries()].map(([id, name]) => ({ id, name })))
    } catch (err) {
      setError(err.message || 'Failed to load study materials.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  const filtered = useMemo(() => {
    if (!filterSubject) return materials
    return materials.filter(m => m.subject_id === filterSubject)
  }, [materials, filterSubject])

  return (
    <div>
      <PageHeader title="Study Materials" subtitle="Resources shared by your teachers" />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <select className="input sm:w-52" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {filterSubject && (
          <button className="btn-outline text-xs" onClick={() => setFilterSubject('')}>Clear</button>
        )}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} material{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">
          {materials.length === 0 ? 'No study materials available yet.' : 'No materials for the selected subject.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(mat => (
            <div key={mat.id} className="card flex flex-col p-5">
              <div className="mb-2">
                <span className="rounded-full bg-royal-50 px-2.5 py-0.5 text-xs font-medium text-royal">
                  {mat.subjects?.subject_name || '—'}
                </span>
              </div>
              <h3 className="font-semibold text-slate-800">{mat.title}</h3>
              <p className="mt-1 text-xs text-slate-400">Uploaded: {formatDate(mat.created_at)}</p>
              {mat.file_url && (
                <a href={mat.file_url} target="_blank" rel="noreferrer"
                  className="mt-auto pt-3 inline-flex items-center gap-1.5 text-sm font-medium text-royal hover:underline">
                  <Icon name="materials" className="h-4 w-4" /> Download
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
