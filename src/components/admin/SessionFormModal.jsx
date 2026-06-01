import { useEffect, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Alert from '../ui/Alert.jsx'
import Spinner from '../ui/Spinner.jsx'
import { supabase } from '../../lib/supabase.js'

const emptyForm = () => ({ sessionName: '', startDate: '', endDate: '' })

// Quick helper — auto-fill a sensible session name from dates.
function deriveSessionName(start, end) {
  if (!start || !end) return ''
  const sy = new Date(start).getFullYear()
  const ey = new Date(end).getFullYear()
  if (sy === ey) return String(sy)
  return `${sy}-${String(ey).slice(-2)}`
}

export default function SessionFormModal({ open, onClose, onSaved, mode, record }) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    if (isEdit && record) {
      setForm({
        sessionName: record.session_name || '',
        startDate: record.start_date || '',
        endDate: record.end_date || '',
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, isEdit, record])

  const set = (k) => (e) => {
    setForm((prev) => {
      const next = { ...prev, [k]: e.target.value }
      // Auto-suggest a session name when dates are filled and name is still blank.
      if ((k === 'startDate' || k === 'endDate') && !prev.sessionName) {
        const suggested = deriveSessionName(
          k === 'startDate' ? e.target.value : prev.startDate,
          k === 'endDate' ? e.target.value : prev.endDate,
        )
        if (suggested) next.sessionName = suggested
      }
      return next
    })
  }

  const validate = () => {
    if (!form.sessionName.trim()) return 'Session name is required (e.g. 2025-26).'
    if (!form.startDate) return 'Start date is required.'
    if (!form.endDate) return 'End date is required.'
    if (form.startDate >= form.endDate) return 'End date must be after start date.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (v) { setError(v); return }
    setError('')
    setSaving(true)
    try {
      const payload = {
        session_name: form.sessionName.trim(),
        start_date: form.startDate,
        end_date: form.endDate,
      }
      if (isEdit) {
        const { error: err } = await supabase
          .from('academic_sessions')
          .update(payload)
          .eq('id', record.id)
        if (err) throw err
      } else {
        // New sessions always start as inactive; admin explicitly activates one.
        const { error: err } = await supabase
          .from('academic_sessions')
          .insert({ ...payload, status: 'inactive' })
        if (err) throw err
      }
      onSaved(isEdit ? 'Session updated.' : 'Session created.')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={isEdit ? 'Edit Session' : 'Create Academic Session'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert type="error">{error}</Alert>}

        <div>
          <label className="label">
            Session Name <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            value={form.sessionName}
            onChange={set('sessionName')}
            disabled={saving}
            placeholder="e.g. 2025-26"
          />
          <p className="mt-1 text-xs text-slate-400">
            Auto-filled from dates — you can override this.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="input"
              value={form.startDate}
              onChange={set('startDate')}
              disabled={saving}
            />
          </div>
          <div>
            <label className="label">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="input"
              value={form.endDate}
              onChange={set('endDate')}
              disabled={saving}
            />
          </div>
        </div>

        {!isEdit && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            New sessions are created as <strong>inactive</strong>. Use the{' '}
            <strong>Set Active</strong> button on the list to make a session the
            current one. Only one session can be active at a time.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (
              <Spinner label={isEdit ? 'Saving…' : 'Creating…'} />
            ) : isEdit ? (
              'Save Changes'
            ) : (
              'Create Session'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
