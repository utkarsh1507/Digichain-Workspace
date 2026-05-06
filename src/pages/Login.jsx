import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button, Input } from '../components/ui';

const QUICK_LOGINS = [
  { label: 'Founder',  color: 'var(--brand-gradient)', email: 'utkarsh@digichainpi.com', name: 'Utkarsh' },
  { label: 'Employee', color: 'var(--accent)',          email: 'karan@digichainpi.com',   name: 'Karan'   },
  { label: 'Intern',   color: '#16a371',                email: 'anaya@digichainpi.com',   name: 'Anaya'   },
];

export default function Login() {
  const { state, login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await login(email, password);
    setSubmitting(false);
  }

  async function quickLogin(ql) {
    setSubmitting(true);
    await login(ql.email, '1234');
    setSubmitting(false);
  }

  const busy = submitting || state.loading;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-1)', fontFamily: 'var(--font-sans)' }}>
      {/* Left panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, background: 'var(--bg-0)', borderRight: '1px solid var(--border-1)' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Logo */}
          <div style={{ marginBottom: 36 }}>
            <img src="/digichain-logo.png" alt="Digichain Pioneers"
              style={{ width: 220, maxWidth: '100%', height: 'auto', display: 'block' }} />
            <div style={{ fontSize: 11, color: 'var(--fg-4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>Workspace</div>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.018em', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: 'var(--fg-3)', marginBottom: 32, fontSize: 14 }}>Sign in to your team workspace</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Email address" icon={Mail} type="email" placeholder="you@digichainpi.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>Password</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
                background: '#fff', border: '1px solid var(--border-1)', borderRadius: 10 }}>
                <Lock size={15} color="var(--fg-3)" />
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  style={{ flex: 1, padding: '10px 0', fontFamily: 'inherit', fontSize: 14, color: 'var(--fg-1)', background: 'transparent', border: 'none', outline: 'none' }} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', display: 'flex', padding: 4 }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {state.loginError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-tint)', borderRadius: 8, fontSize: 13, color: '#ad2236', fontWeight: 500 }}>
                {state.loginError}
              </div>
            )}
            <Button type="submit" variant="gradient" size="lg" disabled={busy} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
            <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 500 }}>Quick access demo</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
          </div>

          {/* Quick login */}
          <div style={{ display: 'flex', gap: 10 }}>
            {QUICK_LOGINS.map(r => (
              <button key={r.label} onClick={() => quickLogin(r)} disabled={busy}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border-1)',
                  background: '#fff', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                  color: 'var(--fg-1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  opacity: busy ? 0.6 : 1, transition: 'all 180ms var(--ease-out)' }}
                onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-1)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: r.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={13} color="#fff" />
                </span>
                {r.label}
                <span style={{ fontSize: 10, color: 'var(--fg-3)', fontWeight: 400 }}>{r.name}</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--fg-4)', textAlign: 'center', marginTop: 16 }}>Demo password: <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 4 }}>1234</code></p>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1.1, background: 'var(--bg-inverse)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 64, gap: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15, color: '#fff', marginBottom: 16 }}>
            Everything your<br />team needs,<br />
            <span style={{ background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>in one place</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.6, maxWidth: 360 }}>
            Attendance, leaves, tasks, chats, meetings, documents — all structured and seamless for your startup team.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 460 }}>
          {[
            { icon: '⏱️', title: 'Smart Attendance',   desc: 'Sign in/out with location tracking' },
            { icon: '📋', title: 'Task Management',    desc: 'Assign, track, and complete tasks' },
            { icon: '💬', title: 'Team Chat',          desc: 'DMs, groups, and channels' },
            { icon: '📅', title: 'Leave & Meetings',   desc: 'Approvals, calls, scheduling' },
            { icon: '📁', title: 'Documents',          desc: 'Organized file sharing for the team' },
            { icon: '📣', title: 'Announcements',      desc: 'Company-wide broadcasts' },
          ].map(f => (
            <div key={f.title} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.06)',
              borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
