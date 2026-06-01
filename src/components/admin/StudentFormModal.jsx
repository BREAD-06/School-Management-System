import { useEffect, useMemo, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Alert from '../ui/Alert.jsx'
import Spinner from '../ui/Spinner.jsx'
import { supabase } from '../../lib/supabase.js'
import { createStudent } from '../../lib/api.js'
import { GENDERS } from '../../lib/constants.js'

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm = () => ({
  firstName: '',
  lastName: '',
  admissionNo: '',
  dob: '',
  gender: '',
  fatherName: '',
  motherName: '',
  parentPhone: '',
  address: '',
  classId: '',
  rollNo: '',
  admissionDate: today(),
})

export default function StudentFormModal({ open, onClose, onSaved, classes, mode, record }) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Populate the form when opening (add => blank, edit => existing values).
  useEffect(() => {
    if (!open) return
    setError('')
    if (isEdit && record) {
      const s = record.student
      setForm({
        firstName: s.first_name || '',
        lastName: s.last_name || '',
        admissionNo: s.admission_no || '',
        dob: s.dob || '',
        gender: s.gender || '',
        fatherName: s.father_name || '',
        motherName: s.mother_name || '',
        parentPhone: s.parent_phone || '',
        address: s.address || '',
        classId: record.class_id || '',
        rollNo: record.roll_no || '',
        admissionDate: s.admission_date || '',
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, isEdit, record])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    if (!form.firstName.trim()) return 'First name is required.'
    if (!form.lastName.trim()) return 'Last name is required.'
    if (!form.admissionNo.trim()) return 'Admission number is required.'
    if (!form.parentPhone.trim()) return 'Parent phone is required.'
    if (!String(form.classId).trim()) return 'Please select a class.'
    if (!/^[0-9+\-\s]{7,15}$/.test(form.parentPhone.trim()))
      return 'Please enter a valid parent phone number.'
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
        // Update personal fields (admin has full access via RLS).
        const { error: sErr } = await supabase
          .from('students')
          .update({
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            dob: form.dob || null,
            gender: form.gender || null,
            father_name: form.fatherName.trim() || null,
            mother_name: form.motherName.trim() || null,
            parent_phone: form.parentPhone.trim(),
            address: form.address.trim() || null,
            admission_date: form.admissionDate || null,
          })
          .eq('id', record.student.id)
        if (sErr) throw sErr

        // Update the current enrollment (class + roll number).
        const { error: eErr } = await supabase
          .from('student_enrollments')
          .update({ class_id: form.classId, roll_no: form.rollNo.trim() || null })
          .eq('id', record.id)
        if (eErr) throw eErr
      } else {
        await createStudent(form)
      }
      onSaved(isEdit ? 'Student updated successfully.' : 'Student created successfully.')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const sortedClasses = useMemo(
    () => [...(classes || [])].sort((a, b) => a.sort_order - b.sort_order),
    [classes],
  )

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={isEdit ? 'Edit Student' : 'Add Student'}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert type="error">{error}</Alert>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">
              First Name <span className="text-red-500">*</span>
            </label>
            <input className="input" value={form.firstName} onChange={set('firstName')} disabled={saving} />
          </div>
          <div>
            <label className="label">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input className="input" value={form.lastName} onChange={set('lastName')} disabled={saving} />
          </div>

          <div>
            <label className="label">
              Admission Number <span className="text-red-500">*</span>
            </label>
            <input
              className="input disabled:bg-slate-100"
              value={form.admissionNo}
              onChange={set('admissionNo')}
              disabled={saving || isEdit}
              placeholder="e.g. SCH001"
            />
            {isEdit && (
              <p className="mt-1 text-xs text-slate-400">
                Admission number is the login ID and cannot be changed.
              </p>
            )}
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input type="date" className="input" value={form.dob} onChange={set('dob')} disabled={saving} />
          </div>

          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={set('gender')} disabled={saving}>
              <option value="">Select…</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">
              Parent Phone <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              value={form.parentPhone}
              onChange={set('parentPhone')}
              disabled={saving}
              placeholder="Used for SMS alerts"
            />
          </div>

          <div>
            <label className="label">Father Name</label>
            <input className="input" value={form.fatherName} onChange={set('fatherName')} disabled={saving} />
          </div>
          <div>
            <label className="label">Mother Name</label>
            <input className="input" value={form.motherName} onChange={set('motherName')} disabled={saving} />
          </div>

          <div>
            <label className="label">
              Class <span className="text-red-500">*</span>
            </label>
            <select className="input" value={form.classId} onChange={set('classId')} disabled={saving}>
              <option value="">Select class…</option>
              {sortedClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Roll Number</label>
            <input className="input" value={form.rollNo} onChange={set('rollNo')} disabled={saving} />
          </div>

          <div>
            <label className="label">Admission Date</label>
            <input type="date" className="input" value={form.admissionDate} onChange={set('admissionDate')} disabled={saving} />
          </div>
        </div>

        <div>
          <label className="label">Address</label>
          <textarea className="input" rows={2} value={form.address} onChange={set('address')} disabled={saving} />
        </div>

        {!isEdit && (
          <p className="rounded-lg bg-royal-50 px-3 py-2 text-xs text-royal-600">
            A login will be created automatically — email{' '}
            <strong>{(form.admissionNo || 'admissionno').toLowerCase()}@school.com</strong> with the
            admission number as the password.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner label={isEdit ? 'Saving…' : 'Creating…'} /> : isEdit ? 'Save Changes' : 'Create Student'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
