import { useState, useEffect } from 'react';
import { getExtras, upsertExtra, deleteExtra } from '../../services/dataService';
import { formatPrice } from '../../utils/format';
import Ico, { paths } from '../../components/Ico';

const PRIMARY_COLOR = '#1a5f6e';
const SECONDARY_COLOR = '#0f172a';
const ACCENT_COLOR = '#D4A843';
const LIGHT_BG = '#f5f5f5';

export default function ExtrasAdmin() {
  const [extras, setExtras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Cargar extras
  useEffect(() => {
    loadExtras();
  }, []);

  const loadExtras = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getExtras();
      setExtras(data || []);
    } catch (err) {
      console.error('Error loading extras:', err);
      setError('Error al cargar extras (Supabase)');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (extra) => {
    setEditing(extra.id);
    setFormData({ ...extra });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      if (!formData.name?.trim()) {
        setError('El nombre es requerido');
        return;
      }

      setSaving(true);
      await upsertExtra({
        id: formData.id,
        name: formData.name,
        description: formData.description || '',
        price: parseFloat(formData.price) || 0,
        active: formData.active !== false
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setEditing(null);
      loadExtras();
    } catch (err) {
      console.error('Error saving extra:', err);
      const isRLS = err.code === '42501' || err.message?.includes('policy');
      setError(`Error al guardar: ${err.message}${isRLS ? '\n\nTIP: Es probable que falten permisos RLS.' : ''}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.name?.trim()) {
        setError('El nombre es requerido');
        return;
      }

      setSaving(true);
      await upsertExtra({
        name: formData.name,
        description: formData.description || '',
        price: parseFloat(formData.price) || 0,
        active: true
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setEditing(null);
      setFormData({});
      loadExtras();
    } catch (err) {
      console.error('Error creating extra:', err);
      setError('Error al crear extra (RLS?)');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este extra?')) return;

    try {
      await deleteExtra(id);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      loadExtras();
    } catch (err) {
      console.error('Error deleting extra:', err);
      setError(err.message || 'Error al eliminar');
    }
  };

  const toggleActiveStatus = async (extra) => {
    try {
      await upsertExtra({
        ...extra,
        active: !extra.active
      });
      loadExtras();
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
                {isNew ? 'Nuevo extra' : `Editando: ${formData.name}`}
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
                Información del extra
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ej: Pack bienvenida"
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

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                  Descripción
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descripción breve del servicio"
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
                  Precio (€)
                </label>
                <input
                  type="number"
                  value={formData.price || 0}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
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

              {!isNew && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: LIGHT_BG,
                  borderRadius: 8,
                  marginBottom: 20
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR }}>
                      Estado del extra
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                      Activa o desactiva este extra
                    </div>
                  </div>
                  <button
                    onClick={() => handleInputChange('active', !formData.active)}
                    style={{
                      background: formData.active ? '#4CAF50' : '#ccc',
                      border: 'none',
                      width: 50,
                      height: 28,
                      borderRadius: 14,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 2,
                      left: formData.active ? 26 : 2,
                      width: 24,
                      height: 24,
                      background: '#fff',
                      borderRadius: '50%',
                      transition: 'left 0.3s'
                    }} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra de guardado */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          left: 0,
          background: '#fff',
          borderTop: `1px solid #ddd`,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <span style={{ fontSize: 13, color: '#888' }}>
            Los cambios se guardarán en Supabase
          </span>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => {
                setEditing(null);
                setFormData({});
              }}
              style={{
                background: '#fff',
                border: `2px solid #ddd`,
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

  // Listado de extras
  return (
    <>
      <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8" style={{ borderBottom: `4px solid ${PRIMARY_COLOR}` }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: SECONDARY_COLOR }}>
            Extras y servicios
          </div>
          <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
            Gestiona {extras.length} extras disponibles · {extras.filter(e => e.active).length} activos
          </div>
        </div>
        <button
          onClick={() => {
            setFormData({ name: '', description: '', price: 0, active: true });
            setEditing('new');
          }}
          style={{
            background: ACCENT_COLOR,
            border: 'none',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600
          }}
        >
          + Nuevo extra
        </button>
      </div>

      <div style={{ padding: '24px', background: LIGHT_BG, minHeight: 'calc(100vh - 120px)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
            Cargando extras...
          </div>
        ) : error ? (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            color: '#856404',
            padding: '16px',
            borderRadius: 8,
            marginBottom: 20
          }}>
            <strong>Error:</strong> {error}
          </div>
        ) : extras.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
            No hay extras disponibles. Crea uno nuevo para comenzar.
          </div>
        ) : (
          <div style={{
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 12,
            overflow: 'hidden'
          }}>
            {extras.map((extra, index) => (
              <div
                key={extra.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1.2fr 1fr auto auto auto',
                  gap: 16,
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: index < extras.length - 1 ? '1px solid #eee' : 'none',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = LIGHT_BG}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                {/* Nombre y descripción */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR }}>
                    {extra.name}
                  </div>
                  {extra.description && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      {extra.description.substring(0, 50)}
                      {extra.description.length > 50 ? '...' : ''}
                    </div>
                  )}
                </div>

                {/* Precio */}
                <div style={{ fontSize: 14, color: PRIMARY_COLOR, fontWeight: 600 }}>
                  {formatPrice(extra.price)}
                </div>

                {/* Creado */}
                <div style={{ fontSize: 12, color: '#888' }}>
                  {extra.created_at ? new Date(extra.created_at).toLocaleDateString('es-ES') : 'N/A'}
                </div>

                {/* Estado */}
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => toggleActiveStatus(extra)}
                    style={{
                      background: extra.active ? '#4CAF50' : '#ccc',
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
                    {extra.active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => startEdit(extra)}
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
                    onClick={() => handleDelete(extra.id)}
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
        )}
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

      {error && (
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
