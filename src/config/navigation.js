// Sidebar navigation definitions for each portal (matches the project spec).

export const adminNav = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'dashboard', end: true },
  { label: 'Student Management', to: '/admin/students', icon: 'students' },
  { label: 'Teacher Management', to: '/admin/teachers', icon: 'teachers' },
  { label: 'Fee Management', to: '/admin/fees', icon: 'fees' },
  { label: 'Marks Management', to: '/admin/marks', icon: 'marks' },
  { label: 'Examinations', to: '/admin/examinations', icon: 'exam' },
  { label: 'Announcements', to: '/admin/announcements', icon: 'announce' },
  { label: 'Gallery', to: '/admin/gallery', icon: 'gallery' },
  { label: 'Toppers', to: '/admin/toppers', icon: 'trophy' },
  { label: 'Academic Sessions', to: '/admin/sessions', icon: 'session' },
  { label: 'Website Content', to: '/admin/website', icon: 'website' },
  { label: 'Timetable Overview', to: '/admin/timetable', icon: 'timetable' },
  { label: 'Messages', to: '/admin/messages', icon: 'messages' },
]

export const teacherNav = [
  { label: 'Dashboard', to: '/teacher/dashboard', icon: 'dashboard', end: true },
  { label: 'Attendance', to: '/teacher/attendance', icon: 'attendance' },
  { label: 'Homework', to: '/teacher/homework', icon: 'homework' },
  { label: 'Marks', to: '/teacher/marks', icon: 'marks' },
  { label: 'Study Materials', to: '/teacher/materials', icon: 'materials' },
  { label: 'Timetable', to: '/teacher/timetable', icon: 'timetable' },
  { label: 'Messages', to: '/teacher/messages', icon: 'messages' },
  { label: 'Settings', to: '/teacher/settings', icon: 'settings' },
]

export const studentNav = [
  { label: 'Dashboard', to: '/student/dashboard', icon: 'dashboard', end: true },
  { label: 'My Profile', to: '/student/profile', icon: 'profile' },
  { label: 'Homework', to: '/student/homework', icon: 'homework' },
  { label: 'Study Materials', to: '/student/materials', icon: 'materials' },
  { label: 'Timetable', to: '/student/timetable', icon: 'timetable' },
  { label: 'Results', to: '/student/marks', icon: 'marks' },
  { label: 'Examinations', to: '/student/examinations', icon: 'exam' },
  { label: 'Notifications', to: '/student/notifications', icon: 'notifications' },
  { label: 'Gallery', to: '/student/gallery', icon: 'gallery' },
  { label: 'Messages', to: '/student/messages', icon: 'messages' },
  { label: 'Settings', to: '/student/settings', icon: 'settings' },
]
