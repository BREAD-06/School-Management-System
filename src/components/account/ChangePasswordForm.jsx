import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/useAuth.js'
import Alert from '../ui/Alert.jsx'
import Spinner from '../ui/Spinner.jsx'

const MIN_LEN = 8

/**
 * Reusable change-password form.
 * - requireCurrent: when true, shows a "Current Password" field and verifies it.
 * - onDone(): called after a successful change.
 */
export default function ChangePasswordForm({ requireCurrent = true, onDone, submitLabel = 'Save Password' }) {
  const { user } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const validate = () => {
    if (requireCurrent && !current) return 'Please enter your current password.'
    if (!next || next.length < MIN_LEN) return `New password must be at least ${MIN_LEN} characters.`
    if (next !== confirm) return 'New password and confirmation do not match.'
    if (requireCurrent && current === next) return 'New password must be different from the current one.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (v) { setError(v); return }
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      // 1) Verify the current password by re-authenticating (if required).
      if (requireCurrent) {
        const { error: vErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: current,
        })
        if (vErr) throw new Error('Current password is incorrect.')
      }

      // 2) Update the password via Supabase Auth.
      const { error: upErr } = await supabase.auth.updateUser({ password: next })
      if (upErr) throw upErr

      setSuccess('Password changed successfully.')
      setCurrent(''); setNext(''); setConfirm('')
      onDone?.()
    } catch (err) {
      setError(err.message || 'Failed to change password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {requireCurrent && (
        <div>
          <label className="label">Current Password</label>
          <input
            type="password"
            className="input"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={saving}
          />
        </div>
      )}

      <div>
        <label className="label">New Password</label>
        <input
          type="password"
          className="input"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          disabled={saving}
          placeholder={`At least ${MIN_LEN} characters`}
        />
      </div>

      <div>
        <label className="label">Confirm New Password</label>
        <input
          type="password"
          className="input"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={saving}
        />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={saving}>
        {saving ? <Spinner label="Saving…" /> : submitLabel}
      </button>
    </form>
  )
}
