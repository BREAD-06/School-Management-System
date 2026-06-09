import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { PageLoader } from './ui/Spinner.jsx'
import { ROLE_HOME } from '../lib/constants.js'
import Landing from '../pages/Landing.jsx'

// Root route ("/") behaviour:
//   • While auth is resolving → spinner.
//   • Logged-in user with a known role → straight to their portal dashboard.
//   • EVERYONE else (including unauthenticated visitors) → the public landing
//     page. Unauthenticated users are NEVER bounced to /login from here; they
//     only reach /login by clicking the Login button.
export default function RootRedirect() {
  const { session, role, loading } = useAuth()

  if (loading) return <PageLoader />
  if (session && role && ROLE_HOME[role]) return <Navigate to={ROLE_HOME[role]} replace />
  return <Landing />
}
