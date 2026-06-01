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

// Student record status values.
// NOTE: the spec's students.status enum is active / graduated / transferred.
// "Deactivate" in the admin UI sets a student to INACTIVE_STUDENT below. If your
// DB enum does not include 'inactive', change this to 'transferred' (or alter
// the enum) — it is intentionally a single constant so it is easy to swap.
export const ACTIVE_STUDENT = 'active'
export const INACTIVE_STUDENT = 'inactive'

// Teacher record status values (spec enum: active / inactive).
export const ACTIVE_TEACHER = 'active'
export const INACTIVE_TEACHER = 'inactive'

export const GENDERS = ['Male', 'Female']
