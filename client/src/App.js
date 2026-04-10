import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AssignmentsPage from './pages/AssignmentsPage';
import AssignmentDetailPage from './pages/AssignmentDetailPage';
import CreateAssignmentPage from './pages/CreateAssignmentPage';
import SubmitAssignmentPage from './pages/SubmitAssignmentPage';
import SubmissionDetailPage from './pages/SubmissionDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';
import MySubmissionsPage from './pages/MySubmissionsPage';

// Layout
import AppLayout from './components/layout/AppLayout';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 spinner" />
        <p className="text-sm text-slate-500 font-medium">Loading ScoreLens AI…</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public */}
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected - wrapped in AppLayout */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard"       element={<DashboardPage />} />
        <Route path="/assignments"     element={<AssignmentsPage />} />
        <Route path="/assignments/new" element={<ProtectedRoute roles={['teacher']}><CreateAssignmentPage /></ProtectedRoute>} />
        <Route path="/assignments/:id" element={<AssignmentDetailPage />} />
        <Route path="/assignments/:id/submit" element={<ProtectedRoute roles={['student']}><SubmitAssignmentPage /></ProtectedRoute>} />
        <Route path="/submissions"     element={<ProtectedRoute roles={['student']}><MySubmissionsPage /></ProtectedRoute>} />
        <Route path="/submissions/:id" element={<SubmissionDetailPage />} />
        <Route path="/analytics"       element={<AnalyticsPage />} />
        <Route path="/profile"         element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
