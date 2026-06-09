import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import PageHeader from '../../components/PageHeader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { PageLoader } from '../../components/ui/Spinner.jsx'
import Icon from '../../components/ui/Icon.jsx'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function StudentExaminations() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('examinations')
        .select('id, exam_name, datesheet_file_url, created_at, academic_sessions(session_name)')
        .order('created_at', { ascending: false })
      if (err) throw err
      setRows(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load datesheets.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <PageHeader title="Examinations" subtitle="Exam datesheets published by the school" />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">No datesheets available yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="card flex flex-col p-5">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-royal-50 text-royal">
                <Icon name="exam" className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-800">{r.exam_name}</h3>
              <p className="mt-0.5 text-sm text-slate-500">{r.academic_sessions?.session_name || '—'}</p>
              <p className="mt-1 text-xs text-slate-400">Uploaded: {fmtDate(r.created_at)}</p>
              {r.datesheet_file_url && (
                <a
                  href={r.datesheet_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary mt-4 w-full"
                >
                  <Icon name="materials" className="h-4 w-4" /> Download PDF
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
