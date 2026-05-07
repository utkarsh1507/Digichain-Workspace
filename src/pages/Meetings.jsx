import { useState } from 'react';
import { Plus, Video, Calendar, Clock, Users, ExternalLink, Trash2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, StatCard, Button, IconBtn, Pill, Eyebrow, Section, Modal, Input, Textarea, Avatar, AvatarStack, Empty, Divider, fmtDate } from '../components/ui';
import { normalizeMeetLink, isGoogleMeetLink } from '../utils/meet';
import { ensureGoogleConnected, createGoogleMeet } from '../utils/googleMeet';

// ── Calendar picker ──────────────────────────────────────────────────────────
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function CalendarPicker({ value, onChange, minDate }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const min = minDate ? new Date(minDate + 'T00:00:00') : today;
  const selected = value ? new Date(value + 'T00:00:00') : null;
  const initial = selected && selected >= min ? selected : (min > today ? min : today);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [hovered, setHovered] = useState(null);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  function selectDay(day) {
    const d = new Date(viewYear, viewMonth, day); d.setHours(0, 0, 0, 0);
    if (d < min) return;
    onChange(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
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
    <div style={{ background: 'var(--bg-1)', borderRadius: 14, padding: '14px 16px', border: '1.5px solid var(--border-1)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} type="button"
          style={{ background: 'var(--bg-2)', border: 'none', cursor: 'pointer', color: 'var(--fg-2)',
            width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 120ms' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--border-1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-2)'}>
          <ChevronLeft size={15} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>{MONTHS[viewMonth]}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 500 }}>{viewYear}</div>
        </div>
        <button onClick={nextMonth} type="button"
          style={{ background: 'var(--bg-2)', border: 'none', cursor: 'pointer', color: 'var(--fg-2)',
            width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 120ms' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--border-1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-2)'}>
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
        {DAYS.map(d => (
          <span key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700,
            color: d === 'Su' || d === 'Sa' ? 'var(--fg-3)' : 'var(--fg-3)', padding: '2px 0',
            letterSpacing: '0.04em' }}>{d}</span>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />;
          const date = new Date(viewYear, viewMonth, day); date.setHours(0, 0, 0, 0);
          const isPast = date < min;
          const isToday = date.getTime() === today.getTime();
          const isSel = selected && date.getTime() === selected.getTime();
          const isHov = hovered === day && !isPast && !isSel;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          return (
            <button key={day} type="button" onClick={() => selectDay(day)} disabled={isPast}
              onMouseEnter={() => !isPast && setHovered(day)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: isSel
                  ? 'var(--accent)'
                  : isHov ? 'var(--bg-2)'
                  : isToday ? 'rgba(var(--accent-rgb, 99,102,241), 0.1)'
                  : 'transparent',
                color: isSel ? '#fff'
                  : isPast ? 'var(--border-2, #ccc)'
                  : isToday ? 'var(--accent)'
                  : isWeekend ? 'var(--fg-3)'
                  : 'var(--fg-1)',
                border: isSel ? 'none'
                  : isToday ? '1.5px solid var(--accent)'
                  : isHov ? '1.5px solid var(--border-1)'
                  : '1.5px solid transparent',
                borderRadius: 8, padding: '7px 0', fontSize: 12,
                fontWeight: isSel || isToday ? 700 : isWeekend ? 400 : 500,
                cursor: isPast ? 'not-allowed' : 'pointer',
                opacity: isPast ? 0.3 : 1,
                transition: 'background 80ms, border-color 80ms, color 80ms',
                fontFamily: 'inherit',
                boxShadow: isSel ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
              }}>
              {day}
            </button>
          );
        })}
      </div>

      {/* Selected date label */}
      {selected && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-1)',
          fontSize: 12, fontWeight: 600, color: 'var(--accent)', textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Calendar size={12} />
          {selected.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      )}
    </div>
  );
}

// ── Time slot picker ─────────────────────────────────────────────────────────
const MORNING_SLOTS = ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM'];
const AFTERNOON_SLOTS = ['12:00 PM','12:30 PM','01:00 PM','01:30 PM','02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM','06:00 PM','06:30 PM'];

function TimeSlotPicker({ value, onChange }) {
  function Chip({ slot }) {
    const isSel = value === slot;
    return (
      <button type="button" onClick={() => onChange(slot)}
        style={{
          padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: isSel ? 700 : 500,
          border: isSel ? 'none' : '1.5px solid var(--border-1)',
          background: isSel ? 'var(--accent)' : 'var(--bg-1)',
          color: isSel ? '#fff' : 'var(--fg-2)',
          cursor: 'pointer', fontFamily: 'var(--font-mono, monospace)',
          transition: 'all 100ms', letterSpacing: '0.01em',
          boxShadow: isSel ? '0 2px 6px rgba(99,102,241,0.3)' : 'none',
        }}
        onMouseEnter={e => { if (!isSel) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; } }}
        onMouseLeave={e => { if (!isSel) { e.currentTarget.style.borderColor = 'var(--border-1)'; e.currentTarget.style.color = 'var(--fg-2)'; } }}>
        {slot}
      </button>
    );
  }
  return (
    <div style={{ background: 'var(--bg-1)', borderRadius: 14, padding: '12px 14px', border: '1.5px solid var(--border-1)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
          color: 'var(--fg-3)', marginBottom: 6 }}>Morning</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {MORNING_SLOTS.map(s => <Chip key={s} slot={s} />)}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
          color: 'var(--fg-3)', marginBottom: 6 }}>Afternoon</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {AFTERNOON_SLOTS.map(s => <Chip key={s} slot={s} />)}
        </div>
      </div>
    </div>
  );
}

// ── Duration picker ──────────────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { value: '15 min', label: '15m' },
  { value: '30 min', label: '30m' },
  { value: '45 min', label: '45m' },
  { value: '60 min', label: '1h' },
  { value: '90 min', label: '1.5h' },
  { value: '120 min', label: '2h' },
];

function DurationPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {DURATION_OPTIONS.map(({ value: v, label }) => {
        const isSel = value === v;
        return (
          <button key={v} type="button" onClick={() => onChange(v)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: isSel ? 700 : 500,
              border: isSel ? 'none' : '1.5px solid var(--border-1)',
              background: isSel ? 'var(--accent)' : 'var(--bg-1)',
              color: isSel ? '#fff' : 'var(--fg-2)',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 100ms',
              boxShadow: isSel ? '0 2px 6px rgba(99,102,241,0.3)' : 'none',
            }}
            onMouseEnter={e => { if (!isSel) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; } }}
            onMouseLeave={e => { if (!isSel) { e.currentTarget.style.borderColor = 'var(--border-1)'; e.currentTarget.style.color = 'var(--fg-2)'; } }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Meetings() {
  const { state, createMeeting, deleteMeeting } = useApp();
  const { currentUser, meetings, users } = state;

  const [tab, setTab] = useState('upcoming');
  const [createOpen, setCreateOpen] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
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
    if (form.date < todayStr) { alert('Cannot schedule a meeting in the past.'); return; }
    if (!form.meetLink) { alert('Please generate a Google Meet link before scheduling.'); return; }
    try {
      await createMeeting({ ...form, meetLink: form.meetLink });
      setForm({ title: '', description: '', date: '', time: '10:00 AM', duration: '30 min', attendeeIds: [currentUser?.id], meetLink: '' });
      setCreateOpen(false);
    } catch (err) { alert(err.message); }
  }

  async function handleGenerateMeetLink() {
    if (!currentUser?.id) return;
    setGeneratingLink(true);
    try {
      const token = localStorage.getItem('dw_token');
      await ensureGoogleConnected(currentUser.id);
      const { meetLink } = await createGoogleMeet({
        userId: currentUser.id,
        title: form.title || 'Digichain Meeting',
        description: form.description || '',
        date: form.date || todayStr,
        time: form.time,
        duration: form.duration,
        token,
      });
      setForm(f => ({ ...f, meetLink }));
    } catch (err) {
      if (err.notConfigured) {
        alert('Google Meet is not configured on the server. Please ask your admin to add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI environment variables.');
      } else {
        alert(err.message || 'Failed to generate Google Meet link.');
      }
    } finally {
      setGeneratingLink(false);
    }
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

          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 8 }}>Time</span>
            <TimeSlotPicker value={form.time} onChange={time => setForm(f => ({ ...f, time }))} />
          </div>

          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 8 }}>Duration</span>
            <DurationPicker value={form.duration} onChange={duration => setForm(f => ({ ...f, duration }))} />
          </div>

          {/* Google Meet link section */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 6 }}>Google Meet link</span>
            {form.meetLink ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(26,115,232,0.07)', border: '1.5px solid rgba(26,115,232,0.25)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <rect x="0" y="4" width="14" height="12" rx="2" fill="#1a73e8"/>
                  <path d="M1 6l5.5 3.5L12 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M14 9l5-3v12l-5-3V9z" fill="#1a73e8"/>
                </svg>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1a73e8', wordBreak: 'break-all' }}>{form.meetLink}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, meetLink: '' }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
              </div>
            ) : (
              <button type="button" onClick={handleGenerateMeetLink} disabled={generatingLink}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10,
                  background: generatingLink ? 'var(--bg-2)' : '#1a73e8',
                  color: generatingLink ? 'var(--fg-3)' : '#fff', fontSize: 13, fontWeight: 600,
                  border: 'none', cursor: generatingLink ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  width: '100%', justifyContent: 'center', transition: 'background 150ms' }}>
                {generatingLink ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
                    </svg>
                    Connecting to Google…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect x="0" y="4" width="14" height="12" rx="2" fill="white" fillOpacity="0.9"/>
                      <path d="M1 6l5.5 3.5L12 6" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M14 9l5-3v12l-5-3V9z" fill="white" fillOpacity="0.9"/>
                    </svg>
                    Generate Google Meet link
                  </>
                )}
              </button>
            )}
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>
              {form.meetLink
                ? 'A unique Google Meet room will be shared with all attendees.'
                : 'Creates a real Google Meet room. All attendees join the same room automatically.'}
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            {!form.meetLink && (
              <span style={{ fontSize: 11, color: '#e07a2f', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#e07a2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Generate a Meet link first
              </span>
            )}
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" icon={Calendar} disabled={!form.meetLink}>Schedule</Button>
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
