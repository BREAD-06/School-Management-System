import { useEffect, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Alert from '../ui/Alert.jsx'
import Spinner from '../ui/Spinner.jsx'
import { supabase } from '../../lib/supabase.js'
import { createTeacher } from '../../lib/api.js'

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm = () => ({
  name: '',
  employeeId: '',
  phone: '',
  email: '',
  designation: '',
  joiningDate: today(),
})

export default function TeacherFormModal({ open, onClose, onSaved, mode, record }) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    if (isEdit && record) {
      setForm({
        name: record.name || '',
        employeeId: record.employee_id || '',
        phone: record.phone || '',
        email: record.email || '',
        designation: record.designation || '',
        joiningDate: record.joining_date || '',
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, isEdit, record])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    if (!form.name.trim()) return 'Name is required.'
    if (!form.employeeId.trim()) return 'Employee ID is required.'
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return 'Please enter a valid email address.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setError('')
    setSaving(true)
    try {
      if (isEdit) {
        const { error: err } = await supabase
          .from('teachers')
          .update({
            name: form.name.trim(),
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            designation: form.designation.trim() || null,
            joining_date: form.joiningDate || null,
          })
          .eq('id', record.id)
        if (err) throw err
      } else {
        await createTeacher(form)
      }
      onSaved(isEdit ? 'Teacher updated successfully.' : 'Teacher created successfully.')
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
      title={isEdit ? 'Edit Teacher' : 'Add Teacher'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert type="error">{error}</Alert>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">
              Name <span className="text-red-500">*</span>
            </label>
            <input className="input" value={form.name} onChange={set('name')} disabled={saving} />
          </div>

          <div>
            <label className="label">
              Employee ID <span className="text-red-500">*</span>
            </label>
            <input
              className="input disabled:bg-slate-100"
              value={form.employeeId}
              onChange={set('employeeId')}
              disabled={saving || isEdit}
              placeholder="e.g. T001"
            />
            {isEdit && (
              <p className="mt-1 text-xs text-slate-400">
                Employee ID is the login ID and cannot be changed.
              </p>
            )}
          </div>
          <div>
            <label className="label">Designation</label>
            <input className="input" value={form.designation} onChange={set('designation')} disabled={saving} placeholder="e.g. Senior Teacher" />
          </div>

          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={set('phone')} disabled={saving} />
          </div>
          <div>
            <label className="label">Email (contact)</label>
            <input className="input" value={form.email} onChange={set('email')} disabled={saving} placeholder="optional contact email" />
          </div>

          <div>
            <label className="label">Joining Date</label>
            <input type="date" className="input" value={form.joiningDate} onChange={set('joiningDate')} disabled={saving} />
          </div>
        </div>

        {!isEdit && (
          <p className="rounded-lg bg-royal-50 px-3 py-2 text-xs text-royal-600">
            A login will be created automatically — email{' '}
            <strong>{(form.employeeId || 'employeeid').toLowerCase()}@school.com</strong> with the
            employee ID as the password.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner label={isEdit ? 'Saving…' : 'Creating…'} /> : isEdit ? 'Save Changes' : 'Create Teacher'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
