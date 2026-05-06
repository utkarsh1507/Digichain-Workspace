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

function MobileBlock() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0e0e14',
      padding: '32px 24px',
      textAlign: 'center',
      fontFamily: "'Manrope', sans-serif",
    }}>
      <img
        src="/digichain-logo.png"
        alt="DigiChain"
        style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 32, opacity: 0.95 }}
      />
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#7B61FF',
        marginBottom: 20,
      }}>
        Access Denied
      </div>
      <h1 style={{
        fontSize: 28,
        fontWeight: 800,
        color: '#ffffff',
        margin: '0 0 16px',
        lineHeight: 1.2,
        background: 'linear-gradient(135deg, #5cc9f5 0%, #8090fd 50%, #d345fd 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Wrong Device.
      </h1>
      <p style={{
        fontSize: 16,
        fontWeight: 600,
        color: '#9a9aa8',
        margin: '0 0 48px',
        maxWidth: 280,
        lineHeight: 1.6,
      }}>
        The Builders are on desktop.
      </p>
      <p style={{
        fontSize: 12,
        color: '#41414d',
        maxWidth: 300,
        lineHeight: 1.7,
        borderTop: '1px solid #1e1e2a',
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

  if (isMobile) return <MobileBlock />;

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
      <Route path="*"              element={<Navigate to={state.currentUser ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
