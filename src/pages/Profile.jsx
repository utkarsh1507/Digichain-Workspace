import { useEffect, useState, useRef } from 'react';
import { Camera, Edit3, Save, X, Mail, Phone, Briefcase, Building2, Calendar, User, Key, Lock, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, Button, Input, Textarea, Select, Pill, Eyebrow, Divider, Avatar, fmtDate } from '../components/ui';
import { authApi } from '../api';
import { STATUS_PRESETS, getPresence, getStatusText } from '../utils/presence';
const DEPARTMENTS = ['Engineering', 'Operations', 'Marketing', 'Leadership', 'Design', 'Sales'];
const LEAVE_TYPES = [
  { id: 'Casual', label: 'Casual Leave', total: 12 },
  { id: 'Sick',   label: 'Sick Leave',   total: 8  },
  { id: 'Earned', label: 'Earned Leave', total: 18 },
  { id: 'WFH',    label: 'Work From Home', total: 20 },
];

export default function Profile() {
  const { state, updateUser, uploadAvatar, addToast } = useApp();
  const { currentUser, leaves, attendance, tasks } = state;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...currentUser });
  const [saving, setSaving] = useState(false);
  const photoRef = useRef();

  // Password change state
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  useEffect(() => {
    if (!editing && currentUser) {
      setForm({ ...currentUser });
    }
  }, [currentUser, editing]);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.next.length < 4) return setPwError('New password must be at least 4 characters.');
    if (pwForm.next !== pwForm.confirm) return setPwError('New passwords do not match.');
    setPwSaving(true);
    try {
      // Verify current password via login (throws if wrong)
      try {
        await authApi.login(currentUser.email, pwForm.current);
      } catch {
        setPwError('Current password is incorrect.');
        setPwSaving(false);
        return;
      }
      await updateUser(currentUser.id, { password: pwForm.next });
      setPwForm({ current: '', next: '', confirm: '' });
      setPwOpen(false);
      if (addToast) addToast({ type: 'success', title: 'Password updated', body: 'Your password was changed successfully.' });
      else alert('Password updated successfully.');
    } catch (err) {
      setPwError(err.message || 'Could not change password.');
    } finally {
      setPwSaving(false);
    }
  }

  if (!currentUser) return null;

  const myLeaves = leaves.filter(l => l.userId === currentUser.id && l.status === 'Approved');
  const myUsage = {};
  myLeaves.forEach(l => { myUsage[l.type] = (myUsage[l.type] || 0) + (l.days || 0); });

  const myTasks = tasks.filter(t => t.assigneeId === currentUser.id);
  const myAttendance = attendance.filter(a => a.userId === currentUser.id);
  const presentDays = myAttendance.filter(a => a.status === 'Present').length;

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try { await uploadAvatar(currentUser.id, file); } catch (err) { alert(err.message); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateUser(currentUser.id, form);
      setEditing(false);
    } catch (err) { alert(err.message); }
    setSaving(false);
  }

  function handleCancel() {
    setForm({ ...currentUser });
    setEditing(false);
  }

  const roleColors = { founder: 'accent', employee: 'info', intern: 'success' };
  const myPresence = getPresence(currentUser);

  return (
    <div style={{ display: 'flex', gap: 28, maxWidth: 1100, margin: '0 auto' }} className="fade-in">
      {/* Left column */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Profile card */}
        <Card style={{ padding: 24, textAlign: 'center' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 16px' }}>
            <Avatar name={currentUser.name} size={100} src={currentUser.avatar} status={myPresence.state} ring />
            <button onClick={() => photoRef.current?.click()}
              style={{ position: 'absolute', bottom: 2, right: 2, width: 30, height: 30, borderRadius: '50%',
                background: 'var(--brand-gradient)', border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Camera size={14} color="#fff" />
            </button>
            <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>

          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{currentUser.name}</h2>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 8 }}>{currentUser.title}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
            <Pill tone={roleColors[currentUser.role] || 'neutral'}>{currentUser.role}</Pill>
            <Pill tone="neutral">{currentUser.department}</Pill>
          </div>
          <Pill tone={myPresence.state === 'online' ? 'success' : myPresence.state === 'away' ? 'warning' : 'neutral'} dot>
            {getStatusText(currentUser)} · {myPresence.detail}
          </Pill>
          <Divider />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14, fontSize: 13 }}>
            {[
              { icon: Mail, label: currentUser.email },
              { icon: Phone, label: currentUser.phone || 'Not set' },
              { icon: Calendar, label: `Joined ${fmtDate(currentUser.joinDate)}` },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-2)' }}>
                <item.icon size={14} color="var(--fg-4)" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Stats */}
        <Card style={{ padding: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Your Stats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Tasks completed', value: myTasks.filter(t => t.status === 'Completed').length },
              { label: 'Tasks in progress', value: myTasks.filter(t => t.status === 'In Progress').length },
              { label: 'Days present', value: presentDays },
              { label: 'Remote days', value: myAttendance.filter(a => a.status === 'Remote').length },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{s.label}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Leave balance */}
        <Card style={{ padding: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Leave Balance</h3>
          {LEAVE_TYPES.map(lt => {
            const used = myUsage[lt.id] || 0;
            const remaining = lt.total === 999 ? '∞' : lt.total - used;
            const pct = lt.total < 999 ? Math.min(100, (used / lt.total) * 100) : 0;
            return (
              <div key={lt.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)' }}>{lt.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>{remaining}{lt.total < 999 ? ` / ${lt.total}` : ''}</span>
                </div>
                {lt.total < 999 && (
                  <div style={{ height: 4, background: 'var(--bg-2)', borderRadius: 999 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brand-gradient)', borderRadius: 999 }} />
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>

      {/* Right column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <Eyebrow>Profile</Eyebrow>
              <h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700 }}>Personal Information</h2>
            </div>
            {!editing
              ? <Button variant="secondary" icon={Edit3} onClick={() => setEditing(true)}>Edit Profile</Button>
              : <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="ghost" icon={X} onClick={handleCancel}>Cancel</Button>
                  <Button variant="primary" icon={Save} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
                </div>}
          </div>

          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Input label="Full Name" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} icon={User} />
                <Input label="Job Title" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} icon={Briefcase} />
                <Input label="Email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} icon={Mail} type="email" />
                <Input label="Phone" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} icon={Phone} />
                <Select label="Department" value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  options={DEPARTMENTS.map(d => ({ value: d, label: d }))} />
                <Input label="Join Date" value={form.joinDate || ''} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} type="date" icon={Calendar} />
                <Select label="Workspace Status" value={form.statusPreset || 'working'} onChange={e => setForm(f => ({ ...f, statusPreset: e.target.value }))}
                  options={STATUS_PRESETS.map(s => ({ value: s.value, label: s.label }))} />
                <Input label="Custom Status Message" value={form.statusMessage || ''} onChange={e => setForm(f => ({ ...f, statusMessage: e.target.value }))} disabled={(form.statusPreset || 'working') !== 'custom'} />
              </div>
              <Textarea label="Bio" value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell your team about yourself…" rows={3} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[
                { icon: User, label: 'Full Name', value: currentUser.name },
                { icon: Briefcase, label: 'Job Title', value: currentUser.title },
                { icon: Mail, label: 'Email', value: currentUser.email },
                { icon: Phone, label: 'Phone', value: currentUser.phone || 'Not set' },
                { icon: Building2, label: 'Department', value: currentUser.department },
                { icon: Calendar, label: 'Join Date', value: fmtDate(currentUser.joinDate) },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.icon size={16} color="var(--fg-3)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-1)' }}>{item.value}</div>
                  </div>
                </div>
              ))}
              {currentUser.bio && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Bio</div>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.65 }}>{currentUser.bio}</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Security / Password */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: pwOpen ? 18 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-tint)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={16} color="var(--accent)" />
              </div>
              <div>
                <Eyebrow>Security</Eyebrow>
                <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700 }}>Password</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
                  {pwOpen ? 'Update your password below.' : 'Change your account password regularly to stay secure.'}
                </p>
              </div>
            </div>
            {!pwOpen
              ? <Button variant="secondary" icon={Key} onClick={() => { setPwOpen(true); setPwError(''); }}>Change Password</Button>
              : <Button variant="ghost" icon={X} onClick={() => { setPwOpen(false); setPwError(''); setPwForm({ current: '', next: '', confirm: '' }); }}>Cancel</Button>}
          </div>

          {pwOpen && (
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'current', label: 'Current Password' },
                { key: 'next',    label: 'New Password' },
                { key: 'confirm', label: 'Confirm New Password' },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>{f.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
                    background: '#fff', border: '1px solid var(--border-1)', borderRadius: 10 }}>
                    <Lock size={15} color="var(--fg-3)" />
                    <input
                      type={showPw[f.key] ? 'text' : 'password'}
                      value={pwForm[f.key]}
                      onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                      required
                      style={{ flex: 1, padding: '10px 0', fontFamily: 'inherit', fontSize: 14, color: 'var(--fg-1)', background: 'transparent', border: 'none', outline: 'none' }}
                    />
                    <button type="button" onClick={() => setShowPw(s => ({ ...s, [f.key]: !s[f.key] }))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', display: 'flex', padding: 4 }}>
                      {showPw[f.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ))}
              {pwError && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--danger-tint)',
                  color: '#ad2236', fontSize: 12, fontWeight: 500 }}>
                  {pwError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button type="submit" variant="primary" icon={Save} disabled={pwSaving}>
                  {pwSaving ? 'Saving…' : 'Update Password'}
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Recent activity */}
        <Card style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myTasks.slice(0, 5).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                background: 'var(--bg-1)', borderRadius: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 8 }}>{t.id}</span>
                </div>
                <Pill tone={{ 'Pending': 'neutral', 'In Progress': 'info', 'Review': 'warning', 'Completed': 'success' }[t.status] || 'neutral'} dot>
                  {t.status}
                </Pill>
              </div>
            ))}
            {myTasks.length === 0 && <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>No recent activity.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
