import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/useAuth.js'
import PageHeader from '../../components/PageHeader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { PageLoader } from '../../components/ui/Spinner.jsx'
import Icon from '../../components/ui/Icon.jsx'

const isPdf = (url) => /\.pdf(\?|$)/i.test(url || '')

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function StudentTimetable() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [className, setClassName] = useState('')
  const [current, setCurrent] = useState(null) // { file_url, updated_at }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: studentData } = await supabase
        .from('students').select('id').eq('user_id', user.id).maybeSingle()
      if (!studentData) throw new Error('Student record not found.')

      const { data: enrollData } = await supabase
        .from('student_enrollments')
        .select('class_id, session_id, classes(class_name), academic_sessions!inner(status)')
        .eq('student_id', studentData.id)
        .eq('academic_sessions.status', 'active')
        .maybeSingle()
      if (!enrollData) throw new Error('No active enrollment found.')
      setClassName(enrollData.classes?.class_name || '')

      const { data, error: err } = await supabase
        .from('timetable')
        .select('file_url, updated_at')
        .eq('class_id', enrollData.class_id)
        .eq('session_id', enrollData.session_id)
        .not('file_url', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
      if (err) throw err
      setCurrent(data?.[0] || null)
    } catch (err) {
      setError(err.message || 'Failed to load timetable.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div>
      <PageHeader title="Timetable" subtitle={className ? `Class ${className} weekly schedule` : 'Weekly class schedule'} />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : !current ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">
          No timetable has been uploaded for your class yet.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div className="text-sm">
              <span className="font-semibold text-navy">{className} Timetable</span>
              <span className="ml-2 text-xs text-slate-400">Updated {fmtDate(current.updated_at)}</span>
            </div>
            <a href={current.file_url} target="_blank" rel="noreferrer" download className="btn-outline text-xs">
              <Icon name="materials" className="h-4 w-4" /> Download
            </a>
          </div>
          <div className="bg-slate-50 p-4">
            {isPdf(current.file_url) ? (
              <iframe title="Timetable PDF" src={current.file_url} className="h-[600px] w-full rounded-lg border border-slate-200 bg-white" />
            ) : (
              <img src={current.file_url} alt={`${className} timetable`} className="mx-auto max-h-[600px] w-auto rounded-lg border border-slate-200 bg-white" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
