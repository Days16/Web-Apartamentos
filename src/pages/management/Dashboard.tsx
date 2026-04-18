/* eslint-disable */
// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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
import {
  PanelPageHeader,
  PanelKpiCard,
  PanelCard,
  PanelBadge,
  PanelTable,
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
  manual: 'Manual',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newBookingAlert, setNewBookingAlert] = useState(null);

  /* ── carga inicial ── */
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

  /* ── realtime nuevas reservas ── */
  useEffect(() => {
    const ch = supabase
      .channel('dashboard-reservations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reservations' },
        payload => {
          const r = payload.new;
          setReservations(prev => [r, ...prev]);
          setNewBookingAlert(`Nueva reserva: ${r.guest || r.guest_name} · ${r.apt || r.apt_slug}`);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  /* ── helpers fecha ── */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
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

  const parseDate = dateStr => {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.substring(0, 10).split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const parts = dateStr.split(' ');
    if (parts.length < 2) return null;
    const day = parseInt(parts[0], 10);
    const mi = MESES.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
    if (mi === -1) return null;
    return new Date(parts[2] ? parseInt(parts[2], 10) : currentYear, mi, day);
  };

  /* ── métricas ── */
  const confirmed = reservations.filter(r => r.status === 'confirmed');

  const checkinsToday = confirmed.filter(r => {
    const d = parseDate(r.check_in || r.checkin);
    return d?.getTime() === today.getTime();
  });
  const checkoutsToday = confirmed.filter(r => {
    const d = parseDate(r.check_out || r.checkout);
    return d?.getTime() === today.getTime();
  });

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const bookingsThisWeek = reservations.filter(r => {
    if (!r.created_at) return false;
    const d = new Date(r.created_at);
    return d >= weekStart && d <= weekEnd;
  });

  const incomeThisMonth = confirmed.reduce((s, r) => {
    const ci = parseDate(r.check_in || r.checkin);
    if (ci?.getMonth() === currentMonth && ci?.getFullYear() === currentYear)
      return s + (r.total_price || r.total || 0);
    return s;
  }, 0);

  const totalApts = apartments.length || 8;
  const occupiedToday = confirmed.filter(r => {
    const ci = parseDate(r.check_in || r.checkin);
    const co = parseDate(r.check_out || r.checkout);
    return ci && co && today >= ci && today < co;
  }).length;
  const occupancyRate = totalApts > 0 ? Math.round((occupiedToday / totalApts) * 100) : 0;

  const totalNights = confirmed.reduce((s, r) => s + (r.nights || 0), 0);
  const totalIncome = confirmed.reduce((s, r) => s + (r.total_price || r.total || 0), 0);
  const adr = totalNights > 0 ? Math.round(totalIncome / totalNights) : 0;

  /* ── datos mensuales ── */
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - 11 + i, 1);
    const y = d.getFullYear(),
      m = d.getMonth();
    const label = `${MESES[m]}${y !== currentYear ? ' ' + y : ''}`;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    let income = 0,
      web = 0,
      manual = 0,
      occupiedAptDays = 0;
    confirmed.forEach(r => {
      const ci = parseDate(r.check_in || r.checkin);
      const co = parseDate(r.check_out || r.checkout);
      if (!ci) return;
      if (ci.getFullYear() === y && ci.getMonth() === m) {
        const amt = r.total_price || r.total || 0;
        income += amt;
        r.source === 'manual' ? (manual += amt) : (web += amt);
      }
      if (!co) return;
      const start = ci < new Date(y, m, 1) ? new Date(y, m, 1) : ci;
      const end = co > new Date(y, m, daysInMonth) ? new Date(y, m, daysInMonth) : co;
      if (end > start) occupiedAptDays += Math.round((end.getTime() - start.getTime()) / 86400000);
    });
    const occ =
      totalApts * daysInMonth > 0
        ? Math.round((occupiedAptDays / (totalApts * daysInMonth)) * 100)
        : 0;
    return { label, income, web, manual, occ };
  });

  /* ── tabla últimas reservas ── */
  const aptName = r =>
    apartments.find(a => a.slug === (r.apt_slug || r.apt))?.internal_name ||
    apartments.find(a => a.slug === (r.apt_slug || r.apt))?.name ||
    r.apt_slug ||
    r.apt ||
    '—';

  const recentCols: Column<any>[] = [
    {
      key: 'id',
      label: 'Ref',
      width: 80,
      render: (_, r) => (
        <span className="font-mono text-[11px] panel-text-muted">
          {formatReservationReference(r.id, r.source)}
        </span>
      ),
    },
    {
      key: 'guest_name',
      label: 'Huésped',
      render: (_, r) => (
        <span className="text-[13px] font-medium" style={{ color: 'var(--panel-text)' }}>
          {formatGuestDisplay(r.guest_name || r.guest, r.source)}
        </span>
      ),
    },
    {
      key: 'apt_slug',
      label: 'Apartamento',
      render: (_, r) => <span className="text-[13px]">{aptName(r)}</span>,
    },
    {
      key: 'check_in',
      label: 'Fechas',
      width: 160,
      render: (_, r) => (
        <span className="text-xs panel-text-muted">
          {r.check_in || r.checkin} → {r.check_out || r.checkout}
        </span>
      ),
    },
    {
      key: 'total_price',
      label: 'Total',
      width: 90,
      align: 'right' as const,
      render: (_, r) => (
        <span className="text-[13px] font-semibold" style={{ color: 'var(--panel-text)' }}>
          {formatPrice(r.total_price || r.total)}
        </span>
      ),
    },
    {
      key: 'source',
      label: 'Origen',
      width: 80,
      render: (_, r) => (
        <PanelBadge variant={r.source === 'manual' ? 'warning' : 'info'}>
          {SRC_LABEL[r.source || 'web'] || r.source || 'Web'}
        </PanelBadge>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      width: 100,
      render: (_, r) => (
        <PanelBadge variant={STATUS_VARIANT[r.status] || 'neutral'}>
          {STATUS_LABEL[r.status] || r.status}
        </PanelBadge>
      ),
    },
  ];

  const formattedToday = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today);
  const todayLabel = formattedToday.charAt(0).toUpperCase() + formattedToday.slice(1);

  /* ── render ── */
  return (
    <div className="panel-page-content">
      {/* Alerta nueva reserva */}
      {newBookingAlert && (
        <div
          className="mx-0 mb-4 flex items-center justify-between gap-4 px-5 py-3 rounded-lg text-sm font-medium"
          style={{
            background: 'rgba(22,163,74,.08)',
            border: '1px solid rgba(22,163,74,.25)',
            color: '#16a34a',
          }}
        >
          <span>🔔 {newBookingAlert}</span>
          <button
            className="opacity-60 hover:opacity-100 text-lg leading-none"
            onClick={() => setNewBookingAlert(null)}
          >
            ✕
          </button>
        </div>
      )}

      <PanelPageHeader
        title="Dashboard"
        subtitle={todayLabel}
        actions={
          <button
            className="panel-btn panel-btn-primary panel-btn-sm"
            onClick={() => navigate('/gestion/reservas')}
          >
            + Nueva reserva manual
          </button>
        }
      />

      {/* KPIs */}
      <div className="panel-kpi-grid mb-6">
        <PanelKpiCard
          loading={loading}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
          label="Check-ins y outs hoy"
          value={String(checkinsToday.length + checkoutsToday.length)}
          trend={
            checkinsToday.length > 0
              ? `${checkinsToday.length} entradas · ${checkoutsToday.length} salidas`
              : 'Sin movimiento hoy'
          }
        />
        <PanelKpiCard
          loading={loading}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          label="Reservas esta semana"
          value={String(bookingsThisWeek.length)}
          trend="creadas en los últimos 7 días"
        />
        <PanelKpiCard
          loading={loading}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          label="Ingresos mes actual"
          value={formatPrice(incomeThisMonth)}
          trend="check-ins confirmados este mes"
        />
        <PanelKpiCard
          loading={loading}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          }
          label="Ocupación hoy"
          value={`${occupancyRate}%`}
          trend={`${occupiedToday} de ${totalApts} apartamentos`}
          trendUp={occupancyRate > 50}
        />
        <PanelKpiCard
          loading={loading}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
          label="ADR — precio medio/noche"
          value={formatPrice(adr)}
          trend={`${totalNights} noches confirmadas en total`}
        />
      </div>

      {/* Fila: check-ins hoy + ocupación por apto */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 mb-5">
        <PanelCard
          title="Check-ins y check-outs hoy"
          actions={
            <button
              className="panel-btn panel-btn-ghost panel-btn-sm"
              onClick={() => navigate('/gestion/reservas')}
            >
              Ver todas
            </button>
          }
          padded={false}
        >
          {checkinsToday.length + checkoutsToday.length === 0 ? (
            <div className="px-6 py-10 text-center panel-text-muted text-sm">
              No hay entradas ni salidas para hoy.
            </div>
          ) : (
            [...checkinsToday, ...checkoutsToday].slice(0, 5).map((r, i) => (
              <div
                key={i}
                className="dashboard-checkin-row grid gap-3 px-6 py-4 border-b cursor-pointer items-center hover:opacity-80 transition-opacity"
                style={{
                  gridTemplateColumns: '1fr 1fr auto',
                  borderColor: 'var(--panel-border)',
                }}
                onClick={() => navigate('/gestion/reservas')}
              >
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--panel-text)' }}>
                    {formatGuestDisplay(r.guest_name || r.guest, r.source)}
                  </div>
                  <div className="text-[11px] panel-text-muted mt-0.5">
                    {aptName(r)} · {r.nights} noches
                  </div>
                </div>
                <div className="text-xs panel-text-muted">
                  {r.check_in || r.checkin} → {r.check_out || r.checkout}
                </div>
                <PanelBadge variant={STATUS_VARIANT[r.status] || 'neutral'}>
                  {STATUS_LABEL[r.status] || r.status}
                </PanelBadge>
              </div>
            ))
          )}
        </PanelCard>

        <PanelCard title="Ocupación por apartamento">
          {apartments.length === 0 ? (
            <div className="py-6 text-center panel-text-muted text-sm">
              No hay apartamentos activos.
            </div>
          ) : (
            apartments.map(apt => {
              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
              const monthStart = new Date(currentYear, currentMonth, 1);
              const monthEnd = new Date(currentYear, currentMonth, daysInMonth);
              let occupiedDays = 0;
              confirmed
                .filter(r => r.apt_slug === apt.slug)
                .forEach(r => {
                  const ci = parseDate(r.check_in || r.checkin);
                  const co = parseDate(r.check_out || r.checkout);
                  if (!ci || !co) return;
                  const start = ci < monthStart ? monthStart : ci;
                  const end = co > monthEnd ? monthEnd : co;
                  if (end > start)
                    occupiedDays += Math.round((end.getTime() - start.getTime()) / 86400000);
                });
              const p = Math.min(100, Math.round((occupiedDays / daysInMonth) * 100));
              return (
                <div key={apt.slug} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--panel-text)' }}>
                      {apt.internal_name || apt.name}
                    </span>
                    <span className="font-semibold" style={{ color: 'var(--panel-text)' }}>
                      {p}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--panel-surface-3)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${p}%`, background: 'var(--panel-accent)' }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </PanelCard>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <PanelCard title="Ingresos mensuales" subtitle="Últimos 12 meses · desglose por fuente">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--panel-text-muted)' }} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--panel-text-muted)' }}
                tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip
                formatter={v => formatPrice(v)}
                contentStyle={{
                  background: 'var(--panel-surface)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="web" name="Web" stackId="a" fill="var(--panel-accent)" />
              <Bar
                dataKey="manual"
                name="Manual"
                stackId="a"
                fill="var(--panel-accent-gold)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </PanelCard>

        <PanelCard title="Ocupación mensual" subtitle="Últimos 12 meses · % de noches ocupadas">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--panel-text-muted)' }} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--panel-text-muted)' }}
                domain={[0, 100]}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip
                formatter={v => `${v}%`}
                contentStyle={{
                  background: 'var(--panel-surface)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="occ"
                name="Ocupación"
                stroke="var(--panel-accent)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </PanelCard>
      </div>

      {/* Tabla últimas reservas */}
      <PanelCard
        title="Últimas reservas"
        actions={
          <button
            className="panel-btn panel-btn-ghost panel-btn-sm"
            onClick={() => navigate('/gestion/reservas')}
          >
            Ver todas
          </button>
        }
        padded={false}
      >
        <PanelTable
          columns={recentCols}
          data={reservations.slice(0, 10)}
          rowKey={r => String(r.id ?? '')}
          loading={loading}
          skeletonRows={5}
          emptyText="No hay reservas registradas."
          onRowClick={() => navigate('/gestion/reservas')}
        />
      </PanelCard>

      {/* Mensajes sin leer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        <PanelCard title="Mensajes sin leer">
          <div className="panel-h1 font-light mb-2" style={{ fontSize: '3rem', lineHeight: 1 }}>
            {loading ? (
              <span
                className="panel-skeleton"
                style={{ width: 48, height: 48, borderRadius: 8, display: 'inline-block' }}
              />
            ) : (
              messages.length
            )}
          </div>
          {messages.length > 0 && (
            <div className="text-xs panel-text-muted mb-4">
              {messages
                .slice(0, 2)
                .map(m => m.name)
                .join(' · ')}
              {messages.length > 2 && ' ...'}
            </div>
          )}
          <button
            className="panel-btn panel-btn-primary panel-btn-sm w-full justify-center"
            onClick={() => navigate('/gestion/mensajes')}
          >
            Ver mensajes
          </button>
        </PanelCard>
      </div>
    </div>
  );
}
