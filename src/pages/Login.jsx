import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { ROLE_HOME, SCHOOL_NAME } from '../lib/constants.js'
import Alert from '../components/ui/Alert.jsx'
import Spinner from '../components/ui/Spinner.jsx'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)
    try {
      const { role } = await signIn(email.trim(), password)
      if (!role) {
        setError('Your account has no role assigned. Please contact the administrator.')
        setLoading(false)
        return
      }
      navigate(ROLE_HOME[role] || '/login', { replace: true })
    } catch (err) {
      const msg = err?.message || 'Login failed. Please try again.'
      setError(
        /invalid login credentials/i.test(msg)
          ? 'Invalid email or password.'
          : msg,
      )
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy via-navy-800 to-royal-600 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/bjps-logo.png"
            alt="Bala Ji Public School"
            className="mx-auto mb-4 h-20 w-auto rounded-2xl bg-white/10 p-2 ring-1 ring-white/20"
          />
          <h1 className="text-2xl font-bold text-white">{SCHOOL_NAME}</h1>
          <p className="mt-1 text-sm text-white/70">Management System Portal</p>
        </div>

        <div className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-navy">Sign in to your account</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use the credentials provided by the school administration.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            {error && <Alert type="error">{error}</Alert>}

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                className="input"
                placeholder="bjps-0001@bjps.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-royal"
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner label="Signing in…" /> : 'Login'}
            </button>

            <p className="text-center text-xs text-slate-500">
              Forgot your password? Please contact the school administrator.
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/60">
          Accounts are created by the school administrator only.
        </p>
      </div>
    </div>
  )
}
