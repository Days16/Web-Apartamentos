/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import {
  PanelPageHeader,
  PanelTable,
  PanelBadge,
  PanelModal,
  PanelConfirm,
  FormField,
  FormSection,
  FormActions,
} from '../../components/panel';
import type { Column } from '../../components/panel';

const EMPTY = {
  code: '',
  type: 'percent',
  value: 10,
  min_nights: 1,
  valid_from: '',
  valid_until: '',
  max_uses: '',
  active: true,
};

function formatValue(row) {
  return row.type === 'percent' ? `${row.value}%` : `€${Number(row.value).toFixed(2)}`;
}

export default function DiscountCodes() {
  const toast = useToast();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Error cargando códigos');
    else setCodes(data || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      code: row.code,
      type: row.type,
      value: row.value,
      min_nights: row.min_nights ?? 1,
      valid_from: row.valid_from ?? '',
      valid_until: row.valid_until ?? '',
      max_uses: row.max_uses != null ? String(row.max_uses) : '',
      active: row.active,
    });
    setModalOpen(true);
  }

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }));

  async function handleSave() {
    if (!form.code.trim()) {
      toast.error('El código es obligatorio');
      return;
    }
    if (!form.value || Number(form.value) <= 0) {
      toast.error('El valor debe ser mayor que 0');
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      min_nights: Number(form.min_nights) || 1,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      max_uses: form.max_uses !== '' ? Number(form.max_uses) : null,
      active: form.active,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('discount_codes').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('discount_codes').insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error(error.code === '23505' ? 'Ese código ya existe' : error.message);
    } else {
      toast.success(editing ? 'Código actualizado' : 'Código creado');
      setModalOpen(false);
      loadCodes();
    }
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('discount_codes').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Código eliminado');
      setConfirmDel(null);
      loadCodes();
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'code',
      label: 'Código',
      render: v => (
        <span className="font-mono font-bold text-[13px] panel-text-accent">
          {v}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      width: 120,
      render: v => (v === 'percent' ? 'Porcentaje' : 'Importe fijo'),
    },
    {
      key: 'value',
      label: 'Valor',
      width: 90,
      align: 'right' as const,
      render: (_, row) => <strong>{formatValue(row)}</strong>,
    },
    {
      key: 'min_nights',
      label: 'Noches mín.',
      width: 100,
      align: 'center' as const,
    },
    {
      key: 'valid_until',
      label: 'Válido hasta',
      width: 130,
      render: v => (v ? new Date(v).toLocaleDateString('es-ES') : '—'),
    },
    {
      key: 'used_count',
      label: 'Usos',
      width: 90,
      align: 'center' as const,
      render: (v, row) => `${v ?? 0}${row.max_uses != null ? ` / ${row.max_uses}` : ''}`,
    },
    {
      key: 'active',
      label: 'Estado',
      width: 100,
      render: v => (
        <PanelBadge variant={v ? 'success' : 'neutral'} dot>
          {v ? 'Activo' : 'Inactivo'}
        </PanelBadge>
      ),
    },
    {
      key: 'id',
      label: '',
      width: 110,
      render: (_, row) => (
        <div className="flex gap-1 justify-end">
          <button
            className="panel-btn panel-btn-ghost panel-btn-sm"
            onClick={e => {
              e.stopPropagation();
              openEdit(row);
            }}
          >
            Editar
          </button>
          <button
            className="panel-btn panel-btn-ghost panel-btn-sm text-red-600"
            onClick={e => {
              e.stopPropagation();
              setConfirmDel(row.id);
            }}
          >
            Eliminar
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="panel-page-content">
      <PanelPageHeader
        title="Códigos de descuento"
        subtitle={`${codes.length} código${codes.length !== 1 ? 's' : ''} · ${codes.filter(c => c.active).length} activos`}
        actions={
          <button className="panel-btn panel-btn-primary panel-btn-sm" onClick={openNew}>
            + Nuevo código
          </button>
        }
      />

      <PanelTable
        columns={columns}
        data={codes}
        loading={loading}
        emptyText="No hay códigos de descuento. Crea uno nuevo."
        onRowClick={openEdit}
      />

      <PanelModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar código' : 'Nuevo código de descuento'}
        size="md"
        footer={
          <FormActions
            saving={saving}
            submitLabel={editing ? 'Guardar cambios' : 'Crear código'}
            onCancel={() => setModalOpen(false)}
            onSubmit={handleSave}
          />
        }
      >
        <FormSection columns={2}>
          <FormField label="Código" required>
            <input
              className="panel-input"
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="VERANO10"
              autoComplete="off"
            />
          </FormField>
          <FormField label="Tipo" required>
            <select
              className="panel-input"
              aria-label="Tipo de descuento"
              value={form.type}
              onChange={e => set('type', e.target.value)}
            >
              <option value="percent">Porcentaje %</option>
              <option value="fixed">Importe fijo €</option>
            </select>
          </FormField>
          <FormField label={form.type === 'percent' ? 'Porcentaje (%)' : 'Importe (€)'} required>
            <input
              type="number"
              className="panel-input"
              min="1"
              step={form.type === 'percent' ? '1' : '0.01'}
              value={form.value}
              onChange={e => set('value', e.target.value)}
            />
          </FormField>
          <FormField label="Noches mínimas">
            <input
              type="number"
              className="panel-input"
              min="1"
              value={form.min_nights}
              onChange={e => set('min_nights', e.target.value)}
            />
          </FormField>
          <FormField label="Válido desde">
            <input
              type="date"
              className="panel-input"
              value={form.valid_from}
              onChange={e => set('valid_from', e.target.value)}
            />
          </FormField>
          <FormField label="Válido hasta">
            <input
              type="date"
              className="panel-input"
              value={form.valid_until}
              onChange={e => set('valid_until', e.target.value)}
            />
          </FormField>
          <FormField label="Usos máximos" hint="Vacío = ilimitado">
            <input
              type="number"
              className="panel-input"
              min="1"
              value={form.max_uses}
              onChange={e => set('max_uses', e.target.value)}
              placeholder="Ilimitado"
            />
          </FormField>
        </FormSection>

        {editing && (
          <div className="panel-info-box mt-2 text-sm">
            Usos registrados: <strong>{editing.used_count ?? 0}</strong>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => set('active', !form.active)}
            className={`panel-toggle${form.active ? ' panel-toggle--on' : ''}`}
            role="switch"
            aria-checked={form.active}
            aria-label="Código activo"
          >
            <span className="panel-toggle-track" />
            <span className="panel-toggle-thumb" />
          </button>
          <span className="text-sm panel-text-main">
            {form.active ? 'Activo — los huéspedes pueden usarlo' : 'Inactivo — no se puede usar'}
          </span>
        </div>
      </PanelModal>

      <PanelConfirm
        open={!!confirmDel}
        variant="destructive"
        title="¿Eliminar este código?"
        description="Esta acción es permanente. El código dejará de funcionar de inmediato."
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
