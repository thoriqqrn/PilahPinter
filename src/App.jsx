// src/App.jsx
// Entry point routing + auto-redirect setelah Google Sign-in (popup & redirect mode)

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';

/**
 * Komponen inner yang menangani redirect otomatis setelah Google Sign-in.
 * Ketika user berhasil login (via popup atau redirect), onAuthStateChanged
 * di AuthContext update `user` → komponen ini navigasi ke /dashboard.
 */
function AuthRedirectHandler() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Jika sedang di halaman login dan sudah terautentikasi → ke dashboard
      if (window.location.pathname === '/login') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthRedirectHandler />
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
