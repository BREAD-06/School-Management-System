import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { PageLoader } from './ui/Spinner.jsx'
import { ROLE_HOME } from '../lib/constants.js'

// Sends users to the right place based on auth + role.
export default function RootRedirect() {
  const { session, role, loading } = useAuth()

  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  if (role && ROLE_HOME[role]) return <Navigate to={ROLE_HOME[role]} replace />
  return <Navigate to="/login" replace />
}
