import { useState } from 'react';
import { Plus, Send, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, Button, Pill, Eyebrow, Modal, Input, Select, Textarea, Avatar, leaveTone, fmtDate } from '../components/ui';
import { LEAVE_TYPE_CONFIG, getLeaveTotal } from '../constants/workspace.js';

export default function Leave() {
  const { state, applyLeave, updateLeaveStatus } = useApp();
  const { currentUser, leaves, users } = state;
  const isFounder = currentUser?.role === 'founder';
  const founder = users.find((u) => u.role === 'founder');
  const [tab, setTab] = useState(isFounder ? 'all' : 'mine');
  const [applyOpen, setApplyOpen] = useState(false);
  const [form, setForm] = useState({ type: 'Casual', fromDate: '', toDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const myLeaves = leaves.filter((leave) => leave.userId === currentUser?.id);
  const pendingLeaves = leaves.filter((leave) => leave.status === 'Pending');

  const myUsage = {};
  myLeaves.filter((leave) => leave.status === 'Approved').forEach((leave) => {
    myUsage[leave.type] = (myUsage[leave.type] || 0) + (leave.days || 0);
  });

  const exhaustedLeave = LEAVE_TYPE_CONFIG.find((item) => {
    const total = getLeaveTotal(currentUser, item.id);
    return total > 0 && (myUsage[item.id] || 0) >= total;
  });

  function calcDays(from, to) {
    if (!from || !to) return 0;
    const diff = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
    return Math.max(0, diff);
  }

  async function handleApply(e) {
    e.preventDefault();
    const days = calcDays(form.fromDate, form.toDate);
    if (!days) return;
    setSubmitting(true);
    try {
      await applyLeave({ ...form, days });
      setForm({ type: 'Casual', fromDate: '', toDate: '', reason: '' });
      setApplyOpen(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(id) {
    try {
      await updateLeaveStatus(id, 'Approved');
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleReject(id) {
    try {
      await updateLeaveStatus(id, 'Rejected');
    } catch (err) {
      alert(err.message);
    }
  }

  const tabs = isFounder
    ? [
        { id: 'all', label: 'All Requests' },
        { id: 'pending', label: `Pending (${pendingLeaves.length})` },
        { id: 'mine', label: 'My Leaves' },
      ]
    : [
        { id: 'mine', label: 'My History' },
        { id: 'apply', label: 'Apply' },
      ];

  const shown = tab === 'pending'
    ? pendingLeaves
    : tab === 'mine'
    ? myLeaves
    : tab === 'all'
    ? leaves
    : myLeaves;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200, margin: '0 auto' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <Eyebrow>Leave Management</Eyebrow>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.018em' }}>Leave</h1>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setApplyOpen(true)}>Apply for Leave</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {LEAVE_TYPE_CONFIG.map((item) => {
          const used = myUsage[item.id] || 0;
          const total = getLeaveTotal(currentUser, item.id);
          const remaining = Math.max(0, total - used);
          const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;

          return (
            <Card key={item.id}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 8 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4, background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                {remaining}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 8 }}>
                {used} used of {total}
              </div>
              <div style={{ height: 4, background: 'var(--bg-2)', borderRadius: 999 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brand-gradient)', borderRadius: 999, transition: 'width 0.5s' }} />
              </div>
            </Card>
          );
        })}
      </div>

      {exhaustedLeave && (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: '#fff5f5', color: '#ad2236', fontSize: 13, fontWeight: 600 }}>
          All {exhaustedLeave.label.toLowerCase()} used. Connect with admin to increase them.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {tabs.map((item) => (
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
            }}>
            {item.label}
          </button>
        ))}
      </div>

      <Card padded={false}>
        <div style={{ display: 'grid', gridTemplateColumns: isFounder ? '36px 1.2fr 1fr 1fr 0.6fr 1fr auto' : '1fr 1fr 0.6fr 1fr auto', gap: 14, padding: '10px 16px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
          {isFounder && <span></span>}
          {isFounder && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>Employee</span>}
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>Dates</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>Type</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>Days</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>Status</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>Action</span>
        </div>
        {shown.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>No leave records found.</div>
        )}
        {shown.map((leave, index) => {
          const employee = leave.user || users.find((user) => user.id === leave.userId);
          return (
            <div
              key={leave.id}
              style={{
                display: 'grid',
                gridTemplateColumns: isFounder ? '36px 1.2fr 1fr 1fr 0.6fr 1fr auto' : '1fr 1fr 0.6fr 1fr auto',
                gap: 14,
                alignItems: 'center',
                padding: '13px 16px',
                borderBottom: index < shown.length - 1 ? '1px solid var(--border-1)' : 'none',
              }}>
              {isFounder && <Avatar name={employee?.name || ''} size={30} src={employee?.avatar} />}
              {isFounder && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{employee?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{employee?.title}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{fmtDate(leave.fromDate)} to {fmtDate(leave.toDate)}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{leave.reason}</div>
              </div>
              <Pill tone="neutral">{LEAVE_TYPE_CONFIG.find((item) => item.id === leave.type)?.label || leave.type}</Pill>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{leave.days}d</span>
              <Pill tone={leaveTone(leave.status)} dot>{leave.status}</Pill>
              <div style={{ display: 'flex', gap: 6 }}>
                {leave.status === 'Pending' && isFounder && (
                  <>
                    <Button variant="success" size="sm" icon={CheckCircle} onClick={() => handleApprove(leave.id)}>Approve</Button>
                    <Button variant="danger" size="sm" icon={XCircle} onClick={() => handleReject(leave.id)}>Reject</Button>
                  </>
                )}
                {!isFounder && leave.status === 'Pending' && (
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>Awaiting approval</span>
                )}
                {leave.status !== 'Pending' && !isFounder && (
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>-</span>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for Leave">
        <form onSubmit={handleApply}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
            <Select
              label="Leave Type"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              options={LEAVE_TYPE_CONFIG.map((item) => ({ value: item.id, label: item.label }))}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="From Date" type="date" value={form.fromDate} onChange={(e) => setForm((prev) => ({ ...prev, fromDate: e.target.value }))} required />
              <Input label="To Date" type="date" value={form.toDate} onChange={(e) => setForm((prev) => ({ ...prev, toDate: e.target.value }))} required />
            </div>
            {form.fromDate && form.toDate && calcDays(form.fromDate, form.toDate) > 0 && (
              <div style={{ padding: '10px 14px', background: 'var(--accent-soft)', borderRadius: 10, fontSize: 13, color: 'var(--accent-press)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} />
                {calcDays(form.fromDate, form.toDate)} day{calcDays(form.fromDate, form.toDate) !== 1 ? 's' : ''}
              </div>
            )}
            <Textarea label="Reason" value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Brief reason for your leave..." required />
            <div style={{ padding: '12px 14px', background: 'var(--bg-1)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={founder?.name || ''} size={28} src={founder?.avatar} />
              <div style={{ fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>Approver: </span>
                <span style={{ color: 'var(--fg-2)' }}>{founder?.name}</span>
                <span style={{ color: 'var(--fg-3)' }}> - Avg response 4h</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-1)' }}>
            <Button variant="ghost" type="button" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" icon={Send} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
