// @ts-nocheck
import { useState, useEffect } from 'react';
import { fetchAllReservations, fetchAllApartments } from '../../services/supabaseService';
import { supabase } from '../../lib/supabase';
import Ico, { paths } from '../../components/Ico';
import { exportAnalytics } from '../../utils/exportExcel';
import generateAnalyticsReport from '../../utils/generateAnalyticsReport';
import { useToast } from '../../contexts/ToastContext';
import { PanelPageHeader, PanelKpiCard } from '../../components/panel';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function diffDays(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : 0;
}

const STATUS_LABEL = { confirmed: 'Confirmada', pending: 'Pendiente', cancelled: 'Cancelada' };
const SOURCE_LABEL = { web: 'Directa', manual: 'Manual', booking: 'Booking.com', airbnb: 'Airbnb' };
const STATUS_COLOR = { confirmed: '#1a5f6e', pending: '#D4A843', cancelled: '#ef4444' };
const SOURCE_COLOR = { web: '#1a5f6e', manual: '#6366f1', booking: '#0ea5e9', airbnb: '#f97316' };

export default function Analytics() {
  const toast = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingDrive, setExportingDrive] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    Promise.all([fetchAllReservations(), fetchAllApartments()]).then(([res, apts]) => {
      setReservations(res || []);
      setApartments(apts || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="panel-page-content">
        <div className="panel-kpi-grid mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="panel-card">
              <div className="panel-skeleton" style={{ height: 64 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Filtrar por año seleccionado ──────────────────────────────────────────
  const confirmed = reservations.filter(r => r.status !== 'cancelled');
  const yearRes = confirmed.filter(r => r.checkin?.startsWith(String(year)));
  const allYears = [...new Set(reservations.map(r => r.checkin?.slice(0, 4)).filter(Boolean))]
    .sort()
    .reverse();

  // ── KPIs globales (todos los años, solo confirmadas) ──────────────────────
  const totalRevenue = confirmed.reduce((s, r) => s + (r.total || 0), 0);
  const totalNights = confirmed.reduce(
    (s, r) => s + (r.nights || diffDays(r.checkin, r.checkout)),
    0
  );
  const avgStay = confirmed.length ? (totalNights / confirmed.length).toFixed(1) : '0';
  const avgTicket = confirmed.length ? Math.round(totalRevenue / confirmed.length) : 0;

  // ── KPIs año seleccionado ─────────────────────────────────────────────────
  const yearRevenue = yearRes.reduce((s, r) => s + (r.total || 0), 0);
  const yearNights = yearRes.reduce((s, r) => s + (r.nights || diffDays(r.checkin, r.checkout)), 0);

  // ── Ingresos y reservas por mes (año seleccionado) ────────────────────────
  const byMonth = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    const monthRes = yearRes.filter(r => r.checkin?.slice(5, 7) === m);
    return {
      label: MONTHS[i],
      count: monthRes.length,
      revenue: monthRes.reduce((s, r) => s + (r.total || 0), 0),
      nights: monthRes.reduce((s, r) => s + (r.nights || diffDays(r.checkin, r.checkout)), 0),
    };
  });
  const maxRevenue = Math.max(...byMonth.map(m => m.revenue), 1);
  const maxCount = Math.max(...byMonth.map(m => m.count), 1);

  // ── Por apartamento (año seleccionado) ────────────────────────────────────
  const aptMap = {};
  yearRes.forEach(r => {
    const slug = r.apt_slug || r.apt;
    if (!aptMap[slug]) {
      const apt = apartments.find(a => a.slug === slug);
      aptMap[slug] = { name: apt?.name || slug, count: 0, revenue: 0, nights: 0 };
    }
    aptMap[slug].count++;
    aptMap[slug].revenue += r.total || 0;
    aptMap[slug].nights += r.nights || diffDays(r.checkin, r.checkout);
  });
  const aptStats = Object.values(aptMap).sort((a: any, b: any) => b.revenue - a.revenue);
  const maxAptRevenue = Math.max(...aptStats.map((a: any) => a.revenue), 1);

  // ── Por estado (globales) ─────────────────────────────────────────────────
  const byStatus = ['confirmed', 'pending', 'cancelled'].map(s => ({
    key: s,
    label: STATUS_LABEL[s],
    count: reservations.filter(r => r.status === s).length,
    color: STATUS_COLOR[s],
  }));
  const totalAll = reservations.length;

  // ── Por canal (año seleccionado) ──────────────────────────────────────────
  const allYearRes = reservations.filter(r => r.checkin?.startsWith(String(year)));
  const bySource = ['web', 'manual', 'booking']
    .map(s => ({
      key: s,
      label: SOURCE_LABEL[s],
      count: allYearRes.filter(r => r.source === s).length,
      revenue: yearRes.filter(r => r.source === s).reduce((sum, r) => sum + (r.total || 0), 0),
      color: SOURCE_COLOR[s],
    }))
    .filter(s => s.count > 0);
  const totalSource = allYearRes.length;

  // ── Ocupación por mes (noches ocupadas / días del mes) ────────────────────
  const occupancy = byMonth.map((m, i) => {
    const daysInMonth = new Date(year, i + 1, 0).getDate();
    const totalRooms = apartments.length || 1;
    const maxNights = daysInMonth * totalRooms;
    return { ...m, rate: Math.min(100, Math.round((m.nights / maxNights) * 100)) };
  });

  return (
    <div className="panel-page-content space-y-5">
      <PanelPageHeader
        title="Analíticas"
        subtitle="Métricas de reservas e ingresos de tus apartamentos"
        actions={
          <div className="flex items-center gap-2">
            <select
              aria-label="Seleccionar año"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="panel-input text-sm"
              style={{ width: 'auto', padding: '0.375rem 0.75rem' }}
            >
              {(allYears.length ? allYears : [String(new Date().getFullYear())]).map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                exportAnalytics({
                  byMonth: occupancy,
                  aptStats,
                  bySource,
                  byStatus,
                  year,
                  totalRevenue,
                  yearRevenue,
                  totalNights,
                  avgStay,
                  avgTicket,
                })
              }
              className="panel-btn panel-btn-ghost panel-btn-sm"
            >
              <Ico d={paths.upload} size={13} color="currentColor" /> Excel
            </button>
            <button
              onClick={() =>
                generateAnalyticsReport({
                  year,
                  totalRevenue,
                  yearRevenue,
                  totalNights,
                  avgStay,
                  avgTicket,
                  aptStats,
                  bySource,
                  byStatus,
                  byMonth: occupancy,
                })
              }
              className="panel-btn panel-btn-ghost panel-btn-sm"
            >
              <Ico d={paths.download} size={13} color="currentColor" /> PDF
            </button>
            <button
              onClick={async () => {
                try {
                  setExportingDrive(true);
                  const { data, error } = await supabase.functions.invoke('drive-export');
                  if (error || (data && data.error))
                    throw new Error(error?.message || data?.error || 'Error en Edge Function');
                  toast.success('Pestaña añadida a tu Google Sheet correctamente');
                } catch (err: any) {
                  toast.error('Error al subir a Sheets: ' + err.message);
                } finally {
                  setExportingDrive(false);
                }
              }}
              disabled={exportingDrive}
              className="panel-btn panel-btn-ghost panel-btn-sm"
            >
              {exportingDrive ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : null}
              {exportingDrive ? 'Creando…' : 'Añadir a Sheets'}
            </button>
          </div>
        }
      />

      {/* KPIs globales */}
      <div className="panel-kpi-grid">
        {[
          {
            label: 'Ingresos totales',
            value: fmt(totalRevenue),
            trend: 'histórico',
            icon: paths.cash,
          },
          {
            label: `Ingresos ${year}`,
            value: fmt(yearRevenue),
            trend: `${yearRes.length} reservas`,
            icon: paths.trend,
          },
          {
            label: 'Estancia media',
            value: `${avgStay} noches`,
            trend: 'histórico',
            icon: paths.cal,
          },
          { label: 'Ticket medio', value: fmt(avgTicket), trend: 'por reserva', icon: paths.tag },
        ].map(k => (
          <PanelKpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            trend={k.trend}
            icon={<Ico d={k.icon} size={18} color="currentColor" />}
          />
        ))}
      </div>

      {/* Ingresos por mes — barras */}
      <div className="panel-card">
        <h2 className="panel-h3 mb-4">Ingresos por mes — {year}</h2>
        <div className="flex items-end gap-1 h-40">
          {byMonth.map(m => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="relative w-full flex flex-col items-center">
                {m.revenue > 0 && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-navy text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10 pointer-events-none">
                    {fmt(m.revenue)}
                  </div>
                )}
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max(2, (m.revenue / maxRevenue) * 128)}px`,
                    backgroundColor: m.revenue > 0 ? '#1a5f6e' : '#e5e7eb',
                  }}
                />
              </div>
              <span className="text-[10px] text-gray-400">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4">
          <span>
            Total {year}: <strong className="text-navy dark:text-white">{fmt(yearRevenue)}</strong>
          </span>
          <span>
            Reservas: <strong className="text-navy dark:text-white">{yearRes.length}</strong>
          </span>
          <span>
            Noches vendidas: <strong className="text-navy dark:text-white">{yearNights}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy by month */}
        <div className="panel-card">
          <h2 className="panel-h3 mb-4">Ocupación estimada — {year}</h2>
          <div className="space-y-2">
            {occupancy.map(m => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-7 shrink-0">
                  {m.label}
                </span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${m.rate}%`,
                      backgroundColor:
                        m.rate >= 80 ? '#1a5f6e' : m.rate >= 50 ? '#D4A843' : '#94a3b8',
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-8 text-right shrink-0">
                  {m.rate}%
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            *Calculado sobre noches disponibles × apartamentos
          </p>
        </div>

        {/* Por canal */}
        <div className="panel-card">
          <h2 className="panel-h3 mb-4">Reservas por canal — {year}</h2>
          {bySource.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos para este año</p>
          ) : (
            <div className="space-y-3">
              {bySource.map(s => (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{s.count} res.</span>
                      <span className="text-xs font-semibold text-navy dark:text-white">
                        {pct(s.count, totalSource)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct(s.count, totalSource)}%`, backgroundColor: s.color }}
                    />
                  </div>
                  {s.revenue > 0 && (
                    <div className="text-[11px] text-gray-400 mt-0.5 text-right">
                      {fmt(s.revenue)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por apartamento */}
        <div className="panel-card">
          <h2 className="panel-h3 mb-4">Por apartamento — {year}</h2>
          {aptStats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Sin reservas confirmadas este año
            </p>
          ) : (
            <div className="space-y-3">
              {aptStats.map((a: any) => (
                <div key={a.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[60%]">
                      {a.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{a.count} res.</span>
                      <span className="text-xs font-semibold text-navy dark:text-white">
                        {fmt(a.revenue)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-full rounded-full bg-teal-600"
                      style={{ width: `${(a.revenue / maxAptRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reservation status (historical) */}
        <div className="panel-card">
          <h2 className="panel-h3 mb-4">Estado de reservas — histórico</h2>
          <div className="space-y-3">
            {byStatus.map(s => (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{s.count} reservas</span>
                    <span className="text-xs font-semibold text-navy dark:text-white">
                      {pct(s.count, totalAll)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct(s.count, totalAll)}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Total reservas:</span>
            <strong className="text-navy dark:text-white">{totalAll}</strong>
          </div>
        </div>
      </div>

      {/* Reservas por mes — número */}
      <div className="panel-card">
        <h2 className="panel-h3 mb-4">Reservas por mes — {year}</h2>
        <div className="flex items-end gap-1 h-28">
          {byMonth.map(m => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="relative w-full flex flex-col items-center">
                {m.count > 0 && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-navy text-white text-[10px] rounded px-1.5 py-0.5 z-10 pointer-events-none">
                    {m.count}
                  </div>
                )}
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max(2, (m.count / maxCount) * 96)}px`,
                    backgroundColor: m.count > 0 ? '#D4A843' : '#e5e7eb',
                  }}
                />
              </div>
              <span className="text-[10px] text-gray-400">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
