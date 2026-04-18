/* eslint-disable */
// @ts-nocheck
import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchAllMessages, updateMessage, deleteMessage } from '../../services/supabaseService';
import { sendContactReply } from '../../services/resendService';
import { supabase } from '../../lib/supabase';
import { PanelPageHeader, PanelBadge, PanelConfirm } from '../../components/panel';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'unread', label: 'Sin leer' },
  { key: 'replied', label: 'Respondidos' },
  { key: 'archived', label: 'Archivados' },
];

const AVATAR_COLORS = [
  '#1a5f6e',
  '#D4A843',
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
];
const avatarColor = (name: string) =>
  AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

export default function Mensajes() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [listWidth, setListWidth] = useState(360);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(360);

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartWidth.current = listWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [listWidth]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - dragStartX.current;
      const next = Math.max(220, Math.min(560, dragStartWidth.current + delta));
      setListWidth(next);
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  /* ── carga + filtros ── */
  useEffect(() => {
    loadMessages();
  }, [filter]);

  /* ── realtime ── */
  useEffect(() => {
    const ch = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  /* ── auto-resize textarea ── */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [reply]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const status = filter === 'all' ? null : filter;
      const msgs = await fetchAllMessages(status);
      setMessages(msgs || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMessage = async msg => {
    setSelected(msg);
    setReply('');
    setReplyError('');
    if (msg.status === 'unread') {
      await updateMessage(msg.id, { status: 'read' });
      setMessages(m => m.map(x => (x.id === msg.id ? { ...x, status: 'read' } : x)));
    }
  };

  const handleArchive = async id => {
    await updateMessage(id, { status: 'archived' });
    setMessages(m => m.map(x => (x.id === id ? { ...x, status: 'archived' } : x)));
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'archived' }));
  };

  const handleDeleteConfirmed = async () => {
    const id = confirmDelete;
    setConfirmDelete(null);
    await deleteMessage(id);
    setMessages(m => m.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const handleSendReply = async () => {
    if (!reply.trim()) {
      setReplyError('La respuesta no puede estar vacía.');
      return;
    }
    setSendingReply(true);
    setReplyError('');
    try {
      await sendContactReply({
        guestEmail: selected.email,
        guestName: selected.name,
        subject: 'Re: Tu consulta en Illa Pancha Ribadeo',
        replyText: reply,
      });
    } catch (err) {
      setReplyError('Error al enviar el email. Comprueba la configuración de Resend.');
      setSendingReply(false);
      return;
    }
    try {
      await updateMessage(selected.id, { status: 'replied' });
    } catch {}
    try {
      await updateMessage(selected.id, {
        reply_content: reply,
        replied: true,
        reply_sent_at: new Date().toISOString(),
      });
    } catch {}
    setMessages(m =>
      m.map(x =>
        x.id === selected.id ? { ...x, reply_content: reply, replied: true, status: 'replied' } : x
      )
    );
    setSelected(prev => ({ ...prev, reply_content: reply, replied: true, status: 'replied' }));
    setReply('');
    setSendingReply(false);
  };

  const unreadCount = messages.filter(m => m.status === 'unread').length;

  const statusVariant = (status: string) =>
    status === 'unread'
      ? 'warning'
      : status === 'replied'
        ? 'success'
        : status === 'archived'
          ? 'neutral'
          : 'info';

  /* ── render ── */
  return (
    <div className="panel-page-content">
      <PanelPageHeader
        title="Mensajes"
        subtitle={`${unreadCount} sin leer`}
        actions={
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`panel-btn panel-btn-sm ${filter === f.key ? 'panel-btn-primary' : 'panel-btn-ghost'}`}
              >
                {f.label}
                {f.key === 'unread' && unreadCount > 0 && (
                  <span
                    className="ml-1.5 inline-flex items-center justify-center text-[10px] font-bold rounded-full"
                    style={{
                      minWidth: 16,
                      height: 16,
                      background: 'var(--panel-accent-gold)',
                      color: '#fff',
                      padding: '0 4px',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        }
      />

      {/* Split pane */}
      <div
        className={`panel-card overflow-hidden messages-split-pane${selected ? ' has-selected' : ''}`}
        style={{
          padding: 0,
          display: 'grid',
          gridTemplateColumns: selected ? `${listWidth}px 4px 1fr` : '1fr',
          minHeight: 520,
        }}
      >
        {/* Lista */}
        <div
          className={`messages-list-panel${selected ? ' border-r' : ''}`}
          style={{ borderColor: 'var(--panel-border)', overflowY: 'auto', maxHeight: 680 }}
        >
          {loading ? (
            <div className="p-8 text-center panel-text-muted text-sm">Cargando mensajes…</div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center panel-text-muted text-sm">
              <div className="text-3xl mb-3 opacity-30">✉</div>
              No hay mensajes en esta categoría.
            </div>
          ) : (
            messages.map(m => {
              const isActive = selected?.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => handleSelectMessage(m)}
                  className="flex items-start gap-3 px-4 py-3.5 border-b cursor-pointer transition-colors"
                  style={{
                    borderColor: 'var(--panel-border)',
                    background: isActive
                      ? 'rgba(26,95,110,.07)'
                      : m.status === 'unread'
                        ? 'var(--panel-surface-2)'
                        : 'transparent',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                    style={{ background: avatarColor(m.name) }}
                  >
                    {m.name?.[0]?.toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-[13px] truncate"
                        style={{
                          color: 'var(--panel-text)',
                          fontWeight: m.status === 'unread' ? 700 : 400,
                        }}
                      >
                        {m.name}
                      </span>
                      {m.status === 'unread' && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: 'var(--panel-accent-gold)' }}
                        />
                      )}
                      {m.status === 'archived' && (
                        <PanelBadge variant="neutral">Archivado</PanelBadge>
                      )}
                      {m.status === 'replied' && (
                        <PanelBadge variant="success">Respondido</PanelBadge>
                      )}
                    </div>
                    <div className="text-[11px] panel-text-muted truncate mb-1">{m.email}</div>
                    <div className="text-xs panel-text-muted truncate">{m.message}</div>
                  </div>

                  <div className="text-[10px] panel-text-muted whitespace-nowrap flex-shrink-0 mt-0.5">
                    {new Date(m.created_at).toLocaleDateString('es-ES')}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Resize handle */}
        {selected && (
          <div
            onMouseDown={onResizeStart}
            className="messages-resize-handle cursor-col-resize flex items-center justify-center group"
            style={{ background: 'var(--panel-border)', width: 4 }}
            title="Arrastra para redimensionar"
          >
            <div
              className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'var(--panel-accent)' }}
            />
          </div>
        )}

        {/* Detalle */}
        {selected && (
          <div className="messages-detail-panel" style={{ overflowY: 'auto', maxHeight: 680 }}>
            {/* Cabecera del detalle */}
            <div
              className="sticky top-0 flex items-center justify-between px-6 py-4 border-b z-10"
              style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-surface)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: avatarColor(selected.name) }}
                >
                  {selected.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--panel-text)' }}>
                    {selected.name}
                  </div>
                  <div className="text-xs panel-text-muted">{selected.email}</div>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {selected.apartment_slug && (
                  <PanelBadge variant="info">{selected.apartment_slug}</PanelBadge>
                )}
                {selected.status !== 'archived' && (
                  <button
                    className="panel-btn panel-btn-ghost panel-btn-sm"
                    onClick={() => handleArchive(selected.id)}
                  >
                    Archivar
                  </button>
                )}
                <button
                  className="panel-btn panel-btn-sm panel-btn-danger"
                  onClick={() => setConfirmDelete(selected.id)}
                >
                  Eliminar
                </button>
                <button
                  className="panel-btn panel-btn-ghost panel-btn-sm"
                  onClick={() => setSelected(null)}
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Fecha + mensaje original */}
              <div className="text-xs panel-text-muted mb-2">
                {new Date(selected.created_at).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div
                className="rounded-xl p-5 mb-5 text-sm leading-relaxed whitespace-pre-wrap break-words"
                style={{ background: 'var(--panel-surface-2)', color: 'var(--panel-text)' }}
              >
                {selected.message}
              </div>

              {/* Respuesta previa */}
              {selected.replied && selected.reply_content && (
                <div
                  className="rounded-xl p-5 mb-5 text-sm leading-relaxed whitespace-pre-wrap break-words border-l-4"
                  style={{
                    background: 'rgba(22,163,74,.06)',
                    borderColor: '#16a34a',
                    color: 'var(--panel-text)',
                  }}
                >
                  <div className="text-xs font-semibold mb-2" style={{ color: '#16a34a' }}>
                    Tu respuesta
                  </div>
                  {selected.reply_content}
                </div>
              )}

              {/* Reply form */}
              {!selected.replied && selected.status !== 'archived' && (
                <div>
                  <div className="panel-form-section-title mb-3">Responder</div>
                  <textarea
                    ref={textareaRef}
                    className="panel-input w-full"
                    style={{ resize: 'none', minHeight: 100, overflowY: 'hidden' }}
                    placeholder="Escribe tu respuesta…"
                    rows={4}
                    value={reply}
                    onChange={e => {
                      setReply(e.target.value);
                      setReplyError('');
                    }}
                  />
                  {replyError && <div className="panel-form-field-error mt-1.5">{replyError}</div>}
                  <div className="flex gap-2 mt-3">
                    <button
                      className="panel-btn panel-btn-primary panel-btn-sm"
                      onClick={handleSendReply}
                      disabled={sendingReply}
                    >
                      {sendingReply ? 'Enviando…' : 'Enviar respuesta'}
                    </button>
                    <button
                      className="panel-btn panel-btn-ghost panel-btn-sm"
                      onClick={() => {
                        setReply('');
                        setReplyError('');
                      }}
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirm eliminar */}
      <PanelConfirm
        open={!!confirmDelete}
        variant="destructive"
        title="¿Eliminar este mensaje?"
        description="Esta acción es permanente y no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
