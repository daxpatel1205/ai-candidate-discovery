import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import JobsPage from './pages/JobsPage';
import LiveJobsPage from './pages/LiveJobsPage';

import InterviewPage from './pages/InterviewPage';
import FraudPage from './pages/FraudPage';
import MultilingualPage from './pages/MultilingualPage';
import LinkedInProfilePage from './pages/LinkedInProfilePage';
import ResumeReviewPage from './pages/ResumeReviewPage';
import LandingPage from './pages/LandingPage';

// Auth Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OtpVerifyPage from './pages/OtpVerifyPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

import { useAuth } from './context/AuthContext';

// Auth Guard Wrapper
function AuthGuard({ children }: { children: JSX.Element }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-base)',
      }}>
        <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366F1, #22D3EE)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1.1rem',
            margin: '0 auto 1.25rem',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35)',
            animation: 'logoBreathe 3s ease-in-out infinite',
          }}>
            CD
          </div>
          <div className="spinner" style={{ margin: '0 auto', color: 'var(--accent)' }} />
          <p style={{ marginTop: '1rem', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Initializing workspace…
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


export default function App() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<OtpVerifyPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected Workspace Layout Routes */}
      <Route
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/live-jobs" element={<LiveJobsPage />} />

        <Route path="/interview" element={<InterviewPage />} />
        <Route path="/fraud" element={<FraudPage />} />
        <Route path="/multilingual" element={<MultilingualPage />} />
        <Route path="/linkedin" element={<LinkedInProfilePage />} />
        <Route path="/resume-review" element={<ResumeReviewPage />} />
      </Route>

      {/* Wildcard Fallback */}
      <Route path="*" element={<Navigate to="/live-jobs" replace />} />
    </Routes>
  );
}
