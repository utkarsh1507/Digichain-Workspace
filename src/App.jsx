import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { Shell } from './components/layout/Shell';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Tasks from './pages/Tasks';
import Messages from './pages/Messages';
import Announcements from './pages/Announcements';
import Documents from './pages/Documents';
import Meetings from './pages/Meetings';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import GoogleCallback from './pages/GoogleCallback';

function MobileBlock() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fafafb',
      padding: '32px 24px',
      textAlign: 'center',
      fontFamily: "'Manrope', sans-serif",
    }}>
      <img
        src="/digichain-logo.png"
        alt="DigiChain"
        style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 32 }}
      />
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: '#fde7eb',
        color: '#e0364c',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        padding: '5px 14px',
        borderRadius: 9999,
        marginBottom: 24,
      }}>
        <span style={{ fontSize: 13 }}>⊘</span> Access Denied
      </div>
      <h1 style={{
        fontSize: 28,
        fontWeight: 800,
        color: '#0e0e14',
        margin: '0 0 12px',
        lineHeight: 1.2,
      }}>
        Wrong Device.
      </h1>
      <p style={{
        fontSize: 16,
        fontWeight: 500,
        color: '#41414d',
        margin: '0 0 48px',
        maxWidth: 280,
        lineHeight: 1.6,
      }}>
        The Builders are on desktop.
      </p>
      <p style={{
        fontSize: 12,
        color: '#9a9aa8',
        maxWidth: 300,
        lineHeight: 1.8,
        borderTop: '1px solid #e8e8ee',
        paddingTop: 24,
      }}>
        This application is designed exclusively for desktop use. Please switch to a desktop or laptop to continue.
      </p>
    </div>
  );
}

function Protected({ children }) {
  const { state } = useApp();
  if (state.loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-1)' }}>
      <Spinner size={40} />
    </div>
  );
  if (!state.currentUser) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  const { state } = useApp();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Never block the OAuth callback popup — it opens at popup width (~520px)
  if (isMobile && !window.location.pathname.startsWith('/google-callback')) return <MobileBlock />;

  // Show spinner while restoring session on initial load
  if (state.loading && !state.currentUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-1)' }}>
        <Spinner size={40} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={state.currentUser ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard"     element={<Protected><Dashboard /></Protected>} />
      <Route path="/attendance"    element={<Protected><Attendance /></Protected>} />
      <Route path="/leave"         element={<Protected><Leave /></Protected>} />
      <Route path="/tasks"         element={<Protected><Tasks /></Protected>} />
      <Route path="/messages"      element={<Protected><Messages /></Protected>} />
      <Route path="/announcements" element={<Protected><Announcements /></Protected>} />
      <Route path="/documents"     element={<Protected><Documents /></Protected>} />
      <Route path="/meetings"      element={<Protected><Meetings /></Protected>} />
      <Route path="/profile"       element={<Protected><Profile /></Protected>} />
      <Route path="/profile/:id"    element={<Protected><Profile /></Protected>} />
      <Route path="/admin"         element={<Protected><AdminPanel /></Protected>} />
      <Route path="/google-callback" element={<GoogleCallback />} />
      <Route path="*"              element={<Navigate to={state.currentUser ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
