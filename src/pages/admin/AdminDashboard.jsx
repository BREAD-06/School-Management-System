import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { ACTIVE_STUDENT, ACTIVE_TEACHER, FEE_STATUS } from '../../lib/constants.js'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatCard({ icon, label, value, loading, to, accent = 'text-navy' }) {
  const inner = (
    <div className="card flex items-center gap-4 p-5 transition hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy/5 text-navy">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`text-2xl font-bold ${accent}`}>
          {loading ? <Spinner className="h-5 w-5" /> : value}
        </p>
      </div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, defaulters: 0, session: null })
  const [recentAnnouncements, setRecentAnnouncements] = useState([])
  const [recentStudents, setRecentStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const month = currentMonth()
        const [students, teachers, classes, defaulters, session, anns, recents] = await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', ACTIVE_STUDENT),
          supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('status', ACTIVE_TEACHER),
          supabase.from('classes').select('id', { count: 'exact', head: true }),
          supabase.from('fees').select('id', { count: 'exact', head: true }).eq('month', month).eq('status', FEE_STATUS.UNPAID),
          supabase.from('academic_sessions').select('session_name').eq('status', 'active').maybeSingle(),
          supabase.from('announcements').select('id, title, audience, created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('students').select('id, first_name, last_name, admission_no').order('admission_no', { ascending: false }).limit(5),
        ])
        if (!active) return
        if (students.error) throw students.error
        if (teachers.error) throw teachers.error
        setStats({
          students: students.count ?? 0,
          teachers: teachers.count ?? 0,
          classes: classes.count ?? 0,
          defaulters: defaulters.count ?? 0,
          session: session.data?.session_name ?? null,
        })
        setRecentAnnouncements(anns.data || [])
        setRecentStudents(recents.data || [])
      } catch (err) {
        if (active) setError(err.message || 'Failed to load dashboard data.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle={stats.session ? `Active session: ${stats.session}` : 'No active academic session set'}
      />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {!loading && !stats.session && (
        <Alert type="warning" className="mb-4">
          No active academic session exists. Create one in{' '}
          <Link to="/admin/sessions" className="font-semibold underline">Academic Sessions</Link> before enrolling students.
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="students" label="Active Students" value={stats.students} loading={loading} to="/admin/students" />
        <StatCard icon="teachers" label="Active Teachers" value={stats.teachers} loading={loading} to="/admin/teachers" />
        <StatCard icon="fees" label="Fee Defaulters (this month)" value={stats.defaulters} loading={loading} to="/admin/fees" accent={stats.defaulters ? 'text-red-600' : 'text-navy'} />
        <StatCard icon="session" label="Total Classes" value={stats.classes} loading={loading} />
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/students" className="btn-primary"><Icon name="students" /> Add Student</Link>
          <Link to="/admin/fees" className="btn-secondary"><Icon name="fees" /> Send Fee Reminders</Link>
          <Link to="/admin/examinations" className="btn-outline"><Icon name="exam" /> Upload Datesheet</Link>
          <Link to="/admin/announcements" className="btn-outline"><Icon name="announce" /> New Announcement</Link>
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy">Recent Announcements</h3>
            <Link to="/admin/announcements" className="text-xs font-medium text-royal hover:underline">View all</Link>
          </div>
          {loading ? (
            <Spinner />
          ) : recentAnnouncements.length === 0 ? (
            <p className="text-sm text-slate-400">No announcements yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentAnnouncements.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-sm text-slate-700">{a.title}</span>
                  <span className="shrink-0 text-xs text-slate-400">{fmtDate(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy">Recently Added Students</h3>
            <Link to="/admin/students" className="text-xs font-medium text-royal hover:underline">View all</Link>
          </div>
          {loading ? (
            <Spinner />
          ) : recentStudents.length === 0 ? (
            <p className="text-sm text-slate-400">No students yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentStudents.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-sm text-slate-700">{s.first_name} {s.last_name}</span>
                  <span className="shrink-0 text-xs font-medium text-navy">{s.admission_no}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
