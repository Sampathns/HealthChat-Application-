import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './context/SocketContext';
import useAuthStore from './context/authStore';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';

import PrescriptionsPage from './pages/PrescriptionsPage';
import ReportsPage from './pages/ReportsPage';
import DoctorsPage from './pages/DoctorsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import Layout from './components/shared/Layout';

// Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

// Public Route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  const { isAuthenticated, refreshUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) refreshUser();
  }, []);

  // Dark mode
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <Router>
      <SocketProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '12px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
            },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="chat/:userId" element={<ChatPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="doctors" element={<DoctorsPage />} />
            <Route path="ai-assistant" element={<AIAssistantPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="admin" element={
              <ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </SocketProvider>
    </Router>
  );
}

export default App;
