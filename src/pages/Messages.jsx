import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Plus, Send, Paperclip, Video, Search, Users, X, File, Image, CheckCheck, ExternalLink, Smile, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Avatar, IconBtn, Button, Empty, Modal, Input, fmtTime } from '../components/ui';
import { messagesApi } from '../api/index.js';
import { extractMeetLink, normalizeMeetLink, stripMeetLinkFromText } from '../utils/meet';
import { ensureGoogleConnected, createGoogleMeet } from '../utils/googleMeet';
import { getPresence, getStatusText, getUserSubtitle } from '../utils/presence';
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const EMOJIS = ['👍', '❤️', '🔥', '🚀', '✅', '😂', '😮', '👏'];

export default function Messages() {
  const {
    state, loadMessages, sendMessage, sendFile, reactToMessage, deleteMessage,
    ensureDm, createChannel, deleteChannel, markChannelRead, addToast, setActiveChannel,
  } = useApp();
  const { currentUser, channels, channelMessages, channelSeenBy, users, typingByChannel } = state;
  const navigate = useNavigate();

  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [channelForm, setChannelForm] = useState({ name: '', description: '', memberIds: [] });
  const [attachedFile, setAttachedFile] = useState(null);
  const [startingMeet, setStartingMeet] = useState(false);
  const [pickerForMsgId, setPickerForMsgId] = useState(null);
  const [deletingChannel, setDeletingChannel] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [, forceTick] = useState(0);                  // refresh typing labels every 1s
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const markReadLastRef = useRef({}); // channelId → last fired ms

  // Separate channels and DMs
  const myChannels = channels.filter(c => c.type === 'channel');
  const myDMs = channels.filter(c => c.type === 'dm');
  const conversations = [...myChannels, ...myDMs];

  const active = channels.find(c => c.id === activeId);
  const activeMsgs = channelMessages[activeId] || [];
  const activeSeenBy = channelSeenBy[activeId] || {};
  const now = Date.now();
  const activeOtherUser = getDMOtherUser(active);
  const activePresence = getPresence(activeOtherUser, now);
  const canDeleteActive = !!active && (
    active.type === 'dm'
      ? (active.memberIds || []).includes(currentUser?.id)
      : active.createdById === currentUser?.id || currentUser?.role === 'founder'
  );

  // Compute typing names from SSE-driven state, only those updated within last 4s
  const typing = Object.entries(typingByChannel?.[activeId] || {})
    .filter(([uid, data]) => uid !== currentUser?.id && (now - data.timestamp) < 4000)
    .map(([, data]) => data.name);

  // Keep the active conversation valid as the list changes
  useEffect(() => {
    if (!conversations.length) {
      if (activeId) setActiveId(null);
      return;
    }
    if (!activeId || !conversations.some((conv) => conv.id === activeId)) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  // Tell AppContext which channel is currently open (so it can suppress
  // toast/sound for messages we're already looking at) + clean up on unmount
  useEffect(() => {
    setActiveChannel(activeId);
    return () => setActiveChannel(null);
  }, [activeId, setActiveChannel]);

  // Throttled markChannelRead — fires immediately on channel switch,
  // then at most once every 10 s for incoming messages (avoids a DB write per message).
  const throttledMarkRead = useCallback((channelId) => {
    const now = Date.now();
    const last = markReadLastRef.current[channelId] ?? 0;
    if (now - last < 30_000) return;
    markReadLastRef.current[channelId] = now;
    markChannelRead(channelId);
  }, [markChannelRead]);

  // Load messages + mark as read when switching channels
  useEffect(() => {
    if (!activeId) return;
    if (!channelMessages[activeId]) {
      loadMessages(activeId).catch(() => {});
    }
    // Force-fire immediately on switch, bypassing the throttle
    markReadLastRef.current[activeId] = Date.now();
    markChannelRead(activeId);
  }, [activeId]); // eslint-disable-line

  // Re-mark as read whenever a new message arrives in the active channel
  // (keeps unread count accurate and pushes seen-receipts to the sender)
  useEffect(() => {
    if (!activeId || !activeMsgs.length) return;
    const last = activeMsgs[activeMsgs.length - 1];
    const senderId = last.senderId || last.sender?.id;
    if (senderId !== currentUser?.id) {
      throttledMarkRead(activeId);
    }
  }, [activeMsgs.length, activeId]); // eslint-disable-line

  // Tick every 1s so the typing indicator fades out after 4s of no events
  useEffect(() => {
    const id = setInterval(() => forceTick(x => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Close reaction picker on outside click
  useEffect(() => {
    if (!pickerForMsgId) return;
    function onDocClick() { setPickerForMsgId(null); }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [pickerForMsgId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMsgs.length, typing.length]);

  // Notify typing — debounced
  const notifyTyping = useCallback(() => {
    if (!activeId || !currentUser) return;
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      messagesApi.setTyping(activeId, currentUser.name.split(' ')[0]).catch(() => {});
    }, 350);
  }, [activeId, currentUser]);

  function getConvName(conv) {
    if (!conv) return '';
    if (conv.type !== 'dm') return conv.name;
    const memberIds = Array.isArray(conv.memberIds) ? conv.memberIds : JSON.parse(conv.memberIds || '[]');
    const otherId = memberIds.find(id => id !== currentUser?.id);
    return users.find(u => u.id === otherId)?.name || 'Unknown';
  }

  function getDMOtherUser(conv) {
    if (!conv || conv.type !== 'dm') return null;
    const memberIds = Array.isArray(conv.memberIds) ? conv.memberIds : JSON.parse(conv.memberIds || '[]');
    const otherId = memberIds.find(id => id !== currentUser?.id);
    return users.find(u => u.id === otherId) || null;
  }

  function getConvAvatar(conv) {
    return getDMOtherUser(conv)?.avatar || null;
  }

  function getLastMsg(convId) {
    const msgs = channelMessages[convId] || [];
    if (!msgs.length) return 'No messages yet';
    const last = msgs[msgs.length - 1];
    if (last.attachmentUrl && !last.text) return `📎 ${last.attachmentName || 'Attachment'}`;
    const senderId = last.senderId || last.sender?.id;
    const isMe = senderId === currentUser?.id;
    const sender = users.find(u => u.id === senderId);
    const senderName = isMe ? 'You' : sender?.name?.split(' ')[0];
    return `${senderName}: ${last.text || '…'}`;
  }

  async function handleSwitchChannel(id) {
    setActiveId(id);
    setAttachedFile(null);
    setDraft('');
    if (!channelMessages[id]) {
      await loadMessages(id).catch(() => {});
    }
    markChannelRead(id);
  }

  async function handleSend(e) {
    e.preventDefault();
    if ((!draft.trim() && !attachedFile) || sending) return;
    setSending(true);
    try {
      if (attachedFile) {
        await sendFile(activeId, attachedFile, draft.trim() || undefined);
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        await sendMessage(activeId, draft.trim());
      }
      setDraft('');
      // Mark as read (own message = you've read through here)
      markChannelRead(activeId);
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDMUser(userId) {
    try {
      const channel = await ensureDm(userId);
      setActiveId(channel.id);
      if (!channelMessages[channel.id]) {
        await loadMessages(channel.id).catch(() => {});
      }
      markChannelRead(channel.id);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleReact(msgId, emoji) {
    try { await reactToMessage(activeId, msgId, emoji); } catch {}
  }

  async function handleDeleteMessage(messageId) {
    if (!window.confirm('Delete this message for everyone?')) return;
    setDeletingMessageId(messageId);
    try {
      await deleteMessage(activeId, messageId);
      setPickerForMsgId((prev) => (prev === messageId ? null : prev));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingMessageId(null);
    }
  }

  async function handleDeleteChannel() {
    if (!active) return;
    const label = active.type === 'dm' ? 'this chat' : `channel ${getConvName(active)}`;
    if (!window.confirm(`Delete ${label}? This will remove it for all members.`)) return;
    setDeletingChannel(true);
    try {
      await deleteChannel(active.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingChannel(false);
    }
  }

  async function handleStartInstantMeet() {
    if (active?.type !== 'dm' || startingMeet) return;

    const otherUser = getDMOtherUser(active);
    const inviterName = currentUser?.name?.split(' ')[0] || 'Someone';

    setStartingMeet(true);
    try {
      const token = localStorage.getItem('dw_token');
      await ensureGoogleConnected(currentUser.id);
      const { meetLink } = await createGoogleMeet({
        userId: currentUser.id,
        title: `${inviterName} ↔ ${otherUser?.name?.split(' ')[0] || 'Call'}`,
        description: 'Instant video call via Digichain Workspace',
        token,
      });

      const inviteText = `${inviterName} started an instant video call.\nJoin here: ${meetLink}`;
      await sendMessage(active.id, inviteText);
      markChannelRead(active.id);
      addToast({
        type: 'success',
        title: 'Instant Meet ready',
        body: `Link sent to ${otherUser?.name?.split(' ')[0] || 'your teammate'}.`,
        path: '/messages',
      });
      window.open(meetLink, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (err.notConfigured) {
        addToast({ type: 'error', title: 'Google Meet not configured', body: 'Ask your admin to add Google API credentials to the server.' });
      } else if (err.message !== 'Google sign-in was cancelled.') {
        addToast({ type: 'error', title: 'Could not start meet', body: err.message });
      }
    } finally {
      setStartingMeet(false);
    }
  }

  async function handleCreateChannel(e) {
    e.preventDefault();
    try {
      const memberIds = channelForm.memberIds.includes(currentUser.id)
        ? channelForm.memberIds
        : [...channelForm.memberIds, currentUser.id];
      const ch = await createChannel({
        name: `#${channelForm.name.replace(/^#+/, '')}`,
        description: channelForm.description,
        memberIds,
        type: 'channel',
      });
      setNewChannelOpen(false);
      setChannelForm({ name: '', description: '', memberIds: [] });
      setActiveId(ch.id);
    } catch (err) { alert(err.message); }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) setAttachedFile(file);
  }

  const getSenderId = (m) => m.senderId || m.sender?.id;
  const getSenderName = (m) => {
    const sender = m.sender || users.find(u => u.id === m.senderId);
    return sender?.name || 'Unknown';
  };

  // Determine "seen" status for current user's messages
  // A message is "seen" if any other member's lastReadAt > message.timestamp
  function getSeenInfo(msg) {
    const senderId = getSenderId(msg);
    if (senderId !== currentUser?.id) return null; // only show for my messages
    const msgTime = new Date(msg.timestamp).getTime();
    const seenByOthers = Object.entries(activeSeenBy)
      .filter(([uid]) => uid !== currentUser?.id)
      .filter(([, ts]) => new Date(ts).getTime() > msgTime);
    return seenByOthers.length > 0 ? seenByOthers.length : null;
  }

  // For each message, is it the LAST one from me that has been seen?
  const lastSeenMsgId = (() => {
    for (let i = activeMsgs.length - 1; i >= 0; i--) {
      const m = activeMsgs[i];
      if (getSenderId(m) === currentUser?.id && getSeenInfo(m)) return m.id;
    }
    return null;
  })();

  function renderTextWithLinks(text, linkColor) {
    return text.split(URL_REGEX).map((part, index) => (
      /^https?:\/\//.test(part)
        ? (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            style={{ color: linkColor, textDecoration: 'underline', fontWeight: 600, wordBreak: 'break-word' }}>
            {part}
          </a>
        )
        : <span key={`${part}-${index}`}>{part}</span>
    ));
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px 1fr',
      height: 'calc(100vh - 112px)',
      border: '1px solid var(--border-1)',
      borderRadius: 16,
      overflow: 'hidden',
      background: '#fff',
      maxWidth: 1400,
      margin: '0 auto',
    }} className="fade-in">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-1)', background: 'var(--bg-1)', overflow: 'hidden' }}>
        {/* Search */}
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border-1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
            background: 'var(--bg-2)', borderRadius: 8 }}>
            <Search size={13} color="var(--fg-3)" />
            <input placeholder="Search conversations…" style={{ flex: 1, border: 'none', background: 'transparent',
              outline: 'none', fontFamily: 'inherit', fontSize: 12, color: 'var(--fg-1)' }} />
          </div>
        </div>

        {/* Lists */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {/* Channels */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 6px 4px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--fg-4)' }}>Channels</span>
            <button onClick={() => setNewChannelOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', display: 'flex', padding: 2, borderRadius: 4 }}>
              <Plus size={13} />
            </button>
          </div>
          {myChannels.map(c => (
            <ConvItem key={c.id} conv={c} active={c.id === activeId}
              name={getConvName(c)} last={getLastMsg(c.id)}
              unread={state.unreadCounts?.[c.id] || 0}
              onClick={() => handleSwitchChannel(c.id)} />
          ))}

          {/* DMs */}
          <div style={{ padding: '12px 6px 4px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--fg-4)' }}>Direct Messages</span>
          </div>
          {myDMs.map(d => (
            <ConvItem key={d.id} conv={d} active={d.id === activeId}
              name={getConvName(d)} last={getLastMsg(d.id)}
              avatar={getConvAvatar(d)}
              user={getDMOtherUser(d)}
              unread={state.unreadCounts?.[d.id] || 0}
              onClick={() => handleSwitchChannel(d.id)} />
          ))}

          {/* New DM */}
          <div style={{ padding: '12px 6px 4px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--fg-4)' }}>New DM</span>
          </div>
          {users.filter(u => u.id !== currentUser?.id).map(u => (
            <div key={u.id} onClick={() => handleDMUser(u.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Avatar name={u.name} size={24} src={u.avatar} status={getPresence(u, now).state} />
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)' }}>{u.name.split(' ')[0]}</span>
              <span style={{ fontSize: 11, color: 'var(--fg-4)', marginLeft: 'auto' }}>{getUserSubtitle(u, now)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Thread ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', overflow: 'hidden' }}>
        {active ? (
          <>
            {/* Header */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexShrink: 0, background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {active.type === 'dm'
                  ? <button
                      onClick={() => activeOtherUser && navigate(`/profile/${activeOtherUser.id}`)}
                      title="View profile"
                      style={{ border: 'none', background: 'transparent', padding: 0, cursor: activeOtherUser ? 'pointer' : 'default', display: 'inline-flex' }}>
                      <Avatar name={getConvName(active)} size={32} src={activeOtherUser?.avatar} status={activePresence.state} />
                    </button>
                  : <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-tint)', display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700 }}>
                      <Hash size={15} />
                    </span>}
                <div>
                  <div
                    onClick={() => active.type === 'dm' && activeOtherUser && navigate(`/profile/${activeOtherUser.id}`)}
                    style={{ fontSize: 15, fontWeight: 600, cursor: active.type === 'dm' && activeOtherUser ? 'pointer' : 'default' }}>
                    {getConvName(active)}
                  </div>
                  {active.type === 'channel' && (
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                      {(active.memberIds || []).length} members{active.description ? ` · ${active.description}` : ''}
                    </div>
                  )}
                  {active.type === 'dm' && (
                    <div style={{ fontSize: 11, color: activePresence.state === 'online' ? '#16a371' : activePresence.state === 'away' ? '#d97706' : 'var(--fg-3)' }}>
                      {getStatusText(activeOtherUser)} · {activePresence.detail}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {active.type === 'dm' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Video}
                    onClick={handleStartInstantMeet}
                    disabled={startingMeet}>
                    {startingMeet ? 'Starting...' : 'Instant Meet'}
                  </Button>
                )}
                {active.type === 'channel' && <IconBtn icon={Users} title="Members" />}
                {canDeleteActive && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={handleDeleteChannel}
                    disabled={deletingChannel}>
                    {deletingChannel ? 'Deleting...' : active.type === 'dm' ? 'Delete Chat' : 'Delete Channel'}
                  </Button>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {activeMsgs.length === 0
                ? <Empty icon={Hash} title="No messages yet" hint="Be the first to say something!" />
                : activeMsgs.map((m, i) => {
                  const prev = i > 0 ? activeMsgs[i - 1] : null;
                  const senderId = getSenderId(m);
                  const isMe = senderId === currentUser?.id;
                  const senderName = getSenderName(m);
                  const grouped = prev && getSenderId(prev) === senderId;
                  const isLastSeenMsg = m.id === lastSeenMsgId;
                  const rawMeetLink = extractMeetLink(m.text || '');
                  const meetLink = rawMeetLink ? normalizeMeetLink(rawMeetLink, `instant-${active.id}-${m.id}`) : null;
                  const inviteText = meetLink ? stripMeetLinkFromText(m.text || '') : m.text;

                  const pickerOpen = pickerForMsgId === m.id;
                  const canDeleteMessage = senderId === currentUser?.id || currentUser?.role === 'founder';
                  const isDeletingMessage = deletingMessageId === m.id;

                  return (
                    <div key={m.id} className="message-row" style={{ display: 'flex', flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start', marginTop: grouped ? 2 : 12, position: 'relative' }}>
                      <div style={{ display: 'flex', gap: 10, justifyContent: isMe ? 'flex-end' : 'flex-start',
                        position: 'relative', width: '100%' }}>
                        {!isMe && (
                          <div style={{ width: 32, flexShrink: 0, display: 'flex', alignItems: 'flex-end' }}>
                            {!grouped && <Avatar name={senderName} size={32} src={m.sender?.avatar} status={getPresence(m.sender || users.find(u => u.id === senderId), now).state} />}
                          </div>
                        )}
                        <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2, position: 'relative' }}>
                          <div
                            className={`message-actions${pickerOpen ? ' is-open' : ''}`}
                            style={{
                              position: 'absolute',
                              top: grouped || isMe ? 0 : 20,
                              [isMe ? 'right' : 'left']: '100%',
                              marginRight: isMe ? 6 : 0,
                              marginLeft: isMe ? 0 : 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: 3,
                              borderRadius: 999,
                              background: '#fff',
                              border: '1px solid var(--border-1)',
                              boxShadow: 'var(--shadow-xs)',
                              zIndex: 10,
                            }}>
                            <button
                              className="message-action-btn"
                              onClick={(e) => { e.stopPropagation(); setPickerForMsgId(pickerOpen ? null : m.id); }}
                              style={{
                                width: 26, height: 26, borderRadius: '50%',
                                background: pickerOpen ? 'var(--accent-tint)' : 'transparent',
                                border: 'none',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: pickerOpen ? 'var(--accent)' : 'var(--fg-3)',
                              }}
                              title="Add reaction"
                              aria-label="Add reaction">
                              <Smile size={14} />
                            </button>
                            {canDeleteMessage && (
                              <button
                                className="message-action-btn"
                                onClick={() => handleDeleteMessage(m.id)}
                                disabled={isDeletingMessage}
                                style={{
                                  width: 26, height: 26, borderRadius: '50%',
                                  background: 'transparent',
                                  border: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: isDeletingMessage ? 'not-allowed' : 'pointer',
                                  color: '#ad2236',
                                  opacity: isDeletingMessage ? 0.55 : 1,
                                }}
                                title={isDeletingMessage ? 'Deleting message' : 'Delete message'}
                                aria-label={isDeletingMessage ? 'Deleting message' : 'Delete message'}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          {!grouped && !isMe && (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{senderName}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-4)' }}>{fmtTime(m.timestamp)}</span>
                            </div>
                          )}

                          {/* Attachment */}
                          {m.attachmentUrl && (
                            m.attachmentType === 'image' ? (
                              <img src={m.attachmentUrl} alt={m.attachmentName}
                                style={{ maxWidth: 280, maxHeight: 200, borderRadius: 10, objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--border-1)' }}
                                onClick={() => window.open(m.attachmentUrl, '_blank')} />
                            ) : (
                              <a href={m.attachmentUrl} target="_blank" rel="noreferrer" download={m.attachmentName}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                                  borderRadius: 10, border: '1px solid var(--border-1)', background: '#fff',
                                  textDecoration: 'none', color: 'var(--fg-1)', maxWidth: 260 }}>
                                <File size={18} color="var(--accent)" />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.attachmentName}</div>
                                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Click to download</div>
                                </div>
                              </a>
                            )
                          )}

                          {/* Text */}
                          {inviteText && (
                            <div style={{ padding: '8px 12px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                              background: isMe ? 'var(--accent)' : 'var(--bg-2)', color: isMe ? '#fff' : 'var(--fg-1)',
                              fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                              display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: meetLink ? 10 : 0 }}>
                              {renderTextWithLinks(inviteText, isMe ? '#fff' : 'var(--accent)')}
                              {meetLink && (
                                <a
                                  href={meetLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '7px 12px',
                                    borderRadius: 10,
                                    background: isMe ? 'rgba(255,255,255,0.16)' : '#fff',
                                    border: isMe ? '1px solid rgba(255,255,255,0.22)' : '1px solid var(--border-1)',
                                    color: isMe ? '#fff' : 'var(--accent)',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                  }}>
                                  <Video size={14} />Join Instant Call <ExternalLink size={11} />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Time for my messages */}
                          {isMe && !grouped && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-4)' }}>
                              {fmtTime(m.timestamp)}
                            </span>
                          )}

                          {/* Reactions */}
                          {(m.reactions || []).some(r => r.userIds.length > 0) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, alignItems: 'center' }}>
                              {(m.reactions || []).filter(r => r.userIds.length > 0).map(r => (
                              <button key={r.emoji} onClick={() => handleReact(m.id, r.emoji)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                                  borderRadius: 999, border: '1px solid var(--border-1)',
                                  background: r.userIds.includes(currentUser?.id) ? 'var(--accent-tint)' : '#fff',
                                  cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
                                  color: r.userIds.includes(currentUser?.id) ? 'var(--accent-press)' : 'var(--fg-2)' }}>
                                {r.emoji} {r.userIds.length}
                              </button>
                              ))}
                            </div>
                          )}

                          {/* Reaction picker popover — positioned BELOW the bubble */}
                          {pickerOpen && (
                            <div style={{
                              position: 'absolute',
                              top: '100%', marginTop: 4,
                              [isMe ? 'right' : 'left']: 0,
                              display: 'flex', gap: 2, alignItems: 'center',
                              padding: '4px 8px', background: '#fff', borderRadius: 999,
                              border: '1px solid var(--border-1)',
                              boxShadow: 'var(--shadow-md)', zIndex: 20,
                            }}>
                              {EMOJIS.map(emoji => (
                                <button key={emoji}
                                  onClick={() => { handleReact(m.id, emoji); setPickerForMsgId(null); }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 18, padding: '4px 4px', lineHeight: 1, borderRadius: 6,
                                    transition: 'transform 120ms' }}
                                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
                                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Seen indicator — shown below the last seen message */}
                      {isLastSeenMsg && active.type === 'dm' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, marginRight: 4 }}>
                          <CheckCheck size={13} color="var(--accent)" />
                          <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>
                            Seen by {getConvName(active).split(' ')[0]}
                          </span>
                        </div>
                      )}
                      {isLastSeenMsg && active.type === 'channel' && (() => {
                        const count = getSeenInfo(m);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, marginRight: 4 }}>
                            <CheckCheck size={13} color="var(--accent)" />
                            <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>
                              Seen by {count} member{count > 1 ? 's' : ''}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}

              {/* Typing indicator */}
              {typing.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', marginTop: 4 }}>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--fg-3)',
                        animation: `typingBounce 1.2s ${i * 0.2}s infinite`,
                        display: 'inline-block',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--fg-3)', fontStyle: 'italic' }}>
                    {typing.length === 1
                      ? `${typing[0]} is typing…`
                      : typing.length === 2
                      ? `${typing[0]} and ${typing[1]} are typing…`
                      : 'Several people are typing…'}
                  </span>
                </div>
              )}
              <style>{`
                .message-actions {
                  opacity: 0;
                  transform: translateY(2px);
                  pointer-events: none;
                  transition: opacity 140ms ease, transform 140ms ease;
                }
                .message-row:hover .message-actions,
                .message-row:focus-within .message-actions,
                .message-actions.is-open {
                  opacity: 1;
                  transform: translateY(0);
                  pointer-events: auto;
                }
                .message-action-btn:hover {
                  background: var(--bg-2) !important;
                }
                @keyframes typingBounce {
                  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                  30% { transform: translateY(-5px); opacity: 1; }
                }
              `}</style>

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-1)', flexShrink: 0, background: '#fff' }}>
              {/* File preview */}
              {attachedFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 6,
                  background: 'var(--accent-tint)', borderRadius: 8, fontSize: 12 }}>
                  {attachedFile.type.startsWith('image/') ? <Image size={14} color="var(--accent)" /> : <File size={14} color="var(--accent)" />}
                  <span style={{ flex: 1, color: 'var(--accent-press)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {attachedFile.name}
                  </span>
                  <span style={{ color: 'var(--fg-3)' }}>{(attachedFile.size / 1024).toFixed(0)} KB</span>
                  <button onClick={() => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
                    <X size={13} color="var(--fg-3)" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSend}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                  background: 'var(--bg-1)', borderRadius: 12, border: '1px solid var(--border-1)' }}>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6, color: 'var(--fg-3)' }}
                  title="Attach file or image">
                  <Paperclip size={16} />
                </button>
                <input
                  value={draft}
                  onChange={e => { setDraft(e.target.value); notifyTyping(); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { handleSend(e); } }}
                  placeholder={`Message ${getConvName(active)}…`}
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none',
                    fontFamily: 'inherit', fontSize: 14, padding: '6px 0', color: 'var(--fg-1)' }}
                />
                <Button type="submit" variant="primary" size="sm" icon={Send}
                  disabled={(!draft.trim() && !attachedFile) || sending}>
                  {sending ? '…' : 'Send'}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty icon={Hash} title="Select a conversation" hint="Choose a channel or DM from the sidebar." />
          </div>
        )}
      </div>

      {/* New Channel Modal */}
      <Modal open={newChannelOpen} onClose={() => setNewChannelOpen(false)} title="Create Channel">
        <form onSubmit={handleCreateChannel} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Channel name" value={channelForm.name}
            onChange={e => setChannelForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. design, product, ops" required />
          <Input label="Description" value={channelForm.description}
            onChange={e => setChannelForm(f => ({ ...f, description: e.target.value }))}
            placeholder="What's this channel for?" />
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 8 }}>Add Members</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
              {users.map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <input type="checkbox" checked={channelForm.memberIds.includes(u.id)}
                    onChange={e => setChannelForm(f => ({
                      ...f,
                      memberIds: e.target.checked ? [...f.memberIds, u.id] : f.memberIds.filter(id => id !== u.id)
                    }))} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                  <Avatar name={u.name} size={26} src={u.avatar} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 'auto' }}>{u.title}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setNewChannelOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Channel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ConvItem({ conv, active, name, last, unread, onClick, avatar, user }) {
  const [hover, setHover] = useState(false);
  const presence = getPresence(user);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 10,
        background: active ? '#fff' : hover ? 'var(--bg-3)' : 'transparent',
        boxShadow: active ? 'var(--shadow-xs)' : 'none', cursor: 'pointer', transition: 'background 120ms' }}>
      {conv.type === 'dm'
        ? <Avatar name={name} size={30} src={avatar} status={presence.state} />
        : <span style={{ width: 30, height: 30, borderRadius: 8, background: active ? 'var(--accent-tint)' : 'var(--bg-2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: active ? 'var(--accent)' : 'var(--fg-3)', fontWeight: 700, flexShrink: 0 }}>
            <Hash size={13} />
          </span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: unread > 0 ? 700 : (active ? 700 : 500), color: 'var(--fg-1)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: 11, color: unread > 0 ? 'var(--fg-2)' : 'var(--fg-4)',
          fontWeight: unread > 0 ? 600 : 400,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last}</div>
      </div>
      {unread > 0 && (
        <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: 'var(--accent)',
          color: '#fff', fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </div>
  );
}
