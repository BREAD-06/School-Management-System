// Central place for school-wide constants and labels.

export const SCHOOL_NAME = import.meta.env.VITE_SCHOOL_NAME || 'Bala Ji Public School'
export const EMAIL_DOMAIN = '@bjps.com'

// Exam types used by the teacher Marks module.
// `value` MUST match the DB check constraint; `label` is what the teacher sees.
export const EXAM_TYPES = [
  { value: 'unit_test', label: 'Unit Test' },
  { value: 'mid_term', label: 'Mid Term Exam' },
  { value: 'final_exam', label: 'Final Exam' },
]

// Attendance status values.
export const ATTENDANCE_STATUS = { PRESENT: 'present', ABSENT: 'absent' }

// Fee status values.
export const FEE_STATUS = { PAID: 'paid', UNPAID: 'unpaid' }

export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
}

export const ROLE_HOME = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
}

// Student record status values — matches the DB enum: active / graduated / transferred.
export const STUDENT_STATUS = {
  ACTIVE: 'active',
  GRADUATED: 'graduated',
  TRANSFERRED: 'transferred',
}
export const ACTIVE_STUDENT = STUDENT_STATUS.ACTIVE
// "Deactivate" in the admin UI marks a student as having left the school.
// Class 10 year-end graduation uses STUDENT_STATUS.GRADUATED (handled later in
// the promotion flow); a mid-year deactivation is recorded as TRANSFERRED.
export const DEACTIVATED_STUDENT = STUDENT_STATUS.TRANSFERRED

// Teacher record status values (spec enum: active / inactive).
export const ACTIVE_TEACHER = 'active'
export const INACTIVE_TEACHER = 'inactive'

export const GENDERS = ['Male', 'Female']
