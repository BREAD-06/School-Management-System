import { useAuth } from '../context/useAuth.js'
import PageHeader from '../components/PageHeader.jsx'
import ChangePasswordForm from '../components/account/ChangePasswordForm.jsx'

// Shared Settings page for all three portals. Currently hosts the
// change-password form; future account settings can be added here.
export default function Settings() {
  const { user } = useAuth()

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <h3 className="text-base font-semibold text-navy">Account</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Email / Login ID</dt>
              <dd className="mt-0.5 break-all font-medium text-slate-700">{user?.email || '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h3 className="text-base font-semibold text-navy">Change Password</h3>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Enter your current password, then choose a new one (minimum 8 characters).
          </p>
          <div className="max-w-md">
            <ChangePasswordForm requireCurrent submitLabel="Update Password" />
          </div>
        </div>
      </div>
    </div>
  )
}
