import { useState } from 'react';
import { Plus, Video, Calendar, Clock, Users, ExternalLink, Trash2, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, StatCard, Button, IconBtn, Pill, Eyebrow, Section, Modal, Input, Select, Textarea, Avatar, AvatarStack, Empty, Divider, fmtDate } from '../components/ui';
import { generateMeetLink, normalizeMeetLink } from '../utils/meet';

export default function Meetings() {
  const { state, createMeeting, deleteMeeting } = useApp();
  const { currentUser, meetings, users } = state;
  const isAdmin = ['founder', 'employee'].includes(currentUser?.role);

  const [tab, setTab] = useState('upcoming');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', date: '', time: '10:00 AM', duration: '30 min',
    attendeeIds: currentUser?.id ? [currentUser.id] : [], meetLink: '',
  });

  const today = new Date().toISOString().split('T')[0];
  const myMeetings = meetings.filter(m =>
    (m.attendeeIds || []).includes(currentUser?.id) || m.organizerId === currentUser?.id
  );
  const upcoming = myMeetings.filter(m => m.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = myMeetings.filter(m => m.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const shown = tab === 'upcoming' ? upcoming : past;

  const todayMeetings = upcoming.filter(m => m.date === today);

  async function handleCreate(e) {
    e.preventDefault();
    const meetLink = form.meetLink || generateMeetLink(`${currentUser?.id}-${form.date}-${form.time}-${form.title}`);
    try {
      await createMeeting({ ...form, meetLink });
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

      {/* Meeting list */}
      {shown.length === 0
        ? <Empty icon={Video} title="No meetings" hint={tab === 'upcoming' ? 'Schedule one above.' : 'No past meetings.'} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shown.map(m => <MeetingCard key={m.id} meeting={m} users={users} currentUser={currentUser} onDelete={deleteMeeting} />)}
        </div>}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Schedule Meeting" width={560}>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Meeting title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="What's this meeting about?" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Agenda, notes…" rows={2} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            <Select label="Time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              options={['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','01:00 PM','01:30 PM','02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM','06:00 PM'].map(t => ({ value: t, label: t }))} />
          </div>
          <Select label="Duration" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
            options={['15 min','30 min','45 min','60 min','90 min','120 min'].map(d => ({ value: d, label: d }))} />
          <Input label="Meeting link (optional)" value={form.meetLink} onChange={e => setForm(f => ({ ...f, meetLink: e.target.value }))}
            placeholder="Leave blank to auto-create a call room" />
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 8 }}>Attendees</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
  const joinLink = normalizeMeetLink(m.meetLink, m.id);
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
                  background: 'var(--brand-gradient)', color: '#fff', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', boxShadow: 'var(--shadow-brand)' }}>
                <Video size={14} />Join Call <ExternalLink size={11} />
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
