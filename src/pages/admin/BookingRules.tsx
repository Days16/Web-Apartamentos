/* eslint-disable */
// @ts-nocheck
import { useState } from 'react';
import {
  fetchMinStayRules,
  addMinStayRule,
  updateMinStayRule,
  deleteMinStayRule,
  fetchAllApartments,
} from '../../services/supabaseService';
import Ico, { paths } from '../../components/Ico';
import { PanelPageHeader, PanelConfirm, PanelModal } from '../../components/panel';
import { usePanelData } from '../../hooks/usePanelData';

export default function ReglasReserva() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [formData, setFormData] = useState({
    apartment_slug: '',
    start_date: '',
    end_date: '',
    min_nights: 1,
    description: '',
  });

  const {
    data: rulesData,
    loading: loadingRules,
    reload: reloadRules,
  } = usePanelData({ fetcher: fetchMinStayRules });
  const { data: apartmentsData, loading: loadingApts } = usePanelData({
    fetcher: fetchAllApartments,
  });

  const rules = rulesData ?? [];
  const apartments = apartmentsData ?? [];
  const loading = loadingRules || loadingApts;

  async function loadData() {
    reloadRules();
  }

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editingRule) {
        await updateMinStayRule(editingRule.id, formData);
      } else {
        await addMinStayRule(formData);
      }
      setIsModalOpen(false);
      setEditingRule(null);
      setFormData({
        apartment_slug: '',
        start_date: '',
        end_date: '',
        min_nights: 1,
        description: '',
      });
      loadData();
    } catch (err) {
      alert('Error guardando la regla');
    }
  };

  const handleDeleteConfirmed = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!id) return;
    try {
      await deleteMinStayRule(id);
      loadData();
    } catch (err) {
      console.error('Error eliminando la regla', err);
    }
  };

  const openEdit = rule => {
    setEditingRule(rule);
    setFormData({
      apartment_slug: rule.apartment_slug,
      start_date: rule.start_date,
      end_date: rule.end_date,
      min_nights: rule.min_nights,
      description: rule.description,
    });
    setIsModalOpen(true);
  };

  if (loading) return <div className="panel-page-content text-slate-400">Cargando reglas...</div>;

  return (
    <div className="panel-page-content">
      <PanelPageHeader
        title="Reglas de Reserva"
        subtitle="Define estancias mínimas obligatorias para fechas especiales."
        actions={
          <button
            onClick={() => {
              setEditingRule(null);
              setIsModalOpen(true);
            }}
            className="panel-btn panel-btn-primary panel-btn-sm flex items-center gap-2"
          >
            <Ico d={paths.plus} size={14} color="white" />
            Nueva Regla
          </button>
        }
      />

      <div className="panel-card overflow-hidden !p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Apartamento
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Período
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                Noches Mín.
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Descripción
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rules.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">
                  No hay reglas definidas todavía.
                </td>
              </tr>
            ) : (
              rules.map(rule => (
                <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-navy">
                    {apartments.find(a => a.slug === rule.apartment_slug)?.name || 'Todos'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">📅</span>
                      <span>{new Date(rule.start_date).toLocaleDateString()}</span>
                      <span className="text-slate-300">→</span>
                      <span>{new Date(rule.end_date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                      {rule.min_nights} noches
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 italic max-w-xs truncate">
                    {rule.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(rule)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Ico d={paths.edit} size={16} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(rule.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Ico d={paths.trash} size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PanelModal
        open={isModalOpen}
        title={editingRule ? 'Editar Regla' : 'Nueva Regla'}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Apartamento
            </label>
            <select
              required
              className="panel-input w-full"
              value={formData.apartment_slug}
              onChange={e => setFormData({ ...formData, apartment_slug: e.target.value })}
            >
              <option value="">Selecciona alojamiento...</option>
              {apartments.map(a => (
                <option key={a.slug} value={a.slug}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Inicio
              </label>
              <input
                type="date"
                required
                className="panel-input w-full"
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fin</label>
              <input
                type="date"
                required
                className="panel-input w-full"
                value={formData.end_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Noches Mínimas
            </label>
            <input
              type="number"
              min="1"
              required
              className="panel-input w-full"
              value={formData.min_nights}
              onChange={e => setFormData({ ...formData, min_nights: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Descripción / Nota (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Temporada alta"
              className="panel-input w-full"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="panel-btn panel-btn-ghost flex-1"
            >
              Cancelar
            </button>
            <button type="submit" className="panel-btn panel-btn-primary flex-1">
              Guardar
            </button>
          </div>
        </form>
      </PanelModal>

      <PanelConfirm
        open={!!confirmDeleteId}
        variant="destructive"
        title="¿Eliminar esta regla?"
        description="Esta acción es permanente y no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
