import { useState, useEffect } from 'react';
import { MapPin, LogIn, LogOut, Clock, TrendingUp, Calendar, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, StatCard, Button, Pill, Eyebrow, Section, attendanceTone, fmtDate } from '../components/ui';
import { Avatar } from '../components/ui';

function calcHours(signIn, signOut) {
  if (!signIn || !signOut || signIn === '—' || signOut === '—') return '—';
  const [ih, im] = signIn.split(':').map(Number);
  const [oh, om] = signOut.split(':').map(Number);
  const mins = (oh * 60 + om) - (ih * 60 + im);
  if (mins <= 0) return '—';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function nowTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function getIstParts(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).formatToParts(date).map((part) => [part.type, part.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}
function todayDate() { return getIstParts().date; }
function isAttendanceWindow(date = new Date()) {
  const { minutes } = getIstParts(date);
  return minutes >= 9 * 60 && minutes <= 19 * 60;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}
      className="text-gradient">
      {time.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
    </span>
  );
}

function ElapsedClock({ signIn }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    function calc() {
      const [ih, im] = signIn.split(':').map(Number);
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false, hourCycle: 'h23',
        }).formatToParts(new Date()).map((p) => [p.type, p.value])
      );
      const nowSecs = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
      return Math.max(0, nowSecs - (ih * 3600 + im * 60));
    }
    setSecs(calc());
    const t = setInterval(() => setSecs(calc()), 1000);
    return () => clearInterval(t);
  }, [signIn]);
  const fmt = (n) => String(n).padStart(2, '0');
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}
      className="text-gradient">
      {fmt(Math.floor(secs / 3600))}:{fmt(Math.floor((secs % 3600) / 60))}:{fmt(secs % 60)}
    </span>
  );
}

export default function Attendance() {
  const { state, signIn, signOut, resetTodayAttendance } = useApp();
  const { currentUser, attendance, todayAttendance, users } = state;
  const isFounder = currentUser?.role === 'founder';
  const [tab, setTab] = useState(isFounder ? 'team' : 'mine');
  const [busy, setBusy] = useState(false);
  const [clockTick, setClockTick] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClockTick(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const today = todayDate();
  const attendanceOpen = isAttendanceWindow(clockTick);
  // todayAttendance is the server-loaded today record
  const todayRecord = todayAttendance;
  // Active session = signed in but not yet signed out
  const todaySession = todayRecord && !todayRecord.signOut ? todayRecord : null;

  const myHistory = attendance.filter(a => a.userId === currentUser?.id).slice(0, 20);

  const thisWeek = myHistory.filter(a => {
    const d = new Date(a.date);
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    return d >= weekStart;
  });
  const weekHours = thisWeek.reduce((sum, a) => {
    if (!a.signIn || !a.signOut || a.signIn === '—' || a.signOut === '—') return sum;
    const [ih, im] = a.signIn.split(':').map(Number);
    const [oh, om] = a.signOut.split(':').map(Number);
    return sum + ((oh * 60 + om) - (ih * 60 + im));
  }, 0);

  async function handleSignIn() {
    setBusy(true);
    try { await signIn('Office, Noida'); } catch (e) { alert(e.message); }
    setBusy(false);
  }
  async function handleSignOut() {
    if (!window.confirm('Are you sure you want to sign out for today?')) return;
    setBusy(true);
    try { await signOut(); } catch (e) { alert(e.message); }
    setBusy(false);
  }
  async function handleReset() {
    if (!window.confirm('Clear today\'s attendance record? You will be able to sign in again.')) return;
    setBusy(true);
    try { await resetTodayAttendance(); } catch (e) { alert(e.message); }
    setBusy(false);
  }

  const teamToday = users.map(u => {
    const rec = attendance.find(a => a.userId === u.id && a.date === today);
    return { user: u, rec };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200, margin: '0 auto' }} className="fade-in">
      <div>
        <Eyebrow>Attendance</Eyebrow>
        <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.018em' }}>
          {todaySession ? "You're signed in" : 'Ready to start the day?'}
        </h1>
      </div>

      {/* Sign-in card */}
      <Card hero={!!todaySession} style={{ padding: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%',
                background: todaySession ? '#16a371' : '#9a9aa8',
                boxShadow: todaySession ? '0 0 0 4px rgba(22,163,113,0.2)' : 'none' }}
                className={todaySession ? 'pulse-dot' : ''} />
              <span style={{ fontSize: 13, fontWeight: 600, color: todaySession ? '#0e7a52' : 'var(--fg-3)' }}>
                {todaySession ? 'Active session' : todayRecord ? 'Session complete' : 'Not signed in'}
              </span>
            </div>
            <LiveClock />
            <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>
              {todaySession
                ? `Signed in at ${todaySession.signIn} · ${todaySession.location}`
                : todayRecord
                ? `Worked ${todayRecord.hours} · Signed out at ${todayRecord.signOut}`
                : attendanceOpen
                ? 'Click "Sign in" to start tracking your hours.'
                : 'Sign in and sign out are available from 9:00 AM to 7:00 PM IST.'}
            </div>
            {todaySession && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: 'rgba(22,163,113,0.08)', width: 'fit-content' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0e7a52' }}>Worked today</span>
                <ElapsedClock signIn={todaySession.signIn} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
            {!todayRecord && !todaySession && (
              <Button variant="gradient" size="lg" icon={LogIn} onClick={handleSignIn} disabled={busy || !attendanceOpen}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            )}
            {todaySession && (
              <Button variant="secondary" size="lg" icon={LogOut} onClick={handleSignOut} disabled={busy || !attendanceOpen}>
                {busy ? 'Signing out…' : 'Sign out'}
              </Button>
            )}
            {todayRecord && !todaySession && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>Signed out</div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{todayRecord.hours}</div>
              </div>
            )}
            <span style={{ fontSize: 11, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={11} />Office, Noida · 192.168.x.x
            </span>
            {todayRecord && (
              <button onClick={handleReset} disabled={busy}
                style={{ fontSize: 11, color: '#e05c5c', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '2px 0', fontFamily: 'inherit', opacity: busy ? 0.5 : 1 }}>
                Reset today
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="This week" value={`${Math.floor(weekHours / 60)}h ${weekHours % 60}m`} sub="of 40h target" icon={Clock} />
        <StatCard label="Present days" value={myHistory.filter(a => a.status === 'Present').length} sub="Last 30 days" icon={TrendingUp} />
        <StatCard label="Remote days" value={myHistory.filter(a => a.status === 'Remote').length} sub="Last 30 days" icon={MapPin} />
        <StatCard label="Avg start time" value="9:52 AM" sub="Last 30 days" icon={Calendar} />
      </div>

      {/* Tabs (founder sees team view) */}
      {isFounder && (
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ id: 'mine', label: 'My Attendance' }, { id: 'team', label: 'Team View' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '7px 16px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: tab === t.id ? 'var(--fg-1)' : 'var(--bg-2)',
                color: tab === t.id ? '#fff' : 'var(--fg-2)', border: 'none' }}>{t.label}</button>
          ))}
        </div>
      )}

      {tab === 'team' && isFounder ? (
        <Section title={`Team attendance — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`}>
          <Card padded={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1.5fr 1fr 1fr 1fr 1fr', gap: 12, padding: '10px 16px',
              borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
              {['', 'Employee', 'Sign In', 'Sign Out', 'Hours', 'Status'].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            {teamToday.map(({ user: u, rec }) => (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '40px 1.5fr 1fr 1fr 1fr 1fr', gap: 12,
                alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-1)' }}>
                <Avatar name={u.name} size={30} src={u.avatar} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{u.title}</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{rec?.signIn || '—'}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{rec?.signOut || '—'}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{rec?.hours || '—'}</span>
                <Pill tone={attendanceTone(rec?.status || 'Not recorded')} dot>{rec?.status || 'Not recorded'}</Pill>
              </div>
            ))}
          </Card>
        </Section>
      ) : (
        <Section title="Recent history" action={
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Showing last 20 records</span>
        }>
          <Card padded={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 14, padding: '10px 16px',
              borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
              {['Date', 'Sign In', 'Sign Out', 'Hours', 'Status'].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            {myHistory.length === 0
              ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>No attendance records yet.</div>
              : myHistory.map((d, i) => (
              <div key={d.id || i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 14,
                padding: '12px 16px', borderBottom: i < myHistory.length - 1 ? '1px solid var(--border-1)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{fmtDate(d.date)}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>{d.signIn}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>{d.signOut || '—'}</span>
                <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{d.hours}</span>
                <Pill tone={attendanceTone(d.status)} dot>{d.status}</Pill>
              </div>
            ))}
          </Card>
        </Section>
      )}
    </div>
  );
}
