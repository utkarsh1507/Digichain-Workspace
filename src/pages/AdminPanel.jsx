import { useState } from 'react';
import { Plus, Trash2, Edit3, Save, X, Users, ShieldCheck, UserCheck, TrendingUp, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, StatCard, Button, IconBtn, Pill, Eyebrow, Section, Modal, Input, Select, Avatar, Divider, fmtDate } from '../components/ui';

const ROLES = ['founder', 'employee', 'intern'];
const DEPARTMENTS = ['Engineering', 'Operations', 'Marketing', 'Leadership', 'Design', 'Sales'];
const TITLES = ['Founder & CEO', 'Backend Developer', 'Frontend Developer', 'Blockchain Developer', 'Operations Manager', 'Product Manager', 'Designer', 'Marketing Manager', 'Dev Intern', 'Design Intern', 'Ops Intern'];

export default function AdminPanel() {
  const { state, createUser, updateUser, deleteUser, updateLeaveStatus } = useApp();
  const { currentUser, users, tasks, leaves, attendance } = state;

  if (currentUser?.role !== 'founder') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <ShieldCheck size={48} color="var(--fg-4)" />
        <h2 style={{ margin: 0, color: 'var(--fg-3)' }}>Access Restricted</h2>
        <p style={{ color: 'var(--fg-4)', fontSize: 14 }}>Only founders can access the admin panel.</p>
      </div>
    );
  }

  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', title: '', department: 'Engineering', role: 'employee', phone: '', joinDate: new Date().toISOString().split('T')[0], password: '1234' });

  const today = new Date().toISOString().split('T')[0];
  const presentToday = users.filter(u => attendance.find(a => a.userId === u.id && a.date === today && ['Present','Remote'].includes(a.status)));
  const pendingLeaves = leaves.filter(l => l.status === 'Pending');

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await createUser(form);
      setForm({ name: '', email: '', title: '', department: 'Engineering', role: 'employee', phone: '', joinDate: new Date().toISOString().split('T')[0], password: '1234' });
      setAddOpen(false);
    } catch (err) { alert(err.message); }
  }
  async function handleEditSave() {
    try {
      await updateUser(editUser.id, editUser);
      setEditUser(null);
    } catch (err) { alert(err.message); }
  }
  async function handleDelete(userId, name) {
    if (!confirm(`Remove ${name}?`)) return;
    try { await deleteUser(userId); } catch (err) { alert(err.message); }
  }

  const roleColors = { founder: 'accent', employee: 'info', intern: 'success' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1300, margin: '0 auto' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <Eyebrow>Admin</Eyebrow>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.018em' }}>Team & Admin</h1>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setAddOpen(true)}>Add Team Member</Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard hero gradientNum label="Total Team" value={users.length} sub={`${users.filter(u => u.role === 'intern').length} interns`} icon={Users} />
        <StatCard label="Present Today" value={presentToday.length} sub={`${users.length - presentToday.length} away`} icon={UserCheck} />
        <StatCard label="Pending Approvals" value={pendingLeaves.length} sub="Leave requests" icon={TrendingUp} />
        <StatCard label="Open Tasks" value={tasks.filter(t => t.status !== 'Completed').length} sub="Across all team" icon={ShieldCheck} />
      </div>

      {/* Team table */}
      <Card padded={false}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Team Members</h3>
          <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{users.length} members</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1.8fr 1.2fr 1fr 0.8fr 1fr auto', gap: 14,
          padding: '10px 20px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
          {['', 'Name', 'Role', 'Department', 'Status', 'Joined', 'Actions'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        {users.map((u, i) => {
          const isPresent = !!attendance.find(a => a.userId === u.id && a.date === today && ['Present','Remote'].includes(a.status));
          const userTasks = tasks.filter(t => t.assigneeId === u.id && t.status !== 'Completed').length;
          return (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '40px 1.8fr 1.2fr 1fr 0.8fr 1fr auto', gap: 14,
              alignItems: 'center', padding: '14px 20px', borderBottom: i < users.length - 1 ? '1px solid var(--border-1)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Avatar name={u.name} size={36} src={u.avatar} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{u.name}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 1 }}>{u.email}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 1 }}>{u.title}</div>
              </div>
              <div style={{ display: 'flex', flex: 'column', gap: 4 }}>
                <Pill tone={roleColors[u.role] || 'neutral'}>{u.role}</Pill>
                {u.id === currentUser.id && <span style={{ fontSize: 10, color: 'var(--fg-4)', marginLeft: 6 }}>(you)</span>}
              </div>
              <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{u.department}</span>
              <Pill tone={isPresent ? 'success' : 'neutral'} dot>{isPresent ? 'Present' : 'Away'}</Pill>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{fmtDate(u.joinDate)}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <IconBtn icon={Edit3} size={30} title="Edit" onClick={() => setEditUser({ ...u })} />
                {u.id !== currentUser.id && (
                  <IconBtn icon={Trash2} size={30} title="Remove" onClick={() => handleDelete(u.id, u.name)} />
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {/* Pending leaves for admin */}
      {pendingLeaves.length > 0 && (
        <Section title={`Pending Leave Requests (${pendingLeaves.length})`}>
          <Card padded={false}>
            {pendingLeaves.map((l, i) => {
              const emp = users.find(u => u.id === l.userId);
              return (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                  borderBottom: i < pendingLeaves.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                  <Avatar name={emp?.name || ''} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{emp?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{l.fromDate} → {l.toDate} · {l.days} day{l.days !== 1 ? 's' : ''} · {l.type}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>{l.reason}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="success" size="sm" onClick={() => updateLeaveStatus(l.id, 'Approved')}>Approve</Button>
                    <Button variant="danger" size="sm" onClick={() => updateLeaveStatus(l.id, 'Rejected')}>Reject</Button>
                  </div>
                </div>
              );
            })}
          </Card>
        </Section>
      )}

      {/* Add user modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Team Member" width={520}>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="John Doe" />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="john@digichainpi.com" />
            <Input label="Job Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Frontend Developer" />
            <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
            <Select label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              options={ROLES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))} />
            <Select label="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              options={DEPARTMENTS.map(d => ({ value: d, label: d }))} />
            <Input label="Join Date" type="date" value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} />
          </div>
          <div style={{ padding: '10px 14px', background: 'var(--info-tint)', borderRadius: 10, fontSize: 12, color: 'var(--info)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mail size={13} />Default password will be set to <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.08)', padding: '1px 5px', borderRadius: 4 }}>1234</code>. Share with the new member.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" icon={Plus}>Add Member</Button>
          </div>
        </form>
      </Modal>

      {/* Edit user modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit Team Member" width={520}>
        {editUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Full Name" value={editUser.name} onChange={e => setEditUser(u => ({ ...u, name: e.target.value }))} />
              <Input label="Job Title" value={editUser.title} onChange={e => setEditUser(u => ({ ...u, title: e.target.value }))} />
              <Input label="Email" value={editUser.email} onChange={e => setEditUser(u => ({ ...u, email: e.target.value }))} />
              <Input label="Phone" value={editUser.phone || ''} onChange={e => setEditUser(u => ({ ...u, phone: e.target.value }))} />
              <Select label="Role" value={editUser.role} onChange={e => setEditUser(u => ({ ...u, role: e.target.value }))}
                options={ROLES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))} />
              <Select label="Department" value={editUser.department} onChange={e => setEditUser(u => ({ ...u, department: e.target.value }))}
                options={DEPARTMENTS.map(d => ({ value: d, label: d }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button variant="primary" icon={Save} onClick={handleEditSave}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
