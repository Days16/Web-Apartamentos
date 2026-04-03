import { useState, useEffect } from 'react';
import React from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import type { DbReview } from '../../types';

interface AptOption {
  slug: string;
  name: string;
}

const EMPTY_FORM = { name: '', origin: '', text: '', stars: 5, date: '', apt: '', active: true };
const STARS = [1, 2, 3, 4, 5];

export default function ResenasAdmin() {
  const toast = useToast();
  const [reviews, setReviews] = useState<DbReview[]>([]);
  const [apts, setApts] = useState<AptOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: DbReview) {
    await supabase.from('reviews').update({ active: !r.active }).eq('id', r.id);
    setReviews(prev => prev.map(x => (x.id === r.id ? { ...x, active: !x.active } : x)));
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta reseña? Esta acción no se puede deshacer.')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar la reseña');
      return;
    }
    setReviews(prev => prev.filter(r => r.id !== id));
    toast.success('Reseña eliminada');
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reseñas</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona las opiniones que aparecen en la web. Solo se muestran las activas.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={startNew}
            className="bg-[#1a5f6e] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#154e5b] transition-colors"
          >
            + Nueva reseña
          </button>
        )}
      </div>

      {/* FORMULARIO */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm"
        >
          <h2 className="font-bold text-slate-700 mb-5">
            {editingId ? 'Editar reseña' : 'Nueva reseña'}
          </h2>

          {formError && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre del huésped *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: María García"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Procedencia</label>
              <input
                type="text"
                value={form.origin}
                onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
                placeholder="Ej: Madrid"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Texto de la reseña *
            </label>
            <textarea
              value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
              rows={3}
              placeholder="Escribe la opinión del huésped..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Puntuación</label>
              <div className="flex gap-1 mt-1">
                {STARS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, stars: s }))}
                    className={`text-2xl transition-transform hover:scale-110 ${s <= form.stars ? 'text-[#D4A843]' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Fecha (texto)
              </label>
              <input
                type="text"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                placeholder="Ej: Agosto 2025"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Apartamento (opcional)
              </label>
              <select
                value={form.apt}
                onChange={e => setForm(f => ({ ...f, apt: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20 bg-white"
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
              className="bg-[#1a5f6e] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#154e5b] transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear reseña'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="px-5 py-2 rounded-lg text-sm text-slate-600 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* LISTA */}
      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Cargando reseñas...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">★</div>
          <div className="font-semibold">No hay reseñas todavía</div>
          <div className="text-sm mt-1">Crea la primera con el botón de arriba.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div
              key={r.id}
              className={`bg-white rounded-xl border p-5 flex gap-4 items-start transition-opacity ${r.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="font-semibold text-slate-800 text-sm">{r.name}</span>
                  {r.origin && <span className="text-xs text-slate-400">{r.origin}</span>}
                  <span className="text-[#D4A843] text-sm">{'★'.repeat(r.stars || 5)}</span>
                  {r.date && <span className="text-xs text-slate-400">{r.date}</span>}
                  {r.apt && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                      {apts.find(a => a.slug === r.apt)?.name || r.apt}
                    </span>
                  )}
                  {!r.active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                      Oculta
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">"{r.text}"</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(r)}
                  title={r.active ? 'Ocultar' : 'Mostrar'}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${r.active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {r.active ? 'Activa' : 'Oculta'}
                </button>
                <button
                  onClick={() => startEdit(r)}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
