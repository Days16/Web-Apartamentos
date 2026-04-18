import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface AuditEntry {
  id: string;
  action: string;
  record_id: string;
  details: Record<string, any> | null;
  created_at: string;
  user_id?: string;
}

const ACTION_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  create_reservation: { icon: '📅', label: 'Reserva creada', color: '#16a34a' },
  update_reservation_status: { icon: '🔄', label: 'Estado actualizado', color: '#2563eb' },
  mark_cash_paid: { icon: '💵', label: 'Pago efectivo registrado', color: '#16a34a' },
  delete_reservation: { icon: '🗑', label: 'Reserva eliminada', color: '#dc2626' },
  update_extras: { icon: '➕', label: 'Extras modificados', color: '#d97706' },
  generate_invoice: { icon: '🧾', label: 'Factura generada', color: '#7c3aed' },
  checkin: { icon: '🔑', label: 'Check-in registrado', color: '#0891b2' },
  checkout: { icon: '🏁', label: 'Check-out registrado', color: '#0891b2' },
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  );
}

function getActionLabel(entry: AuditEntry): {
  icon: string;
  label: string;
  color: string;
  extra?: string;
} {
  const cfg = ACTION_CONFIG[entry.action] ?? {
    icon: '●',
    label: entry.action,
    color: 'var(--panel-text-muted)',
  };
  let extra: string | undefined;
  if (entry.action === 'update_reservation_status' && entry.details?.newStatus) {
    const labels: Record<string, string> = {
      confirmed: 'Confirmada',
      cancelled: 'Cancelada',
      pending: 'Pendiente',
    };
    extra = `→ ${labels[entry.details.newStatus] ?? entry.details.newStatus}`;
  }
  return { ...cfg, extra };
}

interface Props {
  reservationId: string;
}

export default function ReservationTimeline({ reservationId }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reservationId) return;
    setLoading(true);
    supabase
      .from('audits')
      .select('*')
      .eq('record_id', reservationId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setEntries(data || []);
        setLoading(false);
      });
  }, [reservationId]);

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-start gap-3">
            <div className="panel-skeleton w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="panel-skeleton h-3 rounded w-3/4" />
              <div className="panel-skeleton h-2.5 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-sm text-center py-6" style={{ color: 'var(--panel-text-muted)' }}>
        Sin historial de actividad registrado.
      </div>
    );
  }

  return (
    <div className="relative mt-2">
      {/* Vertical line */}
      <div
        className="absolute left-[15px] top-0 bottom-0 w-px"
        style={{ background: 'var(--panel-border)' }}
      />

      <div className="space-y-0">
        {entries.map((entry, _i) => {
          const { icon, label, color, extra } = getActionLabel(entry);
          return (
            <div key={entry.id} className="flex items-start gap-3 relative pb-4">
              {/* Point on line */}
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm z-10"
                style={{ background: `${color}18`, border: `2px solid ${color}30` }}
              >
                {icon}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--panel-text)' }}>
                    {label}
                  </span>
                  {extra && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: `${color}15`, color }}
                    >
                      {extra}
                    </span>
                  )}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--panel-text-muted)' }}>
                  {timeLabel(entry.created_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
