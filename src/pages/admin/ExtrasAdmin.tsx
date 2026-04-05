/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { getExtras, upsertExtra, deleteExtra } from '../../services/dataService';
import { formatPrice } from '../../utils/format';
import { useToast } from '../../contexts/ToastContext';

export default function ExtrasAdmin() {
  const toast = useToast();
  const [extras, setExtras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    loadExtras();
  }, []);

  const loadExtras = async () => {
    try {
      setLoading(true);
      const data = await getExtras();
      setExtras(data || []);
    } catch (err) {
      toast.error('Error al cargar extras');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = extra => {
    setEditing(extra.id);
    setFormData({ ...extra });
    setFormError(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAutoTranslate = async () => {
    if (!formData.name?.trim()) {
      setFormError('Escribe el nombre en español antes de traducir');
      return;
    }
    setTranslating(true);
    setFormError(null);
    try {
      const translate = async (text, targetLang) => {
        if (!text?.trim()) return '';
        const res = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
        );
        const json = await res.json();
        return json?.[0]?.map(chunk => chunk?.[0]).filter(Boolean).join('') || text;
      };
      const langs = ['en', 'fr', 'de', 'pt'];
      const updates = {};
      for (const lang of langs) {
        updates[`name_${lang}`] = await translate(formData.name, lang);
        if (formData.description?.trim()) {
          updates[`description_${lang}`] = await translate(formData.description, lang);
        }
      }
      setFormData(prev => ({ ...prev, ...updates }));
    } catch {
      setFormError('Error al traducir. Comprueba la conexión.');
    } finally {
      setTranslating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      setFormError('El nombre es requerido');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const isNew = editing === 'new';
      await upsertExtra({
        ...(isNew ? {} : { id: formData.id }),
        name: formData.name,
        name_en: formData.name_en || '',
        name_fr: formData.name_fr || '',
        name_de: formData.name_de || '',
        name_pt: formData.name_pt || '',
        description: formData.description || '',
        description_en: formData.description_en || '',
        description_fr: formData.description_fr || '',
        description_de: formData.description_de || '',
        description_pt: formData.description_pt || '',
        price: parseFloat(formData.price) || 0,
        active: formData.active !== false,
      });
      toast.success(isNew ? 'Extra creado correctamente' : 'Cambios guardados correctamente');
      setEditing(null);
      setFormData({});
      loadExtras();
    } catch (err) {
      const isRLS = err.code === '42501' || err.message?.includes('policy');
      toast.error(`Error al guardar: ${err.message}${isRLS ? ' (Revisa permisos RLS)' : ''}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!confirm('¿Estás seguro de que deseas eliminar este extra?')) return;
    try {
      await deleteExtra(id);
      toast.success('Extra eliminado');
      loadExtras();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const toggleActiveStatus = async extra => {
    try {
      await upsertExtra({ ...extra, active: !extra.active });
      setExtras(prev => prev.map(e => (e.id === extra.id ? { ...e, active: !e.active } : e)));
    } catch (err) {
      toast.error(err.message || 'Error al actualizar estado');
    }
  };

  // ─── FORMULARIO ─────────────────────────────────────────────────────────
  if (editing) {
    const isNew = editing === 'new';
    return (
      <div className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="extras-form-header border-b border-[#1a5f6e]/30 mb-0 flex items-center gap-4 bg-white">
          <button
            onClick={() => {
              setEditing(null);
              setFormData({});
              setFormError(null);
            }}
            className="px-3.5 py-2 border border-[#1a5f6e] text-[#1a5f6e] rounded font-semibold text-sm hover:bg-[#1a5f6e] hover:text-white transition-colors"
          >
            ← Volver
          </button>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {isNew ? 'Nuevo extra' : `Editando: ${formData.name}`}
            </div>
            <div className="text-sm text-gray-400 mt-0.5">Los cambios se guardarán en Supabase</div>
          </div>
        </div>

        <div className="extras-form-content">
          <div className="max-w-2xl bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="text-base font-semibold text-[#1a5f6e]">Información del extra</div>
              <button
                type="button"
                onClick={handleAutoTranslate}
                disabled={translating || !formData.name?.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a5f6e]/10 text-[#1a5f6e] border border-[#1a5f6e]/30 rounded text-xs font-semibold hover:bg-[#1a5f6e]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {translating ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-[#1a5f6e]/30 border-t-[#1a5f6e] rounded-full animate-spin" />
                    Traduciendo…
                  </>
                ) : (
                  <>🌐 Traducir desde ES</>
                )}
              </button>
            </div>

            {formError && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {formError}
              </div>
            )}

            {/* Nombres */}
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombres</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Español (ES) *</label>
                <input type="text" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} placeholder="Ej: Pack bienvenida" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">English (EN)</label>
                <input type="text" value={formData.name_en || ''} onChange={e => handleInputChange('name_en', e.target.value)} placeholder="Ej: Welcome pack" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Français (FR)</label>
                <input type="text" value={formData.name_fr || ''} onChange={e => handleInputChange('name_fr', e.target.value)} placeholder="Ej: Pack de bienvenue" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Deutsch (DE)</label>
                <input type="text" value={formData.name_de || ''} onChange={e => handleInputChange('name_de', e.target.value)} placeholder="Ej: Willkommenspaket" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Português (PT)</label>
              <input type="text" value={formData.name_pt || ''} onChange={e => handleInputChange('name_pt', e.target.value)} placeholder="Ej: Pack de boas-vindas" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20" />
            </div>

            {/* Descripciones */}
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-4">Descripciones</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Español (ES)</label>
                <textarea value={formData.description || ''} onChange={e => handleInputChange('description', e.target.value)} placeholder="Descripción breve del servicio" rows={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">English (EN)</label>
                <textarea value={formData.description_en || ''} onChange={e => handleInputChange('description_en', e.target.value)} placeholder="Brief service description" rows={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20 resize-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Français (FR)</label>
                <textarea value={formData.description_fr || ''} onChange={e => handleInputChange('description_fr', e.target.value)} placeholder="Brève description du service" rows={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Deutsch (DE)</label>
                <textarea value={formData.description_de || ''} onChange={e => handleInputChange('description_de', e.target.value)} placeholder="Kurze Servicebeschreibung" rows={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20 resize-none" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Português (PT)</label>
              <textarea value={formData.description_pt || ''} onChange={e => handleInputChange('description_pt', e.target.value)} placeholder="Breve descrição do serviço" rows={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20 resize-none" />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Precio (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price ?? 0}
                onChange={e => handleInputChange('price', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e] focus:ring-2 focus:ring-[#1a5f6e]/20"
              />
            </div>

            <div className="flex items-center gap-3 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleInputChange('active', !formData.active)}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${formData.active !== false ? 'bg-[#1a5f6e]' : 'bg-gray-300'}`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${formData.active !== false ? 'left-6' : 'left-1'}`}
                />
              </button>
              <div>
                <div className="text-sm font-medium text-slate-700">Estado del extra</div>
                <div className="text-xs text-gray-400">
                  {formData.active !== false
                    ? 'Activo — visible para los huéspedes'
                    : 'Inactivo — no se muestra'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra fija */}
        <div className="extras-form-footer fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <span className="extras-footer-note text-xs text-gray-400">Los cambios se guardarán en Supabase</span>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditing(null);
                setFormData({});
                setFormError(null);
              }}
              className="px-4 py-2 border border-gray-300 text-slate-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-[#1a5f6e] text-white rounded text-sm font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {saving && (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {saving ? 'Guardando…' : isNew ? 'Crear extra' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── LISTADO ────────────────────────────────────────────────────────────
  return (
    <div className="bg-white">
      {/* Header */}
      <div className="extras-list-header border-b border-gray-200 flex justify-between items-center bg-slate-50">
        <div>
          <div className="text-2xl font-bold text-slate-900">Extras y servicios</div>
          <div className="text-sm text-gray-400 mt-0.5">
            {extras.length} extras · {extras.filter(e => e.active).length} activos
          </div>
        </div>
        <button
          onClick={() => {
            setFormData({ name: '', description: '', price: 0, active: true });
            setEditing('new');
          }}
          className="bg-[#D4A843] text-white px-4 py-2 rounded font-semibold text-sm hover:bg-opacity-90 transition-colors"
        >
          + Nuevo extra
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Cargando extras...</div>
        ) : extras.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No hay extras disponibles. Crea uno nuevo para comenzar.
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            {/* Cabecera tabla */}
            <div className="extras-table-header bg-slate-50 border-b-2 border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div>Servicio</div>
              <div>Precio</div>
              <div>Creado</div>
              <div className="text-center">Estado</div>
              <div className="text-right">Acciones</div>
            </div>

            {extras.map((extra, index) => (
              <div
                key={extra.id}
                className={`extras-table-row hover:bg-gray-50 transition-colors ${index < extras.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                {/* Nombre y descripción */}
                <div className="extras-row-name">
                  <div className="text-sm font-semibold text-slate-800">{extra.name}</div>
                  {extra.description && (
                    <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                      {extra.description.length > 60
                        ? extra.description.substring(0, 60) + '…'
                        : extra.description}
                    </div>
                  )}
                </div>

                {/* Precio */}
                <div className="extras-row-price text-sm font-semibold text-[#1a5f6e]">
                  {formatPrice(extra.price)}
                </div>

                {/* Creado */}
                <div className="extras-row-date text-xs text-gray-400">
                  {extra.created_at
                    ? new Date(extra.created_at).toLocaleDateString('es-ES')
                    : 'N/A'}
                </div>

                {/* Estado toggle */}
                <div className="extras-row-status flex justify-center">
                  <button
                    onClick={() => toggleActiveStatus(extra)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${extra.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {extra.active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                {/* Acciones */}
                <div className="extras-row-actions flex gap-2 justify-end">
                  <button
                    onClick={() => startEdit(extra)}
                    className="px-3 py-1.5 bg-[#1a5f6e] text-white rounded text-xs font-semibold hover:bg-opacity-90 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(extra.id)}
                    className="px-3 py-1.5 border border-red-400 text-red-600 rounded text-xs font-semibold hover:bg-red-50 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
