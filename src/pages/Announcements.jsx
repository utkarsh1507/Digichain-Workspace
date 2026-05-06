import { useState } from 'react';
import { Plus, Pin, Trash2, Megaphone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, Button, IconBtn, Pill, Eyebrow, Modal, Input, Select, Textarea, Avatar, Empty, timeAgo } from '../components/ui';

const CATEGORIES = ['General', 'Important', 'HR', 'Team', 'Policy', 'Technical'];
const EMOJIS = ['👍','❤️','🔥','🚀','🎉','👏','✅','😮'];

export default function Announcements() {
  const { state, createAnnouncement, updateAnnouncement, deleteAnnouncement, reactToAnnouncement } = useApp();
  const { currentUser, announcements, users } = state;
  const canPost = ['founder', 'employee'].includes(currentUser?.role);
  const isFounder = currentUser?.role === 'founder';

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'General', pinned: false });
  const [filter, setFilter] = useState('All');

  const pinned = announcements.filter(a => a.pinned);
  const regular = announcements.filter(a => !a.pinned);
  const categories = ['All', ...new Set(announcements.map(a => a.category))];
  const filtered = filter === 'All' ? regular : regular.filter(a => a.category === filter);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createAnnouncement(form);
      setForm({ title: '', content: '', category: 'General', pinned: false });
      setCreateOpen(false);
    } catch (err) { alert(err.message); }
  }

  async function handleReact(id, emoji) {
    try { await reactToAnnouncement(id, emoji); } catch {}
  }
  async function handlePin(id, currentPinned) {
    try { await updateAnnouncement(id, { pinned: !currentPinned }); } catch {}
  }
  async function handleDelete(id) {
    try { await deleteAnnouncement(id); } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 900, margin: '0 auto' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <Eyebrow>Company</Eyebrow>
          <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.018em' }}>Announcements</h1>
        </div>
        {canPost && <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>Post Announcement</Button>}
      </div>

      {/* Pinned */}
      {pinned.length > 0 && (
        <div>
          <Eyebrow>Pinned</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
            {pinned.map(a => <AnnouncementCard key={a.id} a={a} users={users} currentUser={currentUser}
              onReact={handleReact} isFounder={isFounder} onPin={handlePin} onDelete={handleDelete} />)}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            style={{ padding: '6px 14px', borderRadius: 999, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: filter === cat ? 'var(--fg-1)' : 'var(--bg-2)',
              color: filter === cat ? '#fff' : 'var(--fg-2)' }}>{cat}</button>
        ))}
      </div>

      {/* Feed */}
      {filtered.length === 0
        ? <Empty icon={Megaphone} title="No announcements" hint="Nothing posted yet in this category." />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(a => <AnnouncementCard key={a.id} a={a} users={users} currentUser={currentUser}
            onReact={handleReact} isFounder={isFounder} onPin={handlePin} onDelete={handleDelete} />)}
        </div>}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Post Announcement" width={560}>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Announcement title…" />
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          <Textarea label="Message" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Write your announcement here…" rows={5} required />
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
            Pin this announcement to the top
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" icon={Megaphone}>Post</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function AnnouncementCard({ a, users, currentUser, onReact, isFounder, onPin, onDelete }) {
  const author = users.find(u => u.id === a.authorId) || a.author;
  const [expanded, setExpanded] = useState(false);
  const body = a.content || a.body || '';
  const isLong = body.length > 300;
  const displayBody = isLong && !expanded ? body.slice(0, 300) + '…' : body;

  const catColors = { 'Important': 'danger', 'HR': 'info', 'Team': 'success', 'Policy': 'warning', 'Technical': 'accent', 'General': 'neutral' };

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Avatar name={author?.name || ''} size={40} src={author?.avatar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{a.title}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>{author?.name}</span>
                <Pill tone="accent">{author?.role || 'member'}</Pill>
                <Pill tone={catColors[a.category] || 'neutral'}>{a.category}</Pill>
                {a.pinned && <Pill tone="accent" icon={Pin}>Pinned</Pill>}
                <span style={{ fontSize: 11, color: 'var(--fg-4)', marginLeft: 'auto' }}>{timeAgo(a.createdAt)}</span>
              </div>
            </div>
            {isFounder && (
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <IconBtn icon={Pin} title={a.pinned ? 'Unpin' : 'Pin'} active={a.pinned}
                  onClick={() => onPin(a.id, a.pinned)} />
                <IconBtn icon={Trash2} title="Delete"
                  onClick={() => onDelete(a.id)} />
              </div>
            )}
          </div>

          {/* Body */}
          <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {displayBody}
          </p>
          {isLong && (
            <button onClick={() => setExpanded(!expanded)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 600, padding: '4px 0', marginTop: 4 }}>
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}

          {/* Reactions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            {a.reactions?.filter(r => r.userIds.length > 0).map(r => (
              <button key={r.emoji} onClick={() => onReact(a.id, r.emoji)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 999, border: '1px solid var(--border-1)',
                  background: r.userIds.includes(currentUser?.id) ? 'var(--accent-tint)' : '#fff',
                  cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                  color: r.userIds.includes(currentUser?.id) ? 'var(--accent-press)' : 'var(--fg-2)',
                  fontWeight: r.userIds.includes(currentUser?.id) ? 600 : 400 }}>
                {r.emoji} <span style={{ fontSize: 12 }}>{r.userIds.length}</span>
              </button>
            ))}
            {/* Emoji picker */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: 4, padding: '4px 8px', borderRadius: 999,
                border: '1px solid var(--border-1)', background: '#fff' }}>
                {EMOJIS.slice(0, 6).map(emoji => (
                  <button key={emoji} onClick={() => onReact(a.id, emoji)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
