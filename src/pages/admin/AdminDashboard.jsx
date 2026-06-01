import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { ACTIVE_STUDENT, ACTIVE_TEACHER } from '../../lib/constants.js'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

function StatCard({ icon, label, value, loading, to }) {
  const inner = (
    <div className="card flex items-center gap-4 p-5 transition hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy/5 text-navy">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-navy">
          {loading ? <Spinner className="h-5 w-5" /> : value}
        </p>
      </div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, teachers: 0, session: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const [students, teachers, session] = await Promise.all([
          supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('status', ACTIVE_STUDENT),
          supabase
            .from('teachers')
            .select('id', { count: 'exact', head: true })
            .eq('status', ACTIVE_TEACHER),
          supabase
            .from('academic_sessions')
            .select('session_name')
            .eq('status', 'active')
            .maybeSingle(),
        ])
        if (!active) return
        if (students.error) throw students.error
        if (teachers.error) throw teachers.error
        setStats({
          students: students.count ?? 0,
          teachers: teachers.count ?? 0,
          session: session.data?.session_name ?? null,
        })
      } catch (err) {
        if (active) setError(err.message || 'Failed to load dashboard data.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle={
          stats.session
            ? `Active session: ${stats.session}`
            : 'No active academic session set'
        }
      />

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {!loading && !stats.session && (
        <Alert type="warning" className="mb-4">
          No active academic session exists. Create one in{' '}
          <Link to="/admin/sessions" className="font-semibold underline">
            Academic Sessions
          </Link>{' '}
          before enrolling students.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon="students"
          label="Active Students"
          value={stats.students}
          loading={loading}
          to="/admin/students"
        />
        <StatCard
          icon="teachers"
          label="Active Teachers"
          value={stats.teachers}
          loading={loading}
          to="/admin/teachers"
        />
        <StatCard
          icon="session"
          label="Active Session"
          value={stats.session || '—'}
          loading={loading}
          to="/admin/sessions"
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/students" className="btn-primary">
            <Icon name="students" /> Manage Students
          </Link>
          <Link to="/admin/teachers" className="btn-secondary">
            <Icon name="teachers" /> Manage Teachers
          </Link>
        </div>
      </div>
    </div>
  )
}
