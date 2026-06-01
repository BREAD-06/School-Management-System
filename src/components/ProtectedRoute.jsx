import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { PageLoader } from './ui/Spinner.jsx'
import { ROLE_HOME } from '../lib/constants.js'

/**
 * Guards routes. If not logged in -> /login. If logged in but the role is not
 * allowed for this route -> send to that role's own dashboard.
 */
export default function ProtectedRoute({ allow, children }) {
  const { session, role, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allow && role && !allow.includes(role)) {
    return <Navigate to={ROLE_HOME[role] || '/login'} replace />
  }

  // Logged in but role row missing — treat as not authorized.
  if (allow && !role) {
    return <Navigate to="/login" replace />
  }

  return children
}
