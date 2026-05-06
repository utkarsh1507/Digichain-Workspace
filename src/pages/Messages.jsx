import { useState, useRef, useEffect, useCallback } from 'react';
import { Hash, Plus, Send, Paperclip, Video, Search, MoreHorizontal, Users, X, File, Image, CheckCheck, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Avatar, IconBtn, Button, Empty, Modal, Input, fmtTime } from '../components/ui';
import { messagesApi } from '../api/index.js';
import { extractMeetLink, generateMeetLink, normalizeMeetLink, stripMeetLinkFromText } from '../utils/meet';
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const EMOJIS = ['👍', '❤️', '🔥', '🚀', '✅', '😂', '😮', '👏'];

export default function Messages() {
  const { state, loadMessages, sendMessage, sendFile, reactToMessage, ensureDm, createChannel, markChannelRead, addToast } = useApp();
  const { currentUser, channels, channelMessages, channelSeenBy, users } = state;

  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [channelForm, setChannelForm] = useState({ name: '', description: '', memberIds: [] });
  const [attachedFile, setAttachedFile] = useState(null);
  const [startingMeet, setStartingMeet] = useState(false);
  const [typing, setTyping] = useState([]);           // names of users currently typing
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingPollRef = useRef(null);

  // Separate channels and DMs
  const myChannels = channels.filter(c => c.type === 'channel');
  const myDMs = channels.filter(c => c.type === 'dm');

  const active = channels.find(c => c.id === activeId);
  const activeMsgs = channelMessages[activeId] || [];
  const activeSeenBy = channelSeenBy[activeId] || {};

  // Set first channel as default
  useEffect(() => {
    if (!activeId && myChannels.length > 0) {
      setActiveId(myChannels[0].id);
    }
  }, [myChannels.length]); // eslint-disable-line

  // Load messages + mark as read when switching channels
  useEffect(() => {
    if (!activeId) return;
    if (!channelMessages[activeId]) {
      loadMessages(activeId).catch(() => {});
    }
    // Mark channel as read when opened
    markChannelRead(activeId);
  }, [activeId]); // eslint-disable-line

  // Poll typing status every 2 seconds when in a channel
  useEffect(() => {
    if (!activeId) return;
    const poll = async () => {
      try {
        const typers = await messagesApi.getTyping(activeId);
        setTyping(typers);
      } catch {}
    };
    poll(); // immediate first call
    typingPollRef.current = setInterval(poll, 2000);
    return () => {
      clearInterval(typingPollRef.current);
      setTyping([]);
    };
  }, [activeId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMsgs.length]);

  // Notify typing
  const notifyTyping = useCallback(() => {
    if (!activeId || !currentUser) return;
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      messagesApi.setTyping(activeId, currentUser.name.split(' ')[0]).catch(() => {});
    }, 400);
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

  async function handleStartInstantMeet() {
    if (active?.type !== 'dm' || startingMeet) return;

    const otherUser = getDMOtherUser(active);
    const meetLink = generateMeetLink(`${active.id}-${Date.now()}`);
    const inviterName = currentUser?.name?.split(' ')[0] || 'Someone';
    const inviteText = `${inviterName} started an instant video call.\nJoin here: ${meetLink}`;

    setStartingMeet(true);
    try {
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
      alert(err.message);
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
      height: 'calc(100vh - 56px)',
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
              <Avatar name={u.name} size={24} src={u.avatar} status="online" />
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)' }}>{u.name.split(' ')[0]}</span>
              <span style={{ fontSize: 11, color: 'var(--fg-4)', marginLeft: 'auto' }}>{u.title?.split(' ')[0]}</span>
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
                  ? <Avatar name={getConvName(active)} size={32} src={getDMOtherUser(active)?.avatar} status="online" />
                  : <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-tint)', display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700 }}>
                      <Hash size={15} />
                    </span>}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{getConvName(active)}</div>
                  {active.type === 'channel' && (
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                      {(active.memberIds || []).length} members{active.description ? ` · ${active.description}` : ''}
                    </div>
                  )}
                  {active.type === 'dm' && <div style={{ fontSize: 11, color: '#16a371' }}>● Online</div>}
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
                <IconBtn icon={MoreHorizontal} />
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

                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start', marginTop: grouped ? 2 : 12 }}>
                      <div style={{ display: 'flex', gap: 10, justifyContent: isMe ? 'flex-end' : 'flex-start',
                        position: 'relative', width: '100%' }}
                        onMouseEnter={e => { const a = e.currentTarget.querySelector('.msg-actions'); if (a) a.style.opacity = '1'; }}
                        onMouseLeave={e => { const a = e.currentTarget.querySelector('.msg-actions'); if (a) a.style.opacity = '0'; }}>
                        {!isMe && (
                          <div style={{ width: 32, flexShrink: 0, display: 'flex', alignItems: 'flex-end' }}>
                            {!grouped && <Avatar name={senderName} size={32} src={m.sender?.avatar} />}
                          </div>
                        )}
                        <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
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
                          {(m.reactions || []).filter(r => r.userIds.length > 0).map(r => (
                            <button key={r.emoji} onClick={() => handleReact(m.id, r.emoji)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                                borderRadius: 999, border: '1px solid var(--border-1)',
                                background: r.userIds.includes(currentUser?.id) ? 'var(--accent-tint)' : '#fff',
                                cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                              {r.emoji} {r.userIds.length}
                            </button>
                          ))}
                        </div>

                        {/* Reaction picker */}
                        <div className="msg-actions" style={{ opacity: 0, transition: 'opacity 120ms', position: 'absolute',
                          [isMe ? 'left' : 'right']: 0, top: 0, display: 'flex', gap: 2, alignItems: 'center',
                          padding: '2px 6px', background: '#fff', borderRadius: 8, border: '1px solid var(--border-1)',
                          boxShadow: 'var(--shadow-xs)', zIndex: 10 }}>
                          {EMOJIS.slice(0, 5).map(emoji => (
                            <button key={emoji} onClick={() => handleReact(m.id, emoji)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>
                              {emoji}
                            </button>
                          ))}
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

function ConvItem({ conv, active, name, last, unread, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 10,
        background: active ? '#fff' : hover ? 'var(--bg-3)' : 'transparent',
        boxShadow: active ? 'var(--shadow-xs)' : 'none', cursor: 'pointer', transition: 'background 120ms' }}>
      {conv.type === 'dm'
        ? <Avatar name={name} size={30} status="online" />
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
