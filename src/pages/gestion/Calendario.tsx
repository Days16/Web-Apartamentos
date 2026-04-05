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

// Configuración de colores según la imagen del usuario
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

  // Estado para el rango de fechas (por defecto 25 días desde hoy)
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
  const [daysToShow, setDaysToShow] = useState(25);

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

  // Scroll para centrar "hoy" en el área visible
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

    // Doble rAF: esperar a que el navegador haya pintado y calculado los tamaños reales
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

  // Generar array de fechas segun el rango (LOCAL)
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
    // Detección robusta de bloques: por status, por ID o por origen manual/bloqueado
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

  if (loading) return <div className="p-10 text-gray-400">Cargando línea de tiempo...</div>;

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
    <div className="bg-white min-h-screen">
      {/* Cabecera (misma línea visual que Reservas) */}
      <div className="border-b border-gray-200 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50">
        <div>
          <div className="text-3xl font-bold text-slate-900 mb-1">Calendario</div>
          <div className="text-sm text-gray-500">
            {reservations.length} reserva{reservations.length !== 1 ? 's' : ''}
            {' · '}
            {filteredApts.length} alojamiento{filteredApts.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePdf}
            disabled={pdfLoading || apartments.length === 0}
            className="bg-white border border-gray-300 text-gray-600 px-4 py-2.5 rounded font-semibold text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Descargar PDF del calendario (tabla de ocupación)"
          >
            <Ico d={paths.printer} size={16} color="currentColor" />
            {pdfLoading ? 'Generando…' : 'PDF'}
          </button>
          <button
            type="button"
            onClick={() => setIsBlockModalOpen(true)}
            className="bg-[#1a5f6e] text-white px-4 py-2.5 rounded font-semibold text-[13px] hover:bg-opacity-90 transition-colors"
          >
            Bloquear
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 print:px-2 print:py-2">
        {/* Controles (ocultos al imprimir) */}
        <div className="bg-white border border-gray-200 rounded-t-xl p-4 flex flex-wrap items-center gap-3 shadow-sm print:hidden">
          {/* Filtro alojamiento */}
          <select
            className="border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-teal-500"
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

          {/* Navegación de fechas */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftDate(-daysToShow)}
              className="border border-gray-300 rounded px-2.5 py-1.5 text-sm hover:bg-gray-50 transition-colors"
              title="Período anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => shiftDate(daysToShow)}
              className="border border-gray-300 rounded px-2.5 py-1.5 text-sm hover:bg-gray-50 transition-colors"
              title="Período siguiente"
            >
              ›
            </button>
          </div>

          {/* Fecha manual */}
          <input
            type="date"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:border-teal-500"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />

          {/* Selector de días */}
          <div className="flex items-center gap-1 rounded border border-gray-300 overflow-hidden text-sm">
            {[14, 25, 60].map(n => (
              <button
                type="button"
                key={n}
                onClick={() => setDaysToShow(n)}
                className={`px-3 py-1.5 transition-colors ${daysToShow === n ? 'bg-teal-600 text-white font-semibold' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {n}d
              </button>
            ))}
          </div>

          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-4">
            {/* Leyenda */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              {Object.entries(STATUS_COLORS).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded border shrink-0"
                    style={{ backgroundColor: config.bg, borderColor: config.border }}
                  />
                  <span>{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LINEA DE TIEMPO / CUADRICULA */}
        <div ref={scrollContainerRef} className="bg-white border-x border-b border-gray-200 shadow-sm rounded-b-xl print:rounded-none" style={{ overflowX: 'auto' }}>
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

                  {/* Celdas de días */}
                  {timelineDates.map((date, idx) => {
                    const dateStr = dateToStr(date);

                    // Reserva que ocupa este día (checkin <= date < checkout)
                    const res = getReservationForDay(apt.slug, date);
                    const type = getStatusType(res);
                    const config = type ? STATUS_COLORS[type] : null;

                    // Reserva que SALE este día (checkout === date) — ocupa la mañana
                    const resCheckout = reservations.find(r => {
                      const rSlug = r.aptSlug || r.apt_slug || r.apt;
                      return (
                        rSlug === apt.slug &&
                        (typeof r.checkout === 'string' ? r.checkout : '').slice(0, 10) === dateStr
                      );
                    });
                    const typeOut = getStatusType(resCheckout);
                    const configOut = typeOut ? STATUS_COLORS[typeOut] : null;

                    const isCheckin =
                      res &&
                      (typeof res.checkin === 'string' ? res.checkin : '').slice(0, 10) === dateStr;
                    const isCheckout = !!resCheckout;
                    // Día con salida por la mañana Y entrada por la tarde (dos reservas distintas)
                    const isSplitDay = isCheckout && res && resCheckout.id !== res.id;
                    const isToday = new Date().toDateString() === date.toDateString();
                    const isSelected =
                      selectedDate &&
                      new Date(selectedDate + 'T00:00:00').toDateString() === date.toDateString();

                    return (
                      <td
                        key={idx}
                        className={`h-16 border border-gray-100 relative cursor-pointer transition-colors ${isToday ? 'bg-teal/5' : ''} hover:bg-gray-50`}
                        style={
                          res && !isCheckin && !isSplitDay && !(isCheckout && !res)
                            ? { backgroundColor: config.bg }
                            : {}
                        }
                        onClick={() => setSelectedDate(dateToStr(date))}
                      >
                        {/* Día partido: salida mañana (triángulo superior-izq) + entrada tarde (triángulo inferior-der) */}
                        {isSplitDay && (
                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {/* Diagonal perfecta 50%/50% sin línea blanca divisoria */}
                            <div
                              className="absolute inset-0"
                              style={{
                                background: `linear-gradient(to bottom right, ${configOut.bg} 49.9%, ${config.bg} 50.1%)`,
                              }}
                            />
                          </div>
                        )}

                        {/* Solo salida este día (mañana ocupada, tarde libre) */}
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

                        {/* Solo entrada este día (mañana libre, tarde ocupada) */}
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

        {/* PANEL DE DETALLE INFERIOR */}
        {selectedDate && (
          <div className="mt-8 bg-white border border-gray-200 rounded-xl shadow-sm p-6 animate-in slide-in-from-bottom-4 duration-300 print:hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-navy">
              Reservas para el{' '}
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cerrar detalle
            </button>
          </div>

          {dayReservations.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400 font-medium">
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
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {res.apartmentName ||
                            apartments.find(a => a.slug === (res.aptSlug || res.apt))?.internalName}
                        </div>
                        <div className="text-lg font-bold text-[#0f172a] truncate">
                          {formatGuestDisplay(res.guest, res.source)}
                        </div>
                      </div>
                      <div
                        className="px-2 py-1 rounded text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: config.bg,
                          color: config.text,
                          border: `1px solid ${config.border}`,
                        }}
                      >
                        {config.label}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-5 text-gray-400">📅</span>
                        <span>
                          {new Date(res.checkin + 'T00:00:00').toLocaleDateString()} -{' '}
                          {new Date(res.checkout + 'T00:00:00').toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-5 text-gray-400">💰</span>
                        <span className="font-bold">{formatPrice(res.total || 0)}</span>
                        <span className="text-xs opacity-60">
                          ({res.nights} {res.nights === 1 ? 'noche' : 'noches'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-5 text-gray-400">🆔</span>
                        <span className="font-mono text-xs">
                          {formatReservationReference(res.id, res.source)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                      <div className="text-[10px] text-gray-400">
                        Origen:{' '}
                        <span className="text-gray-600 font-bold uppercase">
                          {res.source || 'Directo'}
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(`/gestion/reservas?id=${res.id}`)}
                        className="text-teal-600 text-xs font-bold hover:underline"
                      >
                        Ver reserva completa
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
      {isBlockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-navy mb-6">Bloquear Fechas</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Apartamento
                </label>
                <select
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={blockForm.aptSlug}
                  onChange={e => setBlockForm({ ...blockForm, aptSlug: e.target.value })}
                >
                  <option value="">Selecciona...</option>
                  {apartments.map(a => (
                    <option key={a.slug} value={a.slug}>
                      {a.internalName || a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Entrada
                  </label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                    value={blockForm.checkin}
                    onChange={e => setBlockForm({ ...blockForm, checkin: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Salida
                  </label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                    value={blockForm.checkout}
                    onChange={e => setBlockForm({ ...blockForm, checkout: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nota
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={blockForm.note}
                  onChange={e => setBlockForm({ ...blockForm, note: e.target.value })}
                  placeholder="Ej: Mantenimiento anual"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setIsBlockModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleBlockDates}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-teal-700 transition-all"
              >
                Bloquear
              </button>
            </div>
          </div>
        </div>
      )}

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
