import { useState } from 'react';
import { Plus, MoreHorizontal, Check, Trash2, Send, Tag, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  Card, Button, IconBtn, Pill, Eyebrow, Section, Modal, Input, Select, Textarea,
  Avatar, Divider, Empty, priorityTone, statusTone, fmtDate, timeAgo
} from '../components/ui';

const STATUSES = ['Pending', 'In Progress', 'Review', 'Completed', 'Blocked'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function Tasks() {
  const { state, createTask, updateTask, deleteTask, addTaskComment } = useApp();
  const { currentUser, tasks, users } = state;
  const isAdmin = ['founder', 'employee'].includes(currentUser?.role);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', assigneeId: currentUser?.id || '', status: 'Pending', tags: '' });

  const myTasks = currentUser?.role === 'intern'
    ? tasks.filter(t => t.assigneeId === currentUser.id)
    : tasks;

  const filtered = filter === 'All' ? myTasks : filter === 'Mine'
    ? myTasks.filter(t => t.assigneeId === currentUser?.id)
    : myTasks.filter(t => t.status === filter);

  const sel = selected ? tasks.find(t => t.id === selected) : null;

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createTask({ ...form, tags: form.tags.split(',').map(s => s.trim()).filter(Boolean) });
      setCreateOpen(false);
      setForm({ title: '', description: '', priority: 'Medium', dueDate: '', assigneeId: currentUser?.id || '', status: 'Pending', tags: '' });
    } catch (err) { alert(err.message); }
  }

  async function handleStatusChange(taskId, status) {
    try {
      await updateTask(taskId, { status });
    } catch (err) { alert(err.message); }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await addTaskComment(sel.id, comment);
      setComment('');
    } catch (err) { alert(err.message); }
  }

  const filterTabs = ['All', 'Mine', 'Pending', 'In Progress', 'Review', 'Completed'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 56px)', maxWidth: 1400, margin: '0 auto' }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Eyebrow>Tasks</Eyebrow>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.018em' }}>Task Board</h1>
        </div>
        {isAdmin && <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>New Task</Button>}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {filterTabs.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', borderRadius: 999, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filter === f ? 'var(--fg-1)' : 'var(--bg-2)',
              color: filter === f ? '#fff' : 'var(--fg-2)', border: 'none' }}>{f}</button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 380px' : '1fr', gap: 16, flex: 1, overflow: 'hidden' }}>
        {/* Task list */}
        <Card padded={false} style={{ overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 100px 110px 100px 28px', gap: 12,
            padding: '10px 16px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)', position: 'sticky', top: 0 }}>
            {['', 'Task', 'Status', 'Priority', 'Due', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>
          {filtered.length === 0
            ? <Empty icon={Check} title="No tasks" hint="All clear or try a different filter." />
            : filtered.map(t => {
              const isSel = sel?.id === t.id;
              const assignee = users.find(u => u.id === t.assigneeId);
              return (
                <div key={t.id} onClick={() => setSelected(isSel ? null : t.id)}
                  style={{ display: 'grid', gridTemplateColumns: '24px 1fr 100px 110px 100px 28px', gap: 12, alignItems: 'center',
                    padding: '12px 16px', borderBottom: '1px solid var(--border-1)', cursor: 'pointer',
                    background: isSel ? 'var(--accent-soft)' : 'transparent', transition: 'background 120ms' }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg-1)'; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5,
                    border: t.status === 'Completed' ? 'none' : '1.5px solid var(--border-3)',
                    background: t.status === 'Completed' ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); handleStatusChange(t.id, t.status === 'Completed' ? 'Pending' : 'Completed'); }}>
                    {t.status === 'Completed' && <Check size={11} color="#fff" strokeWidth={3} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: t.status === 'Completed' ? 'var(--fg-4)' : 'var(--fg-1)',
                      textDecoration: t.status === 'Completed' ? 'line-through' : 'none',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-4)',
                        background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 4 }}>
                        #{t.id.slice(-6).toUpperCase()}
                      </span>
                      {t.tags?.slice(0, 2).map(tag => <Pill key={tag} tone="neutral">{tag}</Pill>)}
                    </div>
                  </div>
                  <Pill tone={statusTone(t.status)} dot>{t.status}</Pill>
                  <Pill tone={priorityTone(t.priority)}>{t.priority}</Pill>
                  <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{t.dueDate}</span>
                  <Avatar name={assignee?.name || '?'} size={24} />
                </div>
              );
            })}
        </Card>

        {/* Detail panel */}
        {sel && (
          <Card padded={false} style={{ overflow: 'auto', animation: 'slideIn 180ms var(--ease-out)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>{sel.id}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {isAdmin && (
                  <IconBtn icon={Trash2} title="Delete" onClick={() => { deleteTask(sel.id); setSelected(null); }} />
                )}
              </div>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.014em' }}>{sel.title}</h2>
              {sel.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {sel.tags.map(tag => <Pill key={tag} tone="neutral" icon={Tag}>{tag}</Pill>)}
                </div>
              )}
              <Divider />
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 10, fontSize: 13 }}>
                <span style={{ color: 'var(--fg-3)' }}>Status</span>
                <Select value={sel.status} onChange={e => handleStatusChange(sel.id, e.target.value)}
                  options={STATUSES.map(s => ({ value: s, label: s }))} style={{ margin: 0 }} />
                <span style={{ color: 'var(--fg-3)' }}>Priority</span>
                <Select value={sel.priority} onChange={e => updateTask(sel.id, { priority: e.target.value })}
                  options={PRIORITIES.map(p => ({ value: p, label: p }))} style={{ margin: 0 }} />
                <span style={{ color: 'var(--fg-3)', paddingTop: 8 }}>Assignee</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6 }}>
                  <Avatar name={users.find(u => u.id === sel.assigneeId)?.name || '?'} size={24} />
                  <span>{users.find(u => u.id === sel.assigneeId)?.name}</span>
                </div>
                <span style={{ color: 'var(--fg-3)', paddingTop: 8 }}>Due Date</span>
                <span style={{ paddingTop: 6, fontWeight: 500 }}>{sel.dueDate}</span>
                <span style={{ color: 'var(--fg-3)', paddingTop: 8 }}>Reporter</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6 }}>
                  <Avatar name={users.find(u => u.id === sel.reporterId)?.name || '?'} size={24} />
                  <span>{users.find(u => u.id === sel.reporterId)?.name}</span>
                </div>
              </div>
              <Divider />
              <div>
                <Eyebrow>Description</Eyebrow>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6 }}>{sel.description || 'No description.'}</p>
              </div>
              <Divider />
              {/* Comments */}
              <div>
                <Eyebrow>Comments ({sel.comments?.length || 0})</Eyebrow>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  {(sel.comments || []).map(c => {
                    const u = users.find(u => u.id === c.userId);
                    return (
                      <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                        <Avatar name={u?.name || '?'} size={28} />
                        <div style={{ flex: 1, background: 'var(--bg-1)', borderRadius: 10, padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{u?.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{timeAgo(c.at)}</span>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>{c.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={handleComment} style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-start' }}>
                  <Avatar name={currentUser?.name || ''} size={28} />
                  <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                    <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment…"
                      style={{ flex: 1, padding: '8px 12px', fontFamily: 'inherit', fontSize: 13, color: 'var(--fg-1)',
                        background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10, outline: 'none' }} />
                    <Button type="submit" variant="primary" size="sm" icon={Send} disabled={!comment.trim()} />
                  </div>
                </form>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Task" width={560}>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Task title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="What needs to be done?" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Add more details…" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              options={PRIORITIES.map(p => ({ value: p, label: p }))} />
            <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              options={STATUSES.map(s => ({ value: s, label: s }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Assignee" value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
              options={users.map(u => ({ value: u.id, label: u.name }))} />
            <Input label="Due Date" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <Input label="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. Frontend, Bug, DeFi" />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
