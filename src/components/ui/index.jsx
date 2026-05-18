import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#7B61FF','#16a371','#d97706','#2563eb','#d345fd','#0e7a52','#ad2236','#0891b2'];
export function avatarColor(seed = '') {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
export function Avatar({ name = '?', size = 32, src, status, ring, gradient, founder = false }) {
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const bg = gradient ? 'var(--brand-gradient)' : src ? 'transparent' : avatarColor(name);
  const founderRing = founder
    ? 'linear-gradient(135deg, #f5d67a 0%, #c89f2d 45%, #f8ebbb 100%)'
    : 'var(--brand-gradient)';
  const inner = (
    <span style={{
      position: 'relative', width: size, height: size, borderRadius: '50%',
      background: bg, color: '#fff', flexShrink: 0,
      fontSize: Math.round(size * 0.38), fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      border: ring ? '2px solid #fff' : 'none', overflow: 'visible',
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials}
      {status && (
        <span style={{
          position: 'absolute', bottom: Math.max(1, Math.round(size * 0.04)), right: Math.max(1, Math.round(size * 0.04)),
          width: Math.max(8, Math.round(size * 0.24)), height: Math.max(8, Math.round(size * 0.24)),
          borderRadius: '50%', border: '2px solid #fff',
          background: status === 'online' ? '#16a371' : status === 'away' ? '#d97706' : '#9a9aa8',
          boxShadow: '0 0 0 1px rgba(14,14,20,0.06)',
        }} />
      )}
    </span>
  );
  if (ring) return (
    <span style={{ padding: founder ? 3 : 2, borderRadius: '50%', background: founderRing, display: 'inline-flex', boxShadow: founder ? '0 12px 24px rgba(183, 134, 11, 0.18)' : 'none' }}>
      {inner}
    </span>
  );
  return inner;
}
export function AvatarStack({ names = [], avatars = [], size = 28, max = 4, users = null }) {
  // Backwards compatible: accept names+avatars in parallel arrays, or `users` array of {name, avatar}
  const list = users
    ? users.map(u => ({ name: u?.name || '?', avatar: u?.avatar }))
    : names.map((n, i) => ({ name: n, avatar: avatars[i] }));
  const shown = list.slice(0, max);
  const extra = list.length - shown.length;
  return (
    <div style={{ display: 'flex' }}>
      {shown.map((u, i) => (
        <span key={i} style={{ marginLeft: i === 0 ? 0 : -Math.round(size * 0.3), border: '2px solid #fff', borderRadius: '50%', display: 'inline-flex' }}>
          <Avatar name={u.name} size={size} src={u.avatar} />
        </span>
      ))}
      {extra > 0 && (
        <span style={{
          marginLeft: -Math.round(size * 0.3), width: size, height: size, borderRadius: '50%',
          background: 'var(--bg-2)', color: 'var(--fg-2)', fontSize: Math.round(size * 0.35), fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff',
        }}>+{extra}</span>
      )}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, onClick, disabled, style, type = 'button', ...rest }) {
  const [hover, setHover] = useState(false);
  const sp = { sm: { padding: '6px 12px', fontSize: 12, borderRadius: 8, gap: 6 }, md: { padding: '9px 16px', fontSize: 14, borderRadius: 10, gap: 8 }, lg: { padding: '12px 20px', fontSize: 15, borderRadius: 12, gap: 8 } }[size];
  const base = {
    primary:   { background: 'var(--accent)', color: '#fff', border: '1px solid transparent' },
    gradient:  { background: 'var(--brand-gradient)', color: '#fff', border: '1px solid transparent' },
    secondary: { background: '#fff', color: 'var(--fg-1)', border: '1px solid var(--border-1)' },
    ghost:     { background: 'transparent', color: 'var(--fg-2)', border: '1px solid transparent' },
    danger:    { background: '#fff', color: '#ad2236', border: '1px solid var(--danger-tint)' },
    success:   { background: 'var(--success)', color: '#fff', border: '1px solid transparent' },
  }[variant];
  const hov = hover && !disabled ? {
    primary:   { background: 'var(--accent-hover)', boxShadow: 'var(--shadow-brand)' },
    gradient:  { opacity: 0.92, boxShadow: 'var(--shadow-brand)' },
    secondary: { background: 'var(--bg-1)', borderColor: 'var(--border-2)' },
    ghost:     { background: 'var(--bg-2)' },
    danger:    { background: 'var(--danger-tint)' },
    success:   { opacity: 0.9 },
  }[variant] : {};
  const iconSize = size === 'sm' ? 14 : 16;
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'inherit', fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
        transition: 'all 180ms var(--ease-out)', whiteSpace: 'nowrap', ...sp, ...base, ...hov, ...style }}
      {...rest}>
      {Icon && <Icon size={iconSize} />}
      {children}
      {IconRight && <IconRight size={iconSize} />}
    </button>
  );
}
export function IconBtn({ icon: Icon, onClick, size = 36, title, badge, active }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} title={title} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'var(--accent-tint)' : hover ? 'var(--bg-2)' : 'transparent',
        border: '1px solid transparent', borderRadius: 10, cursor: 'pointer',
        color: active ? 'var(--accent)' : 'var(--fg-2)', transition: 'all 120ms var(--ease-out)', flexShrink: 0 }}>
      {Icon && <Icon size={18} />}
      {badge > 0 && (
        <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, padding: '0 4px',
          background: 'var(--danger)', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>
      )}
    </button>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────
const PILL_TONES = {
  neutral: { bg: 'var(--bg-2)', fg: 'var(--fg-2)' },
  accent:  { bg: 'var(--accent-tint)', fg: 'var(--accent-press)' },
  success: { bg: 'var(--success-tint)', fg: '#0e7a52' },
  warning: { bg: 'var(--warning-tint)', fg: '#a85a00' },
  danger:  { bg: 'var(--danger-tint)', fg: '#ad2236' },
  info:    { bg: 'var(--info-tint)', fg: '#1a4bbf' },
};
const DOT_COLORS = { success:'#16a371', warning:'#d97706', danger:'#e0364c', info:'#2563eb', accent:'#7B61FF', neutral:'#9a9aa8' };
export function Pill({ children, tone = 'neutral', dot, icon: Icon }) {
  const t = PILL_TONES[tone] || PILL_TONES.neutral;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px',
      borderRadius: 999, background: t.bg, color: t.fg, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: DOT_COLORS[tone], flexShrink: 0 }} />}
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, padded = true, hero = false, style, onClick, ...rest }) {
  return (
    <div onClick={onClick}
      style={{ background: hero ? 'linear-gradient(135deg,color-mix(in oklab,#5cc9f5 9%,white),color-mix(in oklab,#d345fd 9%,white))' : '#fff',
        border: `1px solid ${hero ? '#ede9ff' : 'var(--border-1)'}`, borderRadius: 14,
        boxShadow: 'var(--shadow-sm)', padding: padded ? 16 : 0,
        cursor: onClick ? 'pointer' : 'default', ...style }} {...rest}>
      {children}
    </div>
  );
}
export function StatCard({ label, value, sub, delta, hero, gradientNum, icon: Icon }) {
  return (
    <Card hero={hero}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>{label}</span>
          {Icon && <span style={{ color: 'var(--fg-4)' }}><Icon size={16} /></span>}
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1,
          ...(gradientNum && { background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }) }}>{value}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {sub && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{sub}</span>}
          {delta && <Pill tone={delta.startsWith('+') ? 'success' : 'danger'}>{delta}</Pill>}
        </div>
      </div>
    </Card>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ label, hint, error, icon: Icon, value, onChange, mono, style, ...rest }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>{label}</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
        background: '#fff', border: `1px solid ${error ? 'var(--danger)' : focus ? 'var(--accent)' : 'var(--border-1)'}`,
        borderRadius: 10, boxShadow: focus ? '0 0 0 3px rgba(123,97,255,0.18)' : 'none',
        transition: 'all 180ms var(--ease-out)' }}>
        {Icon && <span style={{ color: 'var(--fg-3)', display: 'flex' }}><Icon size={15} /></span>}
        <input value={value} onChange={onChange} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ flex: 1, padding: '10px 0', fontFamily: mono ? 'var(--font-mono)' : 'inherit',
            fontSize: mono ? 13 : 14, color: 'var(--fg-1)', background: 'transparent', border: 'none', outline: 'none' }}
          {...rest} />
      </div>
      {(hint || error) && <span style={{ fontSize: 11, color: error ? '#ad2236' : 'var(--fg-3)' }}>{error || hint}</span>}
    </div>
  );
}
export function Select({ label, value, onChange, options, style, ...rest }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>{label}</span>}
      <select value={value} onChange={onChange} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ padding: '10px 12px', fontFamily: 'inherit', fontSize: 14, color: 'var(--fg-1)',
          background: '#fff', border: `1px solid ${focus ? 'var(--accent)' : 'var(--border-1)'}`,
          borderRadius: 10, outline: 'none', boxShadow: focus ? '0 0 0 3px rgba(123,97,255,0.18)' : 'none',
          cursor: 'pointer', transition: 'all 180ms var(--ease-out)' }} {...rest}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
export function Textarea({ label, value, onChange, placeholder, rows = 3, style, ...rest }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>{label}</span>}
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ padding: '10px 12px', fontFamily: 'inherit', fontSize: 14, color: 'var(--fg-1)',
          background: '#fff', border: `1px solid ${focus ? 'var(--accent)' : 'var(--border-1)'}`,
          borderRadius: 10, outline: 'none', resize: 'vertical', lineHeight: 1.5,
          boxShadow: focus ? '0 0 0 3px rgba(123,97,255,0.18)' : 'none',
          transition: 'all 180ms var(--ease-out)' }} {...rest} />
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 520 }) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;
    const prevBodyTouchAction = body.style.touchAction;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouchAction;
      documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px clamp(16px, 4vw, 32px)',
      }}>
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(10,10,18,0.48)',
          backdropFilter: 'blur(10px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: width,
          maxHeight: 'calc(100vh - 48px)',
          overflow: 'hidden',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.65)',
          background: 'rgba(255,255,255,0.98)',
          boxShadow: '0 24px 80px rgba(14,14,20,0.20)',
          animation: 'fadeIn 200ms var(--ease-out)',
        }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', display: 'flex', padding: 4, borderRadius: 8 }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ padding: 24, maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ─── Misc ─────────────────────────────────────────────────────────────────────
export function Divider() {
  return <div style={{ height: 1, background: 'var(--border-1)' }} />;
}
export function Eyebrow({ children }) {
  return <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>{children}</span>;
}
export function Empty({ icon: Icon, title, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 20px', color: 'var(--fg-3)' }}>
      {Icon && <Icon size={32} />}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)' }}>{title}</div>
      {hint && <div style={{ fontSize: 12 }}>{hint}</div>}
    </div>
  );
}
export function Section({ title, action, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border-1)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function priorityTone(p) {
  if (p === 'Critical' || p === 'High') return 'danger';
  if (p === 'Medium') return 'warning';
  return 'neutral';
}
export function statusTone(s) {
  return { 'Pending': 'neutral', 'In Progress': 'info', 'Review': 'warning', 'Completed': 'success', 'Blocked': 'danger' }[s] || 'neutral';
}
export function leaveTone(s) {
  return { 'Approved': 'success', 'Pending': 'warning', 'Rejected': 'danger' }[s] || 'neutral';
}
export function attendanceTone(s) {
  return { 'Present': 'success', 'Remote': 'accent', 'On Leave': 'warning', 'Absent': 'danger', 'Off-duty': 'neutral', 'Late': 'warning' }[s] || 'neutral';
}
export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}
export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── NotificationToast ────────────────────────────────────────────────────────
const TOAST_ICONS = {
  message:      { emoji: '💬', bg: 'var(--accent-tint)',  fg: 'var(--accent)' },
  announcement: { emoji: '📣', bg: '#fff3f5',             fg: '#ad2236' },
  success:      { emoji: '✅', bg: 'var(--success-tint)', fg: '#0e7a52' },
  info:         { emoji: 'ℹ️', bg: 'var(--info-tint)',    fg: '#1a4bbf' },
};

export function NotificationToast({ toasts = [], onDismiss, onNavigate }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 340,
    }}>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(60px) scale(0.95); }
        }
      `}</style>
      {toasts.map(n => {
        const icon = TOAST_ICONS[n.type] || TOAST_ICONS.info;
        return (
          <div key={n.id}
            style={{
              background: '#fff', borderRadius: 14, padding: '13px 16px',
              boxShadow: '0 4px 8px rgba(14,14,20,0.06), 0 16px 40px rgba(14,14,20,0.10)',
              border: '1px solid var(--border-1)',
              display: 'flex', gap: 12, alignItems: 'flex-start',
              animation: 'slideInRight 300ms var(--ease-out)',
              cursor: n.path ? 'pointer' : 'default',
            }}
            onClick={() => { if (n.path && onNavigate) { onNavigate(n.path); onDismiss(n.id); } }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: icon.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>
              {icon.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 2 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>{n.body}</div>
            </div>
            <button onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--fg-4)', padding: 2, borderRadius: 4, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, lineHeight: 1 }}>
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
