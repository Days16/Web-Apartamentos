/* eslint-disable */
// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApartments, getReservations, createReservation } from '../../services/dataService';
import {
  formatDateNumeric,
  formatPrice,
  dateToStr,
  formatGuestDisplay,
  formatReservationReference,
} from '../../utils/format';
import Ico, { paths } from '../../components/Ico';
import { PanelPageHeader, PanelModal, FormField, FormSection } from '../../components/panel';

// Color configuration based on user image
const STATUS_COLORS = {
  reserved: { bg: '#86efac', text: '#14532d', border: '#4ade80', label: 'Web directa' }, // Verde (Web directa)
  booking: { bg: '#93c5fd', text: '#1e3a8a', border: '#3b82f6', label: 'Booking.com' }, // Azul (Booking)
  pending: { bg: '#fef08a', text: '#713f12', border: '#facc15', label: 'Pendiente' }, // Amarillo
  external: { bg: '#d8b4fe', text: '#4c1d95', border: '#a855f7', label: 'Otros' }, // Morado
  blocked: { bg: '#fecaca', text: '#7f1d1d', border: '#f87171', label: 'Bloqueado' }, // Rojo
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export default function Calendario() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [apartments, setApartments] = useState([]);
  const [reservations, setReservations] = useState([]);

  // State for date range (default 25 days from today)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 12);
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  });
  const [daysToShow, setDaysToShow] = useState(60);

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    aptSlug: '',
    checkin: '',
    checkout: '',
    note: 'Bloqueado por mantenimiento',
  });
  const [selectedApt, setSelectedApt] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const calendarRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Drag-to-block state
  const [dragState, setDragState] = useState<{
    aptSlug: string;
    startDate: string;
    endDate: string;
    active: boolean;
  } | null>(null);

  const todayStr = () => {
    const t = new Date();
    return (
      t.getFullYear() +
      '-' +
      String(t.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(t.getDate()).padStart(2, '0')
    );
  };

  const goToToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(daysToShow / 2));
    setStartDate(
      d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0')
    );
  };

  // Scroll to center "today" in the visible area
  useEffect(() => {
    if (loading) return;

    const todayDStr = new Date().toDateString();
    const [yS, mS, dS] = startDate.split('-').map(Number);
    let todayIndex = -1;
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(yS, mS - 1, dS + i);
      if (d.toDateString() === todayDStr) {
        todayIndex = i;
        break;
      }
    }
    if (todayIndex === -1) return;

    // Double rAF: wait for browser to paint and calculate actual sizes
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const table = container.querySelector('table');
        if (!table) return;
        const allCols = table.querySelectorAll('thead tr:first-child th');
        if (allCols.length < 2) return;

        const stickyColWidth = (allCols[0] as HTMLElement).getBoundingClientRect().width;
        const dayColWidth = (allCols[1] as HTMLElement).getBoundingClientRect().width;
        if (!dayColWidth) return;

        const todayLeft = stickyColWidth + todayIndex * dayColWidth;
        const containerWidth = container.clientWidth;
        const scrollLeft = todayLeft - containerWidth / 2 + dayColWidth / 2;

        container.scrollLeft = Math.max(0, scrollLeft);
      });
    });

    return () => cancelAnimationFrame(raf1);
  }, [loading, startDate, daysToShow]);

  /* ── Drag-to-block ── */
  useEffect(() => {
    function onMouseUp() {
      if (dragState?.active && dragState.startDate && dragState.endDate) {
        const [d1, d2] = [dragState.startDate, dragState.endDate].sort();
        // checkout = day after end of range
        const checkout = new Date(d2);
        checkout.setDate(checkout.getDate() + 1);
        const checkoutStr = dateToStr(checkout);
        setBlockForm(prev => ({
          ...prev,
          aptSlug: dragState.aptSlug,
          checkin: d1,
          checkout: checkoutStr,
        }));
        setIsBlockModalOpen(true);
      }
      setDragState(null);
    }
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [dragState]);

  const handleCellMouseDown = (aptSlug: string, dateStr: string, isOccupied: boolean) => {
    if (isOccupied) return;
    setDragState({ aptSlug, startDate: dateStr, endDate: dateStr, active: true });
  };

  const handleCellMouseEnter = (aptSlug: string, dateStr: string) => {
    if (!dragState?.active || dragState.aptSlug !== aptSlug) return;
    setDragState(prev => (prev ? { ...prev, endDate: dateStr } : null));
  };

  const isDragSelected = (aptSlug: string, dateStr: string): boolean => {
    if (!dragState || dragState.aptSlug !== aptSlug) return false;
    const [d1, d2] = [dragState.startDate, dragState.endDate].sort();
    return dateStr >= d1 && dateStr <= d2;
  };

  const shiftDate = offset => {
    const [y, m, d] = startDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d + offset);
    setStartDate(
      dt.getFullYear() +
        '-' +
        String(dt.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(dt.getDate()).padStart(2, '0')
    );
  };

  const handleBlockDates = async () => {
    if (!blockForm.aptSlug || !blockForm.checkin || !blockForm.checkout) return;
    try {
      const dIn = new Date(blockForm.checkin);
      const dOut = new Date(blockForm.checkout);
      const diffTime = Math.abs(dOut - dIn);
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const resData = {
        id: `BLK-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        guest: blockForm.note || 'Bloqueado',
        aptSlug: blockForm.aptSlug,
        checkin: blockForm.checkin,
        checkout: blockForm.checkout,
        nights: nights > 0 ? nights : 1,
        total: 0,
        deposit: 0,
        status: 'confirmed',
        source: 'manual',
        email: 'info@apartamentosillapancha.com',
      };
      const savedRes = await createReservation(resData);
      setReservations(prev => [...prev, savedRes]);
      setIsBlockModalOpen(false);
      setBlockForm({ aptSlug: '', checkin: '', checkout: '', note: 'Bloqueado por mantenimiento' });
    } catch (err) {
      console.error('Error blocking:', err);
      alert('Error al bloquear: ' + (err.message || err));
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [apts, res] = await Promise.all([getApartments(), getReservations()]);
        setApartments(apts);
        const filteredRes = res.filter(r => r.status !== 'cancelled');
        setReservations(filteredRes);
      } catch (err) {
        console.error('Error cargando datos del calendario:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Generate date array based on range (LOCAL)
  const timelineDates = [];
  const [yS, mS, dS] = startDate.split('-').map(Number);
  for (let i = 0; i < daysToShow; i++) {
    const d = new Date(yS, mS - 1, dS + i);
    timelineDates.push(d);
  }

  const getReservationForDay = (aptSlug, date) => {
    // Normalizar d a YYYY-MM-DD (LOCAL)
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dStr = `${y}-${m}-${day}`;

    return reservations.find(r => {
      const rSlug = r.aptSlug || r.apt_slug || r.apt;

      if (rSlug === aptSlug) {
        // slice(0,10) funciona con cualquier formato: "2026-03-31", "2026-03-31 00:00:00", "2026-03-31T00:00:00+00:00"
        const checkinStr = (
          typeof r.checkin === 'string' ? r.checkin : new Date(r.checkin).toISOString()
        ).slice(0, 10);
        const checkoutStr = (
          typeof r.checkout === 'string' ? r.checkout : new Date(r.checkout).toISOString()
        ).slice(0, 10);

        const match = dStr >= checkinStr && dStr < checkoutStr;
        return match;
      }
      return false;
    });
  };

  const getStatusType = res => {
    if (!res) return null;
    // Robust block detection: by status, by ID, or by manual/blocked origin
    if (
      res.status === 'blocked' ||
      res.id?.startsWith('BLK-') ||
      res.guest?.includes('Bloqueado') ||
      res.source === 'manual'
    )
      return 'blocked';
    if (res.status === 'pending') return 'pending';
    if (res.source === 'booking') return 'booking';
    if (res.source === 'web') return 'reserved';
    if (
      res.source === 'other' ||
      (res.source && res.source !== 'manual' && res.source !== 'web' && res.source !== 'booking')
    )
      return 'external';
    return 'reserved';
  };

  const getReservationsForDetailedList = date => {
    if (!date) return [];
    const d = new Date(date + 'T00:00:00');

    return reservations
      .filter(r => {
        const checkin = new Date(r.checkin + 'T00:00:00');
        const checkout = new Date(r.checkout + 'T00:00:00');
        return d >= checkin && d < checkout;
      })
      .map(r => {
        const apt = apartments.find(a => a.slug === (r.aptSlug || r.apt_slug || r.apt));
        return { ...r, apartmentName: apt?.internalName || apt?.name || 'Apartamento desconocido' };
      });
  };

  const dayReservations = getReservationsForDetailedList(selectedDate);

  if (loading)
    return (
      <div className="panel-page-content">
        <div className="panel-card py-16 text-center panel-text-muted text-sm">
          Cargando línea de tiempo…
        </div>
      </div>
    );

  const filteredApts =
    selectedApt === 'all' ? apartments : apartments.filter(a => a.slug === selectedApt);

  const handlePdf = async () => {
    try {
      setPdfLoading(true);
      const { default: generateCalendarPdf } = await import('../../utils/generateCalendarPdf');
      generateCalendarPdf({
        apartments: filteredApts,
        reservations,
        timelineDates,
      });
    } catch (e) {
      alert('No se pudo generar el PDF: ' + (e?.message || String(e)));
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="panel-page-content">
      <PanelPageHeader
        title="Calendario"
        subtitle={`${reservations.length} reserva${reservations.length !== 1 ? 's' : ''} · ${filteredApts.length} alojamiento${filteredApts.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePdf}
              disabled={pdfLoading || apartments.length === 0}
              className="panel-btn panel-btn-ghost panel-btn-sm"
            >
              <Ico d={paths.printer} size={14} color="currentColor" />
              {pdfLoading ? 'Generando…' : 'PDF'}
            </button>
            <button
              type="button"
              className="panel-btn panel-btn-primary panel-btn-sm"
              onClick={() => setIsBlockModalOpen(true)}
            >
              Bloquear fechas
            </button>
          </div>
        }
      />

      <div className="print:px-0">
        {/* Controles compactos */}
        <div
          className="rounded-xl p-3 mb-3 flex flex-wrap items-center gap-2 print:hidden"
          style={{ background: 'var(--panel-surface-2)', border: '1px solid var(--panel-border)' }}
        >
          {/* Filtro alojamiento */}
          <select
            aria-label="Filtrar por alojamiento"
            className="panel-input text-sm"
            style={{ width: 'auto', padding: '0.375rem 0.75rem' }}
            value={selectedApt}
            onChange={e => setSelectedApt(e.target.value)}
          >
            <option value="all">Todos los alojamientos</option>
            {apartments.map(a => (
              <option key={a.slug} value={a.slug}>
                {a.internalName || a.name}
              </option>
            ))}
          </select>

          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftDate(-daysToShow)}
              className="panel-btn panel-btn-ghost panel-btn-sm"
              title="Período anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="panel-btn panel-btn-ghost panel-btn-sm font-semibold"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => shiftDate(daysToShow)}
              className="panel-btn panel-btn-ghost panel-btn-sm"
              title="Período siguiente"
            >
              ›
            </button>
          </div>

          {/* Fecha manual */}
          <input
            type="date"
            className="panel-input text-sm"
            style={{ width: 'auto', padding: '0.375rem 0.625rem' }}
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />

          {/* Days selector */}
          <div
            className="flex items-center rounded-lg overflow-hidden text-sm"
            style={{ border: '1px solid var(--panel-border)' }}
          >
            {[14, 25, 60].map(n => (
              <button
                type="button"
                key={n}
                onClick={() => setDaysToShow(n)}
                className="px-3 py-1.5 transition-colors"
                style={{
                  background: daysToShow === n ? 'var(--panel-accent)' : 'transparent',
                  color: daysToShow === n ? '#fff' : 'var(--panel-text-muted)',
                  fontWeight: daysToShow === n ? 600 : 400,
                }}
              >
                {n}d
              </button>
            ))}
          </div>

          {/* Leyenda */}
          <div className="calendar-legend flex flex-wrap items-center gap-3 ml-auto text-[11px] font-medium panel-text-muted uppercase tracking-wider">
            {Object.entries(STATUS_COLORS).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="w-3.5 h-3.5 rounded border flex-shrink-0"
                  style={{ backgroundColor: config.bg, borderColor: config.border }}
                />
                <span>{config.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* LINEA DE TIEMPO / CUADRICULA */}
        <div
          ref={scrollContainerRef}
          className="panel-card rounded-xl print:rounded-none"
          style={{ overflowX: 'auto', padding: 0 }}
        >
          <div className="g-cal-print relative">
            <table className="border-collapse" style={{ minWidth: '100%' }}>
              <thead>
                {/* CABECERA FECHAS */}
                <tr className="bg-gray-50 sticky top-0 z-20">
                  <th className="w-48 p-4 border border-gray-200 text-sm font-bold text-gray-600 bg-gray-50 sticky left-0 z-30">
                    Alojamiento
                  </th>
                  {timelineDates.map((date, idx) => (
                    <th
                      key={idx}
                      className={`w-16 min-w-[64px] border border-gray-200 py-2 px-1 text-center font-normal cursor-pointer hover:bg-gray-100 transition-colors ${selectedDate && new Date(selectedDate).toDateString() === date.toDateString() ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedDate(dateToStr(date))}
                    >
                      <div className="text-[14px] font-bold text-gray-700">{date.getDate()}</div>
                      <div className="text-[10px] text-gray-500 uppercase">
                        {MONTH_NAMES[date.getMonth()]}
                      </div>
                      <div className="text-[10px] text-gray-500 mb-1">{date.getFullYear()}</div>
                      <div className="text-[10px] text-gray-500 font-bold border-t border-gray-100 pt-1">
                        {DAY_NAMES[date.getDay()]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredApts.map(apt => (
                  <tr key={apt.slug} className="hover:bg-gray-50/50 group">
                    {/* Celda fija de nombre de apartamento */}
                    <td className="p-3 border border-gray-200 text-xs font-bold text-blue-800 bg-white sticky left-0 z-10 group-hover:bg-gray-50">
                      <div className="truncate max-w-[170px]">{apt.internalName || apt.name}</div>
                    </td>

                    {/* Day cells */}
                    {timelineDates.map((date, idx) => {
                      const dateStr = dateToStr(date);

                      // Reservation occupying this day (checkin <= date < checkout)
                      const res = getReservationForDay(apt.slug, date);
                      const type = getStatusType(res);
                      const config = type ? STATUS_COLORS[type] : null;

                      // Reserva que SALE este día (checkout === date) — ocupa la mañana
                      const resCheckout = reservations.find(r => {
                        const rSlug = r.aptSlug || r.apt_slug || r.apt;
                        return (
                          rSlug === apt.slug &&
                          (typeof r.checkout === 'string' ? r.checkout : '').slice(0, 10) ===
                            dateStr
                        );
                      });
                      const typeOut = getStatusType(resCheckout);
                      const configOut = typeOut ? STATUS_COLORS[typeOut] : null;

                      const isCheckin =
                        res &&
                        (typeof res.checkin === 'string' ? res.checkin : '').slice(0, 10) ===
                          dateStr;
                      const isCheckout = !!resCheckout;
                      // Day with checkout in the morning AND check-in in the afternoon (two different reservations)
                      const isSplitDay = isCheckout && res && resCheckout.id !== res.id;
                      const isToday = new Date().toDateString() === date.toDateString();
                      const isSelected =
                        selectedDate &&
                        new Date(selectedDate + 'T00:00:00').toDateString() === date.toDateString();

                      const isOccupied = !!(res && !isCheckin) || isSplitDay;
                      const isDragSel = isDragSelected(apt.slug, dateStr);

                      return (
                        <td
                          key={idx}
                          className={`h-16 border border-gray-100 relative transition-colors ${isToday ? 'bg-teal/5' : ''} ${isOccupied ? 'cursor-not-allowed' : 'cursor-crosshair hover:bg-gray-50'}`}
                          style={{
                            ...(res && !isCheckin && !isSplitDay && !(isCheckout && !res)
                              ? { backgroundColor: config.bg }
                              : {}),
                            ...(isDragSel && !isOccupied
                              ? {
                                  backgroundColor: 'rgba(26,95,110,.2)',
                                  outline: '1px solid #1a5f6e',
                                }
                              : {}),
                          }}
                          onMouseDown={e => {
                            e.preventDefault();
                            handleCellMouseDown(apt.slug, dateStr, isOccupied);
                          }}
                          onMouseEnter={() => handleCellMouseEnter(apt.slug, dateStr)}
                          onClick={() => !isOccupied && setSelectedDate(dateToStr(date))}
                        >
                          {/* Split day: checkout morning (upper-left triangle) + check-in afternoon (lower-right triangle) */}
                          {isSplitDay && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                              {/* Perfect 50/50 diagonal without white divider line */}
                              <div
                                className="absolute inset-0"
                                style={{
                                  background: `linear-gradient(to bottom right, ${configOut.bg} 49.9%, ${config.bg} 50.1%)`,
                                }}
                              />
                            </div>
                          )}

                          {/* Checkout only this day (morning occupied, afternoon free) */}
                          {isCheckout && !isSplitDay && !res && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                              <div
                                className="absolute inset-0"
                                style={{
                                  background: `linear-gradient(135deg, ${configOut.bg} 50%, transparent 50%)`,
                                }}
                              />
                            </div>
                          )}

                          {/* Check-in only this day (morning free, afternoon occupied) */}
                          {isCheckin && !isSplitDay && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                              <div
                                className="absolute inset-0"
                                style={{
                                  background: `linear-gradient(135deg, transparent 50%, ${config.bg} 50%)`,
                                }}
                              />
                            </div>
                          )}

                          {/* Nombre del huésped en el día de checkin */}
                          {isCheckin && (
                            <div className="absolute bottom-0 right-0 left-0 px-1.5 py-0.5 overflow-hidden pointer-events-none z-10 text-right">
                              <div
                                className="text-[9px] font-bold leading-tight truncate"
                                style={{ color: config.text }}
                              >
                                {formatGuestDisplay(res.guest, res.source)}
                              </div>
                            </div>
                          )}

                          {/* Overlay de selección — encima de todo sin tapar el contenido */}
                          {isSelected && (
                            <div className="absolute inset-0 border-2 border-blue-400 rounded-sm pointer-events-none z-30" />
                          )}

                          {/* Indicador de hoy */}
                          {isToday && (
                            <div className="absolute inset-x-0 top-0 h-0.5 bg-teal-500 z-20" />
                          )}

                          {/* Borde izquierdo para días ocupados intermedios (excepto primera columna para limpieza visual) */}
                          {res && !isCheckin && !isSplitDay && idx !== 0 && (
                            <div
                              className="absolute inset-y-0 left-0 w-[1px]"
                              style={{ backgroundColor: config.border }}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* REPETIR CABECERA AL FINAL SI HAY MUCHOS */}
                <tr className="bg-gray-50">
                  <th className="p-4 border border-gray-200 text-sm font-bold text-gray-600 sticky left-0 z-10 bg-gray-50">
                    Alojamiento
                  </th>
                  {timelineDates.map((date, idx) => (
                    <th
                      key={idx}
                      className="border border-gray-200 py-2 px-1 text-center font-normal"
                    >
                      <div className="text-[12px] font-bold text-gray-700">{date.getDate()}</div>
                      <div className="text-[10px] text-gray-500 uppercase">
                        {MONTH_NAMES[date.getMonth()]}
                      </div>
                      <div className="text-[10px] text-gray-400 mb-0.5">{date.getFullYear()}</div>
                      <div className="text-[10px] text-gray-500 font-bold">
                        {DAY_NAMES[date.getDay()]}
                      </div>
                    </th>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* BOTTOM DETAIL PANEL */}
        {selectedDate && (
          <div className="mt-5 panel-card panel-animate-in print:hidden">
            <div className="flex items-center justify-between mb-5">
              <h3 className="panel-h3">
                Reservas para el{' '}
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <button
                className="panel-btn panel-btn-ghost panel-btn-sm"
                onClick={() => setSelectedDate(null)}
              >
                Cerrar ✕
              </button>
            </div>

            {dayReservations.length === 0 ? (
              <div
                className="py-10 text-center panel-text-muted text-sm rounded-lg"
                style={{
                  background: 'var(--panel-surface-2)',
                  border: '1px dashed var(--panel-border)',
                }}
              >
                No hay reservas para este día en los alojamientos seleccionados.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dayReservations.map(res => {
                  const type = getStatusType(res);
                  const config = STATUS_COLORS[type];
                  return (
                    <div
                      key={res.id}
                      className="rounded-xl p-4 transition-shadow hover:shadow-md"
                      style={{
                        border: '1px solid var(--panel-border)',
                        background: 'var(--panel-surface-2)',
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-[10px] font-bold panel-text-muted uppercase tracking-wider mb-1">
                            {res.apartmentName ||
                              apartments.find(a => a.slug === (res.aptSlug || res.apt))
                                ?.internalName}
                          </div>
                          <div
                            className="text-sm font-bold truncate"
                            style={{ color: 'var(--panel-text)' }}
                          >
                            {formatGuestDisplay(res.guest, res.source)}
                          </div>
                        </div>
                        <div
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0"
                          style={{
                            background: config.bg,
                            color: config.text,
                            border: `1px solid ${config.border}`,
                          }}
                        >
                          {config.label}
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-3 text-sm panel-text-muted">
                        <div>
                          📅 {new Date(res.checkin + 'T00:00:00').toLocaleDateString()} →{' '}
                          {new Date(res.checkout + 'T00:00:00').toLocaleDateString()}
                        </div>
                        <div>
                          💰{' '}
                          <span className="font-bold" style={{ color: 'var(--panel-text)' }}>
                            {formatPrice(res.total || 0)}
                          </span>{' '}
                          ({res.nights} noche{res.nights !== 1 ? 's' : ''})
                        </div>
                        <div className="font-mono text-[11px]">
                          🆔 {formatReservationReference(res.id, res.source)}
                        </div>
                      </div>
                      <div
                        className="pt-3 border-t flex justify-between items-center"
                        style={{ borderColor: 'var(--panel-border)' }}
                      >
                        <span className="text-[10px] panel-text-muted uppercase">
                          {res.source || 'Directo'}
                        </span>
                        <button
                          className="text-xs font-semibold hover:underline"
                          style={{ color: 'var(--panel-accent)' }}
                          onClick={() => navigate(`/gestion/reservas?id=${res.id}`)}
                        >
                          Ver reserva →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL BLOQUEO */}
      <PanelModal
        open={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        title="Bloquear fechas"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button
              className="panel-btn panel-btn-ghost panel-btn-sm"
              onClick={() => setIsBlockModalOpen(false)}
            >
              Cancelar
            </button>
            <button className="panel-btn panel-btn-primary panel-btn-sm" onClick={handleBlockDates}>
              Bloquear
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Apartamento" required>
            <select
              aria-label="Apartamento para bloquear"
              className="panel-input"
              value={blockForm.aptSlug}
              onChange={e => setBlockForm({ ...blockForm, aptSlug: e.target.value })}
            >
              <option value="">Selecciona…</option>
              {apartments.map(a => (
                <option key={a.slug} value={a.slug}>
                  {a.internalName || a.name}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Entrada" required>
              <input
                type="date"
                className="panel-input"
                value={blockForm.checkin}
                onChange={e => setBlockForm({ ...blockForm, checkin: e.target.value })}
              />
            </FormField>
            <FormField label="Salida" required>
              <input
                type="date"
                className="panel-input"
                value={blockForm.checkout}
                onChange={e => setBlockForm({ ...blockForm, checkout: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Nota">
            <input
              type="text"
              className="panel-input"
              value={blockForm.note}
              onChange={e => setBlockForm({ ...blockForm, note: e.target.value })}
              placeholder="Ej: Mantenimiento anual"
            />
          </FormField>
        </div>
      </PanelModal>

      <style>{`
        @media print {
          aside,
          nav {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .g-cal-print table {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
