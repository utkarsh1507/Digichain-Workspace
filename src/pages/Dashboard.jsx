import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Plus, Check, Clock, Video, ChevronRight, TrendingUp,
  Users, ClipboardList, CalendarCheck, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  Card, StatCard, Button, Pill, Avatar, AvatarStack,
  Eyebrow, Section, Divider, Empty, priorityTone, statusTone, timeAgo, fmtDate
} from '../components/ui';
import { normalizeMeetLink } from '../utils/meet';
import { getPresence, getStatusText } from '../utils/presence';

function greet(name) {
  const h = new Date().getHours();
  const g = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${g}, ${name.split(' ')[0]}.`;
}
function todayStr() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const QUOTES = [
  { text: 'Code is poetry written for machines and read by humans.', author: 'Anonymous' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Trust the process. Block by block.', author: 'DCP Team' },
  { text: 'Small improvements compound into massive results.', author: 'James Clear' },
];

// ─── Employee Dashboard ───────────────────────────────────────────────────────
export default function Dashboard() {
  const { state } = useApp();
  const { currentUser, tasks, meetings, announcements, attendance, leaves, todayAttendance, users } = state;
  const navigate = useNavigate();
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  if (currentUser?.role === 'founder') return <FounderDashboard />;

  const today = new Date().toISOString().split('T')[0];
  const myTasks = tasks.filter(t => t.assigneeId === currentUser?.id);
  const dueTodayTasks = myTasks.filter(t => t.dueDate === today && t.status !== 'Completed');
  const upcomingMeetings = meetings.filter(m => m.date >= today && (m.attendeeIds || []).includes(currentUser?.id));
  const todaySession = todayAttendance && !todayAttendance.signOut ? todayAttendance : null;

  // Leave balance from approved leaves
  const myApprovedLeaves = leaves.filter(l => l.userId === currentUser?.id && l.status === 'Approved');
  const totalLeaveUsed = myApprovedLeaves.reduce((s, l) => s + (l.days || 0), 0);
  const leaveBalance = 38 - totalLeaveUsed;

  const teamMembers = users.filter(u => u.id !== currentUser?.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1280, margin: '0 auto' }} className="fade-in">
      {/* Greeting */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end' }}>
        <div>
          <Eyebrow>{todayStr()}</Eyebrow>
          <h1 style={{ margin: '6px 0 0', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {greet(currentUser?.name || '')}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--fg-3)', fontSize: 14 }}>
            "{quote.text}" — <span style={{ color: 'var(--fg-2)' }}>{quote.author}</span>
          </p>
        </div>
        <Button variant="gradient" icon={Zap} onClick={() => navigate('/tasks')}>View my tasks</Button>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard hero gradientNum label="Today's Status"
          value={todaySession ? 'Signed In' : todayAttendance ? 'Done' : 'Not in'}
          sub={todaySession ? `Since ${todaySession.signIn}` : todayAttendance?.hours ? todayAttendance.hours : 'Tap Attendance to sign in'} />
        <StatCard label="My Tasks" value={myTasks.filter(t => t.status !== 'Completed').length}
          sub={`${dueTodayTasks.length} due today`} icon={ClipboardList} />
        <StatCard label="Today's Meetings" value={upcomingMeetings.filter(m => m.date === new Date().toISOString().split('T')[0]).length}
          sub={upcomingMeetings.length > 0 ? `Next: ${upcomingMeetings[0]?.time}` : 'No meetings'} icon={CalendarCheck} />
        <StatCard label="Leave Balance" value={leaveBalance} sub="Days remaining · 2026" icon={Clock} />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        {/* Tasks */}
        <Card padded={false}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-1)' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>My tasks</h3>
            <Button variant="ghost" size="sm" icon={Plus} onClick={() => navigate('/tasks')}>New</Button>
          </div>
          {myTasks.slice(0, 5).length === 0
            ? <Empty icon={CheckCircle2} title="All done!" hint="No tasks assigned to you." />
            : myTasks.slice(0, 5).map(t => (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto auto', gap: 14, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-1)', cursor: 'pointer' }}
              onClick={() => navigate('/tasks')}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 18, height: 18, borderRadius: 5, border: t.status === 'Completed' ? 'none' : '1.5px solid var(--border-3)', background: t.status === 'Completed' ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t.status === 'Completed' && <Check size={12} color="#fff" strokeWidth={3} />}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: t.status === 'Completed' ? 'var(--fg-4)' : 'var(--fg-1)', textDecoration: t.status === 'Completed' ? 'line-through' : 'none' }}>{t.title}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{t.id}</div>
              </div>
              <Pill tone={priorityTone(t.priority)}>{t.priority}</Pill>
              <span style={{ fontSize: 12, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{t.dueDate}</span>
            </div>
          ))}
          <div style={{ padding: '10px 16px', textAlign: 'center' }}>
            <span onClick={() => navigate('/tasks')} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}>View all {myTasks.length} tasks →</span>
          </div>
        </Card>

        {/* Meetings */}
        <Card padded={false}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Upcoming meetings</h3>
            <Button variant="ghost" size="sm" icon={Plus} onClick={() => navigate('/meetings')}>Schedule</Button>
          </div>
          {upcomingMeetings.length === 0
            ? <Empty icon={Video} title="No meetings" hint="Schedule one in Meetings." />
            : upcomingMeetings.slice(0, 4).map((m, i) => (
            <div key={m.id} style={{ padding: '12px 16px', borderBottom: i < 3 ? '1px solid var(--border-1)' : 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--fg-2)' }}>{m.date} · {m.time}</span>
                <Pill tone="neutral">{m.duration}</Pill>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{m.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <AvatarStack users={(m.attendeeIds || []).map(id => users.find(u => u.id === id)).filter(Boolean)} size={22} />
                <a href={normalizeMeetLink(m.meetLink, m.id)} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                  <Video size={12} />Join Call
                </a>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Announcements + Team */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <Section title="Recent announcements" action={<Button variant="ghost" size="sm" iconRight={ChevronRight} onClick={() => navigate('/announcements')}>See all</Button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {announcements.slice(0, 3).map(a => {
              const author = users.find(u => u.id === a.authorId) || a.author;
              return (
                <Card key={a.id}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <Avatar name={author?.name || ''} size={36} src={author?.avatar} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{a.title}</span>
                        {a.pinned && <Pill tone="accent">Pinned</Pill>}
                        <span style={{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 'auto' }}>{timeAgo(a.createdAt)}</span>
                      </div>
                      <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {a.content || a.body}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Section>

        {/* Team */}
        <Section title="Team">
          <Card padded={false}>
            {teamMembers.map((u, i) => {
              const presence = getPresence(u);
              return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                borderBottom: i < teamMembers.length - 1 ? '1px solid var(--border-1)' : 'none', cursor: 'pointer' }}
                onClick={() => navigate(`/profile/${u.id}`)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Avatar name={u.name} size={34} src={u.avatar} status={presence.state} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{getStatusText(u)} · {presence.detail}</div>
                </div>
                <Pill tone={u.role === 'founder' ? 'accent' : u.role === 'intern' ? 'success' : 'neutral'}>
                  {u.role}
                </Pill>
              </div>
            );})}
          </Card>
        </Section>
      </div>
    </div>
  );
}

// ─── Founder Dashboard ────────────────────────────────────────────────────────
function FounderDashboard() {
  const { state, updateLeaveStatus } = useApp();
  const { currentUser, tasks, meetings, announcements, attendance, leaves, users } = state;
  const navigate = useNavigate();
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === today);
  const presentToday = todayAttendance.filter(a => ['Present', 'Remote'].includes(a.status)).length;
  const pendingLeaves = leaves.filter(l => l.status === 'Pending');
  const openTasks = tasks.filter(t => t.status !== 'Completed');
  const upcomingMeetings = meetings.filter(m => m.date >= today);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1400, margin: '0 auto' }} className="fade-in">
      {/* Greeting */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end' }}>
        <div>
          <Eyebrow>{todayStr()} · Founder View</Eyebrow>
          <h1 style={{ margin: '6px 0 0', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {greet(currentUser?.name || '')} <span className="text-gradient">Here's the overview.</span>
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--fg-3)', fontSize: 14 }}>
            "{quote.text}" — <span style={{ color: 'var(--fg-2)' }}>{quote.author}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon={Users} onClick={() => navigate('/admin')}>Manage Team</Button>
          <Button variant="gradient" icon={Plus} onClick={() => navigate('/announcements')}>Announce</Button>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        <StatCard hero gradientNum label="Team Present Today" value={`${presentToday} / ${users.length}`} sub={`${users.length - presentToday} away`} delta={presentToday > 3 ? '+Good' : ''} />
        <StatCard label="Open Tasks" value={openTasks.length} sub={`${tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length} high priority`} icon={ClipboardList} />
        <StatCard label="Pending Leaves" value={pendingLeaves.length} sub="Awaiting your approval" icon={AlertCircle} />
        <StatCard label="Meetings Today" value={upcomingMeetings.filter(m => m.date === today).length} sub={`${upcomingMeetings.length} total upcoming`} icon={CalendarCheck} />
        <StatCard label="Team Size" value={users.length} sub={`${users.filter(u => u.role === 'intern').length} interns`} icon={Users} />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* Team Attendance Today */}
        <Card padded={false}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-1)' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Team attendance — today</h3>
            <Button variant="ghost" size="sm" iconRight={ChevronRight} onClick={() => navigate('/attendance')}>Full view</Button>
          </div>
          {users.map((u, i) => {
            const rec = attendance.find(a => a.userId === u.id && a.date === today);
            const status = rec?.status || 'Not recorded';
            const tone = { 'Present': 'success', 'Remote': 'accent', 'On Leave': 'warning', 'Absent': 'danger', 'Not recorded': 'neutral' }[status] || 'neutral';
            return (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 80px', gap: 12, alignItems: 'center',
                padding: '10px 16px', borderBottom: i < users.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                <Avatar name={u.name} size={32} src={u.avatar} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{u.title}</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>
                  {rec ? `${rec.signIn} – ${rec.signOut || '…'}` : '—'}
                </span>
                <Pill tone={tone} dot>{status}</Pill>
              </div>
            );
          })}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pending Leave Approvals */}
          <Card padded={false}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Leave approvals</h3>
              <Pill tone={pendingLeaves.length > 0 ? 'warning' : 'success'} dot>{pendingLeaves.length} pending</Pill>
            </div>
            {pendingLeaves.length === 0
              ? <Empty icon={CheckCircle2} title="All clear!" hint="No pending approvals." />
              : pendingLeaves.slice(0, 4).map((l, i) => {
                const emp = users.find(u => u.id === l.userId);
                return (
                  <div key={l.id} style={{ padding: '12px 16px', borderBottom: i < pendingLeaves.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Avatar name={emp?.name || ''} size={28} src={emp?.avatar} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{emp?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{l.fromDate} → {l.toDate} · {l.days} day{l.days > 1 ? 's' : ''}</div>
                      </div>
                      <Pill tone="neutral">{l.type}</Pill>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button variant="success" size="sm" style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => updateLeaveStatus(l.id, 'Approved')}>
                        Approve
                      </Button>
                      <Button variant="danger" size="sm" style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => updateLeaveStatus(l.id, 'Rejected')}>
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
          </Card>

          {/* Quick actions */}
          <Card>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Quick actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Post announcement', path: '/announcements', color: 'var(--accent)' },
                { label: 'Create new task', path: '/tasks', color: 'var(--info)' },
                { label: 'Schedule meeting', path: '/meetings', color: '#16a371' },
                { label: 'Manage team & roles', path: '/admin', color: 'var(--warning)' },
              ].map(a => (
                <div key={a.label} onClick={() => navigate(a.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
                    background: 'var(--bg-1)', cursor: 'pointer', border: '1px solid var(--border-1)', fontSize: 13, fontWeight: 500 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-1)'}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                  {a.label}
                  <ChevronRight size={14} color="var(--fg-4)" style={{ marginLeft: 'auto' }} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Tasks overview */}
      <Section title="All tasks overview" action={<Button variant="ghost" size="sm" iconRight={ChevronRight} onClick={() => navigate('/tasks')}>Full board</Button>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {['Pending','In Progress','Review','Completed'].map(st => {
            const filtered = tasks.filter(t => t.status === st);
            const tones = { 'Pending': 'neutral', 'In Progress': 'info', 'Review': 'warning', 'Completed': 'success' };
            return (
              <Card key={st} padded={false}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Pill tone={tones[st]} dot>{st}</Pill>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)' }}>{filtered.length}</span>
                </div>
                {filtered.slice(0, 3).map(t => {
                  const assignee = users.find(u => u.id === t.assigneeId);
                  return (
                    <div key={t.id} style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={assignee?.name || ''} size={22} src={assignee?.avatar} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                    </div>
                  );
                })}
                {filtered.length > 3 && (
                  <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--fg-3)', fontWeight: 500 }}>+{filtered.length - 3} more</div>
                )}
              </Card>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
