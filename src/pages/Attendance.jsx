import { useState, useEffect } from 'react';
import { MapPin, LogIn, LogOut, Clock, TrendingUp, Calendar, Users, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { attendanceApi } from '../api';
import { Card, StatCard, Button, Pill, Eyebrow, Section, attendanceTone, fmtDate, Avatar } from '../components/ui';

function calcHours(signIn, signOut) {
  if (!signIn || !signOut || signIn === '-' || signOut === '-') return '-';
  const [ih, im] = signIn.split(':').map(Number);
  const [oh, om] = signOut.split(':').map(Number);
  const mins = (oh * 60 + om) - (ih * 60 + im);
  if (mins <= 0) return '-';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
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

function todayDate() {
  return getIstParts().date;
}

function isAttendanceWindow(date = new Date()) {
  const { minutes } = getIstParts(date);
  return minutes >= 9 * 60 && minutes <= 19 * 60;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span
      style={{ fontFamily: 'var(--font-mono)', fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}
      className="text-gradient"
    >
      {time.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })}
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
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          hourCycle: 'h23',
        }).formatToParts(new Date()).map((part) => [part.type, part.value])
      );
      const nowSecs = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
      return Math.max(0, nowSecs - (ih * 3600 + im * 60));
    }

    setSecs(calc());
    const timer = setInterval(() => setSecs(calc()), 1000);
    return () => clearInterval(timer);
  }, [signIn]);

  const pad = (value) => String(value).padStart(2, '0');

  return (
    <span
      style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}
      className="text-gradient"
    >
      {pad(Math.floor(secs / 3600))}:{pad(Math.floor((secs % 3600) / 60))}:{pad(secs % 60)}
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
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const [selectedDays, setSelectedDays] = useState(10);
  const [historyMode, setHistoryMode] = useState('days');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDownloading, setHistoryDownloading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyRange, setHistoryRange] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [personalHistory, setPersonalHistory] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setClockTick(new Date()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isFounder) return undefined;
    loadHistory({ mode: 'days', days: 10 });
    return undefined;
  }, [isFounder]);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.id) {
      setPersonalHistory([]);
      return undefined;
    }

    attendanceApi.userHistory(currentUser.id, { days: 30 })
      .then((records) => {
        if (!cancelled) setPersonalHistory(records || []);
      })
      .catch(() => {
        if (!cancelled) setPersonalHistory([]);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const today = todayDate();
  const attendanceOpen = isAttendanceWindow(clockTick);
  const todayRecord = todayAttendance;
  const todaySession = todayRecord && !todayRecord.signOut ? todayRecord : null;
  const myHistorySource = personalHistory.length ? personalHistory : attendance.filter((record) => record.userId === currentUser?.id);
  const myHistory = myHistorySource.slice(0, 20);

  const thisWeek = myHistory.filter((record) => {
    const current = new Date();
    const weekStart = new Date(current);
    weekStart.setDate(current.getDate() - current.getDay());
    return new Date(record.date) >= weekStart;
  });

  const weekHours = thisWeek.reduce((sum, record) => {
    if (!record.signIn || !record.signOut || record.signIn === '-' || record.signOut === '-') return sum;
    const [ih, im] = record.signIn.split(':').map(Number);
    const [oh, om] = record.signOut.split(':').map(Number);
    return sum + ((oh * 60 + om) - (ih * 60 + im));
  }, 0);

  async function handleSignIn() {
    setBusy(true);
    try {
      await signIn('Office, Noida');
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    if (!window.confirm('Are you sure you want to sign out for today?')) return;
    setBusy(true);
    try {
      await signOut();
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!window.confirm("Clear today's attendance record? You will be able to sign in again.")) return;
    setBusy(true);
    try {
      await resetTodayAttendance();
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadHistory({ mode = historyMode, date = selectedDate, days = selectedDays } = {}) {
    if (!isFounder) return;
    setHistoryLoading(true);
    setHistoryError('');

    try {
      const params = mode === 'date' ? { date } : { days };
      const result = await attendanceApi.history(params);
      setHistoryMode(mode);
      setHistoryRange(result.range || null);
      setHistoryRecords(result.records || []);
      if (mode === 'date') setSelectedDate(date);
      if (mode === 'days') setSelectedDays(days);
    } catch (error) {
      setHistoryError(error.message || 'Could not load attendance history.');
      setHistoryRange(null);
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleDownloadHistory() {
    if (!isFounder) return;
    setHistoryDownloading(true);
    setHistoryError('');

    try {
      const params = historyMode === 'date' ? { date: selectedDate } : { days: selectedDays };
      await attendanceApi.downloadHistory(params);
    } catch (error) {
      setHistoryError(error.message || 'Could not download attendance report.');
    } finally {
      setHistoryDownloading(false);
    }
  }

  const teamToday = users.map((user) => ({
    user,
    rec: attendance.find((record) => record.userId === user.id && record.date === today),
  }));

  const uniqueHistoryEmployees = new Set(historyRecords.map((record) => record.userId)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200, margin: '0 auto' }} className="fade-in">
      <div>
        <Eyebrow>Attendance</Eyebrow>
        <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.018em' }}>
          {todaySession ? "You're signed in" : 'Ready to start the day?'}
        </h1>
      </div>

      <Card hero={!!todaySession} style={{ padding: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: todaySession ? '#16a371' : '#9a9aa8',
                  boxShadow: todaySession ? '0 0 0 4px rgba(22,163,113,0.2)' : 'none',
                }}
                className={todaySession ? 'pulse-dot' : ''}
              />
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
                : 'Sign-in is available 9:00 AM to 7:00 PM IST. You can sign out at any time.'}
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
                {busy ? 'Signing in...' : 'Sign in'}
              </Button>
            )}
            {todaySession && (
              <Button variant="secondary" size="lg" icon={LogOut} onClick={handleSignOut} disabled={busy}>
                {busy ? 'Signing out...' : 'Sign out'}
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
              <button
                onClick={handleReset}
                disabled={busy}
                style={{ fontSize: 11, color: '#e05c5c', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit', opacity: busy ? 0.5 : 1 }}
              >
                Reset today
              </button>
            )}
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="This week" value={`${Math.floor(weekHours / 60)}h ${weekHours % 60}m`} sub="of 40h target" icon={Clock} />
        <StatCard label="Present days" value={myHistory.filter((record) => record.status === 'Present').length} sub="Last 30 days" icon={TrendingUp} />
        <StatCard label="Remote days" value={myHistory.filter((record) => record.status === 'Remote').length} sub="Last 30 days" icon={MapPin} />
        <StatCard label="Avg start time" value="9:52 AM" sub="Last 30 days" icon={Calendar} />
      </div>

      {isFounder && (
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ id: 'mine', label: 'My Attendance' }, { id: 'team', label: 'Team View' }].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                padding: '7px 16px',
                borderRadius: 999,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: tab === item.id ? 'var(--fg-1)' : 'var(--bg-2)',
                color: tab === item.id ? '#fff' : 'var(--fg-2)',
                border: 'none',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'team' && isFounder ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Section title={`Team attendance - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`}>
            <Card padded={false}>
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1.5fr 1fr 1fr 1fr 1fr', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
                {['', 'Employee', 'Sign In', 'Sign Out', 'Hours', 'Status'].map((heading) => (
                  <span key={heading} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>
                    {heading}
                  </span>
                ))}
              </div>
              {teamToday.map(({ user, rec }) => (
                <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '40px 1.5fr 1fr 1fr 1fr 1fr', gap: 12, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-1)' }}>
                  <Avatar name={user.name} size={30} src={user.avatar} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{user.title}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{rec?.signIn || '-'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{rec?.signOut || '-'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{rec?.hours || '-'}</span>
                  <Pill tone={attendanceTone(rec?.status || 'Not recorded')} dot>{rec?.status || 'Not recorded'}</Pill>
                </div>
              ))}
            </Card>
          </Section>

          <Section title="Attendance history" action={<span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Max 30 days per report</span>}>
            <Card style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>Specific date</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="date"
                          value={selectedDate}
                          max={today}
                          onChange={(event) => setSelectedDate(event.target.value)}
                          style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-1)', fontFamily: 'inherit' }}
                        />
                        <Button variant="secondary" size="sm" onClick={() => loadHistory({ mode: 'date', date: selectedDate })} disabled={historyLoading}>
                          View date
                        </Button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>Quick ranges</span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {[10, 15, 30].map((days) => (
                          <button
                            key={days}
                            onClick={() => loadHistory({ mode: 'days', days })}
                            disabled={historyLoading}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 999,
                              border: 'none',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              fontSize: 12,
                              fontWeight: 600,
                              background: historyMode === 'days' && selectedDays === days ? 'var(--fg-1)' : 'var(--bg-2)',
                              color: historyMode === 'days' && selectedDays === days ? '#fff' : 'var(--fg-2)',
                              opacity: historyLoading ? 0.7 : 1,
                            }}
                          >
                            Last {days} days
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button variant="primary" icon={Download} onClick={handleDownloadHistory} disabled={historyLoading || historyDownloading || historyRecords.length === 0}>
                    {historyDownloading ? 'Preparing file...' : 'Download Excel CSV'}
                  </Button>
                </div>

                {historyRange && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <StatCard label="Selected range" value={historyRange.label} sub={`${historyRange.from} to ${historyRange.to}`} icon={Calendar} />
                    <StatCard label="Records" value={historyRecords.length} sub="Attendance rows loaded" icon={Clock} />
                    <StatCard label="Employees" value={uniqueHistoryEmployees} sub="Covered in this report" icon={Users} />
                  </div>
                )}

                {historyError && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(224, 92, 92, 0.12)', color: '#b24444', fontSize: 12, fontWeight: 600 }}>
                    {historyError}
                  </div>
                )}

                <Card padded={false}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1.4fr 1fr 1fr 1fr 1fr', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
                    {['Date', '', 'Employee', 'Sign In', 'Sign Out', 'Hours', 'Status'].map((heading) => (
                      <span key={heading} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>
                        {heading}
                      </span>
                    ))}
                  </div>
                  {historyLoading ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>Loading attendance history...</div>
                  ) : historyRecords.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>No attendance records found for this selection.</div>
                  ) : (
                    historyRecords.map((record, index) => (
                      <div key={record.id || `${record.userId}-${record.date}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1.4fr 1fr 1fr 1fr 1fr', gap: 12, alignItems: 'center', padding: '12px 16px', borderBottom: index < historyRecords.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{fmtDate(record.date)}</span>
                        <Avatar name={record.user?.name || ''} size={30} src={record.user?.avatar} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{record.user?.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{record.user?.title}</div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{record.signIn || '-'}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{record.signOut || '-'}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{record.hours || calcHours(record.signIn, record.signOut)}</span>
                        <Pill tone={attendanceTone(record.status || 'Not recorded')} dot>{record.status || 'Not recorded'}</Pill>
                      </div>
                    ))
                  )}
                </Card>
              </div>
            </Card>
          </Section>
        </div>
      ) : (
        <Section title="Recent history" action={<span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Showing last 20 records</span>}>
          <Card padded={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 14, padding: '10px 16px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
              {['Date', 'Sign In', 'Sign Out', 'Hours', 'Status'].map((heading) => (
                <span key={heading} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>
                  {heading}
                </span>
              ))}
            </div>
            {myHistory.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>No attendance records yet.</div>
            ) : (
              myHistory.map((record, index) => (
                <div key={record.id || index} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 14, padding: '12px 16px', borderBottom: index < myHistory.length - 1 ? '1px solid var(--border-1)' : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{fmtDate(record.date)}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>{record.signIn}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>{record.signOut || '-'}</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{record.hours}</span>
                  <Pill tone={attendanceTone(record.status)} dot>{record.status}</Pill>
                </div>
              ))
            )}
          </Card>
        </Section>
      )}
    </div>
  );
}
