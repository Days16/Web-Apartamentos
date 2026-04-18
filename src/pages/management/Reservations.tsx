/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  formatDateShort,
  formatPrice,
  formatGuestDisplay,
  formatReservationReference,
} from '../../utils/format';
import {
  getReservations,
  getApartments,
  getExtras,
  markCashPaid,
  updateReservationStatus,
  deleteReservation,
  confirmAndMarkPaid,
} from '../../services/dataService';
import { logAudit } from '../../services/supabaseService';
import generateInvoice from '../../utils/generateInvoice';
import exportReservationsExcel from '../../utils/exportExcel';
import ManualBookingModal from '../../components/ManualBookingModal';
import Ico, { paths } from '../../components/Ico';
import { sendOwnerNotification } from '../../services/resendService';
import { printCheckIn } from '../../components/CheckInForm';
import { fetchSettings } from '../../services/supabaseService';
import {
  PanelPageHeader,
  PanelTable,
  PanelBadge,
  PanelSlideOver,
  PanelCard,
  PanelConfirm,
  FormField,
  FormSection,
  ReservationTimeline,
  ReservationKanban,
} from '../../components/panel';
import type { Column } from '../../components/panel';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error'> = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'error',
};
const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
};
const SRC_LABEL: Record<string, string> = {
  web: 'Web',
  booking: 'Booking',
  airbnb: 'Airbnb',
  manual: 'Manual',
};

export default function Reservas() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id');

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [apartmentData, setApartmentData] = useState({});
  const [extrasData, setExtrasData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editingExtras, setEditingExtras] = useState(false);
  const [draftExtras, setDraftExtras] = useState([]);
  const [savingExtras, setSavingExtras] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(null); // { id, status }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registroSettings, setRegistroSettings] = useState({});

  // Filtros avanzados
  const [filterApt, setFilterApt] = useState('');
  const [filterCheckinFrom, setFilterCheckinFrom] = useState('');
  const [filterCheckinTo, setFilterCheckinTo] = useState('');
  const [filterSource, setFilterSource] = useState('');

  // Filtros guardados
  const [savedFilters, setSavedFilters] = useState<
    Array<{ name: string; apt: string; source: string; from: string; to: string; status: string }>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem('reservas_saved_filters') || '[]');
    } catch {
      return [];
    }
  });
  const [saveInputOpen, setSaveInputOpen] = useState(false);
  const [saveInputName, setSaveInputName] = useState('');

  function doSaveFilter() {
    if (!saveInputName.trim()) return;
    const entry = {
      name: saveInputName.trim(),
      apt: filterApt,
      source: filterSource,
      from: filterCheckinFrom,
      to: filterCheckinTo,
      status: filter,
    };
    const next = [...savedFilters, entry];
    setSavedFilters(next);
    localStorage.setItem('reservas_saved_filters', JSON.stringify(next));
    setSaveInputName('');
    setSaveInputOpen(false);
  }

  function applySavedFilter(f: (typeof savedFilters)[number]) {
    setFilterApt(f.apt);
    setFilterSource(f.source);
    setFilterCheckinFrom(f.from);
    setFilterCheckinTo(f.to);
    setFilter(f.status || 'all');
  }

  function deleteSavedFilter(idx: number) {
    const next = savedFilters.filter((_, i) => i !== idx);
    setSavedFilters(next);
    localStorage.setItem('reservas_saved_filters', JSON.stringify(next));
  }

  // Selección en lote
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');

  // Vista tabla vs kanban
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  /* ── carga ── */
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rData, allApts, extrasResp] = await Promise.all([
        getReservations(),
        getApartments(),
        getExtras(),
      ]);
      const aptMap = {};
      allApts.forEach(a => {
        aptMap[a.slug] = a;
      });
      setApartmentData(aptMap);
      setReservations(rData);
      setExtrasData(extrasResp);
      fetchSettings().then(s => setRegistroSettings(s));
      if (initialId) {
        const t = rData.find(r => r.id === initialId);
        if (t) {
          setSelectedReservation(t);
          setSlideOpen(true);
          setFilter('all');
        }
      }
    } catch (err) {
      setError('Error cargando reservas. Intenta recargar la página.');
    } finally {
      setLoading(false);
    }
  };

  /* ── helpers fecha ── */
  const parseStorageDate = dateStr => {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.substring(0, 10).split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    try {
      const months = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };
      const parts = dateStr.trim().split(/\s+/);
      if (parts.length >= 2)
        return new Date(new Date().getFullYear(), months[parts[1]], parseInt(parts[0]));
    } catch {}
    return null;
  };

  const getDaysInfo = (checkin, checkout) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ci = parseStorageDate(checkin);
    const co = parseStorageDate(checkout);
    if (!ci || !co) return null;
    const daysToCheckin = Math.floor((ci.getTime() - today.getTime()) / 86400000);
    const daysSinceCheckout = Math.floor((today.getTime() - co.getTime()) / 86400000);
    if (daysToCheckin > 0)
      return { type: 'upcoming', text: `En ${daysToCheckin} día${daysToCheckin !== 1 ? 's' : ''}` };
    if (daysToCheckin === 0) return { type: 'today', text: 'Hoy' };
    if (daysSinceCheckout >= 0)
      return {
        type: 'past',
        text: `Hace ${daysSinceCheckout} día${daysSinceCheckout !== 1 ? 's' : ''}`,
      };
    return null;
  };

  /* ── acciones ── */
  const handleMarkCashPaid = async id => {
    setSaving(true);
    try {
      const ok = await markCashPaid(id);
      if (ok) updateLocal(id, { cashPaid: true });
      else setError('Error marcando pago en efectivo.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setSaving(true);
    try {
      const ok = await updateReservationStatus(id, newStatus);
      if (ok) {
        logAudit('update_reservation_status', 'reservation', id, { newStatus });
        updateLocal(id, { status: newStatus });
        if (newStatus === 'cancelled') {
          const r = reservations.find(r => r.id === id);
          const apt = apartmentData[r?.aptSlug];
          if (r)
            sendOwnerNotification({
              type: 'cancellation',
              reservationId: r.id,
              guestName: r.guest,
              guestEmail: r.email,
              apartmentName: apt?.internalName || apt?.name || r.apt,
              checkin: r.checkin,
              checkout: r.checkout,
              nights: r.nights,
              total: r.total,
            });
        }
      } else setError('Error actualizando estado.');
    } finally {
      setSaving(false);
      setConfirmStatus(null);
    }
  };

  const handleConfirmAndMarkPaid = async id => {
    setSaving(true);
    try {
      const ok = await confirmAndMarkPaid(id);
      if (ok) updateLocal(id, { status: 'confirmed', cashPaid: true });
      else setError('Error al confirmar y marcar como pagado.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReservation = async id => {
    setSaving(true);
    try {
      const rToDel = reservations.find(r => r.id === id);
      const ok = await deleteReservation(id);
      if (ok) {
        if (rToDel) {
          const apt = apartmentData[rToDel.aptSlug];
          sendOwnerNotification({
            type: 'cancellation',
            reservationId: rToDel.id,
            guestName: rToDel.guest,
            guestEmail: rToDel.email,
            apartmentName: apt?.internalName || apt?.name || rToDel.apt,
            checkin: rToDel.checkin,
            checkout: rToDel.checkout,
            nights: rToDel.nights,
            total: rToDel.total,
          });
        }
        setReservations(prev => prev.filter(r => r.id !== id));
        setSlideOpen(false);
        setSelectedReservation(null);
      } else setError('Error al eliminar la reserva.');
    } finally {
      setSaving(false);
      setConfirmDel(false);
    }
  };

  const handleSaveExtras = async () => {
    if (!selectedReservation) return;
    setSavingExtras(true);
    try {
      const newExtrasTotal = draftExtras.reduce(
        (s, id) => s + (extrasData.find(e => e.id === id)?.price ?? 0),
        0
      );
      const { error } = await import('../../lib/supabase').then(m =>
        m.supabase
          .from('reservations')
          .update({ extras: draftExtras, extras_total: newExtrasTotal })
          .eq('id', selectedReservation.id)
      );
      if (error) throw error;
      const updated = { ...selectedReservation, extras: draftExtras, extrasTotal: newExtrasTotal };
      setSelectedReservation(updated);
      setReservations(prev =>
        prev.map(r =>
          r.id === updated.id ? { ...r, extras: draftExtras, extrasTotal: newExtrasTotal } : r
        )
      );
      setEditingExtras(false);
    } catch (err) {
      alert('Error al guardar extras: ' + err.message);
    } finally {
      setSavingExtras(false);
    }
  };

  /* ── helpers locales ── */
  const updateLocal = (id, patch) => {
    setReservations(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
    setSelectedReservation(prev => (prev?.id === id ? { ...prev, ...patch } : prev));
  };

  const reservationKey = id => (id != null ? String(id) : '');

  const toggleSelect = id => {
    const k = reservationKey(id);
    if (!k) return;
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };
  const toggleSelectAll = () => {
    const keys = filtered.map(r => reservationKey(r.id)).filter(Boolean);
    const allSel = keys.every(k => selectedIds.has(k));
    setSelectedIds(prev => {
      const n = new Set(prev);
      allSel ? keys.forEach(k => n.delete(k)) : keys.forEach(k => n.add(k));
      return n;
    });
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setSaving(true);
    for (const id of selectedIds) {
      await updateReservationStatus(id, bulkStatus);
      logAudit('update_reservation_status', 'reservation', id, {
        newStatus: bulkStatus,
        bulk: true,
      });
    }
    setReservations(prev =>
      prev.map(r => (selectedIds.has(reservationKey(r.id)) ? { ...r, status: bulkStatus } : r))
    );
    setSelectedIds(new Set());
    setBulkStatus('');
    setSaving(false);
  };

  const handleBulkDelete = async () => {
    setSaving(true);
    for (const id of selectedIds) await deleteReservation(id);
    setReservations(prev => prev.filter(r => !selectedIds.has(reservationKey(r.id))));
    setSelectedIds(new Set());
    setSaving(false);
  };

  const handlePrintSelected = async () => {
    const list = filtered.filter(r => selectedIds.has(reservationKey(r.id)));
    if (!list.length) return;
    setSaving(true);
    try {
      for (const r of list) await generateInvoice(r);
    } catch (err) {
      alert('Error al generar PDF: ' + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  /* ── filtrado ── */
  const parseCheckinForCompare = dateStr => {
    const d = parseStorageDate(dateStr);
    if (!d) return null;
    const today = new Date();
    if (d < today && today.getTime() - d.getTime() > 180 * 86400000)
      d.setFullYear(d.getFullYear() + 1);
    return d;
  };

  const filtered = reservations.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (filterApt && r.aptSlug !== filterApt) return false;
    if (filterSource && r.source !== filterSource) return false;
    if (filterCheckinFrom || filterCheckinTo) {
      const d = parseCheckinForCompare(r.checkin);
      if (d) {
        if (filterCheckinFrom && d < new Date(filterCheckinFrom)) return false;
        if (filterCheckinTo && d > new Date(filterCheckinTo + 'T23:59:59')) return false;
      }
    }
    return true;
  });

  const aptName = r =>
    apartmentData[r.aptSlug]?.internalName || apartmentData[r.aptSlug]?.name || r.apt || '—';

  /* ── columnas tabla ── */
  const columns: Column<any>[] = [
    {
      key: 'guest',
      label: 'Huésped / Ref',
      render: (_, r) => (
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--panel-text)' }}>
            {formatGuestDisplay(r.guest, r.source)}
          </div>
          <div className="text-[10px] font-mono panel-text-muted mt-0.5">
            {formatReservationReference(r.id, r.source)}
          </div>
        </div>
      ),
    },
    {
      key: 'aptSlug',
      label: 'Apartamento',
      render: (_, r) => <span className="text-sm">{aptName(r)}</span>,
    },
    {
      key: 'checkin',
      label: 'Fechas',
      width: 170,
      render: (_, r) => (
        <span className="text-xs panel-text-muted">
          {r.checkin} → {r.checkout}
        </span>
      ),
    },
    {
      key: 'nights',
      label: 'Noches',
      width: 64,
      align: 'right' as const,
      render: (_, r) => <span className="text-sm">{r.nights}</span>,
    },
    {
      key: 'total',
      label: 'Total',
      width: 90,
      align: 'right' as const,
      render: (_, r) => (
        <span className="text-sm font-semibold" style={{ color: 'var(--panel-text)' }}>
          {formatPrice(r.total)}
        </span>
      ),
    },
    {
      key: 'source',
      label: 'Origen',
      width: 80,
      render: (_, r) => (
        <PanelBadge variant={r.source === 'manual' ? 'warning' : 'info'}>
          {SRC_LABEL[r.source] || r.source || 'Web'}
        </PanelBadge>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      width: 110,
      render: (_, r) => (
        <PanelBadge
          variant={STATUS_VARIANT[r.status] || 'neutral'}
          dot
          pulse={r.status === 'pending'}
        >
          {STATUS_LABEL[r.status] || r.status}
        </PanelBadge>
      ),
    },
  ];

  /* ── render ── */
  const hasAdvancedFilters = filterApt || filterSource || filterCheckinFrom || filterCheckinTo;

  return (
    <div className="panel-page-content">
      <PanelPageHeader
        title="Reservas"
        subtitle={`${filtered.length} reserva${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            {/* Toggle vista */}
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--panel-border)' }}
            >
              <button
                onClick={() => setViewMode('table')}
                className="px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  background: viewMode === 'table' ? 'var(--panel-accent)' : 'transparent',
                  color: viewMode === 'table' ? '#fff' : 'var(--panel-text-muted)',
                }}
                aria-label="Vista tabla"
              >
                ☰ Tabla
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className="px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  background: viewMode === 'kanban' ? 'var(--panel-accent)' : 'transparent',
                  color: viewMode === 'kanban' ? '#fff' : 'var(--panel-text-muted)',
                }}
                aria-label="Vista kanban"
              >
                ⊞ Kanban
              </button>
            </div>
            <button
              className="panel-btn panel-btn-ghost panel-btn-sm"
              onClick={() => exportReservationsExcel(filtered)}
              disabled={filtered.length === 0}
            >
              ↓ Excel
            </button>
            <button
              className="panel-btn panel-btn-primary panel-btn-sm"
              onClick={() => setIsModalOpen(true)}
            >
              + Nueva reserva
            </button>
          </div>
        }
      />

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm"
          style={{
            background: 'rgba(220,38,38,.08)',
            color: '#dc2626',
            border: '1px solid rgba(220,38,38,.2)',
          }}
        >
          {error}
          <button className="ml-3 underline text-xs" onClick={fetchData}>
            Reintentar
          </button>
        </div>
      )}

      {/* Filtros de estado */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'pending', label: 'Pendientes' },
          { id: 'confirmed', label: 'Confirmadas' },
          { id: 'cancelled', label: 'Canceladas' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`panel-btn panel-btn-sm whitespace-nowrap ${filter === f.id ? 'panel-btn-primary' : 'panel-btn-ghost'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtros avanzados */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select
          aria-label="Filtrar por apartamento"
          value={filterApt}
          onChange={e => setFilterApt(e.target.value)}
          className="panel-input text-sm"
          style={{ width: 'auto', padding: '0.375rem 0.75rem' }}
        >
          <option value="">Todos los apartamentos</option>
          {Object.values(apartmentData).map((a: any) => (
            <option key={a.slug} value={a.slug}>
              {a.internalName || a.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por fuente"
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          className="panel-input text-sm"
          style={{ width: 'auto', padding: '0.375rem 0.75rem' }}
        >
          <option value="">Todas las fuentes</option>
          <option value="web">Web Directa</option>
          <option value="booking">Booking.com</option>
          <option value="airbnb">Airbnb</option>
          <option value="manual">Manual</option>
        </select>
        <label className="reservations-date-label flex items-center gap-2 text-sm panel-text-muted">
          Check-in desde
          <input
            type="date"
            value={filterCheckinFrom}
            onChange={e => setFilterCheckinFrom(e.target.value)}
            className="panel-input text-sm"
            style={{ width: 'auto', padding: '0.375rem 0.625rem' }}
          />
        </label>
        <label className="reservations-date-label flex items-center gap-2 text-sm panel-text-muted">
          hasta
          <input
            type="date"
            value={filterCheckinTo}
            onChange={e => setFilterCheckinTo(e.target.value)}
            className="panel-input text-sm"
            style={{ width: 'auto', padding: '0.375rem 0.625rem' }}
          />
        </label>
        {hasAdvancedFilters && (
          <button
            className="text-xs panel-text-muted hover:underline"
            onClick={() => {
              setFilterApt('');
              setFilterSource('');
              setFilterCheckinFrom('');
              setFilterCheckinTo('');
            }}
          >
            Limpiar filtros ✕
          </button>
        )}
        {hasAdvancedFilters && !saveInputOpen && (
          <button
            className="panel-btn panel-btn-ghost panel-btn-sm"
            onClick={() => setSaveInputOpen(true)}
            title="Guardar combinación de filtros actual"
          >
            ☆ Guardar filtro
          </button>
        )}
        {hasAdvancedFilters && saveInputOpen && (
          <div className="flex gap-1 items-center">
            <input
              className="panel-input text-xs"
              style={{ width: '140px', padding: '0.25rem 0.5rem' }}
              placeholder="Nombre del filtro…"
              value={saveInputName}
              onChange={e => setSaveInputName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') doSaveFilter();
                if (e.key === 'Escape') {
                  setSaveInputOpen(false);
                  setSaveInputName('');
                }
              }}
              autoFocus
            />
            <button
              className="panel-btn panel-btn-primary panel-btn-sm"
              onClick={doSaveFilter}
              disabled={!saveInputName.trim()}
            >
              Guardar
            </button>
            <button
              className="panel-btn panel-btn-ghost panel-btn-sm"
              onClick={() => {
                setSaveInputOpen(false);
                setSaveInputName('');
              }}
              aria-label="Cancelar"
            >
              ✕
            </button>
          </div>
        )}
        {savedFilters.length > 0 && (
          <div className="relative group">
            <button className="panel-btn panel-btn-ghost panel-btn-sm">
              Filtros guardados ({savedFilters.length}) ▾
            </button>
            <div
              className="absolute left-0 top-full mt-1 z-30 rounded-lg shadow-lg min-w-[200px] hidden group-hover:block"
              style={{
                background: 'var(--panel-surface)',
                border: '1px solid var(--panel-border)',
              }}
            >
              {savedFilters.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50/50 gap-2"
                >
                  <button
                    className="flex-1 text-left truncate"
                    style={{ color: 'var(--panel-text)' }}
                    onClick={() => applySavedFilter(f)}
                  >
                    {f.name}
                  </button>
                  <button
                    onClick={() => deleteSavedFilter(idx)}
                    className="shrink-0 text-xs panel-text-muted hover:text-red-500 transition-colors"
                    title="Eliminar este filtro guardado"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Barra de acciones bulk */}
      {selectedIds.size > 0 && (
        <div
          className="mb-4 px-4 py-3 rounded-lg flex flex-wrap items-center justify-between gap-3 sticky top-2 z-20"
          style={{
            background: 'var(--panel-surface-2)',
            border: '1px solid var(--panel-border)',
            boxShadow: 'var(--panel-shadow-md)',
          }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--panel-text)' }}>
            {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              aria-label="Cambiar estado en lote"
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="panel-input text-xs"
              style={{ width: 'auto', padding: '0.375rem 0.625rem' }}
            >
              <option value="">Cambiar estado a…</option>
              <option value="confirmed">Confirmada</option>
              <option value="pending">Pendiente</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <button
              className="panel-btn panel-btn-sm"
              style={{ background: 'var(--panel-accent-gold)', color: '#fff' }}
              disabled={!bulkStatus || saving}
              onClick={handleBulkStatusChange}
            >
              Aplicar
            </button>
            <div style={{ width: 1, height: 20, background: 'var(--panel-border)' }} />
            <button
              className="panel-btn panel-btn-ghost panel-btn-sm"
              onClick={handlePrintSelected}
            >
              <Ico d={paths.printer} size={13} color="currentColor" /> PDF
            </button>
            <button
              className="panel-btn panel-btn-ghost panel-btn-sm"
              onClick={() =>
                exportReservationsExcel(filtered.filter(r => selectedIds.has(reservationKey(r.id))))
              }
            >
              ↓ Excel
            </button>
            <button
              className="panel-btn panel-btn-sm panel-btn-danger"
              disabled={saving}
              onClick={handleBulkDelete}
            >
              Eliminar selección
            </button>
          </div>
        </div>
      )}

      {/* Vista tabla */}
      {viewMode === 'table' && (
        <div className="panel-card overflow-hidden" style={{ padding: 0 }}>
          <PanelTable
            columns={columns}
            data={filtered}
            rowKey={r => String(r.id ?? '')}
            loading={loading}
            skeletonRows={6}
            emptyText="No se han encontrado reservas con los filtros actuales."
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={r => {
              setSelectedReservation(r);
              setSlideOpen(true);
            }}
          />
        </div>
      )}

      {/* Vista kanban */}
      {viewMode === 'kanban' && (
        <ReservationKanban
          reservations={filtered}
          aptName={aptName}
          onCardClick={r => {
            setSelectedReservation(r);
            setSlideOpen(true);
          }}
        />
      )}

      {/* SlideOver detalle */}
      {selectedReservation && (
        <PanelSlideOver
          open={slideOpen}
          onClose={() => {
            setSlideOpen(false);
            setEditingExtras(false);
          }}
          width="560px"
          title={`Reserva ${formatReservationReference(selectedReservation.id, selectedReservation.source)}`}
          subtitle={formatGuestDisplay(selectedReservation.guest, selectedReservation.source)}
          footer={
            <div className="flex flex-wrap gap-2">
              <button
                className="panel-btn panel-btn-ghost panel-btn-sm"
                onClick={() => generateInvoice(selectedReservation)}
              >
                ↓ PDF Reserva
              </button>
              <button
                className="panel-btn panel-btn-ghost panel-btn-sm"
                onClick={() =>
                  printCheckIn({
                    reservation: {
                      id: formatReservationReference(
                        selectedReservation.id,
                        selectedReservation.source
                      ),
                      guest: formatGuestDisplay(
                        selectedReservation.guest,
                        selectedReservation.source
                      ),
                      email: selectedReservation.email,
                      phone: selectedReservation.phone,
                      checkin: selectedReservation.checkin,
                      checkout: selectedReservation.checkout,
                      apt_slug: selectedReservation.aptSlug,
                      source: selectedReservation.source,
                    },
                    settings: registroSettings,
                    apartmentName:
                      apartmentData[selectedReservation.aptSlug]?.internalName ||
                      apartmentData[selectedReservation.aptSlug]?.name,
                  })
                }
              >
                ⎙ Registro entrada
              </button>
              {selectedReservation.status === 'confirmed' && !selectedReservation.cashPaid && (
                <button
                  className="panel-btn panel-btn-primary panel-btn-sm"
                  disabled={saving}
                  onClick={() => handleMarkCashPaid(selectedReservation.id)}
                >
                  ✓ Marcar pagado
                </button>
              )}
              {selectedReservation.status === 'pending' && (
                <button
                  className="panel-btn panel-btn-primary panel-btn-sm"
                  disabled={saving}
                  onClick={() => handleConfirmAndMarkPaid(selectedReservation.id)}
                >
                  ✓ Confirmar y pagar
                </button>
              )}
              <button
                className="panel-btn panel-btn-sm panel-btn-danger ml-auto"
                disabled={saving}
                onClick={() => setConfirmDel(true)}
              >
                Eliminar
              </button>
            </div>
          }
        >
          {/* Cambiar estado */}
          <div className="flex flex-wrap gap-2 mb-5">
            {(['pending', 'confirmed', 'cancelled'] as const)
              .filter(s => s !== selectedReservation.status)
              .map(s => (
                <button
                  key={s}
                  className="panel-btn panel-btn-ghost panel-btn-sm"
                  onClick={() => setConfirmStatus({ id: selectedReservation.id, status: s })}
                >
                  → {STATUS_LABEL[s]}
                </button>
              ))}
          </div>

          {/* Detalles de la reserva */}
          <PanelCard title="Detalles de la reserva" className="mb-4">
            {[
              [
                'Referencia',
                formatReservationReference(selectedReservation.id, selectedReservation.source),
              ],
              [
                'Huésped',
                formatGuestDisplay(selectedReservation.guest, selectedReservation.source),
              ],
              ['Email', selectedReservation.email],
              ['Teléfono', selectedReservation.phone],
              [
                'Apartamento',
                apartmentData[selectedReservation.aptSlug]?.internalName ||
                  apartmentData[selectedReservation.aptSlug]?.name ||
                  selectedReservation.apt,
              ],
              ['Check-in', formatDateShort(selectedReservation.checkin)],
              ['Check-out', formatDateShort(selectedReservation.checkout)],
              ['Noches', selectedReservation.nights],
              ['Origen', SRC_LABEL[selectedReservation.source] || selectedReservation.source],
            ].map(([label, value], i) => (
              <div
                key={i}
                className="flex justify-between py-2 text-sm border-b last:border-b-0"
                style={{ borderColor: 'var(--panel-border)' }}
              >
                <span className="panel-text-muted">{label}</span>
                <span className="font-medium" style={{ color: 'var(--panel-text)' }}>
                  {value}
                </span>
              </div>
            ))}
            <div className="flex justify-between py-2 text-sm">
              <span className="panel-text-muted">Estado</span>
              <PanelBadge variant={STATUS_VARIANT[selectedReservation.status] || 'neutral'} dot>
                {STATUS_LABEL[selectedReservation.status] || selectedReservation.status}
              </PanelBadge>
            </div>
            {(() => {
              const info = getDaysInfo(selectedReservation.checkin, selectedReservation.checkout);
              if (!info) return null;
              return (
                <div
                  className="flex justify-between py-2 text-sm border-t mt-2"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  <span className="panel-text-muted">Próximo evento</span>
                  <span
                    className="font-semibold"
                    style={{
                      color:
                        info.type === 'upcoming'
                          ? 'var(--panel-accent)'
                          : info.type === 'today'
                            ? 'var(--panel-accent-gold)'
                            : 'var(--panel-text-muted)',
                    }}
                  >
                    {info.text}
                  </span>
                </div>
              );
            })()}
          </PanelCard>

          {/* Pagos */}
          <PanelCard title="Resumen de pagos" className="mb-4">
            {[
              ['Total reserva', formatPrice(selectedReservation.total)],
              ...(selectedReservation.extrasTotal > 0
                ? [['Extras incluidos', formatPrice(selectedReservation.extrasTotal)]]
                : []),
              [
                'Depósito (50%)',
                `${formatPrice(selectedReservation.deposit)} · ${selectedReservation.status === 'confirmed' ? '✓ Cobrado' : '---'}`,
              ],
              [
                'Pago al llegar (50%)',
                `${formatPrice(selectedReservation.deposit)} · ${selectedReservation.cashPaid ? '✓ Recibido' : 'Pendiente'}`,
              ],
            ].map(([label, value], i) => (
              <div
                key={i}
                className="flex justify-between py-2 text-sm border-b last:border-b-0"
                style={{ borderColor: 'var(--panel-border)' }}
              >
                <span className="panel-text-muted">{label}</span>
                <span
                  className="font-medium"
                  style={{
                    color:
                      String(value).includes('Cobrado') || String(value).includes('Recibido')
                        ? 'var(--panel-accent)'
                        : String(value).includes('Pendiente')
                          ? 'var(--panel-accent-gold)'
                          : 'var(--panel-text)',
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
            <div
              className="flex justify-between py-3 text-sm font-bold border-t-2 mt-2"
              style={{ borderColor: 'var(--panel-border)', color: 'var(--panel-text)' }}
            >
              <span>Total cobrado</span>
              <span>
                {formatPrice(
                  selectedReservation.cashPaid || selectedReservation.status !== 'confirmed'
                    ? selectedReservation.total
                    : selectedReservation.deposit
                )}
              </span>
            </div>
          </PanelCard>

          {/* Extras */}
          <PanelCard
            title="Extras contratados"
            actions={
              !editingExtras ? (
                <button
                  className="text-xs font-semibold"
                  style={{ color: 'var(--panel-accent)' }}
                  onClick={() => {
                    setDraftExtras(selectedReservation.extras || []);
                    setEditingExtras(true);
                  }}
                >
                  Editar
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    className="text-xs panel-text-muted hover:underline"
                    onClick={() => setEditingExtras(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="text-xs font-semibold panel-btn panel-btn-primary panel-btn-sm"
                    disabled={savingExtras}
                    onClick={handleSaveExtras}
                  >
                    {savingExtras ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              )
            }
            className="mb-4"
          >
            {editingExtras ? (
              extrasData.length === 0 ? (
                <p className="text-xs panel-text-muted">No hay extras configurados.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {extrasData.map(extra => {
                    const checked = draftExtras.includes(extra.id);
                    return (
                      <label
                        key={extra.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors"
                        style={{
                          background: checked ? 'rgba(26,95,110,.08)' : 'var(--panel-surface-2)',
                          borderColor: checked ? 'var(--panel-accent)' : 'var(--panel-border)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          className="accent-[#1a5f6e]"
                          onChange={() =>
                            setDraftExtras(prev =>
                              checked ? prev.filter(id => id !== extra.id) : [...prev, extra.id]
                            )
                          }
                        />
                        <div>
                          <div
                            className="text-xs font-semibold"
                            style={{ color: 'var(--panel-text)' }}
                          >
                            {extra.name}
                          </div>
                          <div className="text-xs panel-text-muted">
                            {extra.price > 0 ? formatPrice(extra.price) : 'Gratis'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )
            ) : !selectedReservation.extras || selectedReservation.extras.length === 0 ? (
              <p className="text-xs panel-text-muted">Sin extras contratados.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedReservation.extras.map(extraId => {
                  const e = extrasData.find(ex => ex.id === extraId);
                  return e ? (
                    <PanelBadge key={extraId} variant="info">
                      {e.name}
                      {e.price > 0 ? ` · ${formatPrice(e.price)}` : ''}
                    </PanelBadge>
                  ) : null;
                })}
              </div>
            )}
          </PanelCard>

          {/* Apartamento info */}
          {(() => {
            const apt = apartmentData[selectedReservation.aptSlug];
            if (!apt) return null;
            return (
              <PanelCard title="Apartamento">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    ['Nombre', apt.name],
                    ['Capacidad', apt.cap],
                    ['Dormitorios', apt.beds],
                    ['Baños', apt.baths],
                    ['Precio/noche', formatPrice(apt.price)],
                    ['Mín. noches', `${apt.minStay} noches`],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-[11px] panel-text-muted mb-1">{label}</div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--panel-text)' }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </PanelCard>
            );
          })()}

          {/* Timeline historial */}
          {selectedReservation && (
            <PanelCard title="Historial de actividad">
              <ReservationTimeline reservationId={selectedReservation.id} />
            </PanelCard>
          )}
        </PanelSlideOver>
      )}

      {/* Confirm eliminar */}
      <PanelConfirm
        open={confirmDel}
        variant="destructive"
        title="¿Eliminar esta reserva?"
        description="Esta acción no se puede deshacer. Se enviará una notificación al propietario."
        confirmLabel="Eliminar"
        loading={saving}
        onConfirm={() => handleDeleteReservation(selectedReservation?.id)}
        onCancel={() => setConfirmDel(false)}
      />

      {/* Confirm cambio estado */}
      {confirmStatus && (
        <PanelConfirm
          open={!!confirmStatus}
          title={`¿Cambiar estado a "${STATUS_LABEL[confirmStatus.status]}"?`}
          confirmLabel="Confirmar"
          loading={saving}
          onConfirm={() => handleStatusChange(confirmStatus.id, confirmStatus.status)}
          onCancel={() => setConfirmStatus(null)}
        />
      )}

      {/* Modal nueva reserva manual */}
      {isModalOpen && (
        <ManualBookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchData}
          apartments={Object.values(apartmentData)}
        />
      )}
    </div>
  );
}
