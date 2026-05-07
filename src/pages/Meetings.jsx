import { useState } from 'react';
import { Plus, Video, Calendar, Clock, Users, ExternalLink, Trash2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, StatCard, Button, IconBtn, Pill, Eyebrow, Section, Modal, Input, Select, Textarea, Avatar, AvatarStack, Empty, Divider } from '../components/ui';
import { normalizeMeetLink } from '../utils/meet';
import {
  isDailyMeeting,
  isMeetingToday,
  isMeetingWithinNextWeek,
  isPastMeeting,
  isUpcomingMeeting,
  sortMeetingsByNextOccurrence,
} from '../utils/meetingSchedule';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TIME_OPTIONS = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM'];
const DURATION_OPTIONS = ['15 min', '30 min', '45 min', '60 min', '90 min', '120 min'];
const RECURRING_OPTIONS = [
  { value: 'none', label: 'One-time' },
  { value: 'daily', label: 'Every day' },
];

function createInitialForm(currentUser) {
  return {
    title: '',
    description: '',
    date: '',
    time: '10:00 AM',
    duration: '30 min',
    recurring: 'none',
    attendeeIds: currentUser?.id ? [currentUser.id] : [],
    meetLink: '',
  };
}

function CalendarPicker({ value, onChange, minDate }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const min = minDate ? new Date(`${minDate}T00:00:00`) : today;

  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const initial = selected && selected >= min ? selected : (min > today ? min : today);

  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  function selectDay(day) {
    const selectedDate = new Date(viewYear, viewMonth, day);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate < min) return;
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
      return;
    }
    setViewMonth((month) => month - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
      return;
    }
    setViewMonth((month) => month + 1);
  }

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  return (
    <div style={{ background: 'var(--bg-1)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button
          onClick={prevMonth}
          type="button"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-2)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          type="button"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-2)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS.map((day) => (
          <span key={day} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--fg-3)', padding: '2px 0' }}>
            {day}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />;
          const date = new Date(viewYear, viewMonth, day);
          date.setHours(0, 0, 0, 0);
          const isPast = date < min;
          const isToday = date.getTime() === today.getTime();
          const isSelected = selected && date.getTime() === selected.getTime();

          return (
            <button
              key={day}
              type="button"
              onClick={() => selectDay(day)}
              disabled={isPast}
              style={{
                background: isSelected ? 'var(--accent)' : isToday ? 'var(--accent-tint)' : 'transparent',
                color: isSelected ? '#fff' : isPast ? 'var(--border-2, #ccc)' : isToday ? 'var(--accent)' : 'var(--fg-1)',
                border: isSelected ? 'none' : isToday ? '1.5px solid var(--accent)' : 'none',
                borderRadius: 7,
                padding: '6px 0',
                fontSize: 12,
                fontWeight: isSelected || isToday ? 700 : 400,
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

      {selected && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid var(--border-1)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--accent)',
            textAlign: 'center',
          }}>
          {selected.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      )}
    </div>
  );
}

export default function Meetings() {
  const { state, createMeeting, deleteMeeting } = useApp();
  const { currentUser, meetings, users } = state;

  const [tab, setTab] = useState('upcoming');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(() => createInitialForm(currentUser));

  const todayStr = new Date().toISOString().split('T')[0];
  const myMeetings = meetings.filter((meeting) =>
    (meeting.attendeeIds || []).includes(currentUser?.id) || meeting.organizerId === currentUser?.id
  );
  const upcoming = sortMeetingsByNextOccurrence(myMeetings.filter((meeting) => isUpcomingMeeting(meeting, todayStr)), todayStr);
  const past = [...myMeetings.filter((meeting) => isPastMeeting(meeting, todayStr))].sort((a, b) => b.date.localeCompare(a.date));
  const shown = tab === 'upcoming' ? upcoming : past;
  const todayMeetings = upcoming.filter((meeting) => isMeetingToday(meeting, todayStr));

  async function handleCreate(event) {
    event.preventDefault();

    if (!form.date) {
      alert('Please select a start date.');
      return;
    }
    if (form.date < todayStr) {
      alert('Cannot schedule a meeting in the past.');
      return;
    }
    if (!normalizeMeetLink(form.meetLink)) {
      alert('Please paste a valid Google Meet link.');
      return;
    }
    if (!form.attendeeIds.includes(currentUser?.id)) {
      alert('You need to be included in the attendee list.');
      return;
    }

    try {
      await createMeeting({
        ...form,
        meetLink: normalizeMeetLink(form.meetLink),
        recurring: form.recurring === 'daily' ? 'daily' : null,
      });
      setForm(createInitialForm(currentUser));
      setCreateOpen(false);
    } catch (err) {
      alert(err.message);
    }
  }

  function toggleAttendee(userId) {
    setForm((current) => ({
      ...current,
      attendeeIds: current.attendeeIds.includes(userId)
        ? current.attendeeIds.filter((id) => id !== userId)
        : [...current.attendeeIds, userId],
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200, margin: '0 auto' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <Eyebrow>Meetings</Eyebrow>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.018em' }}>Meetings</h1>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>Schedule Meeting</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard hero gradientNum label="Today" value={todayMeetings.length} sub={todayMeetings.length ? `Next: ${todayMeetings[0]?.time}` : 'No meetings today'} />
        <StatCard label="Upcoming" value={upcoming.length} sub="Scheduled meetings" icon={Calendar} />
        <StatCard label="This week" value={upcoming.filter((meeting) => isMeetingWithinNextWeek(meeting, todayStr)).length} sub="Next 7 days" icon={Clock} />
        <StatCard label="Daily" value={upcoming.filter((meeting) => isDailyMeeting(meeting)).length} sub="Repeats every day" icon={CheckCircle} />
      </div>

      {todayMeetings.length > 0 && (
        <Section title="Today's meetings">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {todayMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                users={users}
                currentUser={currentUser}
                onDelete={deleteMeeting}
                highlight
                todayStr={todayStr}
              />
            ))}
          </div>
        </Section>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {[{ id: 'upcoming', label: `Upcoming (${upcoming.length})` }, { id: 'past', label: `Past (${past.length})` }].map((item) => (
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
              border: 'none',
              background: tab === item.id ? 'var(--fg-1)' : 'var(--bg-2)',
              color: tab === item.id ? '#fff' : 'var(--fg-2)',
            }}>
            {item.label}
          </button>
        ))}
      </div>

      {shown.length === 0
        ? <Empty icon={Video} title="No meetings" hint={tab === 'upcoming' ? 'Schedule one above.' : 'No past meetings.'} />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shown.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                users={users}
                currentUser={currentUser}
                onDelete={deleteMeeting}
                todayStr={todayStr}
              />
            ))}
          </div>
        )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Schedule Meeting" width={580}>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Meeting title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            required
            placeholder="What's this meeting about?"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Agenda, notes..."
            rows={2}
          />

          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 8 }}>Start date</span>
            <CalendarPicker value={form.date} onChange={(date) => setForm((current) => ({ ...current, date }))} minDate={todayStr} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select
              label="Time"
              value={form.time}
              onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
              options={TIME_OPTIONS.map((time) => ({ value: time, label: time }))}
            />
            <Select
              label="Duration"
              value={form.duration}
              onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))}
              options={DURATION_OPTIONS.map((duration) => ({ value: duration, label: duration }))}
            />
          </div>

          <Select
            label="Repeat"
            value={form.recurring}
            onChange={(event) => setForm((current) => ({ ...current, recurring: event.target.value }))}
            options={RECURRING_OPTIONS}
          />

          <Input
            label="Google Meet link"
            value={form.meetLink}
            onChange={(event) => setForm((current) => ({ ...current, meetLink: event.target.value }))}
            placeholder="https://meet.google.com/abc-defg-hij"
            required
          />
          <p style={{ margin: '-8px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>
            Paste the existing Google Meet link everyone should use. Daily meetings will reuse this same link and time every day.
          </p>

          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 8 }}>Attendees</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
              {users.map((user) => (
                <label
                  key={user.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}
                  onMouseEnter={(event) => { event.currentTarget.style.background = 'var(--bg-1)'; }}
                  onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}>
                  <input
                    type="checkbox"
                    checked={form.attendeeIds.includes(user.id)}
                    onChange={() => toggleAttendee(user.id)}
                    disabled={user.id === currentUser?.id}
                    style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                  />
                  <Avatar name={user.name} size={28} src={user.avatar} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{user.title}</span>
                  {user.id === currentUser?.id && <Pill tone="neutral">You</Pill>}
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

function MeetingCard({ meeting, users, currentUser, onDelete, highlight, todayStr }) {
  const host = meeting.organizer || users.find((user) => user.id === meeting.organizerId);
  const attendeeIds = meeting.attendeeIds || [];
  const joinLink = normalizeMeetLink(meeting.meetLink);
  const isPast = isPastMeeting(meeting, todayStr);

  return (
    <Card hero={highlight} style={{ padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>{meeting.title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>
                {meeting.date} · {meeting.time}
              </span>
              <Pill tone="neutral">{meeting.duration}</Pill>
              {isDailyMeeting(meeting) && <Pill tone="accent">Daily</Pill>}
              {isPast && <Pill tone="neutral">Completed</Pill>}
            </div>
          </div>
          {!isPast && meeting.organizerId === currentUser?.id && (
            <IconBtn icon={Trash2} title="Cancel meeting" onClick={() => onDelete(meeting.id)} />
          )}
        </div>

        {meeting.description && <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.5 }}>{meeting.description}</p>}

        <Divider />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AvatarStack users={attendeeIds.map((id) => users.find((user) => user.id === id)).filter(Boolean)} size={26} />
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{attendeeIds.length} attendee{attendeeIds.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Host: {host?.name?.split(' ')[0] || 'Unknown'}</span>
            {joinLink ? (
              <a
                href={joinLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 10,
                  background: '#1a73e8',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(26,115,232,0.3)',
                }}>
                {isPast ? <ExternalLink size={14} /> : <Video size={14} />}
                {isPast ? 'Open Meet Link' : 'Join Meet'}
              </a>
            ) : (
              <Pill tone="warning">No valid meet link</Pill>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
