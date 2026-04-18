/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import Ico, { paths } from '../../components/Ico';
import {
  PanelPageHeader,
  PanelTable,
  PanelBadge,
  PanelModal,
  PanelSlideOver,
  PanelConfirm,
  PanelCard,
  FormField,
  FormSection,
  FormActions,
} from '../../components/panel';
import type { Column } from '../../components/panel';

const TYPE_LABEL = {
  cleaning: 'Limpieza',
  repair: 'Reparación',
  inspection: 'Inspección',
  other: 'Otro',
};
const TYPE_VARIANT = {
  cleaning: 'info',
  repair: 'warning',
  inspection: 'neutral',
  other: 'neutral',
};
const STATUS_LABEL = { pending: 'Pendiente', in_progress: 'En progreso', done: 'Completada' };
const STATUS_VARIANT = { pending: 'warning', in_progress: 'info', done: 'success' };

const EMPTY_FORM = {
  title: '',
  type: 'cleaning',
  apt_slug: '',
  description: '',
  due_date: '',
  assigned_to: '',
  status: 'pending',
};

export default function Tasks() {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [{ data: t }, { data: a }] = await Promise.all([
        supabase.from('maintenance_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('apartments').select('slug, name').order('name'),
      ]);
      setTasks(t || []);
      setApartments(a || []);
    } catch (e) {
      toast.error('Error cargando tareas');
    } finally {
      setLoading(false);
    }
  }

  function aptName(slug) {
    return apartments.find(a => a.slug === slug)?.name || slug || '—';
  }

  function isOverdue(task) {
    if (!task.due_date || task.status === 'done') return false;
    return task.due_date < new Date().toISOString().split('T')[0];
  }

  const filtered = tasks.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return isOverdue(t);
    return t.status === filter;
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(task) {
    setEditing(task);
    setForm({
      title: task.title || '',
      type: task.type || 'cleaning',
      apt_slug: task.apt_slug || '',
      description: task.description || '',
      due_date: task.due_date || '',
      assigned_to: task.assigned_to || '',
      status: task.status || 'pending',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        apt_slug: form.apt_slug || null,
        description: form.description.trim() || null,
        due_date: form.due_date || null,
        assigned_to: form.assigned_to.trim() || null,
        status: form.status,
        updated_at: new Date().toISOString(),
      };
      if (editing) {
        const { error } = await supabase
          .from('maintenance_tasks')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Tarea actualizada');
      } else {
        const { error } = await supabase.from('maintenance_tasks').insert(payload);
        if (error) throw error;
        toast.success('Tarea creada');
      }
      setModalOpen(false);
      fetchAll();
    } catch (e) {
      toast.error(e.message || 'Error guardando tarea');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      const { error } = await supabase.from('maintenance_tasks').delete().eq('id', id);
      if (error) throw error;
      toast.success('Tarea eliminada');
      setConfirmDel(null);
      setSlideOpen(false);
      fetchAll();
    } catch (e) {
      toast.error(e.message || 'Error eliminando tarea');
    }
  }

  const TABS = [
    { id: 'all', label: 'Todas', count: tasks.length },
    { id: 'pending', label: 'Pendientes', count: tasks.filter(t => t.status === 'pending').length },
    {
      id: 'in_progress',
      label: 'En progreso',
      count: tasks.filter(t => t.status === 'in_progress').length,
    },
    { id: 'done', label: 'Completadas', count: tasks.filter(t => t.status === 'done').length },
    { id: 'overdue', label: '⚠ Vencidas', count: tasks.filter(t => isOverdue(t)).length },
  ];

  const columns: Column<any>[] = [
    {
      key: 'title',
      label: 'Tarea',
      render: (_, t) => (
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: 'var(--panel-text)' }}>
              {t.title}
            </span>
            <PanelBadge variant={TYPE_VARIANT[t.type]}>{TYPE_LABEL[t.type]}</PanelBadge>
            {isOverdue(t) && <PanelBadge variant="error">Vencida</PanelBadge>}
          </div>
          {t.description && (
            <div className="text-xs panel-text-muted mt-0.5 line-clamp-1">{t.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'apt_slug',
      label: 'Apartamento',
      width: 150,
      render: (_, t) => <span className="text-sm">{aptName(t.apt_slug)}</span>,
    },
    {
      key: 'due_date',
      label: 'Fecha límite',
      width: 120,
      render: (_, t) => (
        <span className={`text-sm ${isOverdue(t) ? 'text-red-500 font-semibold' : ''}`}>
          {t.due_date ? new Date(t.due_date + 'T00:00:00').toLocaleDateString('es-ES') : '—'}
        </span>
      ),
    },
    {
      key: 'assigned_to',
      label: 'Asignado a',
      width: 140,
      render: (_, t) => <span className="text-sm">{t.assigned_to || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Estado',
      width: 120,
      render: (_, t) => (
        <PanelBadge variant={STATUS_VARIANT[t.status]}>{STATUS_LABEL[t.status]}</PanelBadge>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 80,
      render: (_, t) => (
        <div className="flex gap-1">
          <button
            className="panel-btn panel-btn-ghost panel-btn-sm"
            onClick={e => {
              e.stopPropagation();
              openEdit(t);
            }}
            title="Editar"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <Ico d={paths.edit} size={14} color="currentColor" />
          </button>
          <button
            className="panel-btn panel-btn-ghost panel-btn-sm"
            onClick={e => {
              e.stopPropagation();
              setConfirmDel(t.id);
            }}
            title="Eliminar"
            style={{ minWidth: 44, minHeight: 44, color: '#dc2626' }}
          >
            <Ico d={paths.trash} size={14} color="currentColor" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="panel-page-content">
      <PanelPageHeader
        title="Tareas de mantenimiento"
        subtitle={`${filtered.length} tarea${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <button className="panel-btn panel-btn-primary panel-btn-sm" onClick={openCreate}>
            + Nueva tarea
          </button>
        }
      />

      {/* Tabs de filtro */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`panel-btn panel-btn-sm whitespace-nowrap ${filter === tab.id ? 'panel-btn-primary' : 'panel-btn-ghost'}`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,.12)' }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <PanelTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyText="No hay tareas en esta categoría"
        onRowClick={t => {
          setSelected(t);
          setSlideOpen(true);
        }}
      />

      {/* Modal crear/editar */}
      <PanelModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar tarea' : 'Nueva tarea'}
        size="md"
        footer={
          <FormActions
            saving={saving}
            onCancel={() => setModalOpen(false)}
            submitLabel={editing ? 'Guardar cambios' : 'Crear tarea'}
            onSubmit={handleSave}
          />
        }
      >
        <FormSection columns={2}>
          <FormField label="Título" required style={{ gridColumn: '1 / -1' }}>
            <input
              className="panel-input"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Ej: Limpieza después de checkout"
            />
          </FormField>
          <FormField label="Tipo">
            <select
              className="panel-input"
              aria-label="Tipo de tarea"
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            >
              <option value="cleaning">🧹 Limpieza</option>
              <option value="repair">🔧 Reparación</option>
              <option value="inspection">🔍 Inspección</option>
              <option value="other">📋 Otro</option>
            </select>
          </FormField>
          <FormField label="Estado">
            <select
              className="panel-input"
              aria-label="Estado de la tarea"
              value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
            >
              <option value="pending">Pendiente</option>
              <option value="in_progress">En progreso</option>
              <option value="done">Completada</option>
            </select>
          </FormField>
          <FormField label="Apartamento">
            <select
              className="panel-input"
              aria-label="Apartamento"
              value={form.apt_slug}
              onChange={e => setForm(p => ({ ...p, apt_slug: e.target.value }))}
            >
              <option value="">— Todos / Sin asignar</option>
              {apartments.map(a => (
                <option key={a.slug} value={a.slug}>
                  {a.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Fecha límite">
            <input
              type="date"
              className="panel-input"
              value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
            />
          </FormField>
          <FormField label="Asignado a">
            <input
              className="panel-input"
              value={form.assigned_to}
              onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
              placeholder="Nombre o email"
            />
          </FormField>
          <FormField label="Descripción" style={{ gridColumn: '1 / -1' }}>
            <textarea
              className="panel-input"
              rows={3}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Detalles de la tarea (opcional)"
              style={{ resize: 'vertical' }}
            />
          </FormField>
        </FormSection>
      </PanelModal>

      {/* SlideOver detalle */}
      <PanelSlideOver
        open={slideOpen}
        onClose={() => {
          setSlideOpen(false);
          setSelected(null);
        }}
        title={selected?.title || ''}
        subtitle={selected ? `${TYPE_LABEL[selected.type]} · ${STATUS_LABEL[selected.status]}` : ''}
      >
        {selected && (
          <div className="p-4 space-y-4">
            <div className="flex gap-2 flex-wrap">
              <PanelBadge variant={TYPE_VARIANT[selected.type]}>
                {TYPE_LABEL[selected.type]}
              </PanelBadge>
              <PanelBadge variant={STATUS_VARIANT[selected.status]}>
                {STATUS_LABEL[selected.status]}
              </PanelBadge>
              {isOverdue(selected) && <PanelBadge variant="error">Vencida</PanelBadge>}
            </div>
            <div className="space-y-2 text-sm" style={{ color: 'var(--panel-text)' }}>
              <div>
                <span className="panel-label">Apartamento</span>
                <p className="mt-0.5">{aptName(selected.apt_slug)}</p>
              </div>
              {selected.due_date && (
                <div>
                  <span className="panel-label">Fecha límite</span>
                  <p
                    className={`mt-0.5 ${isOverdue(selected) ? 'text-red-500 font-semibold' : ''}`}
                  >
                    {new Date(selected.due_date + 'T00:00:00').toLocaleDateString('es-ES')}
                  </p>
                </div>
              )}
              {selected.assigned_to && (
                <div>
                  <span className="panel-label">Asignado a</span>
                  <p className="mt-0.5">{selected.assigned_to}</p>
                </div>
              )}
              {selected.description && (
                <div>
                  <span className="panel-label">Descripción</span>
                  <p className="mt-0.5 whitespace-pre-wrap">{selected.description}</p>
                </div>
              )}
              <div>
                <span className="panel-label">Creada</span>
                <p className="mt-0.5">{new Date(selected.created_at).toLocaleString('es-ES')}</p>
              </div>
            </div>
            <div
              className="flex gap-2 pt-4 border-t"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              <button
                className="panel-btn panel-btn-primary panel-btn-sm flex-1"
                onClick={() => {
                  setSlideOpen(false);
                  openEdit(selected);
                }}
              >
                Editar
              </button>
              <button
                className="panel-btn panel-btn-danger panel-btn-sm"
                onClick={() => setConfirmDel(selected.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </PanelSlideOver>

      {/* Confirm eliminar */}
      <PanelConfirm
        open={!!confirmDel}
        title="Eliminar tarea"
        description="Esta acción no se puede deshacer."
        variant="destructive"
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
