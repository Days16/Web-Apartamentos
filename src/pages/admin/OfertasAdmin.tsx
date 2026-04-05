/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Colores del panel de administración
const PRIMARY_COLOR = '#1a5f6e';
const SECONDARY_COLOR = '#0f172a';
const ACCENT_COLOR = '#D4A843';
const LIGHT_BG = '#f5f5f5';

export default function OfertasAdmin() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [translating, setTranslating] = useState(false);

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
        return json?.[0]?.map(chunk => chunk?.[0]).filter(Boolean).join('') || text;
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

  const handleDelete = async id => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta oferta?')) return;

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

  // Formulario de edición
  if (editing) {
    const isNew = editing === 'new';
    return (
      <>
        <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8 border-b-[4px] border-[#1a5f6e]">
          <div className="flex items-center gap-3">
            <button
              className="bg-transparent border-2 border-[#1a5f6e] text-[#1a5f6e] px-4 py-2 rounded-lg cursor-pointer text-sm font-semibold hover:bg-[#1a5f6e] hover:text-white transition-colors"
              onClick={() => {
                setEditing(null);
                setFormData({});
              }}
            >
              ← Volver
            </button>
            <div>
              <div className="text-[28px] font-bold text-[#0f172a]">
                {isNew ? 'Nueva Oferta Especial' : `Editando Oferta`}
              </div>
              <div className="text-sm text-gray-500 mt-1">Los cambios se guardarán en Supabase</div>
            </div>
          </div>
        </div>

        <div className="p-6 pb-24 bg-[#f5f5f5] min-h-[calc(100vh-120px)]">
          <div className="max-w-[800px]">
            <div className="bg-white border border-gray-200 rounded-xl p-7">
              <div className="text-[22px] font-semibold text-[#1a5f6e] mb-6">
                Información de la oferta
              </div>

              {/* Títulos */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Títulos y descripciones</div>
                <button
                  type="button"
                  onClick={handleAutoTranslate}
                  disabled={translating || !formData.title_es?.trim()}
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
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                    Español (ES) *
                  </label>
                  <input
                    type="text"
                    value={formData.title_es || ''}
                    onChange={e => handleInputChange('title_es', e.target.value)}
                    placeholder="Ej: Descuento de Verano"
                    className="w-full p-3 border border-gray-200 rounded-md text-sm font-sans focus:outline-none focus:border-[#1a5f6e] focus:ring-1 focus:ring-[#1a5f6e]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                    English (EN)
                  </label>
                  <input
                    type="text"
                    value={formData.title_en || ''}
                    onChange={e => handleInputChange('title_en', e.target.value)}
                    placeholder="Ej: Summer Discount"
                    className="w-full p-3 border border-gray-200 rounded-md text-sm font-sans focus:outline-none focus:border-[#1a5f6e] focus:ring-1 focus:ring-[#1a5f6e]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                    Français (FR)
                  </label>
                  <input
                    type="text"
                    value={formData.title_fr || ''}
                    onChange={e => handleInputChange('title_fr', e.target.value)}
                    placeholder="Ej: Réduction d'été"
                    className="w-full p-3 border border-gray-200 rounded-md text-sm font-sans focus:outline-none focus:border-[#1a5f6e] focus:ring-1 focus:ring-[#1a5f6e]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                    Deutsch (DE)
                  </label>
                  <input
                    type="text"
                    value={formData.title_de || ''}
                    onChange={e => handleInputChange('title_de', e.target.value)}
                    placeholder="Ej: Sommerrabatt"
                    className="w-full p-3 border border-gray-200 rounded-md text-sm font-sans focus:outline-none focus:border-[#1a5f6e] focus:ring-1 focus:ring-[#1a5f6e]"
                  />
                </div>
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                  Português (PT)
                </label>
                <input
                  type="text"
                  value={formData.title_pt || ''}
                  onChange={e => handleInputChange('title_pt', e.target.value)}
                  placeholder="Ej: Desconto de Verão"
                  className="w-full p-3 border border-gray-200 rounded-md text-sm font-sans focus:outline-none focus:border-[#1a5f6e] focus:ring-1 focus:ring-[#1a5f6e]"
                />
              </div>

              {/* Descripciones */}
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 mt-4">Descripciones</div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">Español (ES)</label>
                  <textarea
                    value={formData.description_es || ''}
                    onChange={e => handleInputChange('description_es', e.target.value)}
                    placeholder="Detalles sobre la oferta"
                    rows={3}
                    className="w-full p-3 border border-gray-200 rounded-md text-sm font-sans resize-none focus:outline-none focus:border-[#1a5f6e] focus:ring-1 focus:ring-[#1a5f6e]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">English (EN)</label>
                  <textarea
                    value={formData.description_en || ''}
                    onChange={e => handleInputChange('description_en', e.target.value)}
                    placeholder="Details about the offer"
                    rows={3}
                    className="w-full p-3 border border-gray-200 rounded-md text-sm font-sans resize-none focus:outline-none focus:border-[#1a5f6e] focus:ring-1 focus:ring-[#1a5f6e]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">Français (FR)</label>
                  <textarea
                    value={formData.description_fr || ''}
                    onChange={e => handleInputChange('description_fr', e.target.value)}
                    placeholder="Détails de l'offre"
                    rows={3}
                    className="w-full p-3 border border-gray-200 rounded-md text-sm font-sans resize-none focus:outline-none focus:border-[#1a5f6e] focus:ring-1 focus:ring-[#1a5f6e]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">Deutsch (DE)</label>
                  <textarea
                    value={formData.description_de || ''}
                    onChange={e => handleInputChange('description_de', e.target.value)}
                    placeholder="Details zum Angebot"
                    rows={3}
                    className="w-full p-3 border border-gray-200 rounded-md text-sm font-sans resize-none focus:outline-none focus:border-[#1a5f6e] focus:ring-1 focus:ring-[#1a5f6e]"
                  />
                </div>
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">Português (PT)</label>
                <textarea
                  value={formData.description_pt || ''}
                  onChange={e => handleInputChange('description_pt', e.target.value)}
                  placeholder="Detalhes da oferta"
                  rows={3}
                  className="w-full p-3 border border-gray-200 rounded-md text-sm font-sans resize-none focus:outline-none focus:border-[#1a5f6e] focus:ring-1 focus:ring-[#1a5f6e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                    Porcentaje de descuento (%) *
                  </label>
                  <input
                    type="number"
                    value={formData.discount_percentage || 0}
                    onChange={e => handleInputChange('discount_percentage', e.target.value)}
                    min="1"
                    max="100"
                    placeholder="10"
                    className="w-full p-3 border border-gray-200 rounded-md text-sm font-mono focus:outline-none focus:border-[#1a5f6e] focus:ring-1 focus:ring-[#1a5f6e]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                    Código de descuento (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.discount_code?.toUpperCase() || ''}
                    onChange={e => handleInputChange('discount_code', e.target.value.toUpperCase())}
                    placeholder="VERANO26"
                    className="w-full p-3 border border-gray-200 rounded-md text-sm font-mono focus:outline-none focus:border-[#1a5f6e] focus:ring-1 focus:ring-[#1a5f6e]"
                  />
                  <div className="text-[11px] text-gray-400 mt-1">
                    Si se deja vacío, la oferta se aplica globalmente (banner automático).
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-6 flex justify-end gap-3 z-50">
          <button
            onClick={() => {
              setEditing(null);
              setFormData({});
            }}
            className="bg-white border-2 border-gray-200 text-[#0f172a] px-5 py-2.5 rounded-lg cursor-pointer text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={isNew ? handleCreate : handleSave}
            disabled={saving}
            className={`bg-[#1a5f6e] border-none text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${saving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-[#1a5f6e]/90'}`}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        {saved && (
          <div
            style={{
              position: 'fixed',
              bottom: 70,
              right: 24,
              background: '#4CAF50',
              color: '#fff',
              padding: '12px 20px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              zIndex: 1001,
            }}
          >
            ✓ Cambios guardados correctamente
          </div>
        )}

        {error && (
          <div
            style={{
              position: 'fixed',
              bottom: 70,
              right: 24,
              background: '#f44444',
              color: '#fff',
              padding: '12px 20px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              zIndex: 1001,
            }}
          >
            ✗ {error}
          </div>
        )}
      </>
    );
  }

  // Listado
  return (
    <>
      <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8 border-b-[4px] border-[#1a5f6e]">
        <div>
          <div className="text-[28px] font-bold text-[#0f172a]">Ofertas Especiales</div>
          <div className="text-sm text-gray-500 mt-1">
            Gestiona {offers.length} ofertas promocionales · {offers.filter(e => e.active).length}{' '}
            activas
          </div>
        </div>
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
          className={`bg-[#D4A843] border-none text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${error && error.includes('no existe') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[#D4A843]/90'}`}
        >
          + Nueva oferta
        </button>
      </div>

      <div className="p-6 pb-24 bg-[#f5f5f5] min-h-[calc(100vh-120px)]">
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
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="grid grid-cols-[minmax(250px,1.5fr)_100px_150px_100px_150px] gap-4 py-4 px-6 bg-slate-50 border-b-2 border-slate-200 text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                <div>Oferta</div>
                <div>Descuento</div>
                <div>Código</div>
                <div style={{ textAlign: 'center' }}>Estado</div>
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

                  {/* Código */}
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
                      className="bg-[#1a5f6e] border-none text-white px-3 py-1.5 rounded-md cursor-pointer text-[11px] font-semibold hover:bg-[#1a5f6e]/90 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(offer.id)}
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

      {saved && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-5 py-3 rounded-lg text-sm font-semibold z-[1001] shadow-lg animate-fade-in">
          ✓ Cambios guardados correctamente
        </div>
      )}

      {error && !error.includes('no existe') && (
        <div className="fixed bottom-6 right-6 bg-red-500 text-white px-5 py-3 rounded-lg text-sm font-semibold z-[1001] shadow-lg animate-fade-in">
          ✗ {error}
        </div>
      )}
    </>
  );
}
