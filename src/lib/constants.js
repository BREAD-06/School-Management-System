// Central place for school-wide constants and labels.

export const SCHOOL_NAME = 'Greenwood Public School'
export const EMAIL_DOMAIN = '@school.com'

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
// Class 9 year-end graduation uses STUDENT_STATUS.GRADUATED (handled later in
// the promotion flow); a mid-year deactivation is recorded as TRANSFERRED.
export const DEACTIVATED_STUDENT = STUDENT_STATUS.TRANSFERRED

// Teacher record status values (spec enum: active / inactive).
export const ACTIVE_TEACHER = 'active'
export const INACTIVE_TEACHER = 'inactive'

export const GENDERS = ['Male', 'Female']
