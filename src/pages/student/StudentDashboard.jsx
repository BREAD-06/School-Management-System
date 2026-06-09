import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/ui/Icon.jsx'

const QUICK = [
  { label: 'My Profile', to: '/student/profile', icon: 'profile' },
  { label: 'Homework', to: '/student/homework', icon: 'homework' },
  { label: 'View Results', to: '/student/marks', icon: 'marks' },
  { label: 'Timetable', to: '/student/timetable', icon: 'timetable' },
  { label: 'Notifications', to: '/student/notifications', icon: 'notifications' },
]

export default function StudentDashboard() {
  const { user } = useAuth()
  return (
    <div>
      <PageHeader title="Student Dashboard" subtitle={`Welcome, ${user?.email || 'Student'}`} />
      <div className="card mb-6 bg-gradient-to-r from-navy to-royal-600 p-6 text-white">
        <h2 className="text-lg font-semibold">Hello! 🎒</h2>
        <p className="mt-1 text-sm text-white/80">
          Check your homework, study materials, timetable, and school notices here.
        </p>
      </div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Quick access
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to} className="card flex flex-col items-center gap-3 p-5 text-center transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-royal-50 text-royal">
              <Icon name={q.icon} className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-slate-700">{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
