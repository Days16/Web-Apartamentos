/* eslint-disable */
// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  fetchAllReservations,
  fetchApartments,
  fetchAllMessages,
} from '../../services/supabaseService';
import { formatPrice, formatGuestDisplay, formatReservationReference } from '../../utils/format';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const srcBadge = {
  web: ['bg-[#1a5f6e] text-white', 'Web'],
  booking: ['bg-[#1a5f6e] text-white', 'Web'],
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
    Promise.all([fetchAllReservations(), fetchApartments(), fetchAllMessages('unread')]).then(
      ([res, apts, msgs]) => {
        setReservations(res || []);
        setApartments(apts || []);
        setMessages(msgs || []);
        setLoading(false);
      }
    );
  }, []);

  const confirmed = reservations.filter(r => r.status === 'confirmed');

  // Date utils
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Parsers — soporta ISO "2026-07-12" (Supabase) y legado "12 Ene 2026"
  const parseStorageDate = dateStr => {
    if (!dateStr) return null;
    // ISO format (Supabase)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.substring(0, 10).split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    // Legacy "12 Ene 2026"
    const parts = dateStr.split(' ');
    if (parts.length < 2) return null;
    const day = parseInt(parts[0], 10);
    const months = [
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

  // ADR — ingreso medio por noche
  const totalNights = confirmed.reduce((s, r) => s + (r.nights || 0), 0);
  const totalIncome = confirmed.reduce((s, r) => s + (r.total_price || r.total || 0), 0);
  const adr = totalNights > 0 ? Math.round(totalIncome / totalNights) : 0;

  // Datos mensuales — últimos 12 meses
  const MESES = [
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
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - 11 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const label = `${MESES[m]} ${y !== currentYear ? y : ''}`.trim();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    let income = 0;
    const bySource = { web: 0, booking: 0, manual: 0 };
    let occupiedAptDays = 0;

    confirmed.forEach(r => {
      const ci = parseStorageDate(r.check_in || r.checkin);
      if (!ci) return;
      if (ci.getFullYear() === y && ci.getMonth() === m) {
        const amount = r.total_price || r.total || 0;
        income += amount;
        const src = r.source || 'web';
        if (src in bySource) bySource[src] += amount;
        else bySource.web += amount;
      }
      // ocupación: días solapados con este mes
      const co = parseStorageDate(r.check_out || r.checkout);
      if (!co) return;
      const monthStart = new Date(y, m, 1);
      const monthEnd = new Date(y, m, daysInMonth);
      const start = ci < monthStart ? monthStart : ci;
      const end = co > monthEnd ? monthEnd : co;
      if (end > start) occupiedAptDays += Math.round((end - start) / 86400000);
    });

    const maxAptDays = totalApts * daysInMonth;
    const occ = maxAptDays > 0 ? Math.round((occupiedAptDays / maxAptDays) * 100) : 0;

    return { label, income, occ, ...bySource };
  });

  const formatterDate = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedToday = formatterDate.format(today);
  const formattedTodayCap = formattedToday.charAt(0).toUpperCase() + formattedToday.slice(1);

  return (
    <>
      <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8 border-b-2 border-gray-200">
        <div>
          <div className="text-2xl font-bold text-gray-800">Dashboard</div>
          <div className="text-gray-500 text-sm mt-1">{formattedTodayCap}</div>
        </div>
        <button
          className="bg-[#1a5f6e] text-white px-4 py-2 rounded font-medium hover:bg-opacity-90 transition-colors"
          onClick={() => navigate('/gestion/reservas')}
        >
          + Nueva reserva manual
        </button>
      </div>

      <div className="px-8 pb-8">
        {loading && <div className="mb-5 text-gray-500">Actualizando datos reales...</div>}
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {[
            {
              l: 'Check-ins y outs hoy',
              v: checkinsoutsTodayCount,
              s:
                checkinsToday.length > 0
                  ? `${checkinsToday.length} entradas / ${checkoutsToday.length} salidas`
                  : 'Sin movimiento hoy',
              accent: true,
            },
            {
              l: 'Reservas esta semana',
              v: bookingsThisWeek.length.toString(),
              s: 'creadas en los últimos 7 días',
              accent: false,
            },
            {
              l: 'Ingresos mes actual',
              v: formatPrice(incomeThisMonth),
              s: 'reservas con check-in en este mes',
              accent: false,
            },
            {
              l: 'Ocupación hoy',
              v: occupancyText,
              s: 'sobre los apartamentos activos',
              accent: true,
            },
            {
              l: 'ADR — precio medio/noche',
              v: formatPrice(adr),
              s: `${totalNights} noches confirmadas en total`,
              accent: false,
            },
          ].map((k, i) => (
            <div
              key={i}
              className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${k.accent ? 'border-l-4 border-l-[#1a5f6e]' : ''}`}
            >
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
              {checkinsToday.length > 0 || checkoutsToday.length > 0 ? (
                [...checkinsToday, ...checkoutsToday].slice(0, 5).map((r, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_1fr_auto] gap-3 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer items-center"
                    onClick={() => navigate('/gestion/reservas')}
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {formatGuestDisplay(r.guest_name || r.guest, r.source)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {apartments.find(a => a.slug === (r.apartment_slug || r.apt))
                          ?.internal_name ||
                          apartments.find(a => a.slug === (r.apartment_slug || r.apt))?.name ||
                          r.apartment_slug ||
                          r.apt}{' '}
                        · {r.nights} noches
                      </div>
                    </div>
                    <div className="text-xs text-slate-600">
                      {r.check_in || r.checkin} → {r.check_out || r.checkout}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-[11px] font-medium ${r.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                    >
                      {r.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                    </span>
                  </div>
                ))
              ) : (
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
              {apartments.length > 0 ? (
                apartments.map(apt => {
                  const aptReservations = confirmed.filter(
                    r => (r.apartment_slug || r.aptSlug) === apt.slug
                  );
                  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                  const monthStart = new Date(currentYear, currentMonth, 1);
                  const monthEnd = new Date(currentYear, currentMonth, daysInMonth);
                  let occupiedDays = 0;
                  aptReservations.forEach(r => {
                    const ci = parseStorageDate(r.check_in || r.checkin);
                    const co = parseStorageDate(r.check_out || r.checkout);
                    if (!ci || !co) return;
                    const start = ci < monthStart ? monthStart : ci;
                    const end = co > monthEnd ? monthEnd : co;
                    if (end > start) occupiedDays += Math.round((end - start) / 86400000);
                  });
                  const p = Math.min(100, Math.round((occupiedDays / daysInMonth) * 100));

                  return (
                    <div key={apt.slug} className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-700">{apt.internal_name || apt.name}</span>
                        <span className="font-semibold text-slate-900">{p}%</span>
                      </div>
                      <div className="bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-[#1a5f6e] h-full transition-all duration-500"
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-5 text-slate-500 text-sm">No hay apartamentos activos.</div>
              )}
            </div>
          </div>
        </div>

        {/* GRÁFICOS — últimos 12 meses */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
          {/* Ingresos por mes + desglose fuente */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-lg font-semibold text-gray-900 mb-1">Ingresos mensuales</div>
            <div className="text-xs text-gray-400 mb-4">Últimos 12 meses · desglose por fuente</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip formatter={v => formatPrice(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="web" name="Web" stackId="a" fill="#1a5f6e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="booking" name="Booking" stackId="a" fill="#1a5f6e" />
                <Bar
                  dataKey="manual"
                  name="Manual"
                  stackId="a"
                  fill="#D4A843"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tasa de ocupación mensual */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-lg font-semibold text-gray-900 mb-1">Ocupación mensual</div>
            <div className="text-xs text-gray-400 mb-4">
              Últimos 12 meses · % de noches ocupadas
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => `${v}%`} />
                <Line
                  type="monotone"
                  dataKey="occ"
                  name="Ocupación"
                  stroke="#1a5f6e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
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
          {reservations.length > 0 ? (
            reservations.slice(0, 5).map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-[80px_1.5fr_1fr_1fr_100px_100px_100px] px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer items-center text-sm"
                onClick={() => navigate('/gestion/reservas')}
              >
                <div className="font-mono text-[11px] text-slate-500">
                  {formatReservationReference(r.id, r.source)}
                </div>
                <div className="font-medium text-gray-900 text-[13px]">
                  {formatGuestDisplay(r.guest_name || r.guest, r.source)}
                </div>
                <div className="text-[13px] text-slate-700">
                  {apartments.find(a => a.slug === (r.apartment_slug || r.apt))?.internal_name ||
                    apartments.find(a => a.slug === (r.apartment_slug || r.apt))?.name ||
                    r.apartment_slug ||
                    r.apt}
                </div>
                <div className="text-xs text-slate-500">
                  {r.check_in || r.checkin} → {r.check_out || r.checkout}
                </div>
                <div className="text-[13px] font-semibold">
                  {formatPrice(r.total_price || r.total)}
                </div>
                <div>
                  <span
                    className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap ${srcBadge[r.source || 'web']?.[0] || 'bg-yellow-100 text-yellow-800'}`}
                  >
                    {srcBadge[r.source || 'web']?.[1] || r.source || 'Web'}
                  </span>
                </div>
                <div>
                  <span
                    className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap ${r.status === 'confirmed' ? 'bg-green-100 text-green-800' : r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {r.status === 'confirmed'
                      ? 'Confirmada'
                      : r.status === 'pending'
                        ? 'Pendiente'
                        : 'Cancelada'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-5 text-center text-slate-500 text-sm">No hay reservas.</div>
          )}
        </div>

        {/* Mensajes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-3">
              <div className="text-lg font-semibold text-gray-900">Mensajes sin leer</div>
            </div>
            <div className="font-serif text-5xl font-light text-slate-900 leading-none mb-1">
              {messages.length}
            </div>
            {messages.length > 0 && (
              <div className="text-xs text-slate-500">
                {messages
                  .slice(0, 2)
                  .map(m => m.name)
                  .join(' · ')}
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
