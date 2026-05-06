import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, MessageSquare, Calendar, Clock,
  PalmtreeIcon, Folder, Megaphone, User, Users, LogOut,
  Bell, Settings, Search, ChevronUp, Video,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar, IconBtn, NotificationToast, Modal, Button } from '../ui';
import { requestNotificationPermission, getNotificationPermission } from '../../utils/notifications';
import { STATUS_PRESETS, getPresence, getStatusMeta, getStatusText, getUserSubtitle } from '../../utils/presence';

const NAV = [
  {
    label: 'Workspace',
    items: [
      { path: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/tasks',         icon: CheckSquare,     label: 'Tasks' },
      { path: '/messages',      icon: MessageSquare,   label: 'Messages' },
      { path: '/meetings',      icon: Video,           label: 'Meetings' },
    ],
  },
  {
    label: 'HR',
    items: [
      { path: '/attendance',    icon: Clock,           label: 'Attendance' },
      { path: '/leave',         icon: PalmtreeIcon,    label: 'Leave' },
      { path: '/documents',     icon: Folder,          label: 'Documents' },
    ],
  },
  {
    label: 'Company',
    items: [
      { path: '/announcements', icon: Megaphone,       label: 'Announcements' },
    ],
  },
];

const FOUNDER_NAV = [
  {
    label: 'Admin',
    items: [
      { path: '/admin',         icon: Users,           label: 'Team & Admin' },
    ],
  },
];

function NavItem({ icon: Icon, label, path, active, onClick, badge }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500,
        color: active ? 'var(--fg-1)' : 'var(--fg-2)',
        background: active ? '#fff' : hover ? 'var(--bg-3)' : 'transparent',
        boxShadow: active ? 'var(--shadow-xs)' : 'none', cursor: 'pointer',
        transition: 'background 120ms var(--ease-out)' }}>
      {active && (
        <span style={{ position: 'absolute', left: -10, top: 8, bottom: 8, width: 3, borderRadius: 2,
          background: 'var(--brand-gradient)' }} />
      )}
      <Icon size={18} color={active ? 'var(--accent)' : 'var(--fg-3)'} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, minWidth: 18, textAlign: 'center',
          background: path === '/messages' ? 'var(--accent)' : 'var(--accent-tint)',
          color: path === '/messages' ? '#fff' : 'var(--accent-press)' }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
  );
}

export function Shell({ children }) {
  const { state, logout, toasts, dismissToast, updateUser } = useApp();
  const { currentUser, leaves, unreadCounts, announcements } = state;
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [showNotifyPrompt, setShowNotifyPrompt] = useState(false);
  const [statusDraft, setStatusDraft] = useState({ statusPreset: 'working', statusMessage: '' });
  const [savingStatus, setSavingStatus] = useState(false);

  // Ask for desktop notification permission on first mount (one-time soft prompt)
  useEffect(() => {
    if (!currentUser) return;
    const dismissed = localStorage.getItem('dw_notify_prompt_dismissed');
    const perm = getNotificationPermission();
    if (perm === 'default' && !dismissed) {
      // Show our own friendly inline prompt before triggering the native one
      const t = setTimeout(() => setShowNotifyPrompt(true), 1500);
      return () => clearTimeout(t);
    }
  }, [currentUser?.id]); // eslint-disable-line

  async function enableNotifications() {
    await requestNotificationPermission();
    setShowNotifyPrompt(false);
    localStorage.setItem('dw_notify_prompt_dismissed', '1');
  }

  useEffect(() => {
    if (!currentUser) return;
    setStatusDraft({
      statusPreset: currentUser.statusPreset || 'working',
      statusMessage: currentUser.statusMessage || '',
    });
  }, [currentUser?.id, currentUser?.statusPreset, currentUser?.statusMessage]);

  async function saveStatus(next = statusDraft) {
    if (!currentUser || savingStatus) return;
    setSavingStatus(true);
    try {
      await updateUser(currentUser.id, {
        statusPreset: next.statusPreset,
        statusMessage: next.statusPreset === 'custom' ? next.statusMessage : '',
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingStatus(false);
    }
  }
  function dismissNotifyPrompt() {
    setShowNotifyPrompt(false);
    localStorage.setItem('dw_notify_prompt_dismissed', '1');
  }

  const pendingLeaves = (leaves || []).filter(l => l.status === 'Pending').length;

  // Total unread message count across all channels
  const totalUnread = Object.values(unreadCounts || {}).reduce((a, b) => a + b, 0);

  // New announcements in last 24h (for badge on Announcements nav item)
  const recentAnn = (announcements || []).filter(a => {
    if (!a.createdAt) return false;
    return Date.now() - new Date(a.createdAt).getTime() < 24 * 3600 * 1000;
  }).length;

  function getBadge(path) {
    if (path === '/messages') return totalUnread;
    if (path === '/leave' && currentUser?.role === 'founder') return pendingLeaves;
    if (path === '/announcements') return recentAnn;
    return 0;
  }

  const navGroups = currentUser?.role === 'founder'
    ? [...NAV, ...FOUNDER_NAV]
    : NAV;
  const myPresence = getPresence(currentUser);
  const myStatusMeta = getStatusMeta(currentUser?.statusPreset);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-0)', overflow: 'hidden' }}>
      {/* Toast notifications */}
      <NotificationToast
        toasts={toasts}
        onDismiss={dismissToast}
        onNavigate={(path) => navigate(path)}
      />

      {/* Sidebar */}
      <aside style={{ width: 240, flexShrink: 0, background: 'var(--bg-1)', borderRight: '1px solid var(--border-1)',
        display: 'flex', flexDirection: 'column', padding: '14px 14px', gap: 4, overflow: 'auto' }}>
        {/* Logo */}
        <div style={{ padding: '4px 4px 14px', display: 'flex', alignItems: 'center' }}>
          <img
            src="/digichain-logo.png"
            alt="Digichain Pioneers"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            style={{ width: 172, maxWidth: '100%', height: 'auto', display: 'block' }}
          />
          {/* Fallback text logo */}
          <div style={{ display: 'none', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>D</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>Digichain</span>
          </div>
        </div>

        {/* Nav groups */}
        {navGroups.map(group => (
          <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
              color: 'var(--fg-4)', padding: '10px 10px 4px' }}>{group.label}</span>
            {group.items.map(item => (
              <NavItem key={item.path} icon={item.icon} label={item.label} path={item.path}
                active={location.pathname === item.path}
                badge={getBadge(item.path)}
                onClick={() => navigate(item.path)} />
            ))}
          </div>
        ))}

        {/* User section */}
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-1)', position: 'relative' }}>
          <div onClick={() => setProfileOpen(!profileOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px',
              borderRadius: 10, cursor: 'pointer', transition: 'background 120ms' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Avatar name={currentUser?.name || ''} size={36} src={currentUser?.avatar} status={myPresence.state} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getUserSubtitle(currentUser)}</div>
            </div>
            <ChevronUp size={14} color="var(--fg-3)" style={{ transform: profileOpen ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 180ms' }} />
          </div>
          {profileOpen && (
            <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: '#fff',
              border: '1px solid var(--border-1)', borderRadius: 12, boxShadow: 'var(--shadow-md)',
              padding: 8, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ padding: '8px 10px 10px', borderRadius: 10, background: 'var(--bg-1)', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 999,
                    background: myPresence.state === 'online' ? '#16a371' : myPresence.state === 'away' ? '#d97706' : '#9a9aa8',
                    flexShrink: 0,
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-1)' }}>{getStatusText(currentUser)}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{myPresence.detail}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: `var(--${myStatusMeta.tone === 'success' ? 'success' : 'accent'})` }}>
                    {myStatusMeta.label}
                  </span>
                </div>
                <select
                  value={statusDraft.statusPreset}
                  onChange={(e) => {
                    const next = { ...statusDraft, statusPreset: e.target.value };
                    setStatusDraft(next);
                    if (e.target.value !== 'custom') saveStatus(next);
                  }}
                  style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border-1)', padding: '0 8px',
                    background: '#fff', color: 'var(--fg-1)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}>
                  {STATUS_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>{preset.emoji} {preset.label}</option>
                  ))}
                </select>
                {statusDraft.statusPreset === 'custom' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input
                      value={statusDraft.statusMessage}
                      onChange={(e) => setStatusDraft((s) => ({ ...s, statusMessage: e.target.value }))}
                      placeholder="What's your status?"
                      maxLength={80}
                      style={{ flex: 1, minWidth: 0, height: 32, borderRadius: 8, border: '1px solid var(--border-1)', padding: '0 8px',
                        background: '#fff', color: 'var(--fg-1)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
                    />
                    <Button size="sm" variant="primary" onClick={() => saveStatus()} disabled={savingStatus}>
                      Save
                    </Button>
                  </div>
                )}
              </div>
              {[
                { icon: User, label: 'My Profile', action: () => { navigate('/profile'); setProfileOpen(false); } },
                { icon: Settings, label: 'Settings', action: () => { navigate('/profile'); setProfileOpen(false); } },
              ].map(item => (
                <div key={item.label} onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
                    fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--fg-1)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <item.icon size={16} color="var(--fg-3)" />{item.label}
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--border-1)', margin: '4px 0' }} />
              <div onClick={() => { setProfileOpen(false); setSignOutOpen(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#ad2236' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-tint)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <LogOut size={16} />Sign out
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ height: 56, flexShrink: 0, borderBottom: '1px solid var(--border-1)',
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px',
          position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
            background: 'var(--bg-2)', borderRadius: 10, width: 300 }}>
            <Search size={14} color="var(--fg-3)" />
            <input value={searchVal} onChange={e => setSearchVal(e.target.value)}
              placeholder="Search tasks, people, documents…"
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontFamily: 'inherit', fontSize: 13, color: 'var(--fg-1)' }} />
          </div>
          <IconBtn
            icon={Bell}
            badge={totalUnread + (currentUser?.role === 'founder' ? pendingLeaves : 0)}
            title="Notifications"
            onClick={() => navigate(totalUnread > 0 ? '/messages' : '/leave')}
          />
          <IconBtn icon={User} title="Profile" onClick={() => navigate('/profile')} />
          <div style={{ width: 1, height: 24, background: 'var(--border-1)' }} />
          <Avatar name={currentUser?.name || ''} size={32} src={currentUser?.avatar} status={myPresence.state}
            style={{ cursor: 'pointer' }} onClick={() => navigate('/profile')} />
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflow: location.pathname === '/messages' ? 'hidden' : 'auto', padding: '28px 32px' }}>
          {children}
        </main>
      </div>

      {/* Sign-out confirmation */}
      <Modal open={signOutOpen} onClose={() => setSignOutOpen(false)} title="Sign out?" width={400}>
        <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55 }}>
          You'll be signed out of Digichain Workspace and will need to log in again to access your team data.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setSignOutOpen(false)}>Cancel</Button>
          <Button variant="danger" icon={LogOut} onClick={() => { setSignOutOpen(false); logout(); navigate('/login'); }}>
            Sign out
          </Button>
        </div>
      </Modal>

      {/* Friendly notification permission prompt */}
      {showNotifyPrompt && (
        <div style={{
          position: 'fixed', bottom: 20, left: 20, zIndex: 9999,
          background: '#fff', borderRadius: 14, padding: '14px 18px',
          boxShadow: '0 4px 8px rgba(14,14,20,0.04), 0 16px 40px rgba(14,14,20,0.10)',
          border: '1px solid var(--border-1)',
          maxWidth: 340, display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-tint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            🔔
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 2 }}>
              Stay in the loop
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5, marginBottom: 10 }}>
              Get desktop alerts for new messages, announcements, and meetings even when this tab is in the background.
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" variant="primary" onClick={enableNotifications}>Enable</Button>
              <Button size="sm" variant="ghost" onClick={dismissNotifyPrompt}>Not now</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
