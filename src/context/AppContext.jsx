import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react';
import {
  authApi, usersApi, attendanceApi, leavesApi, tasksApi,
  messagesApi, announcementsApi, documentsApi, meetingsApi,
  API_BASE,
} from '../api/index.js';
import { notify } from '../utils/notifications.js';

const AppContext = createContext(null);
const IST_TIME_ZONE = 'Asia/Kolkata';

// ─── Reducer ──────────────────────────────────────────────────────────────────
const initialState = {
  currentUser: null,
  users: [],
  attendance: [],
  todayAttendance: null,
  leaves: [],
  tasks: [],
  channels: [],
  channelMessages: {},     // { [channelId]: Message[] }
  channelSeenBy: {},       // { [channelId]: { userId: ISOString } }
  unreadCounts: {},        // { [channelId]: number }
  typingByChannel: {},     // { [channelId]: { [userId]: { name, timestamp } } }
  announcements: [],
  documents: [],
  meetings: [],
  loading: true,
  loginError: null,
};

function getIstDateString(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date).map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getTodayAttendanceRecord(records, userId) {
  if (!Array.isArray(records) || records.length === 0) return null;
  if (!userId) return records[0] || null;
  return records.find((record) => record.userId === userId) || null;
}

function upsertById(list, item, { prepend = true } = {}) {
  const idx = list.findIndex((entry) => entry.id === item.id);
  if (idx === -1) {
    return prepend ? [item, ...list] : [...list, item];
  }
  const next = list.slice();
  next[idx] = { ...next[idx], ...item };
  return next;
}

function mergeEmbeddedUser(existing, user) {
  if (!existing || existing.id !== user.id) return existing;
  return { ...existing, ...user };
}

function syncEmbeddedUser(state, user) {
  const users = upsertById(state.users, user, { prepend: false });
  const currentUser = state.currentUser?.id === user.id
    ? { ...state.currentUser, ...user }
    : state.currentUser;

  const attendance = state.attendance.map((record) => ({
    ...record,
    user: mergeEmbeddedUser(record.user, user),
  }));
  const todayAttendance = state.todayAttendance
    ? {
        ...state.todayAttendance,
        user: mergeEmbeddedUser(state.todayAttendance.user, user),
      }
    : state.todayAttendance;
  const leaves = state.leaves.map((leave) => ({
    ...leave,
    user: mergeEmbeddedUser(leave.user, user),
  }));
  const tasks = state.tasks.map((task) => ({
    ...task,
    assignee: mergeEmbeddedUser(task.assignee, user),
    reporter: mergeEmbeddedUser(task.reporter, user),
    comments: (task.comments || []).map((comment) => ({
      ...comment,
      user: mergeEmbeddedUser(comment.user, user),
    })),
  }));
  const channelMessages = Object.fromEntries(
    Object.entries(state.channelMessages).map(([channelId, messages]) => [
      channelId,
      messages.map((message) => ({
        ...message,
        sender: mergeEmbeddedUser(message.sender, user),
      })),
    ])
  );
  const announcements = state.announcements.map((ann) => (
    ann.authorId === user.id || ann.author?.id === user.id
      ? { ...ann, author: { ...(ann.author || {}), ...user } }
      : ann
  ));
  const documents = state.documents.map((doc) => ({
    ...doc,
    uploader: mergeEmbeddedUser(doc.uploader, user),
  }));
  const meetings = state.meetings.map((meeting) => (
    meeting.organizerId === user.id || meeting.organizer?.id === user.id
      ? { ...meeting, organizer: { ...(meeting.organizer || {}), ...user } }
      : meeting
  ));

  return {
    ...state,
    users,
    currentUser,
    attendance,
    todayAttendance,
    leaves,
    tasks,
    channelMessages,
    announcements,
    documents,
    meetings,
  };
}

function upsertAttendanceRecord(records, record) {
  const idx = records.findIndex((entry) =>
    entry.id === record.id || (entry.userId === record.userId && entry.date === record.date)
  );
  if (idx === -1) return [record, ...records];
  const next = records.slice();
  next[idx] = { ...next[idx], ...record };
  return next;
}

function omitKey(obj, keyToRemove) {
  const { [keyToRemove]: _removed, ...rest } = obj;
  return rest;
}

function reducer(state, action) {
  switch (action.type) {

    case 'SET_USER':        return { ...state, currentUser: action.user };
    case 'SET_USERS':       return { ...state, users: action.users };
    case 'SET_ATTENDANCE':  return { ...state, attendance: action.records };
    case 'SET_TODAY':       return { ...state, todayAttendance: action.record };
    case 'SET_LEAVES':      return { ...state, leaves: action.leaves };
    case 'SET_TASKS':       return { ...state, tasks: action.tasks };
    case 'SET_CHANNELS':    return { ...state, channels: action.channels };
    case 'SET_ANNOUNCEMENTS': return { ...state, announcements: action.announcements };
    case 'SET_DOCUMENTS':   return { ...state, documents: action.documents };
    case 'SET_MEETINGS':    return { ...state, meetings: action.meetings };
    case 'SET_LOADING':     return { ...state, loading: action.loading };

    case 'SET_MESSAGES':
      return {
        ...state,
        channelMessages: { ...state.channelMessages, [action.channelId]: action.messages },
        channelSeenBy: { ...state.channelSeenBy, [action.channelId]: action.seenBy || {} },
      };

    case 'SET_UNREAD_COUNTS':
      return { ...state, unreadCounts: action.counts };

    case 'BUMP_UNREAD':
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.channelId]: (state.unreadCounts[action.channelId] || 0) + 1,
        },
      };

    case 'CLEAR_UNREAD':
      return { ...state, unreadCounts: { ...state.unreadCounts, [action.channelId]: 0 } };

    case 'SET_TYPING':
      return {
        ...state,
        typingByChannel: {
          ...state.typingByChannel,
          [action.channelId]: {
            ...(state.typingByChannel[action.channelId] || {}),
            [action.userId]: { name: action.name, timestamp: action.timestamp },
          },
        },
      };

    case 'CLEAR_TYPING':
      return {
        ...state,
        typingByChannel: {
          ...state.typingByChannel,
          [action.channelId]: Object.fromEntries(
            Object.entries(state.typingByChannel[action.channelId] || {})
              .filter(([uid]) => uid !== action.userId)
          ),
        },
      };

    case 'UPDATE_SEEN_BY':
      return {
        ...state,
        channelSeenBy: {
          ...state.channelSeenBy,
          [action.channelId]: {
            ...(state.channelSeenBy[action.channelId] || {}),
            [action.userId]: action.ts,
          },
        },
      };

    case 'LOGIN_ERROR':       return { ...state, loginError: action.message };
    case 'LOGIN_ERROR_CLEAR': return { ...state, loginError: null };
    case 'LOGOUT':            return { ...initialState, loading: false };

    case 'SIGN_IN':
      return {
        ...state,
        todayAttendance: action.record,
        attendance: upsertAttendanceRecord(state.attendance, action.record),
      };
    case 'SIGN_OUT': {
      const updated = action.record;
      return {
        ...state,
        todayAttendance: updated,
        attendance: upsertAttendanceRecord(state.attendance, updated),
      };
    }
    case 'RESET_TODAY': {
      const today = getIstDateString();
      return {
        ...state,
        todayAttendance: null,
        attendance: state.attendance.filter(
          (r) => !(r.userId === state.currentUser?.id && r.date === today)
        ),
      };
    }
    case 'UPSERT_ATTENDANCE': {
      const today = getIstDateString();
      const isTodayForCurrentUser =
        action.record.userId === state.currentUser?.id && action.record.date === today;
      return {
        ...state,
        attendance: upsertAttendanceRecord(state.attendance, action.record),
        todayAttendance: isTodayForCurrentUser
          ? { ...(state.todayAttendance || {}), ...action.record }
          : state.todayAttendance,
      };
    }

    case 'ADD_LEAVE':    return { ...state, leaves: upsertById(state.leaves, action.leave) };
    case 'UPDATE_LEAVE': return { ...state, leaves: upsertById(state.leaves, action.leave) };
    case 'REMOVE_LEAVE': return { ...state, leaves: state.leaves.filter(l => l.id !== action.id) };

    case 'ADD_TASK':    return { ...state, tasks: upsertById(state.tasks, action.task) };
    case 'UPDATE_TASK': return { ...state, tasks: upsertById(state.tasks, action.task) };
    case 'REMOVE_TASK': return { ...state, tasks: state.tasks.filter(t => t.id !== action.id) };
    case 'ADD_TASK_COMMENT': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const comments = t.comments || [];
        if (comments.some((comment) => comment.id === action.comment.id)) return t;
        return { ...t, comments: [...comments, action.comment] };
      });
      return { ...state, tasks };
    }

    case 'ADD_CHANNEL': {
      return { ...state, channels: upsertById(state.channels, action.channel, { prepend: false }) };
    }
    case 'ADD_MESSAGE': {
      const prev = state.channelMessages[action.channelId] || [];
      if (prev.some((message) => message.id === action.message.id)) return state;
      return {
        ...state,
        channelMessages: { ...state.channelMessages, [action.channelId]: [...prev, action.message] },
      };
    }
    case 'UPDATE_MESSAGE': {
      const prev = state.channelMessages[action.channelId] || [];
      const exists = prev.some((message) => message.id === action.message.id);
      const msgs = exists
        ? prev.map((message) => (message.id === action.message.id ? action.message : message))
        : [...prev, action.message];
      return { ...state, channelMessages: { ...state.channelMessages, [action.channelId]: msgs } };
    }
    case 'REMOVE_MESSAGE': {
      const prev = state.channelMessages[action.channelId] || [];
      return {
        ...state,
        channelMessages: {
          ...state.channelMessages,
          [action.channelId]: prev.filter((message) => message.id !== action.id),
        },
      };
    }
    case 'REMOVE_CHANNEL':
      return {
        ...state,
        channels: state.channels.filter((channel) => channel.id !== action.id),
        channelMessages: omitKey(state.channelMessages, action.id),
        channelSeenBy: omitKey(state.channelSeenBy, action.id),
        unreadCounts: omitKey(state.unreadCounts, action.id),
        typingByChannel: omitKey(state.typingByChannel, action.id),
      };

    case 'ADD_ANNOUNCEMENT':    return { ...state, announcements: upsertById(state.announcements, action.ann) };
    case 'UPDATE_ANNOUNCEMENT': return { ...state, announcements: upsertById(state.announcements, action.ann) };
    case 'REMOVE_ANNOUNCEMENT': return { ...state, announcements: state.announcements.filter(a => a.id !== action.id) };

    case 'ADD_DOCUMENT':    return { ...state, documents: upsertById(state.documents, action.doc) };
    case 'REMOVE_DOCUMENT': return { ...state, documents: state.documents.filter(d => d.id !== action.id) };

    case 'ADD_MEETING':    return { ...state, meetings: upsertById(state.meetings, action.meeting) };
    case 'UPDATE_MEETING': return { ...state, meetings: upsertById(state.meetings, action.meeting) };
    case 'REMOVE_MEETING': return { ...state, meetings: state.meetings.filter(m => m.id !== action.id) };

    case 'ADD_USER':    return { ...state, users: upsertById(state.users, action.user, { prepend: false }) };
    case 'UPDATE_USER': return syncEmbeddedUser(state, action.user);
    case 'REMOVE_USER': return { ...state, users: state.users.filter(u => u.id !== action.id) };

    default: return state;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [toasts, setToasts] = useState([]);
  const prevUnreadRef = useRef({});
  const prevAnnouncementCountRef = useRef(0);

  // ── Toast helpers ────────────────────────────────────────────────────────────
  function addToast(toast) {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { ...toast, id }]); // max 3 toasts
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5500);
  }
  function dismissToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  // ── Load all app data ────────────────────────────────────────────────────────
  const loadAppData = useCallback(async (activeUser = null) => {
    try {
      const [users, attendance, todayList, leaves, tasks, channels, announcements, documents, meetings, unreadCounts] =
        await Promise.all([
          usersApi.list(),
          attendanceApi.list(),
          attendanceApi.today(),
          leavesApi.list(),
          tasksApi.list(),
          messagesApi.listChannels(),
          announcementsApi.list(),
          documentsApi.list(),
          meetingsApi.list(),
          messagesApi.getUnread().catch(() => ({})),
        ]);
      dispatch({ type: 'SET_USERS', users });
      dispatch({ type: 'SET_ATTENDANCE', records: attendance });
      dispatch({ type: 'SET_TODAY', record: getTodayAttendanceRecord(todayList, activeUser?.id) });
      dispatch({ type: 'SET_LEAVES', leaves });
      dispatch({ type: 'SET_TASKS', tasks });
      dispatch({ type: 'SET_CHANNELS', channels });
      dispatch({ type: 'SET_ANNOUNCEMENTS', announcements });
      dispatch({ type: 'SET_DOCUMENTS', documents });
      dispatch({ type: 'SET_MEETINGS', meetings });
      dispatch({ type: 'SET_UNREAD_COUNTS', counts: unreadCounts });
      prevUnreadRef.current = unreadCounts;
      prevAnnouncementCountRef.current = announcements.length;
    } catch (err) {
      console.error('Failed to load app data', err);
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, []);

  // ── Session restore ──────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('dw_token');
    if (!token) {
      dispatch({ type: 'SET_LOADING', loading: false });
      return;
    }
    authApi.me()
      .then(user => {
        dispatch({ type: 'SET_USER', user });
        return loadAppData(user);
      })
      .catch(() => {
        localStorage.removeItem('dw_token');
        dispatch({ type: 'SET_LOADING', loading: false });
      });
  }, [loadAppData]);

  // ── Real-time via Server-Sent Events ─────────────────────────────────────────
  // `activeChannelIdRef` is set by the Messages page so we know which channel
  // the user is currently looking at — incoming messages for that channel
  // shouldn't fire a toast/sound (the user is already seeing them).
  const activeChannelIdRef = useRef(null);
  const setActiveChannel = useCallback((id) => { activeChannelIdRef.current = id; }, []);

  useEffect(() => {
    if (!state.currentUser) return;
    const token = localStorage.getItem('dw_token');
    if (!token) return;

    let es = null;
    let reconnectTimer = null;
    let stopped = false;

    function connect() {
      try {
        es = new EventSource(`${API_BASE}/events?token=${encodeURIComponent(token)}`);
      } catch {
        return;
      }

      es.addEventListener('connected', () => {
        // connection established — nothing to do
      });

      es.addEventListener('message:new', (e) => {
        try {
          const msg = JSON.parse(e.data);
          dispatch({ type: 'ADD_MESSAGE', channelId: msg.channelId, message: msg });

          const senderId = msg.senderId || msg.sender?.id;
          const isMine = senderId === state.currentUser.id;
          const isActive = activeChannelIdRef.current === msg.channelId;

          if (!isMine) {
            // bump unread count for that channel
            dispatch({ type: 'BUMP_UNREAD', channelId: msg.channelId });

            if (!isActive) {
              const senderName = msg.sender?.name || 'Someone';
              const preview = msg.text
                ? msg.text.slice(0, 90)
                : (msg.attachmentName ? `📎 ${msg.attachmentName}` : 'New message');
              addToast({
                type: 'message',
                title: senderName,
                body: preview,
                path: '/messages',
              });
              notify({
                kind: 'message',
                title: senderName,
                body: preview,
                tag: `msg:${msg.channelId}`,
              });
            }
          }
        } catch {}
      });

      es.addEventListener('message:update', (e) => {
        try {
          const msg = JSON.parse(e.data);
          dispatch({ type: 'UPDATE_MESSAGE', channelId: msg.channelId, message: msg });
        } catch {}
      });

      es.addEventListener('message:delete', (e) => {
        try {
          const { channelId, id } = JSON.parse(e.data);
          dispatch({ type: 'REMOVE_MESSAGE', channelId, id });
        } catch {}
      });

      es.addEventListener('channel:new', (e) => {
        try {
          const ch = JSON.parse(e.data);
          dispatch({ type: 'ADD_CHANNEL', channel: ch });
        } catch {}
      });

      es.addEventListener('channel:delete', (e) => {
        try {
          const { id } = JSON.parse(e.data);
          dispatch({ type: 'REMOVE_CHANNEL', id });
        } catch {}
      });

      es.addEventListener('channel:read', (e) => {
        try {
          const data = JSON.parse(e.data);
          dispatch({
            type: 'UPDATE_SEEN_BY',
            channelId: data.channelId,
            userId: data.userId,
            ts: data.lastReadAt,
          });
        } catch {}
      });

      es.addEventListener('channel:typing', (e) => {
        try {
          const data = JSON.parse(e.data);
          dispatch({
            type: 'SET_TYPING',
            channelId: data.channelId,
            userId: data.userId,
            name: data.name,
            timestamp: data.timestamp,
          });
        } catch {}
      });

      es.addEventListener('announcement:new', (e) => {
        try {
          const ann = JSON.parse(e.data);
          dispatch({ type: 'ADD_ANNOUNCEMENT', ann });
          if (ann.authorId !== state.currentUser.id) {
            const body = ann.content?.slice(0, 90) + (ann.content?.length > 90 ? '…' : '');
            addToast({
              type: 'announcement',
              title: `📣 ${ann.title}`,
              body,
              path: '/announcements',
            });
            notify({
              kind: 'announcement',
              title: `📣 ${ann.title}`,
              body,
              tag: `ann:${ann.id}`,
            });
          }
        } catch {}
      });

      es.addEventListener('announcement:update', (e) => {
        try {
          const ann = JSON.parse(e.data);
          dispatch({ type: 'UPDATE_ANNOUNCEMENT', ann });
        } catch {}
      });

      es.addEventListener('announcement:delete', (e) => {
        try {
          const { id } = JSON.parse(e.data);
          dispatch({ type: 'REMOVE_ANNOUNCEMENT', id });
        } catch {}
      });

      es.addEventListener('document:new', (e) => {
        try {
          const doc = JSON.parse(e.data);
          dispatch({ type: 'ADD_DOCUMENT', doc });
        } catch {}
      });

      es.addEventListener('document:delete', (e) => {
        try {
          const { id } = JSON.parse(e.data);
          dispatch({ type: 'REMOVE_DOCUMENT', id });
        } catch {}
      });

      es.addEventListener('task:new', (e) => {
        try {
          const task = JSON.parse(e.data);
          if (state.currentUser.role === 'intern' && task.assigneeId !== state.currentUser.id) return;
          dispatch({ type: 'ADD_TASK', task });
        } catch {}
      });

      es.addEventListener('task:update', (e) => {
        try {
          const task = JSON.parse(e.data);
          if (state.currentUser.role === 'intern' && task.assigneeId !== state.currentUser.id) {
            dispatch({ type: 'REMOVE_TASK', id: task.id });
            return;
          }
          dispatch({ type: 'UPDATE_TASK', task });
        } catch {}
      });

      es.addEventListener('task:delete', (e) => {
        try {
          const { id } = JSON.parse(e.data);
          dispatch({ type: 'REMOVE_TASK', id });
        } catch {}
      });

      es.addEventListener('task:comment', (e) => {
        try {
          const { taskId, comment } = JSON.parse(e.data);
          dispatch({ type: 'ADD_TASK_COMMENT', taskId, comment });
        } catch {}
      });

      es.addEventListener('leave:new', (e) => {
        try {
          const leave = JSON.parse(e.data);
          dispatch({ type: 'ADD_LEAVE', leave });
        } catch {}
      });

      es.addEventListener('leave:update', (e) => {
        try {
          const leave = JSON.parse(e.data);
          dispatch({ type: 'UPDATE_LEAVE', leave });
        } catch {}
      });

      es.addEventListener('leave:delete', (e) => {
        try {
          const { id } = JSON.parse(e.data);
          dispatch({ type: 'REMOVE_LEAVE', id });
        } catch {}
      });

      es.addEventListener('attendance:upsert', (e) => {
        try {
          const record = JSON.parse(e.data);
          dispatch({ type: 'UPSERT_ATTENDANCE', record });
        } catch {}
      });

      es.addEventListener('attendance:delete', (e) => {
        try {
          const { userId } = JSON.parse(e.data);
          if (userId === state.currentUser?.id) dispatch({ type: 'RESET_TODAY' });
        } catch {}
      });

      es.addEventListener('user:new', (e) => {
        try {
          const user = JSON.parse(e.data);
          dispatch({ type: 'ADD_USER', user });
        } catch {}
      });

      es.addEventListener('user:update', (e) => {
        try {
          const user = JSON.parse(e.data);
          dispatch({ type: 'UPDATE_USER', user });
        } catch {}
      });

      es.addEventListener('user:delete', (e) => {
        try {
          const { id } = JSON.parse(e.data);
          dispatch({ type: 'REMOVE_USER', id });
        } catch {}
      });

      es.addEventListener('meeting:new', (e) => {
        try {
          const meeting = JSON.parse(e.data);
          dispatch({ type: 'ADD_MEETING', meeting });
          if (meeting.organizerId !== state.currentUser.id) {
            addToast({
              type: 'announcement',
              title: '📅 Meeting scheduled',
              body: `${meeting.title} — ${meeting.date} at ${meeting.time}`,
              path: '/meetings',
            });
            notify({
              kind: 'announcement',
              title: 'New meeting scheduled',
              body: `${meeting.title} — ${meeting.date} at ${meeting.time}`,
              tag: `meet:${meeting.id}`,
            });
          }
        } catch {}
      });

      es.addEventListener('meeting:update', (e) => {
        try {
          const meeting = JSON.parse(e.data);
          dispatch({ type: 'UPDATE_MEETING', meeting });
        } catch {}
      });

      es.addEventListener('meeting:delete', (e) => {
        try {
          const { id } = JSON.parse(e.data);
          dispatch({ type: 'REMOVE_MEETING', id });
        } catch {}
      });

      es.onerror = () => {
        // EventSource auto-reconnects, but if the server kills it (e.g. on logout)
        // we close + retry after a delay.
        if (stopped) return;
        try { es.close(); } catch {}
        reconnectTimer = setTimeout(() => { if (!stopped) connect(); }, 3000);
      };
    }

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (es) try { es.close(); } catch {}
    };
  }, [state.currentUser?.id]); // eslint-disable-line

  // ── Auth ─────────────────────────────────────────────────────────────────────
  async function login(email, password) {
    dispatch({ type: 'LOGIN_ERROR_CLEAR' });
    try {
      const { token, user } = await authApi.login(email, password);
      localStorage.setItem('dw_token', token);
      dispatch({ type: 'SET_USER', user });
      dispatch({ type: 'SET_LOADING', loading: true });
      await loadAppData(user);
    } catch (err) {
      dispatch({ type: 'LOGIN_ERROR', message: err.message || 'Invalid email or password.' });
    }
  }

  function logout() {
    localStorage.removeItem('dw_token');
    dispatch({ type: 'LOGOUT' });
  }

  // ── Attendance ───────────────────────────────────────────────────────────────
  async function signIn(location) {
    const record = await attendanceApi.signIn(location);
    dispatch({ type: 'SIGN_IN', record });
    return record;
  }
  async function signOut() {
    const record = await attendanceApi.signOut();
    dispatch({ type: 'SIGN_OUT', record });
    return record;
  }
  async function resetTodayAttendance() {
    await attendanceApi.resetToday();
    dispatch({ type: 'RESET_TODAY' });
  }

  // ── Leaves ───────────────────────────────────────────────────────────────────
  async function applyLeave(data) {
    const leave = await leavesApi.apply(data);
    dispatch({ type: 'ADD_LEAVE', leave });
    return leave;
  }
  async function updateLeaveStatus(id, status) {
    const leave = await leavesApi.update(id, status);
    dispatch({ type: 'UPDATE_LEAVE', leave });
    return leave;
  }
  async function deleteLeave(id) {
    await leavesApi.remove(id);
    dispatch({ type: 'REMOVE_LEAVE', id });
  }

  // ── Tasks ────────────────────────────────────────────────────────────────────
  async function createTask(data) {
    const task = await tasksApi.create(data);
    dispatch({ type: 'ADD_TASK', task });
    return task;
  }
  async function updateTask(id, data) {
    const task = await tasksApi.update(id, data);
    dispatch({ type: 'UPDATE_TASK', task });
    return task;
  }
  async function deleteTask(id) {
    await tasksApi.remove(id);
    dispatch({ type: 'REMOVE_TASK', id });
  }
  async function addTaskComment(taskId, text) {
    const comment = await tasksApi.addComment(taskId, text);
    dispatch({ type: 'ADD_TASK_COMMENT', taskId, comment });
    return comment;
  }

  // ── Messages ─────────────────────────────────────────────────────────────────
  async function loadMessages(channelId) {
    const { messages, seenBy } = await messagesApi.getMessages(channelId);
    dispatch({ type: 'SET_MESSAGES', channelId, messages, seenBy });
    return messages;
  }
  async function sendMessage(channelId, text) {
    const message = await messagesApi.sendMessage(channelId, text);
    dispatch({ type: 'ADD_MESSAGE', channelId, message });
    return message;
  }
  async function sendFile(channelId, file, text) {
    const message = await messagesApi.uploadFile(channelId, file, text);
    dispatch({ type: 'ADD_MESSAGE', channelId, message });
    return message;
  }
  async function reactToMessage(channelId, messageId, emoji) {
    const message = await messagesApi.react(channelId, messageId, emoji);
    dispatch({ type: 'UPDATE_MESSAGE', channelId, message });
    return message;
  }
  async function deleteMessage(channelId, messageId) {
    await messagesApi.deleteMessage(channelId, messageId);
    dispatch({ type: 'REMOVE_MESSAGE', channelId, id: messageId });
  }
  async function ensureDm(otherUserId) {
    const channel = await messagesApi.ensureDm(otherUserId);
    dispatch({ type: 'ADD_CHANNEL', channel });
    return channel;
  }
  async function createChannel(data) {
    const channel = await messagesApi.createChannel(data);
    dispatch({ type: 'ADD_CHANNEL', channel });
    return channel;
  }
  async function deleteChannel(channelId) {
    await messagesApi.deleteChannel(channelId);
    dispatch({ type: 'REMOVE_CHANNEL', id: channelId });
  }
  async function markChannelRead(channelId) {
    try {
      await messagesApi.markRead(channelId);
      const ts = new Date().toISOString();
      if (state.currentUser) {
        dispatch({ type: 'UPDATE_SEEN_BY', channelId, userId: state.currentUser.id, ts });
      }
      dispatch({ type: 'CLEAR_UNREAD', channelId });
      prevUnreadRef.current = { ...prevUnreadRef.current, [channelId]: 0 };
    } catch {}
  }

  // ── Announcements ────────────────────────────────────────────────────────────
  async function createAnnouncement(data) {
    const ann = await announcementsApi.create(data);
    dispatch({ type: 'ADD_ANNOUNCEMENT', ann });
    return ann;
  }
  async function updateAnnouncement(id, data) {
    const ann = await announcementsApi.update(id, data);
    dispatch({ type: 'UPDATE_ANNOUNCEMENT', ann });
    return ann;
  }
  async function deleteAnnouncement(id) {
    await announcementsApi.remove(id);
    dispatch({ type: 'REMOVE_ANNOUNCEMENT', id });
  }
  async function reactToAnnouncement(id, emoji) {
    const ann = await announcementsApi.react(id, emoji);
    dispatch({ type: 'UPDATE_ANNOUNCEMENT', ann });
    return ann;
  }

  // ── Documents ────────────────────────────────────────────────────────────────
  async function uploadDocument(file, folder, description) {
    const doc = await documentsApi.upload(file, folder, description);
    dispatch({ type: 'ADD_DOCUMENT', doc });
    return doc;
  }
  async function deleteDocument(id) {
    await documentsApi.remove(id);
    dispatch({ type: 'REMOVE_DOCUMENT', id });
  }

  // ── Meetings ─────────────────────────────────────────────────────────────────
  async function createMeeting(data) {
    const meeting = await meetingsApi.create(data);
    dispatch({ type: 'ADD_MEETING', meeting });
    return meeting;
  }
  async function updateMeeting(id, data) {
    const meeting = await meetingsApi.update(id, data);
    dispatch({ type: 'UPDATE_MEETING', meeting });
    return meeting;
  }
  async function deleteMeeting(id) {
    await meetingsApi.remove(id);
    dispatch({ type: 'REMOVE_MEETING', id });
  }

  // ── Users (admin) ────────────────────────────────────────────────────────────
  async function createUser(data) {
    const user = await usersApi.create(data);
    dispatch({ type: 'ADD_USER', user });
    return user;
  }
  async function updateUser(id, data) {
    const user = await usersApi.update(id, data);
    dispatch({ type: 'UPDATE_USER', user });
    return user;
  }
  async function deleteUser(id) {
    await usersApi.remove(id);
    dispatch({ type: 'REMOVE_USER', id });
  }
  async function uploadAvatar(id, file) {
    const user = await usersApi.uploadAvatar(id, file);
    dispatch({ type: 'UPDATE_USER', user });
    return user;
  }
  async function refreshPresence() {
    const user = await usersApi.presence();
    dispatch({ type: 'UPDATE_USER', user });
    return user;
  }

  useEffect(() => {
    if (!state.currentUser) return;
    let stopped = false;
    const beat = () => {
      if (stopped || document.visibilityState === 'hidden') return;
      refreshPresence().catch(() => {});
    };
    beat();
    const interval = setInterval(beat, 60 * 1000);
    window.addEventListener('focus', beat);
    document.addEventListener('visibilitychange', beat);
    return () => {
      stopped = true;
      clearInterval(interval);
      window.removeEventListener('focus', beat);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [state.currentUser?.id]); // eslint-disable-line

  const value = {
    state,
    dispatch,
    toasts,
    dismissToast,
    addToast,
    setActiveChannel,
    // actions
    login, logout,
    signIn, signOut, resetTodayAttendance,
    applyLeave, updateLeaveStatus, deleteLeave,
    createTask, updateTask, deleteTask, addTaskComment,
    loadMessages, sendMessage, sendFile, reactToMessage, deleteMessage, ensureDm, createChannel, deleteChannel, markChannelRead,
    createAnnouncement, updateAnnouncement, deleteAnnouncement, reactToAnnouncement,
    uploadDocument, deleteDocument,
    createMeeting, updateMeeting, deleteMeeting,
    createUser, updateUser, deleteUser, uploadAvatar, refreshPresence,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() { return useContext(AppContext); }
