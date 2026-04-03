/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchAllApartments } from '../../services/supabaseService';
import Ico, { paths } from '../../components/Ico';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function timeAgo(iso: string) {
  if (!iso) return 'Nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Ahora mismo';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h} h`;
  return `Hace ${Math.floor(h / 24)} días`;
}

export default function IcalAdmin() {
  const [sources, setSources] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null); // id de la fuente en sync
  const [syncingAll, setSyncingAll] = useState(false);
  const [form, setForm] = useState({ apartment_slug: '', url: '' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const [{ data: src }, apts] = await Promise.all([
      supabase.from('ical_sources').select('*').order('created_at'),
      fetchAllApartments(),
    ]);
    setSources(src || []);
    setApartments(apts || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // ── Añadir fuente ─────────────────────────────────────────────────────────
  const handleAdd = async e => {
    e.preventDefault();
    if (!form.apartment_slug || !form.url) {
      setError('Selecciona un apartamento e introduce la URL del calendario.');
      return;
    }
    if (!form.url.startsWith('http')) {
      setError('La URL debe empezar por http:// o https://');
      return;
    }
    setError('');
    setAdding(true);
    const { error: err } = await supabase
      .from('ical_sources')
      .insert({ apartment_slug: form.apartment_slug, url: form.url });
    if (err) {
      setError(err.message);
    } else {
      setForm({ apartment_slug: '', url: '' });
      await load();
    }
    setAdding(false);
  };

  // ── Eliminar fuente ───────────────────────────────────────────────────────
  const handleDelete = async (id: string, slug: string) => {
    if (
      !confirm(
        '¿Eliminar esta fuente?\n\nLas reservas importadas de Booking.com para este apartamento también se eliminarán.'
      )
    )
      return;

    await supabase.from('ical_sources').delete().eq('id', id);
    // Eliminar reservas importadas de esta fuente
    await supabase
      .from('reservations')
      .delete()
      .eq('source', 'booking')
      .eq('apt_slug', slug)
      .like('ical_uid', `booking-${slug}-%`);

    await load();
  };

  // ── Sincronizar una fuente ────────────────────────────────────────────────
  const handleSync = async (id: string) => {
    setSyncing(id);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-ical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err: any) {
      alert(`Error al sincronizar: ${err.message}`);
    }
    await load();
    setSyncing(null);
  };

  // ── Activar/Desactivar fuente ───────────────────────────────────────────
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error: err } = await supabase
      .from('ical_sources')
      .update({ active: !currentStatus })
      .eq('id', id);

    if (err) {
      alert(`Error al cambiar estado: ${err.message}`);
    } else {
      await load();
    }
  };

  // ── Sincronizar todo ──────────────────────────────────────────────────────
  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-ical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err: any) {
      alert(`Error al sincronizar: ${err.message}`);
    }
    await load();
    setSyncingAll(false);
  };

  const exportUrl = (slug: string) => {
    // Extraer ref de proyecto de VITE_SUPABASE_URL (ej: wzjonvdauwaispnjosaw)
    const ref = SUPABASE_URL.match(/https?:\/\/([^.]+)\./)?.[1];
    if (ref) {
      return `https://${ref}.functions.supabase.co/export-ical?slug=${slug}`;
    }
    // Fallback al gateway si no se puede extraer la ref
    return `${SUPABASE_URL}/functions/v1/export-ical?slug=${slug}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-navy dark:text-white">
            Sincronización Booking.com
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Importa las reservas de Booking.com vía iCal para evitar dobles reservas.
          </p>
        </div>
        {sources.length > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Ico
              d={syncingAll ? paths.sync : paths.sync}
              size={15}
              color="white"
              className={syncingAll ? 'animate-spin' : ''}
            />
            {syncingAll ? 'Sincronizando…' : 'Sincronizar todo'}
          </button>
        )}
      </div>

      {/* Cómo obtener la URL de Booking.com */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex gap-3">
          <Ico d={paths.check} size={16} color="#3b82f6" className="shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <p className="font-semibold">¿Dónde encuentro la URL iCal de Booking.com?</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-700 dark:text-blue-400">
              <li>
                Inicia sesión en la <strong>Extranet de Booking.com</strong>
              </li>
              <li>
                Ve a <strong>Calendario → Sincronizar calendarios</strong>
              </li>
              <li>
                Copia la URL del enlace <strong>"Exportar calendario"</strong> (.ics)
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Añadir nueva fuente */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-navy dark:text-white mb-4">
          Añadir calendario de Booking.com
        </h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
          <select
            value={form.apartment_slug}
            onChange={e => setForm(f => ({ ...f, apartment_slug: e.target.value }))}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-navy dark:text-white w-48"
          >
            <option value="">Apartamento…</option>
            {apartments.map(a => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            type="url"
            placeholder="https://admin.booking.com/hotel/...ics"
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            className="flex-1 min-w-64 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-navy dark:text-white placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Ico d={paths.plus} size={14} color="white" />
            {adding ? 'Añadiendo…' : 'Añadir'}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {/* Lista de fuentes */}
      {sources.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Ico d={paths.sync} size={32} color="#9ca3af" />
          <p className="mt-3 text-sm">No hay calendarios configurados todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map(src => {
            const apt = apartments.find(a => a.slug === src.apartment_slug);
            const issyncing = syncing === src.id;
            const statusOk = src.last_status === 'ok';
            const statusErr = src.last_status === 'error';

            return (
              <div
                key={src.id}
                className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-opacity ${src.active === false ? 'opacity-60 grayscale-[0.5]' : ''}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Estado */}
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          src.active === false
                            ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                            : statusOk
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : statusErr
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${src.active === false ? 'bg-gray-300' : statusOk ? 'bg-green-500' : statusErr ? 'bg-red-500' : 'bg-gray-400'}`}
                        />
                        {src.active === false
                          ? 'Desactivado'
                          : statusOk
                            ? 'OK'
                            : statusErr
                              ? 'Error'
                              : 'Sin sincronizar'}
                      </span>
                      <span className="text-sm font-semibold text-navy dark:text-white">
                        {apt?.name || src.apartment_slug}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate max-w-xs md:max-w-md lg:max-w-lg mb-1">
                      {src.url}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      <span>
                        Última sync: <strong>{timeAgo(src.last_sync)}</strong>
                      </span>
                      {src.last_message && (
                        <span className={statusErr ? 'text-red-500' : ''}>{src.last_message}</span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleActive(src.id, src.active !== false)}
                      title={
                        src.active === false
                          ? 'Activar sincronización'
                          : 'Desactivar sincronización'
                      }
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors border ${
                        src.active === false
                          ? 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Ico
                        d={src.active === false ? paths.check : paths.sync}
                        size={13}
                        color="currentColor"
                      />
                      {src.active === false ? 'Activar' : 'Desactivar'}
                    </button>
                    <button
                      onClick={() => handleSync(src.id)}
                      disabled={issyncing || src.active === false}
                      title="Sincronizar ahora"
                      className="flex items-center gap-1.5 text-xs border border-teal-600 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-30"
                    >
                      <Ico
                        d={paths.sync}
                        size={13}
                        color="currentColor"
                        className={issyncing ? 'animate-spin' : ''}
                      />
                      {issyncing ? 'Sync…' : 'Sync'}
                    </button>
                    <button
                      onClick={() => handleDelete(src.id, src.apartment_slug)}
                      title="Eliminar"
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Ico d={paths.trash} size={15} color="currentColor" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Exportar calendarios propios */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-navy dark:text-white mb-1">
          Exportar calendarios propios
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Usa estas URLs en Booking.com para importar tus reservas directas y evitar huecos.
        </p>
        <div className="space-y-2">
          {apartments.map(apt => (
            <div key={apt.slug} className="flex items-center gap-3 text-sm">
              <span className="w-36 text-gray-700 dark:text-gray-300 font-medium shrink-0 truncate">
                {apt.name}
              </span>
              <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded truncate">
                {exportUrl(apt.slug)}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(exportUrl(apt.slug))}
                title="Copiar URL"
                className="shrink-0 p-1.5 text-gray-400 hover:text-teal-600 transition-colors"
              >
                <Ico d={paths.copy} size={14} color="currentColor" />
              </button>
              <a
                href={exportUrl(apt.slug)}
                target="_blank"
                rel="noopener noreferrer"
                title="Descargar .ics"
                className="shrink-0 p-1.5 text-gray-400 hover:text-teal-600 transition-colors"
              >
                <Ico d={paths.download} size={14} color="currentColor" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
