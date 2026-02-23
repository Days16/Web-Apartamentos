import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApartments, getReservations, createReservation } from '../../services/dataService';
import { formatDateNumeric, formatPrice, dateToStr } from '../../utils/format';
import Ico, { paths } from '../../components/Ico';

// Configuración de colores según la imagen del usuario
const STATUS_COLORS = {
  reserved: { bg: '#86efac', text: '#14532d', border: '#4ade80', label: 'Reservado' }, // Verde
  pending: { bg: '#fef08a', text: '#713f12', border: '#facc15', label: 'Pendiente' }, // Amarillo
  external: { bg: '#bfdbfe', text: '#1e3a8a', border: '#60a5fa', label: 'Externo' },   // Azul
  blocked: { bg: '#fecaca', text: '#7f1d1d', border: '#f87171', label: 'Bloqueado' }  // Rojo
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function Calendario() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [apartments, setApartments] = useState([]);
  const [reservations, setReservations] = useState([]);

  // Estado para el rango de fechas (por defecto 25 días desde hoy)
  const [startDate, setStartDate] = useState(new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0'));
  const [daysToShow, setDaysToShow] = useState(25);

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    aptSlug: '',
    checkin: '',
    checkout: '',
    note: 'Bloqueado por mantenimiento'
  });
  const [selectedApt, setSelectedApt] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);

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
        email: 'info@illapancha.com'
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
        // Forzamos comparación robusta de strings YYYY-MM-DD (Evitando desfase UTC)
        const checkinStr = typeof r.checkin === 'string' ? r.checkin.split(' ')[0] : new Date(r.checkin).toISOString().split('T')[0];
        const checkoutStr = typeof r.checkout === 'string' ? r.checkout.split(' ')[0] : new Date(r.checkout).toISOString().split('T')[0];

        const match = dStr >= checkinStr && dStr < checkoutStr;
        return match;
      }
      return false;
    });
  };

  const getStatusType = (res) => {
    if (!res) return null;
    if (res.source === 'external' || res.source === 'booking' || res.source === 'airbnb' || res.source === 'iCal') return 'external';
    // Detección robusta de bloques: por status, por ID o por origen manual/bloqueado
    if (res.status === 'blocked' || res.id?.startsWith('BLK-') || res.guest?.includes('Bloqueado') || res.source === 'manual') return 'blocked';
    if (res.status === 'pending') return 'pending';
    return 'reserved';
  };

  const getReservationsForDetailedList = (date) => {
    if (!date) return [];
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    return reservations.filter(r => {
      const checkin = new Date(r.checkin);
      const checkout = new Date(r.checkout);
      checkin.setHours(0, 0, 0, 0);
      checkout.setHours(0, 0, 0, 0);
      return d >= checkin && d < checkout;
    }).map(r => {
      const apt = apartments.find(a => a.slug === (r.aptSlug || r.apt_slug || r.apt));
      return { ...r, apartmentName: apt?.name || 'Apartamento desconocido' };
    });
  };

  const dayReservations = getReservationsForDetailedList(selectedDate);

  if (loading) return <div className="p-10 text-gray-400">Cargando línea de tiempo...</div>;

  const filteredApts = selectedApt === 'all' ? apartments : apartments.filter(a => a.slug === selectedApt);

  return (
    <div className="p-4 md:p-8 bg-[#f8fafc] min-h-screen">

      {/* HEADER / CONTROLES */}
      <div className="bg-white border border-gray-200 rounded-t-xl p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <select
          className="border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-teal-500"
          value={selectedApt}
          onChange={e => setSelectedApt(e.target.value)}
        >
          <option value="all">Todos los alojamientos</option>
          {apartments.map(a => <option key={a.slug} value={a.slug}>{a.name}</option>)}
        </select>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Período:</span>
          <select className="border border-gray-300 rounded px-2 py-1.5 outline-none">
            <option>Predeterminado</option>
          </select>
          <input
            type="date"
            className="border border-gray-300 rounded px-2 py-1 outline-none ml-2"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <button className="bg-white border border-blue-400 text-blue-600 px-4 py-1.5 rounded hover:bg-blue-50 transition-colors">
            Mostrar
          </button>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-4 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            {Object.entries(STATUS_COLORS).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: config.bg, borderColor: config.border }} />
                <span>{config.label}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setIsBlockModalOpen(true)}
            className="bg-white border border-teal-500 text-teal-600 px-4 py-1.5 rounded text-sm font-bold hover:bg-teal-50 transition-colors ml-4"
          >
            Bloquear
          </button>
        </div>
      </div>

      {/* LINEA DE TIEMPO / CUADRICULA */}
      <div className="bg-white border-x border-b border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto relative" ref={scrollContainerRef}>
          <table className="w-full border-collapse table-fixed">
            <thead>
              {/* CABECERA FECHAS */}
              <tr className="bg-gray-50 sticky top-0 z-20">
                <th className="w-48 p-4 border border-gray-200 text-sm font-bold text-gray-600 bg-gray-50 sticky left-0 z-30">Alojamiento</th>
                {timelineDates.map((date, idx) => (
                  <th
                    key={idx}
                    className={`w-16 min-w-[64px] border border-gray-200 py-2 px-1 text-center font-normal cursor-pointer hover:bg-gray-100 transition-colors ${selectedDate && new Date(selectedDate).toDateString() === date.toDateString() ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedDate(dateToStr(date))}
                  >
                    <div className="text-[14px] font-bold text-gray-700">{date.getDate()}</div>
                    <div className="text-[10px] text-gray-500 uppercase">{MONTH_NAMES[date.getMonth()]}</div>
                    <div className="text-[10px] text-gray-400 mb-1">{date.getFullYear()}</div>
                    <div className="text-[10px] text-gray-500 font-bold border-t border-gray-100 pt-1">{DAY_NAMES[date.getDay()]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredApts.map((apt) => (
                <tr key={apt.slug} className="hover:bg-gray-50/50 group">
                  {/* Celda fija de nombre de apartamento */}
                  <td className="p-3 border border-gray-200 text-xs font-bold text-blue-800 bg-white sticky left-0 z-10 group-hover:bg-gray-50">
                    <div className="truncate max-w-[170px]">{apt.name}</div>
                  </td>

                  {/* Celdas de días */}
                  {timelineDates.map((date, idx) => {
                    const res = getReservationForDay(apt.slug, date);
                    const type = getStatusType(res);
                    const config = type ? STATUS_COLORS[type] : null;

                    const isCheckin = res && new Date(res.checkin).toDateString() === date.toDateString();
                    const isToday = new Date().toDateString() === date.toDateString();
                    const isSelected = selectedDate && new Date(selectedDate).toDateString() === date.toDateString();

                    return (
                      <td
                        key={idx}
                        className={`h-16 border border-gray-100 relative cursor-pointer transition-colors ${isToday ? 'bg-teal/5' : ''} ${isSelected ? 'bg-blue-50/50' : ''} hover:bg-gray-50`}
                        style={res ? { backgroundColor: isSelected ? undefined : config.bg } : {}}
                        onClick={() => setSelectedDate(date.toISOString().split('T')[0])}
                      >
                        {isCheckin && (
                          <div className="absolute inset-0 px-2 py-1 overflow-hidden pointer-events-none z-10">
                            <div className="text-[10px] font-bold leading-tight truncate" style={{ color: config.text }}>
                              {res.guest}
                            </div>
                            <div className="text-[9px] opacity-70" style={{ color: config.text }}>
                              #{res.id.slice(-6)}
                            </div>
                          </div>
                        )}
                        {/* Indicador de hoy */}
                        {isToday && <div className="absolute inset-x-0 top-0 h-0.5 bg-teal-500 z-20" />}

                        {/* Líneas divisorias de reserva */}
                        {res && (
                          <div className="absolute inset-y-0 left-0 w-[1px]" style={{ backgroundColor: config.border }} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* REPETIR CABECERA AL FINAL SI HAY MUCHOS */}
              <tr className="bg-gray-50">
                <th className="p-4 border border-gray-200 text-sm font-bold text-gray-600 sticky left-0 z-10 bg-gray-50">Alojamiento</th>
                {timelineDates.map((date, idx) => (
                  <th key={idx} className="border border-gray-200 py-2 px-1 text-center font-normal">
                    <div className="text-[12px] font-bold text-gray-700">{date.getDate()}</div>
                    <div className="text-[10px] text-gray-500 uppercase">{MONTH_NAMES[date.getMonth()]}</div>
                    <div className="text-[10px] text-gray-400 mb-0.5">{date.getFullYear()}</div>
                    <div className="text-[10px] text-gray-500 font-bold">{DAY_NAMES[date.getDay()]}</div>
                  </th>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* PANEL DE DETALLE INFERIOR */}
      {selectedDate && (
        <div className="mt-8 bg-white border border-gray-200 rounded-xl shadow-sm p-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-navy">
              Reservas para el {new Date(selectedDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
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
              {dayReservations.map((res) => {
                const type = getStatusType(res);
                const config = STATUS_COLORS[type];
                return (
                  <div key={res.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {res.apartmentName}
                        </div>
                        <div className="text-lg font-bold text-navy truncate">
                          {res.guest}
                        </div>
                      </div>
                      <div className="px-2 py-1 rounded text-[10px] font-bold uppercase" style={{ backgroundColor: config.bg, color: config.text, border: `1px solid ${config.border}` }}>
                        {config.label}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-5 text-gray-400">📅</span>
                        <span>{new Date(res.checkin).toLocaleDateString()} - {new Date(res.checkout).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-5 text-gray-400">💰</span>
                        <span className="font-bold">{formatPrice(res.total || 0)}</span>
                        <span className="text-xs opacity-60">({res.nights} {res.nights === 1 ? 'noche' : 'noches'})</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-5 text-gray-400">🆔</span>
                        <span className="font-mono text-xs">{res.id}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                      <div className="text-[10px] text-gray-400">
                        Origen: <span className="text-gray-600 font-bold uppercase">{res.source || 'Directo'}</span>
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

      {/* MODAL BLOQUEO */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-navy mb-6">Bloquear Fechas</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Apartamento</label>
                <select className="w-full border border-slate-200 rounded-lg p-3 text-sm" value={blockForm.aptSlug} onChange={e => setBlockForm({ ...blockForm, aptSlug: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {apartments.map(a => <option key={a.slug} value={a.slug}>{a.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entrada</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg p-3 text-sm" value={blockForm.checkin} onChange={e => setBlockForm({ ...blockForm, checkin: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Salida</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg p-3 text-sm" value={blockForm.checkout} onChange={e => setBlockForm({ ...blockForm, checkout: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nota</label>
                <input type="text" className="w-full border border-slate-200 rounded-lg p-3 text-sm" value={blockForm.note} onChange={e => setBlockForm({ ...blockForm, note: e.target.value })} placeholder="Ej: Mantenimiento anual" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setIsBlockModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-600">Cancelar</button>
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

      {/* FOOTER NAVBAR (opcional, imitando la de la imagen) */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {/* Botones de navegación de rango si fuera necesario */}
      </div>

    </div>
  );
}
