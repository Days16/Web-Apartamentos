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
  getApartmentBySlug,
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
import { printRegistro } from '../../components/RegistroEntrada';
import { fetchSettings } from '../../services/supabaseService';

const COLORS = {
  blue: '#1a5f6e',
  gray: '#0f172a',
  yellow: '#D4A843',
  darkGray: '#0f172a',
  lightGray: '#f5f5f5',
  success: '#1a5f6e',
  warning: '#D4A843',
  error: '#C0392B',
};

const statusLabels = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
};

const statusBadgeColors = {
  confirmed: { bg: 'rgba(26,95,110, 0.1)', text: '#1a5f6e', border: 'rgba(26,95,110, 0.3)' },
  pending: { bg: 'rgba(212, 168, 67, 0.1)', text: '#D4A843', border: 'rgba(212, 168, 67, 0.3)' },
  cancelled: { bg: 'rgba(192, 57, 43, 0.1)', text: '#C0392B', border: 'rgba(192, 57, 43, 0.3)' },
};

const srcBadge = {
  web: ['Web Directa', '#1a5f6e'],
  booking: ['Web (Booking)', '#1a5f6e'],
};

export default function Reservas() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id');

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [apartmentData, setApartmentData] = useState({});
  const [extrasData, setExtrasData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editingExtras, setEditingExtras] = useState(false);
  const [draftExtras, setDraftExtras] = useState([]);
  const [savingExtras, setSavingExtras] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtros avanzados
  const [filterApt, setFilterApt] = useState('');
  const [filterCheckinFrom, setFilterCheckinFrom] = useState('');
  const [filterCheckinTo, setFilterCheckinTo] = useState('');
  const [filterSource, setFilterSource] = useState('');

  // Selección en lote
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [registroSettings, setRegistroSettings] = useState({});

  // Cargar reservas, apartamentos y extras
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar reservas
      const reservationsData = await getReservations();

      // Cargar extras
      const extrasResponse = await getExtras();
      setExtrasData(extrasResponse);

      // Cargar apartamentos para cada reserva (Optimizado para obtener todos de una vez)
      const allApts = await getApartments();
      const apartmentsMap = {};
      allApts.forEach(apt => {
        apartmentsMap[apt.slug] = apt;
      });

      setApartmentData(apartmentsMap);
      setReservations(reservationsData);
      fetchSettings().then(s => setRegistroSettings(s));

      // Si venimos con un ID de reserva, seleccionarla automáticamente
      if (initialId) {
        const target = reservationsData.find(r => r.id === initialId);
        if (target) {
          setSelectedId(initialId);
          setSelectedReservation(target);
          // Si hay filtros, cambiarlos a 'all' para asegurar que se vea
          setFilter('all');
        }
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error cargando reservas. Intenta recargar la página.');
    } finally {
      setLoading(false);
    }
  };

  // Calcular días hasta check-in o desde check-out
  const getDaysInfo = (checkin, checkout) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Parsear formato "DD MMM" a fecha
      const checkInDate = parseStorageDate(checkin);
      const checkOutDate = parseStorageDate(checkout);

      if (!checkInDate || !checkOutDate) return null;

      const daysToCheckin = Math.floor((checkInDate - today) / (1000 * 60 * 60 * 24));
      const daysSinceCheckout = Math.floor((today - checkOutDate) / (1000 * 60 * 60 * 24));

      if (daysToCheckin > 0) {
        return {
          type: 'upcoming',
          days: daysToCheckin,
          text: `En ${daysToCheckin} día${daysToCheckin !== 1 ? 's' : ''}`,
        };
      } else if (daysToCheckin === 0) {
        return { type: 'today', days: 0, text: 'Hoy' };
      } else if (daysSinceCheckout >= 0) {
        return {
          type: 'past',
          days: daysSinceCheckout,
          text: `Hace ${daysSinceCheckout} día${daysSinceCheckout !== 1 ? 's' : ''}`,
        };
      }
    } catch (err) {
      console.error('Error parsing dates:', err);
    }
    return null;
  };

  const parseStorageDate = dateStr => {
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
      if (parts.length === 2) {
        const day = parseInt(parts[0]);
        const month = months[parts[1]];
        const year = new Date().getFullYear();
        return new Date(year, month, day);
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleMarkCashPaid = async id => {
    setSaving(true);
    try {
      const success = await markCashPaid(id);
      if (success) {
        const updated = reservations.map(r => (r.id === id ? { ...r, cashPaid: true } : r));
        setReservations(updated);
        if (selectedId === id) {
          setSelectedReservation(updated.find(r => r.id === id));
        }
      } else {
        setError('Error marcando pago en efectivo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setSaving(true);
    try {
      const success = await updateReservationStatus(id, newStatus);
      if (success) {
        logAudit('update_reservation_status', 'reservation', id, { newStatus });
        const updated = reservations.map(r => (r.id === id ? { ...r, status: newStatus } : r));
        setReservations(updated);

        const currentReservation = updated.find(r => r.id === id);
        if (selectedId === id) {
          setSelectedReservation(currentReservation);
        }

        if (newStatus === 'cancelled' && currentReservation) {
          const apt = apartmentData[currentReservation.aptSlug];
          sendOwnerNotification({
            type: 'cancellation',
            reservationId: currentReservation.id,
            guestName: currentReservation.guest,
            guestEmail: currentReservation.email,
            apartmentName: apt?.internalName || apt?.name || currentReservation.apt,
            checkin: currentReservation.checkin,
            checkout: currentReservation.checkout,
            nights: currentReservation.nights,
            total: currentReservation.total,
          });
        }
      } else {
        setError('Error actualizando estado.');
      }
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  };

  const handleConfirmAndMarkPaid = async id => {
    setSaving(true);
    try {
      const success = await confirmAndMarkPaid(id);
      if (success) {
        const updated = reservations.map(r =>
          r.id === id ? { ...r, status: 'confirmed', cashPaid: true } : r
        );
        setReservations(updated);
        if (selectedId === id) {
          setSelectedReservation(updated.find(r => r.id === id));
        }
      } else {
        setError('Error al confirmar y marcar como pagado.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReservation = async id => {
    if (
      !window.confirm(
        '¿Estás seguro de que deseas eliminar esta reserva? Esta acción no se puede deshacer.'
      )
    )
      return;

    setSaving(true);
    try {
      const success = await deleteReservation(id);
      if (success) {
        const resToDelete = reservations.find(r => r.id === id);
        if (resToDelete) {
          const apt = apartmentData[resToDelete.aptSlug];
          sendOwnerNotification({
            type: 'cancellation',
            reservationId: resToDelete.id,
            guestName: resToDelete.guest,
            guestEmail: resToDelete.email,
            apartmentName: apt?.internalName || apt?.name || resToDelete.apt,
            checkin: resToDelete.checkin,
            checkout: resToDelete.checkout,
            nights: resToDelete.nights,
            total: resToDelete.total,
          });
        }
        setReservations(prev => prev.filter(r => r.id !== id));
        setSelectedId(null);
        setSelectedReservation(null);
      } else {
        setError('Error al eliminar la reserva.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExtras = async () => {
    if (!selectedReservation) return;
    setSavingExtras(true);
    try {
      const newExtrasTotal = draftExtras.reduce((sum, id) => {
        const extra = extrasData.find(e => e.id === id);
        return sum + (extra?.price ?? 0);
      }, 0);
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

  const handleSelectReservation = reservation => {
    setSelectedId(reservation.id);
    setSelectedReservation(reservation);
  };

  const handleExportExcel = () => {
    exportReservationsExcel(filtered);
  };

  const handleGeneratePDF = () => {
    if (selectedReservation) {
      generateInvoice(selectedReservation);
    }
  };

  const reservationKey = id => (id != null ? String(id) : '');

  const handleBulkExport = () => {
    exportReservationsExcel(filtered.filter(r => selectedIds.has(reservationKey(r.id))));
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    if (!window.confirm(`¿Cambiar ${selectedIds.size} reserva(s) a "${statusLabels[bulkStatus]}"?`))
      return;
    setSaving(true);
    for (const id of selectedIds) {
      await updateReservationStatus(id, bulkStatus);
      logAudit('update_reservation_status', 'reservation', id, {
        newStatus: bulkStatus,
        bulk: true,
      });
    }
    setReservations(prev =>
      prev.map(r =>
        selectedIds.has(reservationKey(r.id)) ? { ...r, status: bulkStatus } : r
      )
    );
    setSelectedIds(new Set());
    setBulkStatus('');
    setSaving(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (
      !window.confirm(
        `¿Eliminar ${selectedIds.size} reserva(s) seleccionadas? Esta acción no se puede deshacer.`
      )
    )
      return;
    setSaving(true);
    for (const id of selectedIds) {
      await deleteReservation(id);
    }
    setReservations(prev => prev.filter(r => !selectedIds.has(reservationKey(r.id))));
    setSelectedIds(new Set());
    setSaving(false);
  };

  const handlePrint = async () => {
    const list = filtered.filter(r => selectedIds.has(reservationKey(r.id)));
    if (list.length === 0) return;
    setSaving(true);
    try {
      for (const r of list) {
        await generateInvoice(r);
      }
    } catch (err) {
      alert('Error al generar PDF: ' + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = id => {
    const key = reservationKey(id);
    if (!key) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visKeys = filtered.map(r => reservationKey(r.id)).filter(Boolean);
    if (visKeys.length === 0) return;
    const allVisible = visKeys.every(k => selectedIds.has(k));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisible) visKeys.forEach(k => next.delete(k));
      else visKeys.forEach(k => next.add(k));
      return next;
    });
  };

  const parseCheckinForCompare = dateStr => {
    const d = parseStorageDate(dateStr);
    if (!d) return null;
    // Ajustar año: si la fecha queda muy en el pasado, asumir año siguiente
    const today = new Date();
    if (d < today && today - d > 180 * 24 * 60 * 60 * 1000) {
      d.setFullYear(d.getFullYear() + 1);
    }
    return d;
  };

  const filtered = reservations.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (filterApt && r.aptSlug !== filterApt) return false;
    if (filterSource && r.source !== filterSource) return false;
    if (filterCheckinFrom || filterCheckinTo) {
      const checkinDate = parseCheckinForCompare(r.checkin);
      if (checkinDate) {
        if (filterCheckinFrom && checkinDate < new Date(filterCheckinFrom)) return false;
        if (filterCheckinTo && checkinDate > new Date(filterCheckinTo + 'T23:59:59')) return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] text-slate-900">
        <div className="text-center">
          <div className="text-lg font-semibold mb-3">Cargando reservas...</div>
          <div className="text-xs text-gray-500">Conectando con base de datos...</div>
        </div>
      </div>
    );
  }

  if (error && !selectedId) {
    return (
      <div className="flex items-center justify-center min-h-[500px] text-red-600">
        <div className="text-center">
          <div className="text-lg font-semibold mb-3">⚠️ {error}</div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-[#1a5f6e] text-white rounded hover:bg-opacity-90 transition-colors font-medium text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Vista de detalle
  if (selectedId && selectedReservation) {
    const apt = apartmentData[selectedReservation.aptSlug];
    const daysInfo = getDaysInfo(selectedReservation.checkin, selectedReservation.checkout);

    const getStatusOptions = () => {
      const current = selectedReservation.status;
      const options = ['pending', 'confirmed', 'cancelled'].filter(s => s !== current);
      return options;
    };

    return (
      <div className="bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 bg-slate-50">
          <div className="flex justify-between items-start flex-col gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedId(null);
                  setSelectedReservation(null);
                }}
                className="px-3.5 py-2 bg-white border border-[#1a5f6e] text-[#1a5f6e] rounded font-medium text-xs hover:bg-[#1a5f6e] hover:text-white transition-colors"
              >
                ← Volver
              </button>
              <div>
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  Reserva{' '}
                  {formatReservationReference(
                    selectedReservation.id,
                    selectedReservation.source,
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {formatGuestDisplay(selectedReservation.guest, selectedReservation.source)}
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                onClick={handleGeneratePDF}
                className="px-3.5 py-2 bg-white border border-[#1a5f6e] text-[#1a5f6e] rounded font-medium text-xs hover:bg-[#1a5f6e] hover:text-white transition-colors"
              >
                ↓ PDF Factura
              </button>
              <button
                onClick={() =>
                  printRegistro({
                    reservation: {
                      id: formatReservationReference(
                        selectedReservation.id,
                        selectedReservation.source,
                      ),
                      guest: formatGuestDisplay(
                        selectedReservation.guest,
                        selectedReservation.source,
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
                className="px-3.5 py-2 bg-white border border-gray-400 text-gray-700 rounded font-medium text-xs hover:bg-gray-100 transition-colors"
              >
                ⎙ Registro entrada
              </button>

              {selectedReservation.status === 'confirmed' && !selectedReservation.cashPaid && (
                <button
                  onClick={() => handleMarkCashPaid(selectedReservation.id)}
                  disabled={saving}
                  className="px-3.5 py-2 bg-[#1a5f6e] text-white rounded font-medium text-xs hover:bg-opacity-90 transition-colors disabled:opacity-60"
                >
                  {saving ? '⏳ Guardando...' : '✓ Marcar como pagado'}
                </button>
              )}

              {selectedReservation.status === 'pending' && (
                <button
                  onClick={() => handleConfirmAndMarkPaid(selectedReservation.id)}
                  disabled={saving}
                  className="px-3.5 py-2 bg-[#1a5f6e] text-white rounded font-medium text-xs hover:bg-opacity-90 transition-colors disabled:opacity-60"
                >
                  {saving ? '⏳ Procesando...' : '✓ Confirmar y Marcar Pagado'}
                </button>
              )}

              {getStatusOptions().length > 0 && (
                <div className="relative inline-block">
                  <button
                    onClick={() => setConfirmAction(confirmAction ? null : 'changeStatus')}
                    className="px-3.5 py-2 bg-white border border-[#D4A843] text-[#D4A843] rounded font-medium text-xs hover:bg-[#D4A843] hover:text-white transition-colors"
                  >
                    Cambiar estado ▼
                  </button>
                  {confirmAction === 'changeStatus' && (
                    <div className="absolute top-full right-0 bg-white border border-[#D4A843] rounded mt-1 shadow-md z-10 w-40 overflow-hidden">
                      {getStatusOptions().map(status => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(selectedReservation.id, status)}
                          disabled={saving}
                          className="block w-full text-left px-4 py-2 text-xs text-slate-800 hover:bg-slate-50 disabled:opacity-60 transition-colors"
                        >
                          • {statusLabels[status]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => handleDeleteReservation(selectedReservation.id)}
                disabled={saving}
                className="px-3.5 py-2 bg-white border border-red-600 text-red-600 rounded font-medium text-xs hover:bg-red-600 hover:text-white transition-colors disabled:opacity-60"
              >
                {saving ? '⏳...' : '🗑 Eliminar'}
              </button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Detalles de la reserva */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-slate-50">
              <div className="bg-[#1a5f6e] text-white px-4 py-3 text-sm font-semibold">
                Detalles de la reserva
              </div>
              <div className="p-4">
                {[
                  [
                    'Referencia',
                    formatReservationReference(
                      selectedReservation.id,
                      selectedReservation.source,
                    ),
                  ],
                  [
                    'Huésped',
                    formatGuestDisplay(selectedReservation.guest, selectedReservation.source),
                  ],
                  ['Email', selectedReservation.email],
                  ['Teléfono', selectedReservation.phone],
                  ['Apartamento', apt?.internalName || apt?.name || selectedReservation.apt],
                  ['Check-in', formatDateShort(selectedReservation.checkin)],
                  ['Check-out', formatDateShort(selectedReservation.checkout)],
                  ['Noches', selectedReservation.nights],
                  [
                    'Origen',
                    srcBadge[selectedReservation.source]?.[0] || selectedReservation.source,
                  ],
                ].map(([label, value], i) => (
                  <div
                    key={i}
                    className={`flex justify-between py-2.5 text-[13px] ${i < 8 ? 'border-b border-gray-200' : ''}`}
                  >
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-slate-900">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2.5 text-[13px]">
                  <span className="text-gray-500">Estado</span>
                  <div
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      selectedReservation.status === 'confirmed'
                        ? 'bg-[#1a5f6e]/10 text-[#1a5f6e] border border-[#1a5f6e]/30'
                        : selectedReservation.status === 'pending'
                          ? 'bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/30'
                          : 'bg-[#C0392B]/10 text-[#C0392B] border border-[#C0392B]/30'
                    }`}
                  >
                    {statusLabels[selectedReservation.status]}
                  </div>
                </div>
                {daysInfo && (
                  <div className="flex justify-between py-2.5 text-[13px] mt-2 pt-3 border-t border-gray-200">
                    <span className="text-gray-500">Próximo evento</span>
                    <span
                      className={`font-semibold ${daysInfo.type === 'upcoming' ? 'text-[#1a5f6e]' : daysInfo.type === 'today' ? 'text-[#D4A843]' : 'text-gray-400'}`}
                    >
                      {daysInfo.text}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Pagos */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-slate-50">
              <div className="bg-[#1a5f6e] text-white px-4 py-3 text-sm font-semibold">
                Resumen de pagos
              </div>
              <div className="p-4">
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
                    className={`flex justify-between py-2.5 text-[13px] ${i < 3 ? 'border-b border-gray-200' : ''}`}
                  >
                    <span className="text-gray-500">{label}</span>
                    <span
                      className={`font-medium ${value.includes('Cobrado') || value.includes('Recibido') ? 'text-[#1a5f6e]' : value.includes('Pendiente') ? 'text-[#D4A843]' : 'text-slate-900'}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-3 mt-2 text-sm font-bold border-t-2 border-gray-200 text-slate-900">
                  <span>Total cobrado</span>
                  <span>
                    {formatPrice(
                      selectedReservation.cashPaid || selectedReservation.status !== 'confirmed'
                        ? selectedReservation.total
                        : selectedReservation.deposit
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Extras — editable */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-slate-50 mb-6">
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
              <span className="text-sm font-semibold text-slate-900">Extras contratados</span>
              {!editingExtras ? (
                <button
                  onClick={() => {
                    setDraftExtras(selectedReservation.extras || []);
                    setEditingExtras(true);
                  }}
                  className="text-xs text-[#1a5f6e] font-semibold hover:underline"
                >
                  Editar
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingExtras(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveExtras}
                    disabled={savingExtras}
                    className="text-xs bg-[#1a5f6e] text-white px-3 py-1 rounded font-semibold disabled:opacity-50"
                  >
                    {savingExtras ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              )}
            </div>
            <div className="p-4">
              {editingExtras ? (
                // Modo edición: checkboxes con todos los extras disponibles
                extrasData.length === 0 ? (
                  <p className="text-xs text-gray-400">No hay extras configurados en el panel.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {extrasData.map(extra => {
                      const checked = draftExtras.includes(extra.id);
                      return (
                        <label
                          key={extra.id}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${checked ? 'bg-[#1a5f6e]/10 border-[#1a5f6e]' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setDraftExtras(prev =>
                                checked ? prev.filter(id => id !== extra.id) : [...prev, extra.id]
                              )
                            }
                            className="accent-[#1a5f6e]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-800 truncate">
                              {extra.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {extra.price > 0 ? formatPrice(extra.price) : 'Gratis'}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )
              ) : // Modo lectura
              !selectedReservation.extras || selectedReservation.extras.length === 0 ? (
                <p className="text-xs text-gray-400">Sin extras contratados.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedReservation.extras.map(extraId => {
                    const extra = extrasData.find(e => e.id === extraId);
                    return extra ? (
                      <div
                        key={extraId}
                        className="px-3 py-1.5 bg-[#1a5f6e]/10 border border-[#1a5f6e] rounded text-xs text-[#1a5f6e] font-medium"
                      >
                        {extra.name}{' '}
                        {extra.price > 0 ? `· ${formatPrice(extra.price)}` : '· Gratis'}
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Información del apartamento */}
          {apt && (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900 mb-3">Apartamento</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  ['Nombre', apt.name],
                  ['Capacidad', apt.cap],
                  ['Dormitorios', apt.beds],
                  ['Baños', apt.baths],
                  ['Precio/noche', formatPrice(apt.price)],
                  ['Estancia mínima', `${apt.minStay} noches`],
                ].map(([label, value], i) => (
                  <div key={i}>
                    <div className="text-[11px] text-gray-500 mb-1">{label}</div>
                    <div className="text-[13px] font-semibold text-slate-900">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista de lista
  return (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6 flex justify-between items-center bg-slate-50">
        <div>
          <div className="text-3xl font-bold text-slate-900 mb-1">Reservas</div>
          <div className="text-sm text-gray-500">
            {filtered.length} reserva{filtered.length !== 1 ? 's' : ''}{' '}
            {filter !== 'all' && `(${statusLabels[filter]})`}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1a5f6e] text-white px-4 py-2.5 rounded font-semibold text-[13px] hover:bg-opacity-90 transition-colors"
          >
            + Nueva reserva manual
          </button>
          <button
            onClick={handleExportExcel}
            disabled={filtered.length === 0}
            className="bg-[#1a5f6e] text-white px-4 py-2.5 rounded font-semibold text-[13px] hover:bg-opacity-90 transition-colors disabled:opacity-60"
          >
            ↓ Exportar Excel
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4 text-xs">
            {error}
          </div>
        )}

        {/* Filtros — estado */}
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
              className={`px-4 py-2 rounded text-[13px] transition-colors whitespace-nowrap ${
                filter === f.id
                  ? 'bg-[#1a5f6e] text-white font-semibold border border-transparent'
                  : 'bg-transparent text-slate-700 font-medium border border-[#ddd] hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Filtros avanzados */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={filterApt}
            onChange={e => setFilterApt(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-[13px] text-slate-700 bg-white"
          >
            <option value="">Todos los apartamentos</option>
            {Object.values(apartmentData).map(a => (
              <option key={a.slug} value={a.slug}>
                {a.internalName || a.name}
              </option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-[13px] text-slate-700 bg-white"
          >
            <option value="">Todas las fuentes</option>
            <option value="web">Web Directa</option>
            <option value="booking">Booking.com</option>
            <option value="airbnb">Airbnb</option>
            <option value="manual">Manual</option>
          </select>
          <label className="flex items-center gap-1 text-[13px] text-slate-600">
            <span>Check-in desde</span>
            <input
              type="date"
              value={filterCheckinFrom}
              onChange={e => setFilterCheckinFrom(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1.5 text-[13px] text-slate-700 bg-white"
            />
          </label>
          <label className="flex items-center gap-1 text-[13px] text-slate-600">
            <span>hasta</span>
            <input
              type="date"
              value={filterCheckinTo}
              onChange={e => setFilterCheckinTo(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1.5 text-[13px] text-slate-700 bg-white"
            />
          </label>
          {(filterApt || filterSource || filterCheckinFrom || filterCheckinTo) && (
            <button
              onClick={() => {
                setFilterApt('');
                setFilterSource('');
                setFilterCheckinFrom('');
                setFilterCheckinTo('');
              }}
              className="text-xs text-red-600 font-semibold hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Acciones en lote — encima de la tabla para verlas sin bajar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
            <div className="text-sm font-bold text-slate-700">
              {selectedIds.size} reserva{selectedIds.size !== 1 ? 's' : ''} seleccionada
              {selectedIds.size !== 1 ? 's' : ''}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-xs bg-white h-9"
              >
                <option value="">Cambiar estado a...</option>
                <option value="confirmed">Confirmada</option>
                <option value="pending">Pendiente</option>
                <option value="cancelled">Cancelada</option>
              </select>
              <button
                onClick={handleBulkStatusChange}
                disabled={!bulkStatus || saving}
                className="bg-[#D4A843] text-white px-4 py-2 rounded text-xs font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50 h-9"
              >
                Aplicar
              </button>
              <div className="w-[1px] h-6 bg-slate-200 mx-2" />
              <button
                onClick={handlePrint}
                className="bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                title="Imprimir / Guardar como PDF"
              >
                <Ico d={paths.printer} size={14} color="currentColor" />
                PDF
              </button>
              <button
                onClick={handleBulkExport}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded text-xs font-bold hover:bg-slate-50 transition-colors h-9"
              >
                ↓ Exportar selección
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={saving}
                className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded text-xs font-bold hover:bg-red-50 transition-colors h-9"
              >
                🗑 Eliminar selección
              </button>
            </div>
          </div>
        )}

        {/* Tabla de reservas */}
        <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filtered.length > 0 &&
                      filtered.every(r => selectedIds.has(reservationKey(r.id)))
                    }
                    onChange={e => {
                      e.stopPropagation();
                      toggleSelectAll();
                    }}
                    className="accent-[#1a5f6e]"
                  />
                </th>
                <th className="px-4 py-3">Huésped / Referencia</th>
                <th className="px-4 py-3">Apartamento</th>
                <th className="px-4 py-3">Fechas</th>
                <th className="px-4 py-3">Noches</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 italic-last">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-400 text-sm">
                    No se han encontrado reservas con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filtered.map(res => (
                  <tr
                    key={res.id}
                    onClick={() => handleSelectReservation(res)}
                    className={`cursor-pointer group hover:bg-slate-50 transition-colors ${selectedId === res.id ? 'bg-blue-50/50' : ''}`}
                  >
                    <td
                      className="px-4 py-4 text-center"
                      onClick={e => {
                        e.stopPropagation();
                        toggleSelect(res.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar reserva ${res.id}`}
                        checked={selectedIds.has(reservationKey(res.id))}
                        onChange={e => {
                          e.stopPropagation();
                          toggleSelect(res.id);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="accent-[#1a5f6e]"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-[#1a5f6e] transition-colors line-clamp-1">
                        {formatGuestDisplay(res.guest, res.source)}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {formatReservationReference(res.id, res.source)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-slate-700">
                        {apartmentData[res.aptSlug]?.internalName ||
                          apartmentData[res.aptSlug]?.name ||
                          res.apt}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700">
                        {res.checkin} → {res.checkout}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700">{res.nights}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-bold text-slate-900">
                        {formatPrice(res.total)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="text-[11px] font-bold px-2 py-1 rounded-sm uppercase tracking-tighter"
                        style={{
                          backgroundColor: `${srcBadge[res.source]?.[1] || '#999'}15`,
                          color: srcBadge[res.source]?.[1] || '#999',
                          border: `1px solid ${srcBadge[res.source]?.[1] || '#999'}30`,
                        }}
                      >
                        {srcBadge[res.source]?.[0] || res.source}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="text-[11px] font-bold px-3 py-1 rounded flex w-fit items-center gap-1.5"
                        style={{
                          backgroundColor: statusBadgeColors[res.status]?.bg,
                          color: statusBadgeColors[res.status]?.text,
                          border: `1px solid ${statusBadgeColors[res.status]?.border}`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: statusBadgeColors[res.status]?.text }}
                        />
                        {statusLabels[res.status]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
