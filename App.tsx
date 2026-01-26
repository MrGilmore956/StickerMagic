/**
 * Saucy App - Main Application Router
 * 
 * Routes:
 * - / : User homepage (browse GIFs)
 * - /create : Legacy create page
 * - /admin : Admin portal (protected)
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { initAuthListener } from './services/authService';

// Pages
import HomePage from './pages/HomePage';
import CreateTab from './components/CreateTab';

// Admin pages (lazy loaded)
const AdminPortal = React.lazy(() => import('./pages/admin/AdminPortal'));
const LogoPreview = React.lazy(() => import('./pages/LogoPreview'));

// DEV MODE: Set to true to enable admin access without login (for testing)
const DEV_MODE = true;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(DEV_MODE); // Start with DEV_MODE value

  useEffect(() => {
    // If DEV_MODE is enabled, skip auth and grant admin access
    if (DEV_MODE) {
      setLoading(false);
      setIsAdmin(true);
      return;
    }

    const unsubscribe = initAuthListener(async (authUser) => {
      setUser(authUser);

      // Check admin status
      if (authUser) {
        // Check if email is in admin list
        const adminEmails = [
          'brntay956@gmail.com', // Primary admin
        ];
        setIsAdmin(adminEmails.includes(authUser.email || ''));
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <Routes>
          {/* User Homepage - Browse GIFs */}
          <Route path="/" element={<HomePage />} />

          {/* Legacy Create Page */}
          <Route path="/create" element={<CreateTab />} />

          {/* Admin Portal - Protected */}
          <Route
            path="/admin/*"
            element={
              isAdmin ? <AdminPortal /> : <Navigate to="/" replace />
            }
          />

          {/* Logo Preview - For testing new logos */}
          <Route path="/logo-preview" element={<LogoPreview />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
};

export default App;
