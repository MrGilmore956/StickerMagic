/**
 * Saucy App - Main Application Router
 * 
 * Routes:
 * - / : User homepage (browse GIFs) - PUBLIC (actions require auth)
 * - /create : Create page - REQUIRES AUTH
 * - /admin : Admin portal (protected)
 * - /login : Login page
 * - /gif/:id : Individual GIF page (for sharing)
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { initAuthListener } from './services/authService';
import { ensureUserProfile, UserProfile } from './services/userProfileService';

// Pages
import HomePage from './pages/HomePage';
import CreateTab from './components/CreateTab';
import LoginPage from './pages/LoginPage';

// Lazy-loaded pages
const AdminPortal = React.lazy(() => import('./pages/admin/AdminPortal'));
const SauceBox = React.lazy(() => import('./pages/SauceBox'));
const LogoPreview = React.lazy(() => import('./pages/LogoPreview'));
const GifPage = React.lazy(() => import('./pages/GifPage'));

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = initAuthListener(async (authUser) => {
      setUser(authUser);

      if (authUser) {
        // Load or create user profile from Firestore
        try {
          const profile = await ensureUserProfile(
            authUser.uid,
            authUser.email || '',
            authUser.displayName || '',
            authUser.photoURL || ''
          );
          setUserProfile(profile);
        } catch (error) {
          console.error('Failed to load user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
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

  const isAuthenticated = user !== null;

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
          {/* Login Page */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
          />

          {/* Homepage - PUBLIC (actions require auth at component level) */}
          <Route path="/" element={<HomePage />} />

          {/* Create Page - Requires Auth */}
          <Route
            path="/create"
            element={isAuthenticated ? <CreateTab /> : <Navigate to="/login" replace />}
          />

          {/* Sauce Box - Requires Auth */}
          <Route
            path="/saucebox"
            element={isAuthenticated ? <SauceBox /> : <Navigate to="/login" replace />}
          />

          {/* Admin Portal - Protected (requires auth + admin role) */}
          <Route
            path="/admin/*"
            element={
              !isAuthenticated ? (
                <Navigate to="/login" replace />
              ) : (userProfile?.role === 'admin' || userProfile?.role === 'owner') ? (
                <AdminPortal />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Logo Preview */}
          <Route
            path="/logo-preview"
            element={isAuthenticated ? <LogoPreview /> : <Navigate to="/login" replace />}
          />

          {/* Individual GIF Page - PUBLIC (for link sharing) */}
          <Route path="/gif/:id" element={<GifPage />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
};

export default App;
