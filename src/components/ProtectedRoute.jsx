import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { PageLoader } from './ui/Spinner.jsx'
import { ROLE_HOME } from '../lib/constants.js'

/**
 * Guards routes. If not logged in -> / (public landing page). If logged in but
 * the role is not allowed for this route -> send to that role's own dashboard.
 *
 * NOTE: unauthenticated users are sent to "/" (NOT "/login"). This is what makes
 * logout land on the landing page: when signOut() clears the session, this guard
 * re-renders and redirects — sending it to "/" means clicking logout in any
 * portal reliably ends up on the public landing page. Visitors still reach the
 * login screen via the explicit "Login" button.
 */
export default function ProtectedRoute({ allow, children }) {
  const { session, role, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!session) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  if (allow && role && !allow.includes(role)) {
    return <Navigate to={ROLE_HOME[role] || '/'} replace />
  }

  // Logged in but role row missing — treat as not authorized.
  if (allow && !role) {
    return <Navigate to="/" replace />
  }

  return children
}
