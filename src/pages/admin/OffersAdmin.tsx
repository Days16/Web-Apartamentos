/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  PanelPageHeader,
  PanelConfirm,
  PanelCard,
  FormSection,
  FormField,
  FormActions,
} from '../../components/panel';

export default function OfertasAdmin() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('offers')
        .select('*')
        .order('id', { ascending: false });

      if (fetchError) throw fetchError;
      setOffers(data || []);
    } catch (err) {
      console.error('Error loading offers:', err);
      // Don't show errors if the table likely doesn't exist yet
      if (err.message && err.message.includes('relation "offers" does not exist')) {
        setError(
          'La tabla de ofertas aún no existe en Supabase. Ejecuta el script SQL proporcionado.'
        );
      } else {
        setError(err.message || 'Error al cargar ofertas');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAutoTranslate = async () => {
    if (!formData.title_es?.trim()) {
      setError('Escribe al menos el título en español antes de traducir');
      return;
    }
    setTranslating(true);
    setError(null);
    try {
      const translate = async (text, targetLang) => {
        if (!text?.trim()) return '';
        const res = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
        );
        const json = await res.json();
        // Response: [[["translated","original",...]], ...]
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
        updates[`title_${lang}`] = await translate(formData.title_es, lang);
        if (formData.description_es?.trim()) {
          updates[`description_${lang}`] = await translate(formData.description_es, lang);
        }
      }
      setFormData(prev => ({ ...prev, ...updates }));
    } catch (err) {
      setError('Error al traducir automáticamente. Comprueba la conexión.');
    } finally {
      setTranslating(false);
    }
  };

  const startEdit = offer => {
    setFormData({ ...offer });
    setEditing(offer.id);
    setError(null);
  };

  const handleSave = async () => {
    try {
      if (!formData.title_es?.trim()) {
        setError('El título en español es requerido');
        return;
      }
      if (!formData.discount_percentage || formData.discount_percentage <= 0) {
        setError('El porcentaje de descuento debe ser mayor a 0');
        return;
      }

      setSaving(true);
      const { error: updateError } = await supabase
        .from('offers')
        .update({
          title_es: formData.title_es,
          title_en: formData.title_en || '',
          title_fr: formData.title_fr || '',
          title_de: formData.title_de || '',
          title_pt: formData.title_pt || '',
          description_es: formData.description_es || '',
          description_en: formData.description_en || '',
          description_fr: formData.description_fr || '',
          description_de: formData.description_de || '',
          description_pt: formData.description_pt || '',
          discount_code: formData.discount_code?.toUpperCase() || '',
          discount_percentage: parseInt(formData.discount_percentage) || 0,
          active: formData.active !== false,
        })
        .eq('id', formData.id);

      if (updateError) throw updateError;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setEditing(null);
      loadOffers();
    } catch (err) {
      console.error('Error saving offer:', err);
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.title_es?.trim()) {
        setError('El título en español es requerido');
        return;
      }
      if (!formData.discount_percentage || formData.discount_percentage <= 0) {
        setError('El porcentaje de descuento debe ser mayor a 0');
        return;
      }

      setSaving(true);
      const { error: insertError } = await supabase.from('offers').insert([
        {
          title_es: formData.title_es,
          title_en: formData.title_en || '',
          title_fr: formData.title_fr || '',
          title_de: formData.title_de || '',
          title_pt: formData.title_pt || '',
          description_es: formData.description_es || '',
          description_en: formData.description_en || '',
          description_fr: formData.description_fr || '',
          description_de: formData.description_de || '',
          description_pt: formData.description_pt || '',
          discount_code: formData.discount_code?.toUpperCase() || '',
          discount_percentage: parseInt(formData.discount_percentage) || 0,
          active: true,
        },
      ]);

      if (insertError) throw insertError;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setEditing(null);
      setFormData({});
      loadOffers();
    } catch (err) {
      console.error('Error creating offer:', err);
      setError(err.message || 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!id) return;
    try {
      const { error: deleteError } = await supabase.from('offers').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      loadOffers();
    } catch (err) {
      console.error('Error deleting offer:', err);
      setError(err.message || 'Error al eliminar');
    }
  };

  const toggleActiveStatus = async offer => {
    try {
      const { error: updateError } = await supabase
        .from('offers')
        .update({ active: !offer.active })
        .eq('id', offer.id);

      if (updateError) throw updateError;
      loadOffers();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message || 'Error al actualizar estado');
    }
  };

  // Edit form
  if (editing) {
    const isNew = editing === 'new';
    return (
      <div className="panel-page-content">
        <PanelPageHeader
          title={isNew ? 'Nueva Oferta Especial' : 'Editando Oferta'}
          subtitle="Los cambios se guardarán en Supabase"
          actions={
            <button
              className="panel-btn panel-btn-ghost panel-btn-sm"
              onClick={() => {
                setEditing(null);
                setFormData({});
              }}
            >
              ← Volver
            </button>
          }
        />

        <div className="max-w-[800px]">
          <PanelCard title="Información de la oferta">
            {/* Títulos */}
            <div className="panel-section-header">
              <span className="panel-section-header-title">Títulos y descripciones</span>
              <button
                type="button"
                onClick={handleAutoTranslate}
                disabled={translating || !formData.title_es?.trim()}
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
            </div>
            <FormSection columns={2}>
              <FormField label="Español (ES)" required>
                <input
                  type="text"
                  value={formData.title_es || ''}
                  onChange={e => handleInputChange('title_es', e.target.value)}
                  placeholder="Ej: Descuento de Verano"
                  className="panel-input"
                />
              </FormField>
              <FormField label="English (EN)">
                <input
                  type="text"
                  value={formData.title_en || ''}
                  onChange={e => handleInputChange('title_en', e.target.value)}
                  placeholder="Ej: Summer Discount"
                  className="panel-input"
                />
              </FormField>
              <FormField label="Français (FR)">
                <input
                  type="text"
                  value={formData.title_fr || ''}
                  onChange={e => handleInputChange('title_fr', e.target.value)}
                  placeholder="Ej: Réduction d'été"
                  className="panel-input"
                />
              </FormField>
              <FormField label="Deutsch (DE)">
                <input
                  type="text"
                  value={formData.title_de || ''}
                  onChange={e => handleInputChange('title_de', e.target.value)}
                  placeholder="Ej: Sommerrabatt"
                  className="panel-input"
                />
              </FormField>
            </FormSection>
            <FormSection>
              <FormField label="Português (PT)">
                <input
                  type="text"
                  value={formData.title_pt || ''}
                  onChange={e => handleInputChange('title_pt', e.target.value)}
                  placeholder="Ej: Desconto de Verão"
                  className="panel-input"
                />
              </FormField>
            </FormSection>

            {/* Descripciones */}
            <div className="panel-section-header mt-2">
              <span className="panel-section-header-title">Descripciones</span>
            </div>
            <FormSection columns={2}>
              <FormField label="Español (ES)">
                <textarea
                  value={formData.description_es || ''}
                  onChange={e => handleInputChange('description_es', e.target.value)}
                  placeholder="Detalles sobre la oferta"
                  rows={3}
                  className="panel-input resize-none"
                />
              </FormField>
              <FormField label="English (EN)">
                <textarea
                  value={formData.description_en || ''}
                  onChange={e => handleInputChange('description_en', e.target.value)}
                  placeholder="Details about the offer"
                  rows={3}
                  className="panel-input resize-none"
                />
              </FormField>
              <FormField label="Français (FR)">
                <textarea
                  value={formData.description_fr || ''}
                  onChange={e => handleInputChange('description_fr', e.target.value)}
                  placeholder="Détails de l'offre"
                  rows={3}
                  className="panel-input resize-none"
                />
              </FormField>
              <FormField label="Deutsch (DE)">
                <textarea
                  value={formData.description_de || ''}
                  onChange={e => handleInputChange('description_de', e.target.value)}
                  placeholder="Details zum Angebot"
                  rows={3}
                  className="panel-input resize-none"
                />
              </FormField>
            </FormSection>
            <FormSection>
              <FormField label="Português (PT)">
                <textarea
                  value={formData.description_pt || ''}
                  onChange={e => handleInputChange('description_pt', e.target.value)}
                  placeholder="Detalhes da oferta"
                  rows={3}
                  className="panel-input resize-none"
                />
              </FormField>
            </FormSection>

            {/* Descuento */}
            <div className="panel-section-header mt-2">
              <span className="panel-section-header-title">Configuración del descuento</span>
            </div>
            <FormSection columns={2}>
              <FormField label="Porcentaje de descuento (%)" required>
                <input
                  type="number"
                  value={formData.discount_percentage || 0}
                  onChange={e => handleInputChange('discount_percentage', e.target.value)}
                  min="1"
                  max="100"
                  placeholder="10"
                  className="panel-input font-mono"
                />
              </FormField>
              <FormField
                label="Código de descuento"
                hint="Si se deja vacío, la oferta se aplica globalmente (banner automático)."
              >
                <input
                  type="text"
                  value={formData.discount_code?.toUpperCase() || ''}
                  onChange={e => handleInputChange('discount_code', e.target.value.toUpperCase())}
                  placeholder="VERANO26"
                  className="panel-input font-mono"
                />
              </FormField>
            </FormSection>
          </PanelCard>
        </div>

        <FormActions
          saving={saving}
          onCancel={() => {
            setEditing(null);
            setFormData({});
          }}
          onSubmit={isNew ? handleCreate : handleSave}
        />
      </div>
    );
  }

  // Listado
  return (
    <div className="panel-page-content">
      <PanelPageHeader
        title="Ofertas Especiales"
        subtitle={`Gestiona ${offers.length} ofertas promocionales · ${offers.filter(e => e.active).length} activas`}
        actions={
          <button
            onClick={() => {
              setFormData({
                title_es: '',
                title_en: '',
                title_fr: '',
                title_de: '',
                title_pt: '',
                description_es: '',
                description_en: '',
                description_fr: '',
                description_de: '',
                description_pt: '',
                discount_percentage: 10,
                active: true,
              });
              setEditing('new');
            }}
            disabled={error && error.includes('no existe en Supabase')}
            className="panel-btn panel-btn-primary panel-btn-sm"
          >
            + Nueva oferta
          </button>
        }
      />

      <div>
        {error && error.includes('no existe') && (
          <div className="bg-amber-50 border border-amber-400 text-amber-800 p-4 rounded-lg mb-5">
            <strong>Atención:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 px-5 text-gray-500">Cargando ofertas...</div>
        ) : !error || !error.includes('no existe') ? (
          offers.length === 0 ? (
            <div className="text-center py-10 px-5 text-gray-500 bg-white rounded-lg border border-gray-200">
              No hay ofertas configuradas. Haz clic en "Nueva oferta" para añadir una.
            </div>
          ) : (
            <div className="panel-card overflow-hidden !p-0">
              <div className="grid grid-cols-[minmax(250px,1.5fr)_100px_150px_100px_150px] gap-4 py-4 px-6 bg-slate-50 border-b-2 border-slate-200 text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                <div>Oferta</div>
                <div>Descuento</div>
                <div>Código</div>
                <div className="text-center">Estado</div>
                <div>Acciones</div>
              </div>

              {offers.map((offer, index) => (
                <div
                  key={offer.id}
                  className={`grid grid-cols-[minmax(250px,1.5fr)_100px_150px_100px_150px] gap-4 items-center py-4 px-6 ${index < offers.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  {/* Info */}
                  <div>
                    <div className="text-sm font-semibold text-[#0f172a] mb-1">
                      {offer.title_es}
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2">{offer.description_es}</div>
                  </div>

                  {/* Info 2 */}
                  <div>
                    <div className="text-sm font-bold text-[#1a5f6e]">
                      -{offer.discount_percentage}%
                    </div>
                  </div>

                  {/* Code */}
                  <div>
                    {offer.discount_code ? (
                      <div className="inline-block px-2 py-1 bg-slate-50 border border-dashed border-slate-400 rounded font-mono text-xs font-semibold text-[#D4A843]">
                        {offer.discount_code}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic">Automático</div>
                    )}
                  </div>

                  {/* Estado */}
                  <div className="text-center">
                    <button
                      onClick={() => toggleActiveStatus(offer)}
                      className={`border-none text-white px-3 py-1.5 rounded-md cursor-pointer text-[11px] font-semibold transition-colors ${offer.active ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 hover:bg-gray-500'}`}
                    >
                      {offer.active ? 'Activa' : 'Inactiva'}
                    </button>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(offer)}
                      className="panel-btn panel-btn-primary panel-btn-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(offer.id)}
                      className="bg-white border border-red-500 text-red-500 px-3 py-1.5 rounded-md cursor-pointer text-[11px] font-semibold hover:bg-red-50 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>

      <PanelConfirm
        open={!!confirmDeleteId}
        variant="destructive"
        title="¿Eliminar esta oferta?"
        description="Esta acción es permanente y no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
