import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import DashboardLayout from './components/DashboardLayout.jsx'
import RootRedirect from './components/RootRedirect.jsx'
import { adminNav, teacherNav, studentNav } from './config/navigation.js'

import Login from './pages/Login.jsx'
import Placeholder from './pages/Placeholder.jsx'

import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import StudentManagement from './pages/admin/StudentManagement.jsx'
import TeacherManagement from './pages/admin/TeacherManagement.jsx'

import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx'
import StudentDashboard from './pages/student/StudentDashboard.jsx'

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />

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
          <Route path="fees" element={<Placeholder title="Fee Management" icon="fees" phase="Phase 3" />} />
          <Route path="marks" element={<Placeholder title="Marks Management" icon="marks" phase="Phase 3" />} />
          <Route path="examinations" element={<Placeholder title="Examinations" icon="exam" phase="Phase 3" />} />
          <Route path="announcements" element={<Placeholder title="Announcements" icon="announce" phase="Phase 2" />} />
          <Route path="gallery" element={<Placeholder title="Gallery Management" icon="gallery" phase="Phase 2" />} />
          <Route path="sessions" element={<Placeholder title="Academic Sessions" icon="session" phase="Phase 1 (next)" />} />
          <Route path="website" element={<Placeholder title="Website Content" icon="website" phase="Phase 4" />} />
          <Route path="timetable" element={<Placeholder title="Timetable Overview" icon="timetable" phase="Phase 2" />} />
          <Route path="messages" element={<Placeholder title="Messages" icon="messages" phase="Phase 4" />} />
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
          <Route path="attendance" element={<Placeholder title="Attendance" icon="attendance" phase="Phase 3" />} />
          <Route path="homework" element={<Placeholder title="Homework" icon="homework" phase="Phase 2" />} />
          <Route path="marks" element={<Placeholder title="Marks" icon="marks" phase="Phase 3" />} />
          <Route path="materials" element={<Placeholder title="Study Materials" icon="materials" phase="Phase 2" />} />
          <Route path="timetable" element={<Placeholder title="Timetable" icon="timetable" phase="Phase 2" />} />
          <Route path="messages" element={<Placeholder title="Messages" icon="messages" phase="Phase 4" />} />
          <Route path="settings" element={<Placeholder title="Settings" icon="settings" phase="Phase 1 (next)" />} />
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
          <Route path="profile" element={<Placeholder title="My Profile" icon="profile" phase="Phase 1 (next)" />} />
          <Route path="homework" element={<Placeholder title="Homework" icon="homework" phase="Phase 2" />} />
          <Route path="materials" element={<Placeholder title="Study Materials" icon="materials" phase="Phase 2" />} />
          <Route path="timetable" element={<Placeholder title="Timetable" icon="timetable" phase="Phase 2" />} />
          <Route path="examinations" element={<Placeholder title="Examinations" icon="exam" phase="Phase 3" />} />
          <Route path="notifications" element={<Placeholder title="Notifications" icon="notifications" phase="Phase 2" />} />
          <Route path="gallery" element={<Placeholder title="Gallery" icon="gallery" phase="Phase 2" />} />
          <Route path="messages" element={<Placeholder title="Messages" icon="messages" phase="Phase 4" />} />
          <Route path="settings" element={<Placeholder title="Settings" icon="settings" phase="Phase 1 (next)" />} />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </ToastProvider>
  )
}
