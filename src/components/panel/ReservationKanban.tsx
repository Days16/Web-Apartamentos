/* eslint-disable */
// @ts-nocheck
import { formatPrice, formatGuestDisplay } from '../../utils/format';
import PanelBadge from './PanelBadge';

const COLUMNS = [
  { id: 'pending', label: 'Pendientes', color: '#d97706', bg: 'rgba(217,119,6,.08)' },
  { id: 'confirmed', label: 'Confirmadas', color: '#16a34a', bg: 'rgba(22,163,74,.08)' },
  { id: 'cancelled', label: 'Canceladas', color: '#dc2626', bg: 'rgba(220,38,38,.08)' },
];

const SRC_LABEL = { web: 'Web', booking: 'Booking', airbnb: 'Airbnb', manual: 'Manual' };
const STATUS_VARIANT = { confirmed: 'success', pending: 'warning', cancelled: 'error' };

interface Props {
  reservations: any[];
  aptName: (r: any) => string;
  onCardClick: (r: any) => void;
}

export default function ReservationKanban({ reservations, aptName, onCardClick }: Props) {
  return (
    <div
      className="reservation-kanban flex gap-4 overflow-x-auto pb-4 pt-1"
      style={{ minHeight: '400px' }}
    >
      {COLUMNS.map(col => {
        const items = reservations.filter(
          r => r.status === col.id || (!r.status && col.id === 'pending')
        );
        return (
          <div
            key={col.id}
            className="flex-shrink-0 flex flex-col rounded-xl"
            style={{
              width: '280px',
              background: col.bg,
              border: `1px solid ${col.color}30`,
            }}
          >
            {/* Cabecera columna */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-t-xl border-b"
              style={{ borderColor: `${col.color}25` }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <span
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: col.color }}
                >
                  {col.label}
                </span>
              </div>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: `${col.color}20`, color: col.color }}
              >
                {items.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5" style={{ maxHeight: '70vh' }}>
              {items.length === 0 && (
                <div
                  className="text-center py-8 text-xs"
                  style={{ color: 'var(--panel-text-muted)' }}
                >
                  Sin reservas
                </div>
              )}
              {items.map(r => (
                <div
                  key={r.id}
                  onClick={() => onCardClick(r)}
                  className="rounded-xl p-3.5 cursor-pointer transition-all group"
                  style={{
                    background: 'var(--panel-surface)',
                    border: '1px solid var(--panel-border)',
                    boxShadow: 'var(--panel-shadow)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--panel-shadow-md)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--panel-shadow)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  {/* Guest + source badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className="text-xs font-semibold truncate flex-1"
                      style={{ color: 'var(--panel-text)' }}
                    >
                      {formatGuestDisplay(r.guest, r.source)}
                    </div>
                    <PanelBadge variant={r.source === 'manual' ? 'warning' : 'info'}>
                      {SRC_LABEL[r.source] || 'Web'}
                    </PanelBadge>
                  </div>

                  {/* Apartamento */}
                  <div className="text-[11px] mb-2" style={{ color: 'var(--panel-text-muted)' }}>
                    {aptName(r)}
                  </div>

                  {/* Fechas */}
                  <div
                    className="flex items-center gap-1 text-[10px] mb-3"
                    style={{ color: 'var(--panel-text-muted)' }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{r.checkin}</span>
                    <span>→</span>
                    <span>{r.checkout}</span>
                    <span className="ml-1 opacity-70">· {r.nights}n</span>
                  </div>

                  {/* Footer: total + noches */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: 'var(--panel-accent)' }}>
                      {formatPrice(r.total)}
                    </span>
                    {r.cashPaid && (
                      <span className="text-[9px] font-semibold" style={{ color: '#16a34a' }}>
                        ✓ pagado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
