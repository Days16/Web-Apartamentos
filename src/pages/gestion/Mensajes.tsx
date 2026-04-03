/* eslint-disable */
// @ts-nocheck
import { useEffect, useState } from 'react';
import { fetchAllMessages, updateMessage, deleteMessage } from '../../services/supabaseService';
import { sendContactReply } from '../../services/resendService';
import { supabase } from '../../lib/supabase';
import ConfirmDialog from '../../components/ConfirmDialog';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'unread', label: 'Sin leer' },
  { key: 'replied', label: 'Respondidos' },
  { key: 'archived', label: 'Archivados' },
];

export default function Mensajes() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // id del mensaje a borrar

  // Carga inicial + cuando cambia el filtro
  useEffect(() => {
    loadMessages();
  }, [filter]);

  // Realtime — nuevos mensajes
  useEffect(() => {
    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const status = filter === 'all' ? null : filter;
      const msgs = await fetchAllMessages(status);
      setMessages(msgs || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Error cargando mensajes');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async id => {
    try {
      await updateMessage(id, { status: 'read' });
      setMessages(m => m.map(msg => (msg.id === id ? { ...msg, status: 'read' } : msg)));
    } catch (err) {
      console.error('Error updating message:', err);
    }
  };

  const handleSelectMessage = async msg => {
    setSelected(msg);
    if (msg.status === 'unread') {
      await handleMarkRead(msg.id);
    }
  };

  const handleArchive = async id => {
    try {
      await updateMessage(id, { status: 'archived' });
      setMessages(m => m.map(msg => (msg.id === id ? { ...msg, status: 'archived' } : msg)));
      if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'archived' }));
    } catch (err) {
      console.error('Error archiving message:', err);
    }
  };

  const handleDeleteConfirmed = async () => {
    const id = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteMessage(id);
      setMessages(m => m.filter(msg => msg.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim()) {
      setError('La respuesta no puede estar vacía');
      return;
    }
    try {
      await sendContactReply({
        guestEmail: selected.email,
        guestName: selected.name,
        subject: 'Re: Tu consulta en Illa Pancha Ribadeo',
        replyText: reply,
      });
    } catch (err) {
      console.error('Error sending reply email:', err?.message || err);
      setError('Error al enviar el email. Comprueba la configuración de Resend.');
      return;
    }

    // Actualizar status (columna que siempre existe)
    try {
      await updateMessage(selected.id, { status: 'replied' });
    } catch (err) {
      console.error('Error updating status:', err?.message || err);
    }

    // Guardar contenido de respuesta (requiere columnas reply_content, replied, reply_sent_at)
    try {
      await updateMessage(selected.id, {
        reply_content: reply,
        replied: true,
        reply_sent_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Columnas de respuesta no disponibles en la BD:', err?.message || err);
    }

    setMessages(m =>
      m.map(msg =>
        msg.id === selected.id
          ? { ...msg, reply_content: reply, replied: true, status: 'replied' }
          : msg
      )
    );
    setSelected(prev => ({ ...prev, reply_content: reply, replied: true, status: 'replied' }));
    setReply('');
    setError('');
  };

  const unreadCount = messages.filter(m => m.status === 'unread').length;

  // ── VISTA DETALLE ──────────────────────────────────────────────
  if (selected) {
    return (
      <>
        <ConfirmDialog
          open={!!confirmDelete}
          title="Eliminar mensaje"
          message="Esta acción es permanente y no se puede deshacer. ¿Eliminar el mensaje?"
          confirmLabel="Eliminar"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(null)}
        />

        <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8 border-b-2 border-gray-200">
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              onClick={() => setSelected(null)}
            >
              ← Volver
            </button>
            <div>
              <div className="text-2xl font-bold text-gray-800">{selected.name}</div>
              <div className="text-gray-500 text-sm mt-1">{selected.email}</div>
            </div>
          </div>
          <div className="flex gap-2">
            {selected.status !== 'archived' && (
              <button
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors"
                onClick={() => handleArchive(selected.id)}
              >
                Archivar
              </button>
            )}
            <button
              className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors"
              onClick={() => setConfirmDelete(selected.id)}
            >
              Eliminar
            </button>
          </div>
        </div>

        <div className="px-8 pb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-3xl">
            {/* MENSAJE ORIGINAL */}
            <div className="bg-slate-50 p-6 mb-6 rounded-md">
              <div className="text-xs text-slate-500 mb-2">
                {new Date(selected.created_at).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · {selected.email}
              </div>
              <div className="text-[15px] text-slate-900 leading-relaxed whitespace-pre-wrap break-words">
                {selected.message}
              </div>
            </div>

            {/* RESPUESTA ANTERIOR */}
            {selected.replied && selected.reply_content && (
              <div className="bg-green-50 p-6 mb-6 border-l-4 border-green-500 rounded-md">
                <div className="text-xs text-green-800 mb-2 font-semibold">Tu respuesta</div>
                <div className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap break-words">
                  {selected.reply_content}
                </div>
              </div>
            )}

            {/* RESPONDER */}
            {!selected.replied && selected.status !== 'archived' && (
              <>
                <div className="font-serif text-xl text-slate-900 mb-4">Responder</div>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded mb-3 text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-1 focus:ring-[#1a5f6e]"
                  placeholder="Escribe tu respuesta..."
                  rows={5}
                  value={reply}
                  onChange={e => {
                    setReply(e.target.value);
                    setError('');
                  }}
                />
                {error && <div className="text-xs text-red-600 mb-3">{error}</div>}
                <div className="flex gap-3">
                  <button
                    className="px-5 py-2 bg-[#1a5f6e] text-white rounded font-medium hover:bg-opacity-90 transition-colors text-sm"
                    onClick={handleSendReply}
                  >
                    Enviar respuesta
                  </button>
                  <button
                    className="px-5 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 transition-colors text-sm"
                    onClick={() => setSelected(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── VISTA LISTA ────────────────────────────────────────────────
  return (
    <>
      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar mensaje"
        message="Esta acción es permanente y no se puede deshacer. ¿Eliminar el mensaje?"
        confirmLabel="Eliminar"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />

      <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8 border-b-2 border-gray-200">
        <div>
          <div className="text-2xl font-bold text-gray-800">Mensajes</div>
          <div className="text-gray-500 text-sm mt-1">{unreadCount} sin leer</div>
        </div>
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${f.key === filter ? 'bg-[#1a5f6e] text-white' : 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400">Cargando...</div>
          ) : messages.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No hay mensajes</div>
          ) : (
            messages.map(m => (
              <div
                key={m.id}
                className={`grid grid-cols-[40px_1fr_auto_auto] gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center ${m.status === 'unread' ? 'bg-slate-50' : ''}`}
              >
                {/* Avatar — clickable */}
                <div
                  className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-700 flex-shrink-0 cursor-pointer"
                  onClick={() => handleSelectMessage(m)}
                >
                  {m.name[0]}
                </div>

                {/* Contenido — clickable */}
                <div className="cursor-pointer min-w-0" onClick={() => handleSelectMessage(m)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[13px] text-slate-900 ${m.status === 'unread' ? 'font-bold' : 'font-normal'}`}
                    >
                      {m.name}
                    </span>
                    <span className="text-[11px] text-slate-500">{m.email}</span>
                    {m.apartment_slug && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium uppercase tracking-wider">
                        {m.apartment_slug}
                      </span>
                    )}
                    {m.status === 'unread' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4A843] flex-shrink-0" />
                    )}
                    {m.status === 'archived' && (
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-500 rounded text-[10px]">
                        Archivado
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 overflow-hidden text-ellipsis whitespace-nowrap max-w-[460px]">
                    {m.message}
                  </div>
                </div>

                {/* Fecha */}
                <div className="text-[11px] text-slate-300 whitespace-nowrap">
                  {new Date(m.created_at).toLocaleDateString('es-ES')}
                </div>

                {/* Acciones */}
                <div className="flex gap-1.5">
                  {m.status !== 'archived' && (
                    <button
                      title="Archivar"
                      className="px-2.5 py-1 text-[11px] border border-gray-200 text-gray-500 rounded hover:bg-gray-100 transition-colors"
                      onClick={e => {
                        e.stopPropagation();
                        handleArchive(m.id);
                      }}
                    >
                      Archivar
                    </button>
                  )}
                  <button
                    title="Eliminar"
                    className="px-2.5 py-1 text-[11px] border border-red-200 text-red-500 rounded hover:bg-red-50 transition-colors"
                    onClick={e => {
                      e.stopPropagation();
                      setConfirmDelete(m.id);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
