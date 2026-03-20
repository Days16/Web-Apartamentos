import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDateShort, formatPrice } from '../../utils/format';
import { getReservations, getApartmentBySlug, getExtras, markCashPaid, updateReservationStatus, deleteReservation, confirmAndMarkPaid } from '../../services/dataService';
import generateInvoice from '../../utils/generateInvoice';
import exportReservationsExcel from '../../utils/exportExcel';
import ManualBookingModal from '../../components/ManualBookingModal';
import { sendOwnerNotification } from '../../services/resendService';

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
  booking: ['Booking.com', '#003580'],
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
  const [confirmAction, setConfirmAction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

      // Cargar apartamentos para cada reserva
      const apartments = {};
      for (const res of reservationsData) {
        if (res.aptSlug && !apartments[res.aptSlug]) {
          const apt = await getApartmentBySlug(res.aptSlug);
          if (apt) {
            apartments[res.aptSlug] = apt;
          }
        }
      }
      setApartmentData(apartments);
      setReservations(reservationsData);

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
        return { type: 'upcoming', days: daysToCheckin, text: `En ${daysToCheckin} día${daysToCheckin !== 1 ? 's' : ''}` };
      } else if (daysToCheckin === 0) {
        return { type: 'today', days: 0, text: 'Hoy' };
      } else if (daysSinceCheckout >= 0) {
        return { type: 'past', days: daysSinceCheckout, text: `Hace ${daysSinceCheckout} día${daysSinceCheckout !== 1 ? 's' : ''}` };
      }
    } catch (err) {
      console.error('Error parsing dates:', err);
    }
    return null;
  };

  const parseStorageDate = (dateStr) => {
    try {
      const months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
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

  const handleMarkCashPaid = async (id) => {
    setSaving(true);
    try {
      const success = await markCashPaid(id);
      if (success) {
        const updated = reservations.map(r => r.id === id ? { ...r, cashPaid: true } : r);
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
        const updated = reservations.map(r => r.id === id ? { ...r, status: newStatus } : r);
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
            apartmentName: apt?.name || currentReservation.apt,
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

  const handleConfirmAndMarkPaid = async (id) => {
    setSaving(true);
    try {
      const success = await confirmAndMarkPaid(id);
      if (success) {
        const updated = reservations.map(r => r.id === id ? { ...r, status: 'confirmed', cashPaid: true } : r);
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

  const handleDeleteReservation = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta reserva? Esta acción no se puede deshacer.')) return;

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
            apartmentName: apt?.name || resToDelete.apt,
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

  const handleSelectReservation = (reservation) => {
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

  const filtered = reservations.filter(r => filter === 'all' || r.status === filter);

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
          <button onClick={fetchData} className="px-4 py-2 bg-[#1a5f6e] text-white rounded hover:bg-opacity-90 transition-colors font-medium text-sm">
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
                  Reserva {selectedReservation.id}
                </div>
                <div className="text-sm text-gray-500">{selectedReservation.guest}</div>
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
                  ['Referencia', selectedReservation.id],
                  ['Huésped', selectedReservation.guest],
                  ['Email', selectedReservation.email],
                  ['Teléfono', selectedReservation.phone],
                  ['Apartamento', apt?.name || selectedReservation.apt],
                  ['Check-in', formatDateShort(selectedReservation.checkin)],
                  ['Check-out', formatDateShort(selectedReservation.checkout)],
                  ['Noches', selectedReservation.nights],
                  ['Origen', srcBadge[selectedReservation.source]?.[0] || selectedReservation.source],
                ].map(([label, value], i) => (
                  <div key={i} className={`flex justify-between py-2.5 text-[13px] ${i < 8 ? 'border-b border-gray-200' : ''}`}>
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-slate-900">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2.5 text-[13px]">
                  <span className="text-gray-500">Estado</span>
                  <div className={`px-3 py-1 rounded text-xs font-semibold ${selectedReservation.status === 'confirmed' ? 'bg-[#1a5f6e]/10 text-[#1a5f6e] border border-[#1a5f6e]/30' :
                    selectedReservation.status === 'pending' ? 'bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/30' :
                      'bg-[#C0392B]/10 text-[#C0392B] border border-[#C0392B]/30'
                    }`}>
                    {statusLabels[selectedReservation.status]}
                  </div>
                </div>
                {daysInfo && (
                  <div className="flex justify-between py-2.5 text-[13px] mt-2 pt-3 border-t border-gray-200">
                    <span className="text-gray-500">Próximo evento</span>
                    <span className={`font-semibold ${daysInfo.type === 'upcoming' ? 'text-[#1a5f6e]' : daysInfo.type === 'today' ? 'text-[#D4A843]' : 'text-gray-400'}`}>
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
                  ...(selectedReservation.extrasTotal > 0 ? [['Extras incluidos', formatPrice(selectedReservation.extrasTotal)]] : []),
                  ['Depósito (50%)', `${formatPrice(selectedReservation.deposit)} · ${selectedReservation.status === 'confirmed' ? '✓ Cobrado' : '---'}`],
                  ['Pago al llegar (50%)', `${formatPrice(selectedReservation.deposit)} · ${selectedReservation.cashPaid ? '✓ Recibido' : 'Pendiente'}`],
                ].map(([label, value], i) => (
                  <div key={i} className={`flex justify-between py-2.5 text-[13px] ${i < 3 ? 'border-b border-gray-200' : ''}`}>
                    <span className="text-gray-500">{label}</span>
                    <span className={`font-medium ${value.includes('Cobrado') || value.includes('Recibido') ? 'text-[#1a5f6e]' : value.includes('Pendiente') ? 'text-[#D4A843]' : 'text-slate-900'}`}>
                      {value}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-3 mt-2 text-sm font-bold border-t-2 border-gray-200 text-slate-900">
                  <span>Total cobrado</span>
                  <span>{formatPrice(selectedReservation.cashPaid || selectedReservation.status !== 'confirmed' ? selectedReservation.total : selectedReservation.deposit)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Extras */}
          {selectedReservation.extras && selectedReservation.extras.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-slate-50 mb-6 p-4">
              <div className="text-sm font-semibold text-slate-900 mb-3">
                Extras contratados
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedReservation.extras.map(extraId => {
                  const extra = extrasData.find(e => e.id === extraId);
                  return extra ? (
                    <div key={extraId} className="px-3 py-1.5 bg-[#1a5f6e]/10 border border-[#1a5f6e] rounded text-xs text-[#1a5f6e] font-medium">
                      {extra.name} {extra.price > 0 ? `· ${formatPrice(extra.price)}` : '· Gratis'}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Información del apartamento */}
          {apt && (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900 mb-3">
                Apartamento
              </div>
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
          <div className="text-sm text-gray-500">{filtered.length} reserva{filtered.length !== 1 ? 's' : ''} {filter !== 'all' && `(${statusLabels[filter]})`}</div>
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

        {/* Filtros */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'pending', label: 'Pendientes' },
            { id: 'confirmed', label: 'Confirmadas' },
            { id: 'cancelled', label: 'Canceladas' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded text-[13px] transition-colors whitespace-nowrap ${filter === f.id
                ? 'bg-[#1a5f6e] text-white font-semibold border border-transparent'
                : 'bg-transparent text-slate-700 font-medium border border-[#ddd] hover:bg-slate-50'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tabla */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-6 text-gray-500">
            <div className="text-base font-semibold mb-2 text-slate-800">
              No hay reservas
            </div>
            <div className="text-[13px]">
              {filter !== 'all' ? `No hay reservas ${statusLabels[filter].toLowerCase()}` : 'Carga un archivo o crea una reserva manual'}
            </div>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm">
            <table className="w-full border-collapse text-[13px]">
              <thead className="bg-slate-50 border-b-2 border-gray-200">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-700">Ref.</th>
                  <th className="p-3 text-left font-semibold text-slate-700">Huésped</th>
                  <th className="p-3 text-left font-semibold text-slate-700">Apartamento</th>
                  <th className="p-3 text-left font-semibold text-slate-700">Fechas</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Noches</th>
                  <th className="p-3 text-right font-semibold text-slate-700">Total</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Estado</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Pago</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Info</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const daysInfo = getDaysInfo(r.checkin, r.checkout);
                  return (
                    <tr
                      key={i}
                      className={`border-b border-gray-200 cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}
                      onClick={() => handleSelectReservation(r)}
                    >
                      <td className="p-3 font-mono text-[11px] text-gray-500">{r.id}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{r.guest}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{r.email}</div>
                      </td>
                      <td className="p-3 text-slate-700">{r.apt}</td>
                      <td className="p-3 text-[12px] text-gray-600 whitespace-nowrap">
                        {r.checkin} → {r.checkout}
                      </td>
                      <td className="p-3 text-center font-medium text-slate-700">{r.nights}</td>
                      <td className="p-3 text-right font-semibold text-slate-800 whitespace-nowrap">{r.total} €</td>
                      <td className="p-3 text-center">
                        <div className={`px-2 py-1 rounded text-[11px] font-semibold inline-block ${r.status === 'confirmed' ? 'bg-[#1a5f6e]/10 text-[#1a5f6e] border border-[#1a5f6e]/30' :
                          r.status === 'pending' ? 'bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/30' :
                            'bg-[#C0392B]/10 text-[#C0392B] border border-[#C0392B]/30'
                          }`}>
                          {statusLabels[r.status]}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {r.cashPaid ? (
                          <div className="text-[#1a5f6e] font-semibold text-sm">✓</div>
                        ) : r.status === 'confirmed' ? (
                          <div className="text-[#D4A843] font-semibold text-xs">50%</div>
                        ) : (
                          <div className="text-gray-400 text-xs">—</div>
                        )}
                      </td>
                      <td className="p-3 text-center text-[12px]">
                        {daysInfo ? (
                          <div className={`font-medium ${daysInfo.type === 'upcoming' ? 'text-[#1a5f6e]' : daysInfo.type === 'today' ? 'text-[#D4A843]' : 'text-gray-400'}`}>
                            {daysInfo.text}
                          </div>
                        ) : (
                          <div className="text-gray-400">—</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ManualBookingModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={(newRes) => {
            setIsModalOpen(false);
            setReservations(prev => [newRes, ...prev]);
          }}
        />
      )}
    </div>
  );
}
