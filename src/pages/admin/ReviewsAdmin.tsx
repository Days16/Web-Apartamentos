import { useState, useEffect } from 'react';
import React from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import type { DbReview } from '../../types';
import { PanelPageHeader, PanelConfirm } from '../../components/panel';

interface AptOption {
  slug: string;
  name: string;
}

const EMPTY_FORM = { name: '', origin: '', text: '', stars: 5, date: '', apt: '', active: true };
const STARS = [1, 2, 3, 4, 5];

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Activas' },
  { key: 'inactive', label: 'Inactivas' },
];

function StarRating({ stars, max = 5, size = 14 }: { stars: number; max?: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i < stars ? '#D4A843' : 'none'}
          stroke={i < stars ? '#D4A843' : '#d1d5db'}
          strokeWidth="1.5"
        >
          <path
            strokeLinejoin="round"
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span className="inline-flex gap-1">
      {STARS.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-110"
        >
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill={s <= value ? '#D4A843' : 'none'}
            stroke={s <= value ? '#D4A843' : '#d1d5db'}
            strokeWidth="1.5"
          >
            <path
              strokeLinejoin="round"
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        </button>
      ))}
    </span>
  );
}

export default function ResenasAdmin() {
  const toast = useToast();
  const [reviews, setReviews] = useState<DbReview[]>([]);
  const [apts, setApts] = useState<AptOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: revs }, { data: aptsData }] = await Promise.all([
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('apartments').select('slug, name').order('name'),
    ]);
    setReviews(revs || []);
    setApts(aptsData || []);
    setLoading(false);
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setFormError(null);
  }

  function startEdit(r: DbReview) {
    setForm({
      name: r.name || '',
      origin: r.origin || '',
      text: r.text || '',
      stars: r.stars || 5,
      date: r.date || '',
      apt: r.apt || '',
      active: r.active !== false,
    });
    setEditingId(r.id);
    setShowForm(true);
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim() || !form.text.trim()) {
      setFormError('El nombre y el texto son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        origin: form.origin.trim() || null,
        text: form.text.trim(),
        stars: Number(form.stars),
        date: form.date.trim() || null,
        apt: form.apt || null,
        active: form.active,
      };
      if (editingId) {
        const { error } = await supabase.from('reviews').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Reseña actualizada correctamente');
      } else {
        const { error } = await supabase.from('reviews').insert(payload);
        if (error) throw error;
        toast.success('Reseña creada correctamente');
      }
      await loadData();
      cancelForm();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: DbReview) {
    await supabase.from('reviews').update({ active: !r.active }).eq('id', r.id);
    setReviews(prev => prev.map(x => (x.id === r.id ? { ...x, active: !x.active } : x)));
  }

  async function handleDeleteConfirmed() {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!id) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar la reseña');
      return;
    }
    setReviews(prev => prev.filter(r => r.id !== id));
    toast.success('Reseña eliminada');
  }

  const filtered = reviews.filter(r => {
    if (filter === 'active') return r.active !== false;
    if (filter === 'inactive') return r.active === false;
    return true;
  });

  return (
    <div className="panel-page-content">
      <PanelPageHeader
        title="Reseñas"
        subtitle="Gestiona las opiniones que aparecen en la web. Solo se muestran las activas."
        actions={
          <div className="flex items-center gap-2">
            {/* Filtros tabs */}
            <div className="flex rounded-lg overflow-hidden border panel-border-color">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key as any)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.key ? 'bg-[#1a5f6e] text-white' : 'panel-surface-2-bg panel-text-muted'}`}
                >
                  {f.label}
                  {f.key !== 'all' && (
                    <span className="ml-1 opacity-70">
                      (
                      {f.key === 'active'
                        ? reviews.filter(r => r.active !== false).length
                        : reviews.filter(r => r.active === false).length}
                      )
                    </span>
                  )}
                </button>
              ))}
            </div>
            {!showForm && (
              <button onClick={startNew} className="panel-btn panel-btn-primary panel-btn-sm">
                + Nueva reseña
              </button>
            )}
          </div>
        }
      />

      {/* FORM */}
      {showForm && (
        <form onSubmit={handleSave} className="panel-card mb-6">
          <h2 className="panel-h3 mb-5">
            {editingId ? 'Editar reseña' : 'Nueva reseña'}
          </h2>

          {formError && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="panel-form-field-label">Nombre del huésped *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: María García"
                className="panel-input"
              />
            </div>
            <div>
              <label className="panel-form-field-label">Procedencia</label>
              <input
                type="text"
                value={form.origin}
                onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
                placeholder="Ej: Madrid"
                className="panel-input"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="panel-form-field-label">Texto de la reseña *</label>
            <textarea
              value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
              rows={3}
              placeholder="Escribe la opinión del huésped..."
              className="panel-input resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="panel-form-field-label">Puntuación</label>
              <div className="mt-1.5">
                <StarPicker value={form.stars} onChange={s => setForm(f => ({ ...f, stars: s }))} />
              </div>
            </div>
            <div>
              <label className="panel-form-field-label">Fecha (texto)</label>
              <input
                type="text"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                placeholder="Ej: Agosto 2025"
                className="panel-input"
              />
            </div>
            <div>
              <label className="panel-form-field-label">Apartamento (opcional)</label>
              <select
                value={form.apt}
                onChange={e => setForm(f => ({ ...f, apt: e.target.value }))}
                className="panel-input"
              >
                <option value="">General (todos)</option>
                {apts.map(a => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, active: !f.active }))}
              className={`w-10 h-6 rounded-full transition-colors relative ${form.active ? 'bg-[#1a5f6e]' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.active ? 'left-5' : 'left-1'}`}
              />
            </button>
            <span className="text-sm text-slate-600">Visible en la web</span>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="panel-btn panel-btn-primary panel-btn-sm disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear reseña'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="panel-btn panel-btn-ghost panel-btn-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* GRID DE CARDS */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="panel-card animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 bg-slate-100 rounded" />
                <div className="h-2.5 bg-slate-100 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <svg
            className="mx-auto mb-3 opacity-30"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="#D4A843"
            stroke="#D4A843"
            strokeWidth="0.5"
          >
            <path
              strokeLinejoin="round"
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
          <div className="font-semibold">
            {filter === 'all'
              ? 'No hay reseñas todavía'
              : `No hay reseñas ${filter === 'active' ? 'activas' : 'inactivas'}`}
          </div>
          {filter === 'all' && (
            <div className="text-sm mt-1">Crea la primera con el botón de arriba.</div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(r => {
            const initials =
              r.name
                ?.split(' ')
                .map((w: string) => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || '?';
            const aptName = apts.find(a => a.slug === r.apt)?.name;
            return (
              <div
                key={r.id}
                className={`panel-card flex flex-col gap-3 transition-opacity ${!r.active ? 'opacity-60' : ''}`}
              >
                {/* Cabecera */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-[#1a5f6e]">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm panel-text-main">{r.name}</span>
                      {!r.active && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                          Oculta
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating stars={r.stars || 5} size={12} />
                      {r.origin && <span className="text-[11px] text-slate-400">{r.origin}</span>}
                      {r.date && <span className="text-[11px] text-slate-400">· {r.date}</span>}
                    </div>
                  </div>
                </div>

                {/* Texto */}
                <p className="text-sm leading-relaxed line-clamp-3 panel-text-muted">"{r.text}"</p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t panel-border-color">
                  <div>
                    {aptName && (
                      <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                        {aptName}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => toggleActive(r)}
                      title={r.active ? 'Ocultar' : 'Mostrar'}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${r.active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {r.active ? 'Activa' : 'Oculta'}
                    </button>
                    <button
                      onClick={() => startEdit(r)}
                      className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(r.id)}
                      className="px-2.5 py-1 rounded text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PanelConfirm
        open={!!confirmDeleteId}
        variant="destructive"
        title="¿Eliminar esta reseña?"
        description="Esta acción es permanente y no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
