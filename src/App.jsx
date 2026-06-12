import { Navigate, Route, Routes } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { ToastProvider } from './components/ui/Toast.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import DashboardLayout from './components/DashboardLayout.jsx'
import RootRedirect from './components/RootRedirect.jsx'
import { adminNav, teacherNav, studentNav } from './config/navigation.js'

import Login from './pages/Login.jsx'
import Settings from './pages/Settings.jsx'
import Messages from './pages/Messages.jsx'
import PublicGallery from './pages/Gallery.jsx'

import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import StudentManagement from './pages/admin/StudentManagement.jsx'
import TeacherManagement from './pages/admin/TeacherManagement.jsx'
import SessionManagement from './pages/admin/SessionManagement.jsx'
import AdminAnnouncements from './pages/admin/Announcements.jsx'
import AdminGallery from './pages/admin/Gallery.jsx'
import AdminFees from './pages/admin/Fees.jsx'
import AdminExaminations from './pages/admin/Examinations.jsx'
import AdminWebsiteContent from './pages/admin/WebsiteContent.jsx'
import AdminMarksManagement from './pages/admin/MarksManagement.jsx'
import AdminTimetable from './pages/admin/Timetable.jsx'
import AdminToppers from './pages/admin/Toppers.jsx'

import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx'
import TeacherHomework from './pages/teacher/Homework.jsx'
import TeacherStudyMaterials from './pages/teacher/StudyMaterials.jsx'
import TeacherTimetable from './pages/teacher/Timetable.jsx'
import TeacherAttendance from './pages/teacher/Attendance.jsx'
import TeacherMarks from './pages/teacher/Marks.jsx'

import StudentDashboard from './pages/student/StudentDashboard.jsx'
import StudentHomework from './pages/student/Homework.jsx'
import StudentStudyMaterials from './pages/student/StudyMaterials.jsx'
import StudentTimetable from './pages/student/Timetable.jsx'
import StudentProfile from './pages/student/Profile.jsx'
import StudentNotifications from './pages/student/Notifications.jsx'
import StudentGallery from './pages/student/Gallery.jsx'
import StudentExaminations from './pages/student/Examinations.jsx'
import StudentResults from './pages/student/Marks.jsx'

export default function App() {
  return (
    <ToastProvider>
      <Analytics />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/gallery" element={<PublicGallery />} />

        {/* ---------------- Admin ---------------- */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={['admin']}>
              <DashboardLayout portalLabel="Admin Portal" navItems={adminNav} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="teachers" element={<TeacherManagement />} />
          <Route path="fees" element={<AdminFees />} />
          <Route path="marks" element={<AdminMarksManagement />} />
          <Route path="examinations" element={<AdminExaminations />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="toppers" element={<AdminToppers />} />
          <Route path="sessions" element={<SessionManagement />} />
          <Route path="website" element={<AdminWebsiteContent />} />
          <Route path="timetable" element={<AdminTimetable />} />
          <Route path="messages" element={<Messages />} />
        </Route>

        {/* ---------------- Teacher ---------------- */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allow={['teacher']}>
              <DashboardLayout portalLabel="Teacher Portal" navItems={teacherNav} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="homework" element={<TeacherHomework />} />
          <Route path="marks" element={<TeacherMarks />} />
          <Route path="materials" element={<TeacherStudyMaterials />} />
          <Route path="timetable" element={<TeacherTimetable />} />
          <Route path="messages" element={<Messages />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* ---------------- Student ---------------- */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allow={['student']}>
              <DashboardLayout portalLabel="Student Portal" navItems={studentNav} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="homework" element={<StudentHomework />} />
          <Route path="materials" element={<StudentStudyMaterials />} />
          <Route path="timetable" element={<StudentTimetable />} />
          <Route path="marks" element={<StudentResults />} />
          <Route path="examinations" element={<StudentExaminations />} />
          <Route path="notifications" element={<StudentNotifications />} />
          <Route path="gallery" element={<StudentGallery />} />
          <Route path="messages" element={<Messages />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </ToastProvider>
  )
}
