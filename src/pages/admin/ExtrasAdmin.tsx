// @ts-nocheck
import { useState, useEffect } from 'react';
import { getExtras, upsertExtra, deleteExtra } from '../../services/dataService';
import { formatPrice } from '../../utils/format';
import { useToast } from '../../contexts/ToastContext';
import {
  PanelPageHeader,
  PanelConfirm,
  PanelCard,
  FormSection,
  FormField,
  FormActions,
} from '../../components/panel';

export default function ExtrasAdmin() {
  const toast = useToast();
  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Extra>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const startEdit = (extra: Extra) => {
    setEditing(extra.id);
    setFormData({ ...extra });
    setFormError(null);
  };

  const handleInputChange = (field: string, value: unknown) => {
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
        return (
          json?.[0]
            ?.map(chunk => chunk?.[0])
            .filter(Boolean)
            .join('') || text
        );
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

  const handleDeleteConfirmed = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!id) return;
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
      <div className="panel-page-content">
        <PanelPageHeader
          title={isNew ? 'Nuevo extra' : `Editando: ${formData.name}`}
          subtitle="Los cambios se guardarán en Supabase"
          actions={
            <button
              onClick={() => {
                setEditing(null);
                setFormData({});
                setFormError(null);
              }}
              className="panel-btn panel-btn-ghost panel-btn-sm"
            >
              ← Volver
            </button>
          }
        />

        <div className="max-w-[700px]">
          <PanelCard
            title="Información del extra"
            actions={
              <button
                type="button"
                onClick={handleAutoTranslate}
                disabled={translating || !formData.name?.trim()}
                className="panel-btn panel-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {translating ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-[#1a5f6e]/30 border-t-[#1a5f6e] rounded-full animate-spin" />
                    Traduciendo…
                  </>
                ) : (
                  '🌐 Traducir desde ES'
                )}
              </button>
            }
          >
            {formError && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {formError}
              </div>
            )}

            <div className="panel-section-header">
              <span className="panel-section-header-title">Nombres</span>
            </div>
            <FormSection columns={2}>
              <FormField label="Español (ES)" required>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={e => handleInputChange('name', e.target.value)}
                  placeholder="Ej: Pack bienvenida"
                  className="panel-input"
                />
              </FormField>
              <FormField label="English (EN)">
                <input
                  type="text"
                  value={formData.name_en || ''}
                  onChange={e => handleInputChange('name_en', e.target.value)}
                  placeholder="Ej: Welcome pack"
                  className="panel-input"
                />
              </FormField>
              <FormField label="Français (FR)">
                <input
                  type="text"
                  value={formData.name_fr || ''}
                  onChange={e => handleInputChange('name_fr', e.target.value)}
                  placeholder="Ej: Pack de bienvenue"
                  className="panel-input"
                />
              </FormField>
              <FormField label="Deutsch (DE)">
                <input
                  type="text"
                  value={formData.name_de || ''}
                  onChange={e => handleInputChange('name_de', e.target.value)}
                  placeholder="Ej: Willkommenspaket"
                  className="panel-input"
                />
              </FormField>
            </FormSection>
            <FormSection>
              <FormField label="Português (PT)">
                <input
                  type="text"
                  value={formData.name_pt || ''}
                  onChange={e => handleInputChange('name_pt', e.target.value)}
                  placeholder="Ej: Pack de boas-vindas"
                  className="panel-input"
                />
              </FormField>
            </FormSection>

            <div className="panel-section-header mt-2">
              <span className="panel-section-header-title">Descripciones</span>
            </div>
            <FormSection columns={2}>
              <FormField label="Español (ES)">
                <textarea
                  value={formData.description || ''}
                  onChange={e => handleInputChange('description', e.target.value)}
                  placeholder="Descripción breve del servicio"
                  rows={2}
                  className="panel-input resize-none"
                />
              </FormField>
              <FormField label="English (EN)">
                <textarea
                  value={formData.description_en || ''}
                  onChange={e => handleInputChange('description_en', e.target.value)}
                  placeholder="Brief service description"
                  rows={2}
                  className="panel-input resize-none"
                />
              </FormField>
              <FormField label="Français (FR)">
                <textarea
                  value={formData.description_fr || ''}
                  onChange={e => handleInputChange('description_fr', e.target.value)}
                  placeholder="Brève description du service"
                  rows={2}
                  className="panel-input resize-none"
                />
              </FormField>
              <FormField label="Deutsch (DE)">
                <textarea
                  value={formData.description_de || ''}
                  onChange={e => handleInputChange('description_de', e.target.value)}
                  placeholder="Kurze Servicebeschreibung"
                  rows={2}
                  className="panel-input resize-none"
                />
              </FormField>
            </FormSection>
            <FormSection>
              <FormField label="Português (PT)">
                <textarea
                  value={formData.description_pt || ''}
                  onChange={e => handleInputChange('description_pt', e.target.value)}
                  placeholder="Breve descrição do serviço"
                  rows={2}
                  className="panel-input resize-none"
                />
              </FormField>
            </FormSection>

            <div className="panel-section-header mt-2">
              <span className="panel-section-header-title">Configuración</span>
            </div>
            <FormSection columns={2}>
              <FormField label="Precio (€)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price ?? 0}
                  onChange={e => handleInputChange('price', e.target.value)}
                  className="panel-input"
                />
              </FormField>
            </FormSection>

            <div className="panel-toggle-row mt-2">
              <div>
                <div className="text-sm font-medium panel-text-main">Estado del extra</div>
                <div className="text-xs panel-text-muted mt-0.5">
                  {formData.active !== false
                    ? 'Activo — visible para los huéspedes'
                    : 'Inactivo — no se muestra'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange('active', !formData.active)}
                className={`panel-toggle${formData.active !== false ? ' panel-toggle--on' : ''}`}
                aria-label="Estado del extra"
                role="switch"
                aria-checked={formData.active !== false}
              >
                <span className="panel-toggle-track" />
                <span className="panel-toggle-thumb" />
              </button>
            </div>
          </PanelCard>
        </div>

        <FormActions
          saving={saving}
          submitLabel={isNew ? 'Crear extra' : 'Guardar cambios'}
          onCancel={() => {
            setEditing(null);
            setFormData({});
            setFormError(null);
          }}
          onSubmit={handleSave}
        />
      </div>
    );
  }

  // ─── LISTADO ────────────────────────────────────────────────────────────
  return (
    <div className="panel-page-content">
      <PanelPageHeader
        title="Extras y servicios"
        subtitle={`${extras.length} extras · ${extras.filter(e => e.active).length} activos`}
        actions={
          <button
            onClick={() => {
              setFormData({ name: '', description: '', price: 0, active: true });
              setEditing('new');
            }}
            className="panel-btn panel-btn-primary panel-btn-sm"
          >
            + Nuevo extra
          </button>
        }
      />

      <div>
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Cargando extras...</div>
        ) : extras.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No hay extras disponibles. Crea uno nuevo para comenzar.
          </div>
        ) : (
          <div className="panel-card overflow-hidden !p-0">
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
                {/* Name and description */}
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
                    className="panel-btn panel-btn-primary panel-btn-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(extra.id)}
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

      <PanelConfirm
        open={!!confirmDeleteId}
        variant="destructive"
        title="¿Eliminar este extra?"
        description="Esta acción es permanente y no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
