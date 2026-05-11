import { useState } from 'react';
import {
  Plus,
  Video,
  Calendar,
  Clock,
  ExternalLink,
  Trash2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  Card,
  StatCard,
  Button,
  IconBtn,
  Pill,
  Eyebrow,
  Section,
  Modal,
  Input,
  Textarea,
  Avatar,
  AvatarStack,
  Empty,
  Divider,
} from '../components/ui';
import { normalizeMeetLink } from '../utils/meet';
import {
  isDailyMeeting,
  isMeetingToday,
  isMeetingWithinNextWeek,
  isPastMeeting,
  isPastMeetingWithinRetention,
  isUpcomingMeeting,
  sortMeetingsByNextOccurrence,
} from '../utils/meetingSchedule';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TIME_OPTIONS = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM'];
const DURATION_OPTIONS = ['15 min', '30 min', '45 min', '60 min', '90 min', '120 min'];
const RECURRING_OPTIONS = [
  { value: 'none', label: 'One-time', hint: 'Great for interviews, demos, and quick syncs.' },
  { value: 'daily', label: 'Every day', hint: 'Keeps the same Meet link and time active each day.' },
];

function formatDateValue(date) {
  return date.toISOString().split('T')[0];
}

function addDays(baseDate, offset) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + offset);
  return next;
}

function getDisplayDateLabel(value) {
  if (!value) return 'Pick a date';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

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

function createFormFromMeeting(meeting, currentUser) {
  return {
    title: meeting.title || '',
    description: meeting.description || '',
    date: meeting.date || '',
    time: meeting.time || '10:00 AM',
    duration: meeting.duration || '30 min',
    recurring: isDailyMeeting(meeting) ? 'daily' : 'none',
    attendeeIds: Array.from(new Set([...(meeting.attendeeIds || []), currentUser?.id].filter(Boolean))),
    meetLink: meeting.meetLink || '',
  };
}

function SegmentedOptionGroup({ label, value, onChange, options, columns = 2 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>{label}</span>}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 10 }}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 4,
                padding: '12px 14px',
                borderRadius: 14,
                border: active ? '1px solid var(--accent)' : '1px solid var(--border-1)',
                background: active ? 'linear-gradient(135deg, rgba(92,201,245,0.14), rgba(123,97,255,0.12))' : '#fff',
                boxShadow: active ? '0 10px 28px rgba(123,97,255,0.14)' : 'var(--shadow-sm)',
                color: 'var(--fg-1)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 180ms var(--ease-out)',
                fontFamily: 'inherit',
              }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{option.label}</span>
              {option.hint && <span style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--fg-3)' }}>{option.hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimeSlotPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>Time</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {TIME_OPTIONS.map((slot) => {
          const active = value === slot;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onChange(slot)}
              style={{
                padding: '10px 8px',
                borderRadius: 12,
                border: active ? '1px solid var(--accent)' : '1px solid var(--border-1)',
                background: active ? 'var(--accent)' : '#fff',
                color: active ? '#fff' : 'var(--fg-2)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 160ms var(--ease-out)',
                boxShadow: active ? '0 10px 22px rgba(123,97,255,0.22)' : 'none',
              }}>
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
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
    onChange(formatDateValue(selectedDate));
  }

  function jumpTo(date) {
    setViewMonth(date.getMonth());
    setViewYear(date.getFullYear());
    onChange(formatDateValue(date));
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

  const quickDates = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: 'In 3 days', value: addDays(today, 3) },
  ].filter((item) => item.value >= min);

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(92,201,245,0.09), rgba(255,255,255,0.98))',
        borderRadius: 18,
        padding: '14px 16px 16px',
        border: '1px solid rgba(123,97,255,0.12)',
        boxShadow: '0 16px 48px rgba(14,14,20,0.06)',
      }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {quickDates.map((item) => {
          const itemValue = formatDateValue(item.value);
          const active = itemValue === value;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => jumpTo(item.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 999,
                border: active ? '1px solid var(--accent)' : '1px solid var(--border-1)',
                background: active ? 'var(--accent)' : 'rgba(255,255,255,0.78)',
                color: active ? '#fff' : 'var(--fg-2)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
              {item.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button
          onClick={prevMonth}
          type="button"
          style={{
            background: 'rgba(255,255,255,0.75)',
            border: '1px solid var(--border-1)',
            cursor: 'pointer',
            color: 'var(--fg-2)',
            padding: 6,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
          }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          type="button"
          style={{
            background: 'rgba(255,255,255,0.75)',
            border: '1px solid var(--border-1)',
            cursor: 'pointer',
            color: 'var(--fg-2)',
            padding: 6,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
          }}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {DAYS.map((day) => (
          <span key={day} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--fg-3)', padding: '2px 0' }}>
            {day}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
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
                minHeight: 44,
                background: isSelected ? 'var(--accent)' : isToday ? 'rgba(123,97,255,0.08)' : 'rgba(255,255,255,0.68)',
                color: isSelected ? '#fff' : isPast ? 'var(--border-2, #ccc)' : isToday ? 'var(--accent)' : 'var(--fg-1)',
                border: isSelected ? '1px solid var(--accent)' : isToday ? '1px solid rgba(123,97,255,0.28)' : '1px solid transparent',
                borderRadius: 12,
                padding: '6px 0',
                fontSize: 12,
                fontWeight: isSelected || isToday ? 700 : 500,
                cursor: isPast ? 'not-allowed' : 'pointer',
                opacity: isPast ? 0.35 : 1,
                transition: 'all 140ms var(--ease-out)',
                fontFamily: 'inherit',
              }}>
              {day}
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.74)',
          border: '1px solid var(--border-1)',
          fontSize: 12,
          fontWeight: 700,
          color: selected ? 'var(--accent)' : 'var(--fg-3)',
          textAlign: 'center',
        }}>
        {getDisplayDateLabel(value)}
      </div>
    </div>
  );
}

function MeetingForm({
  form,
  setForm,
  users,
  currentUser,
  todayStr,
  onSubmit,
  onCancel,
  submitLabel,
}) {
  function toggleAttendee(userId) {
    setForm((current) => ({
      ...current,
      attendeeIds: current.attendeeIds.includes(userId)
        ? current.attendeeIds.filter((id) => id !== userId)
        : [...current.attendeeIds, userId],
    }));
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 8 }}>Start date</span>
          <CalendarPicker value={form.date} onChange={(date) => setForm((current) => ({ ...current, date }))} minDate={todayStr} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card style={{ padding: 16, background: 'linear-gradient(180deg, rgba(123,97,255,0.06), #fff)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="var(--accent)" />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Meeting vibe</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
                {form.recurring === 'daily'
                  ? 'Daily meetings stay active in the main meetings list and keep the same Meet link.'
                  : 'One-time meetings move to Past for 7 days after they are completed.'}
              </span>
              <Pill tone={form.recurring === 'daily' ? 'accent' : 'neutral'}>
                {form.recurring === 'daily' ? 'Repeats every day' : 'Single occurrence'}
              </Pill>
            </div>
          </Card>

          <SegmentedOptionGroup
            label="Duration"
            value={form.duration}
            onChange={(duration) => setForm((current) => ({ ...current, duration }))}
            options={DURATION_OPTIONS.map((duration) => ({ value: duration, label: duration }))}
            columns={2}
          />

          <SegmentedOptionGroup
            label="Repeat"
            value={form.recurring}
            onChange={(recurring) => setForm((current) => ({ ...current, recurring }))}
            options={RECURRING_OPTIONS}
            columns={1}
          />
        </div>
      </div>

      <TimeSlotPicker value={form.time} onChange={(time) => setForm((current) => ({ ...current, time }))} />

      <Input
        label="Google Meet link"
        value={form.meetLink}
        onChange={(event) => setForm((current) => ({ ...current, meetLink: event.target.value }))}
        placeholder="https://meet.google.com/abc-defg-hij"
        required
      />
      <p style={{ margin: '-8px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>
        Daily meetings reuse the same Meet link and stay visible in the upcoming meetings section every day.
      </p>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>Attendees</span>
          <Pill tone="info">{form.attendeeIds.length} selected</Pill>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
          {users.map((user) => {
            const selected = form.attendeeIds.includes(user.id);
            return (
              <label
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  border: selected ? '1px solid rgba(123,97,255,0.24)' : '1px solid transparent',
                  background: selected ? 'rgba(123,97,255,0.07)' : 'transparent',
                }}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleAttendee(user.id)}
                  disabled={user.id === currentUser?.id}
                  style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                />
                <Avatar name={user.name} size={30} src={user.avatar} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{user.title}</span>
                </div>
                {user.id === currentUser?.id && <Pill tone="neutral">You</Pill>}
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" icon={Calendar}>{submitLabel}</Button>
      </div>
    </form>
  );
}

export default function Meetings() {
  const { state, createMeeting, updateMeeting, deleteMeeting } = useApp();
  const { currentUser, meetings, users } = state;

  const [tab, setTab] = useState('upcoming');
  const [createOpen, setCreateOpen] = useState(false);
  const [editMeetingId, setEditMeetingId] = useState(null);
  const [form, setForm] = useState(() => createInitialForm(currentUser));

  const todayStr = new Date().toISOString().split('T')[0];
  const myMeetings = meetings.filter((meeting) =>
    (meeting.attendeeIds || []).includes(currentUser?.id) || meeting.organizerId === currentUser?.id
  );
  const upcoming = sortMeetingsByNextOccurrence(myMeetings.filter((meeting) => isUpcomingMeeting(meeting, todayStr)), todayStr);
  const past = [...myMeetings.filter((meeting) => isPastMeetingWithinRetention(meeting, todayStr))]
    .sort((a, b) => b.date.localeCompare(a.date));
  const shown = tab === 'upcoming' ? upcoming : past;
  const todayMeetings = upcoming.filter((meeting) => isMeetingToday(meeting, todayStr));
  const editingMeeting = myMeetings.find((meeting) => meeting.id === editMeetingId) || null;

  function resetCreateForm() {
    setForm(createInitialForm(currentUser));
  }

  function openCreateModal() {
    resetCreateForm();
    setEditMeetingId(null);
    setCreateOpen(true);
  }

  function closeCreateModal() {
    setCreateOpen(false);
    resetCreateForm();
  }

  function openEditModal(meeting) {
    setEditMeetingId(meeting.id);
    setForm(createFormFromMeeting(meeting, currentUser));
  }

  function closeEditModal() {
    setEditMeetingId(null);
    resetCreateForm();
  }

  function validateForm() {
    if (!form.date) {
      alert('Please select a start date.');
      return false;
    }
    if (form.date < todayStr) {
      alert('Cannot schedule or move a meeting to a past date.');
      return false;
    }
    if (!normalizeMeetLink(form.meetLink)) {
      alert('Please paste a valid Google Meet link.');
      return false;
    }
    if (!form.attendeeIds.includes(currentUser?.id)) {
      alert('You need to be included in the attendee list.');
      return false;
    }
    return true;
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      await createMeeting({
        ...form,
        meetLink: normalizeMeetLink(form.meetLink),
        recurring: form.recurring === 'daily' ? 'daily' : null,
      });
      closeCreateModal();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleEdit(event) {
    event.preventDefault();
    if (!editingMeeting || !validateForm()) return;

    try {
      await updateMeeting(editingMeeting.id, {
        ...form,
        meetLink: normalizeMeetLink(form.meetLink),
        recurring: form.recurring === 'daily' ? 'daily' : null,
      });
      closeEditModal();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200, margin: '0 auto' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Eyebrow>Meetings</Eyebrow>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.018em' }}>Meetings</h1>
        </div>
        <Button variant="primary" icon={Plus} onClick={openCreateModal}>Schedule Meeting</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard hero gradientNum label="Today" value={todayMeetings.length} sub={todayMeetings.length ? `Next: ${todayMeetings[0]?.time}` : 'No meetings today'} />
        <StatCard label="Upcoming" value={upcoming.length} sub="Scheduled meetings" icon={Calendar} />
        <StatCard label="This week" value={upcoming.filter((meeting) => isMeetingWithinNextWeek(meeting, todayStr)).length} sub="Next 7 days" icon={Clock} />
        <StatCard label="Daily" value={upcoming.filter((meeting) => isDailyMeeting(meeting)).length} sub="Repeats every day" icon={CheckCircle} />
      </div>

      <Card style={{ padding: 18, background: 'linear-gradient(135deg, rgba(92,201,245,0.08), rgba(123,97,255,0.06), rgba(255,255,255,0.98))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RotateCcw size={16} color="var(--accent)" />
              <span style={{ fontSize: 14, fontWeight: 700 }}>Recurring meetings stay active</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
              Daily meetings remain in Upcoming and never move into Past automatically. One-time meetings stay in Past for only 7 days.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Pill tone="accent">Daily stays visible</Pill>
            <Pill tone="info">Past retained for 1 week</Pill>
          </div>
        </div>
      </Card>

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
                onEdit={openEditModal}
                highlight
                todayStr={todayStr}
              />
            ))}
          </div>
        </Section>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {[{ id: 'upcoming', label: `Upcoming (${upcoming.length})` }, { id: 'past', label: `Past 7 Days (${past.length})` }].map((item) => (
          <button
            key={item.id}
            type="button"
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
        ? <Empty icon={Video} title="No meetings" hint={tab === 'upcoming' ? 'Schedule one above.' : 'No meetings from the last 7 days.'} />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shown.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                users={users}
                currentUser={currentUser}
                onDelete={deleteMeeting}
                onEdit={openEditModal}
                todayStr={todayStr}
              />
            ))}
          </div>
        )}

      <Modal open={createOpen} onClose={closeCreateModal} title="Schedule Meeting" width={760}>
        <MeetingForm
          form={form}
          setForm={setForm}
          users={users}
          currentUser={currentUser}
          todayStr={todayStr}
          onSubmit={handleCreate}
          onCancel={closeCreateModal}
          submitLabel="Schedule"
        />
      </Modal>

      <Modal open={Boolean(editingMeeting)} onClose={closeEditModal} title="Edit Meeting" width={760}>
        <MeetingForm
          form={form}
          setForm={setForm}
          users={users}
          currentUser={currentUser}
          todayStr={todayStr}
          onSubmit={handleEdit}
          onCancel={closeEditModal}
          submitLabel="Save changes"
        />
      </Modal>
    </div>
  );
}

function MeetingCard({ meeting, users, currentUser, onDelete, onEdit, highlight, todayStr }) {
  const host = meeting.organizer || users.find((user) => user.id === meeting.organizerId);
  const attendeeIds = meeting.attendeeIds || [];
  const joinLink = normalizeMeetLink(meeting.meetLink);
  const isPast = isPastMeeting(meeting, todayStr);
  const canManage = meeting.organizerId === currentUser?.id && (!isPast || isDailyMeeting(meeting));

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
          {canManage && (
            <div style={{ display: 'flex', gap: 6 }}>
              <IconBtn icon={Pencil} title="Edit meeting" onClick={() => onEdit(meeting)} />
              <IconBtn icon={Trash2} title="Cancel meeting" onClick={() => onDelete(meeting.id)} />
            </div>
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
