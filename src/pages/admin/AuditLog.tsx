/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { PanelPageHeader, PanelTable, PanelBadge, PanelSlideOver } from '../../components/panel';
import type { Column } from '../../components/panel';

const ACTION_LABELS: Record<string, string> = {
  update_reservation_status: 'Cambiar estado reserva',
  delete_reservation: 'Eliminar reserva',
  confirm_and_mark_paid: 'Confirmar y marcar pagada',
  mark_cash_paid: 'Marcar pago en efectivo',
  update_reservation_extras: 'Actualizar extras reserva',
  create_reservation: 'Crear reserva',
  update_apartment: 'Actualizar apartamento',
  delete_apartment: 'Eliminar apartamento',
  update_setting: 'Cambiar ajuste',
  invite_user: 'Invitar usuario',
  change_user_role: 'Cambiar rol usuario',
};

const ENTITY_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'neutral'> = {
  reservation: 'info',
  apartment: 'success',
  settings: 'warning',
  user: 'neutral',
};

const DATE_FILTERS = [
  { id: '7', label: 'Últimos 7 días' },
  { id: '30', label: 'Últimos 30 días' },
  { id: '0', label: 'Todo' },
];

export default function AuditLog() {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('30');
  const [entityFilter, setEntityFilter] = useState('');
  const [slideOpen, setSlideOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, [dateFilter]);

  async function fetchRecords() {
    setLoading(true);
    try {
      let q = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (dateFilter !== '0') {
        const from = new Date();
        from.setDate(from.getDate() - parseInt(dateFilter));
        q = q.gte('created_at', from.toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;
      setRecords(data || []);
    } catch (e) {
      toast.error('Error cargando registro de auditoría');
    } finally {
      setLoading(false);
    }
  }

  const entities = [...new Set(records.map(r => r.entity).filter(Boolean))];

  const filtered = entityFilter ? records.filter(r => r.entity === entityFilter) : records;

  function formatAction(action: string) {
    return (
      ACTION_LABELS[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    );
  }

  function formatDate(iso: string) {
    if (!iso) return '—';
    const d = new Date(iso);
    return (
      d.toLocaleDateString('es-ES') +
      ' ' +
      d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    );
  }

  const columns: Column<any>[] = [
    {
      key: 'created_at',
      label: 'Fecha / Hora',
      width: 160,
      render: v => <span className="text-xs font-mono panel-text-muted">{formatDate(v)}</span>,
    },
    {
      key: 'user_email',
      label: 'Usuario',
      width: 200,
      render: v => <span className="text-sm truncate">{v || '—'}</span>,
    },
    {
      key: 'action',
      label: 'Acción',
      render: v => <span className="text-sm">{formatAction(v)}</span>,
    },
    {
      key: 'entity',
      label: 'Entidad',
      width: 130,
      render: v =>
        v ? (
          <PanelBadge variant={ENTITY_VARIANT[v] || 'neutral'}>{v}</PanelBadge>
        ) : (
          <span className="panel-text-muted text-xs">—</span>
        ),
    },
    {
      key: 'entity_id',
      label: 'Registro',
      width: 150,
      render: v => (
        <span className="text-xs font-mono panel-text-muted truncate">
          {v ? v.substring(0, 12) + '…' : '—'}
        </span>
      ),
    },
    {
      key: 'details',
      label: '',
      width: 100,
      render: (v, row) =>
        v && Object.keys(v).length > 0 ? (
          <button
            className="panel-btn panel-btn-ghost panel-btn-sm text-xs"
            onClick={e => {
              e.stopPropagation();
              setSelected(row);
              setSlideOpen(true);
            }}
          >
            Ver detalles
          </button>
        ) : null,
    },
  ];

  return (
    <div className="panel-page-content">
      <PanelPageHeader
        title="Registro de auditoría"
        subtitle={`${filtered.length} evento${filtered.length !== 1 ? 's' : ''}`}
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="flex gap-1">
          {DATE_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`panel-btn panel-btn-sm ${dateFilter === f.id ? 'panel-btn-primary' : 'panel-btn-ghost'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {entities.length > 0 && (
          <select
            className="panel-input text-sm w-auto"
            aria-label="Filtrar por entidad"
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
          >
            <option value="">Todas las entidades</option>
            {entities.map(e => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        )}
        {entityFilter && (
          <button
            className="text-xs panel-text-muted hover:underline"
            onClick={() => setEntityFilter('')}
          >
            Limpiar ✕
          </button>
        )}
      </div>

      <PanelTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyText="No hay registros de auditoría para este período"
        onRowClick={row => {
          if (row.details && Object.keys(row.details).length > 0) {
            setSelected(row);
            setSlideOpen(true);
          }
        }}
      />

      {/* SlideOver detalles */}
      <PanelSlideOver
        open={slideOpen}
        onClose={() => {
          setSlideOpen(false);
          setSelected(null);
        }}
        title="Detalles del evento"
        subtitle={
          selected ? `${formatDate(selected.created_at)} · ${selected.user_email || 'Sistema'}` : ''
        }
      >
        {selected && (
          <div className="p-4 space-y-4">
            <div className="space-y-2 text-sm panel-text-main">
              <div>
                <span className="panel-label">Acción</span>
                <p className="mt-0.5 font-medium">{formatAction(selected.action)}</p>
              </div>
              <div>
                <span className="panel-label">Entidad</span>
                <p className="mt-0.5">
                  {selected.entity || '—'} {selected.entity_id ? `· ${selected.entity_id}` : ''}
                </p>
              </div>
              <div>
                <span className="panel-label">Usuario</span>
                <p className="mt-0.5">{selected.user_email || 'Sistema'}</p>
              </div>
            </div>
            {selected.details && Object.keys(selected.details).length > 0 && (
              <div>
                <span className="panel-label block mb-2">Datos del cambio</span>
                <pre className="text-xs rounded-lg p-3 overflow-auto panel-surface-2-bg panel-border-color panel-text-main max-h-[400px] border">
                  {JSON.stringify(selected.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </PanelSlideOver>
    </div>
  );
}
