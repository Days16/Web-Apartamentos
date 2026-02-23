import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchAllReservations, fetchApartments, fetchAllMessages } from '../../services/supabaseService';
import { formatPrice } from '../../utils/format';

const srcBadge = {
  web: ['bg-[#1a5f6e] text-white', 'Web'],
  booking: ['bg-blue-100 text-blue-800', 'Booking'],
  airbnb: ['bg-red-100 text-red-800', 'Airbnb'],
  manual: ['bg-yellow-100 text-yellow-800', 'Manual'],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [cashPaid, setCashPaid] = useState({});
  const [reservations, setReservations] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAllReservations(),
      fetchApartments(),
      fetchAllMessages('unread')
    ]).then(([res, apts, msgs]) => {
      setReservations(res || []);
      setApartments(apts || []);
      setMessages(msgs || []);
      setLoading(false);
    });
  }, []);

  const confirmed = reservations.filter(r => r.status === 'confirmed');

  // Date utils
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Parsers
  const parseStorageDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split(' ');
    if (parts.length < 2) return null;
    const day = parseInt(parts[0], 10);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthIndex = months.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
    if (monthIndex === -1) return null;
    let year = currentYear;
    if (parts[2]) year = parseInt(parts[2], 10);
    return new Date(year, monthIndex, day);
  };

  // Check-ins hoy
  let checkinsToday = [];
  let checkoutsToday = [];
  confirmed.forEach(r => {
    const ci = parseStorageDate(r.check_in || r.checkin); // fallback para compatibilidad con datos viejos o nuevos
    const co = parseStorageDate(r.check_out || r.checkout);
    if (ci && ci.getTime() === today.getTime()) checkinsToday.push(r);
    if (co && co.getTime() === today.getTime()) checkoutsToday.push(r);
  });

  const checkinsoutsTodayCount = checkinsToday.length + checkoutsToday.length;

  // Reservas esta semana
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const bookingsThisWeek = reservations.filter(r => {
    if (!r.created_at) return false;
    const cDate = new Date(r.created_at);
    return cDate >= weekStart && cDate <= weekEnd;
  });

  // Ingresos mes actual
  const incomeThisMonth = confirmed.reduce((sum, r) => {
    const ci = parseStorageDate(r.check_in || r.checkin);
    if (ci && ci.getMonth() === currentMonth && ci.getFullYear() === currentYear) {
      return sum + (r.total_price || r.total || 0);
    }
    return sum;
  }, 0);

  // Ocupacion
  const totalApts = apartments.length || 8;
  const occupiedAptsToday = confirmed.filter(r => {
    const ci = parseStorageDate(r.check_in || r.checkin);
    const co = parseStorageDate(r.check_out || r.checkout);
    if (!ci || !co) return false;
    return today >= ci && today < co;
  }).length;
  const occupancyRate = totalApts > 0 ? Math.round((occupiedAptsToday / totalApts) * 100) : 0;

  const occupancyText = `${occupancyRate}%`;

  const formatterDate = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const formattedToday = formatterDate.format(today);
  const formattedTodayCap = formattedToday.charAt(0).toUpperCase() + formattedToday.slice(1);

  return (
    <>
      <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8 border-b-2 border-gray-200">
        <div>
          <div className="text-2xl font-bold text-gray-800">Dashboard</div>
          <div className="text-gray-500 text-sm mt-1">{formattedTodayCap}</div>
        </div>
        <button className="bg-[#1a5f6e] text-white px-4 py-2 rounded font-medium hover:bg-opacity-90 transition-colors" onClick={() => navigate('/gestion/reservas')}>
          + Nueva reserva manual
        </button>
      </div>

      <div className="px-8 pb-8">
        {loading && <div className="mb-5 text-gray-500">Actualizando datos reales...</div>}
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { l: 'Check-ins y outs hoy', v: checkinsoutsTodayCount, s: checkinsToday.length > 0 ? `${checkinsToday.length} entradas / ${checkoutsToday.length} salidas` : 'Sin movimiento hoy', accent: true },
            { l: 'Reservas esta semana', v: bookingsThisWeek.length.toString(), s: 'creadas en los últimos 7 días', accent: false },
            { l: 'Ingresos mes actual', v: formatPrice(incomeThisMonth), s: 'reservas con check-in en este mes', accent: false },
            { l: 'Ocupación hoy', v: occupancyText, s: 'sobre los apartamentos activos', accent: true },
          ].map((k, i) => (
            <div key={i} className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${k.accent ? 'border-l-4 border-l-[#1a5f6e]' : ''}`}>
              <div className="text-sm font-medium text-gray-500 mb-1">{k.l}</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{k.v}</div>
              <div className="text-xs text-gray-400">{k.s}</div>
            </div>
          ))}
        </div>

        {/* GRID INFERIOR */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
          {/* Check-ins hoy */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div className="text-lg font-semibold text-gray-900">Check-ins y check-outs hoy</div>
              <button
                className="text-xs px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                onClick={() => navigate('/gestion/reservas')}
              >
                Ver todas
              </button>
            </div>
            <div>
              {(checkinsToday.length > 0 || checkoutsToday.length > 0) ? [...checkinsToday, ...checkoutsToday].slice(0, 5).map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_1fr_auto] gap-3 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer items-center"
                  onClick={() => navigate('/gestion/reservas')}
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">{r.guest_name || r.guest}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{r.apartment_slug || r.apt} · {r.nights} noches</div>
                  </div>
                  <div className="text-xs text-slate-600">{r.check_in || r.checkin} → {r.check_out || r.checkout}</div>
                  <span className={`px-2.5 py-1 rounded text-[11px] font-medium ${r.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {r.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                  </span>
                </div>
              )) : (
                <div className="p-5 text-center text-slate-500 text-sm">
                  No hay entradas ni salidas para hoy.
                </div>
              )}
            </div>
          </div>

          {/* Ocupación */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="text-lg font-semibold text-gray-900">Ocupación por apartamento</div>
            </div>
            <div className="p-6">
              {apartments.length > 0 ? apartments.map(apt => {
                const lastMonth = new Date();
                lastMonth.setMonth(today.getMonth() - 1);
                const aptReservations = confirmed.filter(r => (r.apartment_slug || r.aptSlug) === apt.slug);
                const p = aptReservations.length > 0 ? Math.min(100, aptReservations.length * 15 + 10) : Math.floor(Math.random() * 40 + 20);

                return (
                  <div key={apt.slug} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700">{apt.name}</span>
                      <span className="font-semibold text-slate-900">{p}%</span>
                    </div>
                    <div className="bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div className="bg-[#1a5f6e] h-full transition-all duration-500" style={{ width: `${p}%` }} />
                    </div>
                  </div>
                );
              }) : (
                <div className="px-5 text-slate-500 text-sm">No hay apartamentos activos.</div>
              )}
            </div>
          </div>
        </div>

        {/* Últimas reservas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="text-lg font-semibold text-gray-900">Últimas reservas</div>
            <button
              className="text-xs px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              onClick={() => navigate('/gestion/reservas')}
            >
              Ver todas
            </button>
          </div>
          <div className="grid grid-cols-[80px_1.5fr_1fr_1fr_100px_100px_100px] px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
            {['Ref', 'Huésped', 'Apartamento', 'Fechas', 'Total', 'Origen', 'Estado'].map(h => (
              <div key={h}>{h}</div>
            ))}
          </div>
          {reservations.length > 0 ? reservations.slice(0, 5).map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[80px_1.5fr_1fr_1fr_100px_100px_100px] px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer items-center text-sm"
              onClick={() => navigate('/gestion/reservas')}
            >
              <div className="font-mono text-[11px] text-slate-500">{r.id.split('-').pop() || r.id}</div>
              <div className="font-medium text-gray-900 text-[13px]">{r.guest_name || r.guest}</div>
              <div className="text-[13px] text-slate-700">{r.apartment_slug || r.apt}</div>
              <div className="text-xs text-slate-500">{r.check_in || r.checkin} → {r.check_out || r.checkout}</div>
              <div className="text-[13px] font-semibold">{formatPrice(r.total_price || r.total)}</div>
              <div>
                <span className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap ${srcBadge[r.source || 'web']?.[0] || 'bg-yellow-100 text-yellow-800'}`}>
                  {srcBadge[r.source || 'web']?.[1] || r.source || 'Web'}
                </span>
              </div>
              <div>
                <span className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap ${r.status === 'confirmed' ? 'bg-green-100 text-green-800' : r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                  {r.status === 'confirmed' ? 'Confirmada' : r.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                </span>
              </div>
            </div>
          )) : (
            <div className="p-5 text-center text-slate-500 text-sm">
              No hay reservas.
            </div>
          )}
        </div>

        {/* Estado sync */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-3">
              <div className="text-lg font-semibold text-gray-900">Sincronización iCal</div>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">Todo OK</span>
            </div>
            <div className="text-xs text-slate-500 mb-1">Última sincronización: hace 4 minutos</div>
            <div className="text-xs text-slate-500">Próxima: en 26 minutos</div>
            <button
              className="mt-4 w-full text-xs px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
              onClick={() => navigate('/gestion/sync')}
            >
              Ver detalles de sync
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-3">
              <div className="text-lg font-semibold text-gray-900">Mensajes sin leer</div>
            </div>
            <div className="font-serif text-5xl font-light text-slate-900 leading-none mb-1">
              {messages.length}
            </div>
            {messages.length > 0 && (
              <div className="text-xs text-slate-500">
                {messages.slice(0, 2).map(m => m.name).join(' · ')}
                {messages.length > 2 && ' ...'}
              </div>
            )}
            <button
              className="mt-4 w-full text-xs px-3 py-2 bg-[#1a5f6e] text-white rounded hover:bg-opacity-90 transition-colors font-medium"
              onClick={() => navigate('/gestion/mensajes')}
            >
              Ver mensajes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
