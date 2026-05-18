import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Edit3, Save, X, Mail, Phone, Briefcase, Building2, Calendar, User, Key, Lock, Eye, EyeOff, ShieldCheck, Crown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, Button, Input, Textarea, Select, Pill, Eyebrow, Divider, Avatar, fmtDate } from '../components/ui';
import { authApi, attendanceApi } from '../api';
import { STATUS_PRESETS, getPresence, getStatusText } from '../utils/presence';
import { LEAVE_TYPE_CONFIG, getLeaveTotal } from '../constants/workspace.js';

const DEPARTMENTS = ['Engineering', 'Operations', 'Marketing', 'Leadership', 'Design', 'Sales'];

export default function Profile() {
  const { state, updateUser, uploadAvatar, addToast } = useApp();
  const { currentUser, users, leaves, attendance, tasks } = state;
  const { id } = useParams();
  const profileUser = id ? users.find((u) => u.id === id) : currentUser;
  const isOwnProfile = profileUser?.id === currentUser?.id;
  const canEditProfile = !!profileUser && (isOwnProfile || currentUser?.role === 'founder');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...profileUser });
  const [saving, setSaving] = useState(false);
  const photoRef = useRef();

  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [attendanceStats, setAttendanceStats] = useState([]);

  useEffect(() => {
    if (!editing && profileUser) {
      setForm({ ...profileUser });
    }
  }, [profileUser, editing]);

  useEffect(() => {
    setEditing(false);
  }, [profileUser?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!profileUser?.id) {
      setAttendanceStats([]);
      return undefined;
    }

    attendanceApi.userHistory(profileUser.id, { days: 30 })
      .then((records) => {
        if (!cancelled) setAttendanceStats(records);
      })
      .catch(() => {
        if (!cancelled) setAttendanceStats([]);
      });

    return () => {
      cancelled = true;
    };
  }, [profileUser?.id]);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.next.length < 4) return setPwError('New password must be at least 4 characters.');
    if (pwForm.next !== pwForm.confirm) return setPwError('New passwords do not match.');
    setPwSaving(true);
    try {
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
  if (!profileUser) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 32 }}>
        <Card style={{ padding: 28, textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Profile not found</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--fg-3)', fontSize: 14 }}>This teammate may no longer be in the workspace.</p>
        </Card>
      </div>
    );
  }

  const myLeaves = leaves.filter((leave) => leave.userId === profileUser.id && leave.status === 'Approved');
  const myUsage = {};
  myLeaves.forEach((leave) => {
    myUsage[leave.type] = (myUsage[leave.type] || 0) + (leave.days || 0);
  });

  const myTasks = tasks.filter((task) => task.assigneeId === profileUser.id);
  const myAttendance = attendanceStats.length ? attendanceStats : attendance.filter((record) => record.userId === profileUser.id);
  const presentDays = myAttendance.filter((record) => record.status === 'Present').length;

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file || !canEditProfile) return;
    try {
      await uploadAvatar(profileUser.id, file);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSave() {
    if (!canEditProfile) return;
    setSaving(true);
    try {
      await updateUser(profileUser.id, form);
      setEditing(false);
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  }

  function handleCancel() {
    setForm({ ...profileUser });
    setEditing(false);
  }

  const roleColors = { founder: 'accent', employee: 'info', intern: 'success' };
  const myPresence = getPresence(profileUser);
  const profileFirstName = profileUser.name?.split(' ')[0] || 'This teammate';
  const isFounderProfile = profileUser.role === 'founder';

  return (
    <div style={{ display: 'flex', gap: 28, maxWidth: 1100, margin: '0 auto' }} className="fade-in">
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card style={{ padding: 24, textAlign: 'center', background: isFounderProfile ? 'linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%)' : undefined, border: isFounderProfile ? '1px solid rgba(51,65,85,0.14)' : undefined, boxShadow: isFounderProfile ? '0 18px 40px rgba(15,23,42,0.08)' : undefined }}>
          <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 16px' }}>
            <Avatar name={profileUser.name} size={100} src={profileUser.avatar} status={myPresence.state} ring founder={isFounderProfile} />
            {canEditProfile && (
              <button
                onClick={() => photoRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--brand-gradient)',
                  border: '2px solid #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                <Camera size={14} color="#fff" />
              </button>
            )}
            <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>

          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{profileUser.name}</h2>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 8 }}>{profileUser.title}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
            <Pill tone={roleColors[profileUser.role] || 'neutral'}>{profileUser.role}</Pill>
            <Pill tone="neutral">{profileUser.department}</Pill>
            {isFounderProfile && <Pill tone="info" icon={ShieldCheck}>Workspace Admin</Pill>}
          </div>
          {isFounderProfile && (
            <div style={{
              marginBottom: 16,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(15,23,42,0.05) 0%, rgba(51,65,85,0.08) 100%)',
              border: '1px solid rgba(51,65,85,0.10)',
              color: '#334155',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              <Crown size={14} />
              Founder access includes workspace oversight and elevated permissions
            </div>
          )}
          <Pill tone={myPresence.state === 'online' ? 'success' : myPresence.state === 'away' ? 'warning' : 'neutral'} dot>
            {getStatusText(profileUser)} - {myPresence.detail}
          </Pill>
          <Divider />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14, fontSize: 13 }}>
            {[
              { icon: Mail, label: profileUser.email },
              { icon: Phone, label: profileUser.phone || 'Not set' },
              { icon: Calendar, label: `Joined ${fmtDate(profileUser.joinDate)}` },
            ].map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-2)' }}>
                <item.icon size={14} color="var(--fg-4)" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>{isOwnProfile ? 'Your Stats' : `${profileFirstName}'s Stats`}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Tasks completed', value: myTasks.filter((task) => task.status === 'Completed').length },
              { label: 'Tasks in progress', value: myTasks.filter((task) => task.status === 'In Progress').length },
              { label: 'Days present', value: presentDays },
              { label: 'Remote days', value: myAttendance.filter((record) => record.status === 'Remote').length },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{item.label}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>{isOwnProfile ? 'Leave Balance' : 'Leave Usage'}</h3>
          {LEAVE_TYPE_CONFIG.map((item) => {
            const used = myUsage[item.id] || 0;
            const total = getLeaveTotal(profileUser, item.id);
            const remaining = Math.max(0, total - used);
            const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
            return (
              <div key={item.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)' }}>{item.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>{remaining} / {total}</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-2)', borderRadius: 999 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brand-gradient)', borderRadius: 999 }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <Eyebrow>Profile</Eyebrow>
              <h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700 }}>Personal Information</h2>
            </div>
            {!editing
              ? canEditProfile && <Button variant="secondary" icon={Edit3} onClick={() => setEditing(true)}>Edit Profile</Button>
              : <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="ghost" icon={X} onClick={handleCancel}>Cancel</Button>
                  <Button variant="primary" icon={Save} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                </div>}
          </div>

          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Input label="Full Name" value={form.name || ''} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} icon={User} />
                <Input label="Job Title" value={form.title || ''} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} icon={Briefcase} />
                <Input label="Email" value={form.email || ''} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} icon={Mail} type="email" />
                <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} icon={Phone} />
                <Select label="Department" value={form.department || ''} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} options={DEPARTMENTS.map((d) => ({ value: d, label: d }))} />
                <Input label="Join Date" value={form.joinDate || ''} onChange={(e) => setForm((prev) => ({ ...prev, joinDate: e.target.value }))} type="date" icon={Calendar} />
                <Select label="Workspace Status" value={form.statusPreset || 'working'} onChange={(e) => setForm((prev) => ({ ...prev, statusPreset: e.target.value }))} options={STATUS_PRESETS.map((s) => ({ value: s.value, label: `${s.emoji} ${s.label}` }))} />
                <Input label="Custom Status Message" value={form.statusMessage || ''} onChange={(e) => setForm((prev) => ({ ...prev, statusMessage: e.target.value }))} disabled={(form.statusPreset || 'working') !== 'custom'} />
              </div>
              <Textarea label="Bio" value={form.bio || ''} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} placeholder="Tell your team about yourself..." rows={3} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[
                { icon: User, label: 'Full Name', value: profileUser.name },
                { icon: Briefcase, label: 'Job Title', value: profileUser.title },
                { icon: Mail, label: 'Email', value: profileUser.email },
                { icon: Phone, label: 'Phone', value: profileUser.phone || 'Not set' },
                { icon: Building2, label: 'Department', value: profileUser.department },
                { icon: Calendar, label: 'Join Date', value: fmtDate(profileUser.joinDate) },
              ].map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.icon size={16} color="var(--fg-3)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-1)' }}>{item.value}</div>
                  </div>
                </div>
              ))}
              {profileUser.bio && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Bio</div>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.65 }}>{profileUser.bio}</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {isOwnProfile && (
          <Card style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: pwOpen ? 18 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                  { key: 'next', label: 'New Password' },
                  { key: 'confirm', label: 'Confirm New Password' },
                ].map((field) => (
                  <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>{field.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: '#fff', border: '1px solid var(--border-1)', borderRadius: 10 }}>
                      <Lock size={15} color="var(--fg-3)" />
                      <input
                        type={showPw[field.key] ? 'text' : 'password'}
                        value={pwForm[field.key]}
                        onChange={(e) => setPwForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        required
                        style={{ flex: 1, padding: '10px 0', fontFamily: 'inherit', fontSize: 14, color: 'var(--fg-1)', background: 'transparent', border: 'none', outline: 'none' }}
                      />
                      <button type="button" onClick={() => setShowPw((prev) => ({ ...prev, [field.key]: !prev[field.key] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', display: 'flex', padding: 4 }}>
                        {showPw[field.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ))}
                {pwError && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--danger-tint)', color: '#ad2236', fontSize: 12, fontWeight: 500 }}>
                    {pwError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Button type="submit" variant="primary" icon={Save} disabled={pwSaving}>
                    {pwSaving ? 'Saving...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}

        <Card style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myTasks.slice(0, 5).map((task) => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--bg-1)', borderRadius: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{task.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 8 }}>{task.id}</span>
                </div>
                <Pill tone={{ Pending: 'neutral', 'In Progress': 'info', Review: 'warning', Completed: 'success' }[task.status] || 'neutral'} dot>
                  {task.status}
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
