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
            if (err.message && err.message.includes("relation \"offers\" does not exist")) {
                setError("La tabla de ofertas aún no existe en Supabase. Ejecuta el script SQL proporcionado.");
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

    const startEdit = (offer) => {
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
                    description_es: formData.description_es || '',
                    description_en: formData.description_en || '',
                    discount_code: formData.discount_code?.toUpperCase() || '',
                    discount_percentage: parseInt(formData.discount_percentage) || 0,
                    active: formData.active !== false
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
            const { error: insertError } = await supabase
                .from('offers')
                .insert([{
                    title_es: formData.title_es,
                    title_en: formData.title_en || '',
                    description_es: formData.description_es || '',
                    description_en: formData.description_en || '',
                    discount_code: formData.discount_code?.toUpperCase() || '',
                    discount_percentage: parseInt(formData.discount_percentage) || 0,
                    active: true
                }]);

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

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta oferta?')) return;

        try {
            const { error: deleteError } = await supabase
                .from('offers')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            loadOffers();
        } catch (err) {
            console.error('Error deleting offer:', err);
            setError(err.message || 'Error al eliminar');
        }
    };

    const toggleActiveStatus = async (offer) => {
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
                <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8" style={{ borderBottom: `4px solid ${PRIMARY_COLOR}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            style={{
                                background: 'none',
                                border: `2px solid ${PRIMARY_COLOR}`,
                                color: PRIMARY_COLOR,
                                padding: '8px 16px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 600
                            }}
                            onClick={() => {
                                setEditing(null);
                                setFormData({});
                            }}
                        >
                            ← Volver
                        </button>
                        <div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: SECONDARY_COLOR }}>
                                {isNew ? 'Nueva Oferta Especial' : `Editando Oferta`}
                            </div>
                            <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
                                Los cambios se guardarán en Supabase
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '24px', background: LIGHT_BG, minHeight: 'calc(100vh - 120px)' }}>
                    <div style={{ maxWidth: 800 }}>
                        <div style={{
                            background: '#fff',
                            border: `1px solid #ddd`,
                            borderRadius: 12,
                            padding: 28
                        }}>
                            <div style={{ fontSize: 22, fontWeight: 600, color: PRIMARY_COLOR, marginBottom: 24 }}>
                                Información de la oferta
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                                        Título (ES) *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title_es || ''}
                                        onChange={(e) => handleInputChange('title_es', e.target.value)}
                                        placeholder="Ej: Descuento de Verano"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: `1px solid #ddd`,
                                            borderRadius: 6,
                                            fontSize: 14,
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                                        Título (EN)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title_en || ''}
                                        onChange={(e) => handleInputChange('title_en', e.target.value)}
                                        placeholder="Ej: Summer Discount"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: `1px solid #ddd`,
                                            borderRadius: 6,
                                            fontSize: 14,
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                                    Descripción (ES)
                                </label>
                                <textarea
                                    value={formData.description_es || ''}
                                    onChange={(e) => handleInputChange('description_es', e.target.value)}
                                    placeholder="Detalles sobre la oferta"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: `1px solid #ddd`,
                                        borderRadius: 6,
                                        fontSize: 14,
                                        minHeight: 80,
                                        fontFamily: 'inherit',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                                    Descripción (EN)
                                </label>
                                <textarea
                                    value={formData.description_en || ''}
                                    onChange={(e) => handleInputChange('description_en', e.target.value)}
                                    placeholder="Details about the offer"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: `1px solid #ddd`,
                                        borderRadius: 6,
                                        fontSize: 14,
                                        minHeight: 80,
                                        fontFamily: 'inherit',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                                        Porcentaje de descuento (%) *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.discount_percentage || 0}
                                        onChange={(e) => handleInputChange('discount_percentage', e.target.value)}
                                        min="1"
                                        max="100"
                                        placeholder="10"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: `1px solid #ddd`,
                                            borderRadius: 6,
                                            fontSize: 14,
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                                        Código de descuento (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.discount_code?.toUpperCase() || ''}
                                        onChange={(e) => handleInputChange('discount_code', e.target.value.toUpperCase())}
                                        placeholder="VERANO26"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: `1px solid #ddd`,
                                            borderRadius: 6,
                                            fontSize: 14,
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                                        Si se deja vacío, la oferta se aplica globalmente (banner automático).
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: '#fff',
                    borderTop: '1px solid #ddd',
                    padding: '16px 24px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12,
                    zIndex: 999
                }}>
                    <button
                        onClick={() => {
                            setEditing(null);
                            setFormData({});
                        }}
                        style={{
                            background: '#fff',
                            border: '2px solid #ddd',
                            color: SECONDARY_COLOR,
                            padding: '10px 20px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={isNew ? handleCreate : handleSave}
                        disabled={saving}
                        style={{
                            background: PRIMARY_COLOR,
                            border: 'none',
                            color: '#fff',
                            padding: '10px 20px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>

                {saved && (
                    <div style={{
                        position: 'fixed',
                        bottom: 70,
                        right: 24,
                        background: '#4CAF50',
                        color: '#fff',
                        padding: '12px 20px',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        zIndex: 1001
                    }}>
                        ✓ Cambios guardados correctamente
                    </div>
                )}

                {error && (
                    <div style={{
                        position: 'fixed',
                        bottom: 70,
                        right: 24,
                        background: '#f44444',
                        color: '#fff',
                        padding: '12px 20px',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        zIndex: 1001
                    }}>
                        ✗ {error}
                    </div>
                )}
            </>
        );
    }

    // Listado
    return (
        <>
            <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8" style={{ borderBottom: `4px solid ${PRIMARY_COLOR}` }}>
                <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: SECONDARY_COLOR }}>
                        Ofertas Especiales
                    </div>
                    <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
                        Gestiona {offers.length} ofertas promocionales · {offers.filter(e => e.active).length} activas
                    </div>
                </div>
                <button
                    onClick={() => {
                        setFormData({ title_es: '', title_en: '', description_es: '', description_en: '', discount_percentage: 10, active: true });
                        setEditing('new');
                    }}
                    disabled={error && error.includes('no existe en Supabase')}
                    style={{
                        background: ACCENT_COLOR,
                        border: 'none',
                        color: '#fff',
                        padding: '10px 20px',
                        borderRadius: 8,
                        cursor: error && error.includes('no existe') ? 'not-allowed' : 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        opacity: error && error.includes('no existe') ? 0.5 : 1
                    }}
                >
                    + Nueva oferta
                </button>
            </div>

            <div style={{ padding: '24px', background: LIGHT_BG, minHeight: 'calc(100vh - 120px)' }}>
                {error && error.includes('no existe') && (
                    <div style={{
                        background: '#fff3cd',
                        border: '1px solid #ffc107',
                        color: '#856404',
                        padding: '16px',
                        borderRadius: 8,
                        marginBottom: 20
                    }}>
                        <strong>Atención:</strong> {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                        Cargando ofertas...
                    </div>
                ) : !error || !error.includes('no existe') ? (
                    offers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888', background: '#fff', borderRadius: 8, border: '1px solid #ddd' }}>
                            No hay ofertas configuradas. Haz clic en "Nueva oferta" para añadir una.
                        </div>
                    ) : (
                        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #ddd', overflow: 'hidden' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(250px, 1.5fr) 100px 150px 100px 150px',
                                gap: 16,
                                padding: '16px 24px',
                                background: '#fafafa',
                                borderBottom: '2px solid #ddd',
                                fontSize: 12,
                                fontWeight: 700,
                                color: SECONDARY_COLOR,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                <div>Oferta</div>
                                <div>Descuento</div>
                                <div>Código</div>
                                <div style={{ textAlign: 'center' }}>Estado</div>
                                <div>Acciones</div>
                            </div>

                            {offers.map((offer, index) => (
                                <div
                                    key={offer.id}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(250px, 1.5fr) 100px 150px 100px 150px',
                                        gap: 16,
                                        alignItems: 'center',
                                        padding: '16px 24px',
                                        borderBottom: index < offers.length - 1 ? '1px solid #eee' : 'none'
                                    }}
                                >
                                    {/* Info */}
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 4 }}>
                                            {offer.title_es}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#666', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {offer.description_es}
                                        </div>
                                    </div>

                                    {/* Info 2 */}
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: PRIMARY_COLOR }}>
                                            -{offer.discount_percentage}%
                                        </div>
                                    </div>

                                    {/* Código */}
                                    <div>
                                        {offer.discount_code ? (
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '4px 8px',
                                                background: '#f8fafc',
                                                border: '1px dashed #94a3b8',
                                                borderRadius: 4,
                                                fontFamily: 'monospace',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: ACCENT_COLOR
                                            }}>
                                                {offer.discount_code}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>
                                                Automático
                                            </div>
                                        )}
                                    </div>

                                    {/* Estado */}
                                    <div style={{ textAlign: 'center' }}>
                                        <button
                                            onClick={() => toggleActiveStatus(offer)}
                                            style={{
                                                background: offer.active ? '#4CAF50' : '#ccc',
                                                border: 'none',
                                                color: '#fff',
                                                padding: '6px 12px',
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {offer.active ? 'Activa' : 'Inactiva'}
                                        </button>
                                    </div>

                                    {/* Acciones */}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => startEdit(offer)}
                                            style={{
                                                background: PRIMARY_COLOR,
                                                border: 'none',
                                                color: '#fff',
                                                padding: '6px 12px',
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                                fontSize: 11,
                                                fontWeight: 600
                                            }}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(offer.id)}
                                            style={{
                                                background: '#fff',
                                                border: `1px solid #f44444`,
                                                color: '#f44444',
                                                padding: '6px 12px',
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                                fontSize: 11,
                                                fontWeight: 600
                                            }}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )) : null}
            </div>

            {saved && (
                <div style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    background: '#4CAF50',
                    color: '#fff',
                    padding: '12px 20px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    zIndex: 1001
                }}>
                    ✓ Cambios guardados correctamente
                </div>
            )}

            {error && !error.includes('no existe') && (
                <div style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    background: '#f44444',
                    color: '#fff',
                    padding: '12px 20px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    zIndex: 1001
                }}>
                    ✗ {error}
                </div>
            )}
        </>
    );
}
