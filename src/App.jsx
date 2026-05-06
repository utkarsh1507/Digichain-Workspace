import { Routes, Route, Navigate } from 'react-router-dom';
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
      <Route path="/admin"         element={<Protected><AdminPanel /></Protected>} />
      <Route path="*"              element={<Navigate to={state.currentUser ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
