import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/ui/Icon.jsx'

const QUICK = [
  { label: 'Attendance', to: '/teacher/attendance', icon: 'attendance' },
  { label: 'Homework', to: '/teacher/homework', icon: 'homework' },
  { label: 'Marks', to: '/teacher/marks', icon: 'marks' },
  { label: 'Study Materials', to: '/teacher/materials', icon: 'materials' },
]

export default function TeacherDashboard() {
  const { user } = useAuth()
  return (
    <div>
      <PageHeader title="Teacher Dashboard" subtitle={`Welcome, ${user?.email || 'Teacher'}`} />
      <div className="card mb-6 bg-gradient-to-r from-navy to-royal-600 p-6 text-white">
        <h2 className="text-lg font-semibold">Welcome back 👋</h2>
        <p className="mt-1 text-sm text-white/80">
          Use the quick links below to mark attendance, assign homework, and manage your classes.
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
