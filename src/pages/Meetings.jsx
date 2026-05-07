import { useState } from 'react';
import { Plus, Video, Calendar, Clock, Users, ExternalLink, Trash2, CheckCircle, ChevronLeft, ChevronRight, ExternalLink as LinkIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, StatCard, Button, IconBtn, Pill, Eyebrow, Section, Modal, Input, Select, Textarea, Avatar, AvatarStack, Empty, Divider, fmtDate } from '../components/ui';
import { normalizeMeetLink, isGoogleMeetLink } from '../utils/meet';

// ── Inline calendar picker ───────────────────────────────────────────────────
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function CalendarPicker({ value, onChange, minDate }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const min = minDate ? new Date(minDate + 'T00:00:00') : today;

  const selected = value ? new Date(value + 'T00:00:00') : null;
  const initial = selected && selected >= min ? selected : (min > today ? min : today);

  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  function selectDay(day) {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    if (d < min) return;
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ background: 'var(--bg-1)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border-1)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={prevMonth} type="button"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-2)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} type="button"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-2)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => (
          <span key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--fg-3)', padding: '2px 0' }}>{d}</span>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />;
          const date = new Date(viewYear, viewMonth, day); date.setHours(0, 0, 0, 0);
          const isPast = date < min;
          const isToday = date.getTime() === today.getTime();
          const isSel = selected && date.getTime() === selected.getTime();
          return (
            <button key={day} type="button" onClick={() => selectDay(day)} disabled={isPast}
              style={{
                background: isSel ? 'var(--accent)' : isToday ? 'var(--accent-tint)' : 'transparent',
                color: isSel ? '#fff' : isPast ? 'var(--border-2, #ccc)' : isToday ? 'var(--accent)' : 'var(--fg-1)',
                border: isSel ? 'none' : isToday ? '1.5px solid var(--accent)' : 'none',
                borderRadius: 7, padding: '6px 0', fontSize: 12,
                fontWeight: isSel || isToday ? 700 : 400,
                cursor: isPast ? 'not-allowed' : 'pointer',
                opacity: isPast ? 0.35 : 1,
                transition: 'background 100ms',
                fontFamily: 'inherit',
              }}>
              {day}
            </button>
          );
        })}
      </div>

      {/* Selected date display */}
      {selected && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-1)',
          fontSize: 12, fontWeight: 600, color: 'var(--accent)', textAlign: 'center' }}>
          {selected.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Meetings() {
  const { state, createMeeting, deleteMeeting } = useApp();
  const { currentUser, meetings, users } = state;

  const [tab, setTab] = useState('upcoming');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', date: '', time: '10:00 AM', duration: '30 min',
    attendeeIds: currentUser?.id ? [currentUser.id] : [], meetLink: '',
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const myMeetings = meetings.filter(m =>
    (m.attendeeIds || []).includes(currentUser?.id) || m.organizerId === currentUser?.id
  );
  const upcoming = myMeetings.filter(m => m.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
  const past = myMeetings.filter(m => m.date < todayStr).sort((a, b) => b.date.localeCompare(a.date));
  const shown = tab === 'upcoming' ? upcoming : past;
  const todayMeetings = upcoming.filter(m => m.date === todayStr);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.date) { alert('Please select a date.'); return; }
    // Prevent past dates (extra guard beyond the calendar widget)
    if (form.date < todayStr) { alert('Cannot schedule a meeting in the past.'); return; }
    try {
      await createMeeting({ ...form, meetLink: form.meetLink || '' });
      setForm({ title: '', description: '', date: '', time: '10:00 AM', duration: '30 min', attendeeIds: [currentUser?.id], meetLink: '' });
      setCreateOpen(false);
    } catch (err) { alert(err.message); }
  }

  function toggleAttendee(userId) {
    setForm(f => ({
      ...f,
      attendeeIds: f.attendeeIds.includes(userId)
        ? f.attendeeIds.filter(id => id !== userId)
        : [...f.attendeeIds, userId],
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200, margin: '0 auto' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <Eyebrow>Meetings</Eyebrow>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.018em' }}>Meetings & Calls</h1>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>Schedule Meeting</Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard hero gradientNum label="Today" value={todayMeetings.length} sub={todayMeetings.length ? `Next: ${todayMeetings[0]?.time}` : 'No meetings today'} />
        <StatCard label="Upcoming" value={upcoming.length} sub="Scheduled meetings" icon={Calendar} />
        <StatCard label="This week" value={upcoming.filter(m => {
          const d = new Date(m.date), now = new Date();
          return d >= now && d <= new Date(now.getTime() + 7 * 86400000);
        }).length} sub="Next 7 days" icon={Clock} />
        <StatCard label="Recurring" value={upcoming.filter(m => m.recurring).length} sub="Auto-scheduled" icon={CheckCircle} />
      </div>

      {/* Today's meetings */}
      {todayMeetings.length > 0 && (
        <Section title="Today's meetings">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {todayMeetings.map(m => <MeetingCard key={m.id} meeting={m} users={users} currentUser={currentUser} onDelete={deleteMeeting} highlight />)}
          </div>
        </Section>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ id: 'upcoming', label: `Upcoming (${upcoming.length})` }, { id: 'past', label: `Past (${past.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '7px 16px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: tab === t.id ? 'var(--fg-1)' : 'var(--bg-2)',
              color: tab === t.id ? '#fff' : 'var(--fg-2)' }}>{t.label}</button>
        ))}
      </div>

      {shown.length === 0
        ? <Empty icon={Video} title="No meetings" hint={tab === 'upcoming' ? 'Schedule one above.' : 'No past meetings.'} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shown.map(m => <MeetingCard key={m.id} meeting={m} users={users} currentUser={currentUser} onDelete={deleteMeeting} />)}
        </div>}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Schedule Meeting" width={580}>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Meeting title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="What's this meeting about?" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Agenda, notes…" rows={2} />

          {/* Calendar picker */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 8 }}>Date</span>
            <CalendarPicker value={form.date} onChange={date => setForm(f => ({ ...f, date }))} minDate={todayStr} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              options={['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','01:00 PM','01:30 PM','02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM','06:00 PM'].map(t => ({ value: t, label: t }))} />
            <Select label="Duration" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              options={['15 min','30 min','45 min','60 min','90 min','120 min'].map(d => ({ value: d, label: d }))} />
          </div>

          {/* Google Meet link section */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 6 }}>Google Meet link</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={form.meetLink}
                onChange={e => setForm(f => ({ ...f, meetLink: e.target.value }))}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                style={{ flex: 1, height: 36, borderRadius: 8, border: '1.5px solid var(--border-1)',
                  padding: '0 10px', background: '#fff', color: 'var(--fg-1)',
                  fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
              />
              <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 8,
                  background: '#1a73e8', color: '#fff', fontSize: 12, fontWeight: 600,
                  textDecoration: 'none', whiteSpace: 'nowrap', height: 36 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15 4.5V12l4.5-3L24 12V3.75A1.5 1.5 0 0022.5 2.25H4.5A1.5 1.5 0 003 3.75V20.25A1.5 1.5 0 004.5 21.75H19.5A1.5 1.5 0 0021 20.25V15l-4.5 2.25L12 14.25V12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="0" y="4" width="14" height="12" rx="2" fill="#1a73e8"/>
                  <path d="M1 6l5.5 3.5L12 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Get Meet link
              </a>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>
              Click "Get Meet link" → copy the URL from Google Meet → paste it here.
              Leave blank to add a link later.
            </p>
          </div>

          {/* Attendees */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 8 }}>Attendees</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
              {users.map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <input type="checkbox" checked={form.attendeeIds.includes(u.id)} onChange={() => toggleAttendee(u.id)}
                    style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                  <Avatar name={u.name} size={28} src={u.avatar} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{u.title}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" icon={Calendar}>Schedule</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MeetingCard({ meeting: m, users, currentUser, onDelete, highlight }) {
  const host = m.organizer || users.find(u => u.id === (m.organizerId || m.hostId));
  const attendeeIds = m.attendeeIds || [];
  const isPast = m.date < new Date().toISOString().split('T')[0];
  const joinLink = normalizeMeetLink(m.meetLink);
  const hasGoogleLink = isGoogleMeetLink(m.meetLink);

  return (
    <Card hero={highlight} style={{ padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>{m.title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>{m.date} · {m.time}</span>
              <Pill tone="neutral">{m.duration}</Pill>
              {m.recurring && <Pill tone="accent">🔁 {m.recurring}</Pill>}
              {isPast && <Pill tone="neutral">Completed</Pill>}
            </div>
          </div>
          {!isPast && (m.organizerId === currentUser?.id || m.hostId === currentUser?.id) && (
            <IconBtn icon={Trash2} title="Cancel meeting" onClick={() => onDelete(m.id)} />
          )}
        </div>

        {m.description && <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.5 }}>{m.description}</p>}

        <Divider />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AvatarStack users={attendeeIds.map(id => users.find(u => u.id === id))} size={26} />
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{attendeeIds.length} attendee{attendeeIds.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Host: {host?.name?.split(' ')[0] || 'Unknown'}</span>
            {!isPast && (
              <a href={joinLink} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10,
                  background: hasGoogleLink ? '#1a73e8' : 'var(--brand-gradient)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', boxShadow: hasGoogleLink ? '0 2px 8px rgba(26,115,232,0.3)' : 'var(--shadow-brand)' }}>
                {hasGoogleLink ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="0" y="4" width="14" height="12" rx="2" fill="white" fillOpacity="0.3"/>
                    <path d="M1 6l5.5 3.5L12 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M14 9l5-3v12l-5-3V9z" fill="white" fillOpacity="0.9"/>
                  </svg>
                ) : <Video size={14} />}
                Join Meet
              </a>
            )}
            {isPast && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
                <ExternalLink size={11} />
                <a href={joinLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-3)' }}>Meeting link</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
