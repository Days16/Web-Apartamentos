import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export interface PanelNotification {
  id: string;
  type: 'new_booking' | 'message' | 'review' | 'ical_error' | 'cancellation';
  title: string;
  body: string;
  link?: string;
  read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  new_booking: { icon: '📅', color: '#16a34a' },
  message: { icon: '✉️', color: '#2563eb' },
  review: { icon: '⭐', color: '#d97706' },
  ical_error: { icon: '⚠️', color: '#dc2626' },
  cancellation: { icon: '✕', color: '#dc2626' },
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

interface Props {
  userId?: string;
}

export default function PanelNotifications({ userId: _userId }: Props) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<PanelNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const unread = notifs.filter(n => !n.read).length;

  /* ── load ── */
  async function loadNotifs() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('panel_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifs(data || []);
    } finally {
      setLoading(false);
    }
  }

  /* ── realtime ── */
  useEffect(() => {
    loadNotifs();
    const ch = supabase
      .channel('panel-notifications-rt')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'panel_notifications',
        },
        payload => {
          setNotifs(prev => [payload.new as PanelNotification, ...prev]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  /* ── close on outside click ── */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* ── mark as read ── */
  async function markAllRead() {
    await supabase.from('panel_notifications').update({ read: true }).eq('read', false);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function markRead(id: string) {
    await supabase.from('panel_notifications').update({ read: true }).eq('id', id);
    setNotifs(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }

  function handleClick(n: PanelNotification) {
    if (!n.read) markRead(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center rounded-lg transition-colors"
        style={{
          width: '36px',
          height: '36px',
          color: 'var(--panel-text-muted)',
          background: open ? 'var(--panel-surface-2)' : 'transparent',
        }}
        aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ''}`}
        aria-expanded={open}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[9px] font-bold rounded-full text-white panel-badge-pulse"
            style={{
              minWidth: '16px',
              height: '16px',
              background: '#dc2626',
              padding: '0 3px',
              lineHeight: 1,
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-xl border z-50 overflow-hidden panel-animate-in"
          style={{
            width: '340px',
            background: 'var(--panel-surface)',
            borderColor: 'var(--panel-border)',
            boxShadow: 'var(--panel-shadow-md)',
          }}
          role="region"
          aria-label="Notificaciones"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--panel-border)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--panel-text)' }}>
                Notificaciones
              </span>
              {unread > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: '#dc2626' }}
                >
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs transition-colors hover:underline"
                style={{ color: 'var(--panel-accent)' }}
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
            {loading && (
              <div
                className="px-4 py-8 text-center text-sm"
                style={{ color: 'var(--panel-text-muted)' }}
              >
                Cargando…
              </div>
            )}
            {!loading && notifs.length === 0 && (
              <div className="px-4 py-8 text-center">
                <div className="text-2xl mb-2">🔔</div>
                <div className="text-sm" style={{ color: 'var(--panel-text-muted)' }}>
                  Sin notificaciones
                </div>
              </div>
            )}
            {notifs.map(n => {
              const cfg = TYPE_CONFIG[n.type] ?? { icon: '●', color: 'var(--panel-text-muted)' };
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b"
                  style={{
                    borderColor: 'var(--panel-border)',
                    background: n.read ? 'transparent' : 'rgba(26,95,110,.05)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--panel-surface-2)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = n.read
                      ? 'transparent'
                      : 'rgba(26,95,110,.05)';
                  }}
                >
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
                    style={{ background: `${cfg.color}18` }}
                  >
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-semibold leading-tight truncate"
                      style={{ color: n.read ? 'var(--panel-text-muted)' : 'var(--panel-text)' }}
                    >
                      {n.title}
                    </div>
                    <div
                      className="text-[11px] mt-0.5 line-clamp-2"
                      style={{ color: 'var(--panel-text-muted)' }}
                    >
                      {n.body}
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: 'var(--panel-text-muted)' }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                  {!n.read && (
                    <div
                      className="flex-shrink-0 w-2 h-2 rounded-full mt-1"
                      style={{ background: 'var(--panel-accent)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
