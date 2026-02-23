import { useState, useEffect } from 'react';
import { formatDateNumeric, formatPrice } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import Ico, { paths } from '../../components/Ico';

const amenities = ['WiFi', 'Parking', 'Cocina equipada', 'TV Smart', 'A/C', 'Calefacción', 'Lavadora', 'Terraza', 'Vistas al mar', 'Vistas a la ría', 'Cuna disponible', 'Barbacoa'];

const seasonTypes = [
  { id: 'low', label: 'Baja', color: '#4CAF50' },
  { id: 'high', label: 'Alta', color: '#FF6B6B' },
  { id: 'christmas', label: 'Navidad', color: '#FFD700' },
  { id: 'easter', label: 'Semana Santa', color: '#9C27B0' }
];

const PRIMARY_COLOR = '#1a5f6e';
const SECONDARY_COLOR = '#0f172a';
const ACCENT_COLOR = '#D4A843';
const LIGHT_BG = '#f5f5f5';

// ─── VALIDADORES ────────────────────────────────────────────────────────
const validateSlug = (slug) => /^[a-z0-9-]+$/.test(slug);

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isUrlSafe = (str) => /^[a-zA-Z0-9-_]+$/.test(str);

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────
export default function ApartamentosAdmin() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [seasonPrices, setSeasonPrices] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [unsplashUrl, setUnsplashUrl] = useState('');
  const [newSeasonData, setNewSeasonData] = useState({ type: 'low', price: '', start_date: '', end_date: '' });
  const [validationErrors, setValidationErrors] = useState({});

  // Cargar apartamentos
  useEffect(() => {
    loadApartments();
  }, []);

  const loadApartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('apartments')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setApartments(data || []);
    } catch (err) {
      console.error('Error loading apartments:', err);
      setError(err.message || 'Error al cargar apartamentos');
    } finally {
      setLoading(false);
    }
  };

  // Cargar precios de temporada
  const loadSeasonPrices = async (apartmentSlug) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('season_prices')
        .select('*')
        .eq('apartment_slug', apartmentSlug)
        .order('start_date', { ascending: true });

      if (fetchError) throw fetchError;
      setSeasonPrices(data || []);
    } catch (err) {
      console.error('Error loading season prices:', err);
    }
  };

  // Cargar fotos
  const loadPhotos = async (apartmentSlug) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('apartment_photos')
        .select('*')
        .eq('apartment_slug', apartmentSlug)
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;
      setPhotos(data || []);
    } catch (err) {
      console.error('Error loading photos:', err);
    }
  };

  const startEdit = (apt) => {
    setEditing(apt.slug);
    setFormData({ ...apt, bathrooms: apt.baths, bedrooms: apt.bedrooms || apt.beds });
    setSelectedAmenities(apt.amenities || []);
    setActiveTab('basic');
    loadSeasonPrices(apt.slug);
    loadPhotos(apt.slug);
  };

  const startCreate = () => {
    setEditing('new');
    setFormData({
      active: true, min_stay: 2, capacity: 2, price: 100,
      bedrooms: 1, bathrooms: 1, beds: 1, color: '#1a5f6e',
      cancellation_days: 14, deposit_percentage: 50,
      slug: ''
    });
    setSelectedAmenities([]);
    setValidationErrors({});
    setActiveTab('basic');
    setSeasonPrices([]);
    setPhotos([]);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Auto-generar slug si se está escribiendo el nombre y es un apartamento nuevo
      if (field === 'name' && editing === 'new') {
        newData.slug = value
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
          .replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
          .trim()
          .replace(/\s+/g, '-') // replace spaces with dashes
          .replace(/-+/g, '-'); // collapse dashes
      }

      return newData;
    });

    // Limpiar error del campo cuando se empieza a editar
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // ─── VALIDACIÓN ──────────────────────────────────────────────────────
  const validateForm = async () => {
    const errors = {};
    const requiredFields = ['name', 'price', 'capacity', 'bedrooms', 'bathrooms', 'slug'];

    // Validar campos obligatorios
    for (const field of requiredFields) {
      if (!formData[field] || (typeof formData[field] === 'string' && formData[field].trim() === '')) {
        errors[field] = `${field === 'name' ? 'Nombre' : field === 'price' ? 'Precio' : field === 'capacity' ? 'Capacidad' : field === 'bedrooms' ? 'Dormitorios' : field === 'bathrooms' ? 'Baños' : 'Slug'} es obligatorio`;
      }
    }

    // Validar que el slug sea URL-safe
    if (formData.slug && !validateSlug(formData.slug)) {
      errors.slug = 'El slug debe contener solo letras minúsculas, números y guiones';
    }

    // Validar unicidad del slug
    if (formData.slug) {
      const duplicateSlug = apartments.some(
        apt => apt.slug === formData.slug && apt.slug !== editing
      );
      if (duplicateSlug) {
        errors.slug = 'Este slug ya existe en otro apartamento';
      }
    }

    // Validar unicidad del nombre
    const duplicateName = apartments.some(
      apt => apt.name === formData.name && apt.slug !== editing
    );
    if (duplicateName) {
      errors.name = 'Este nombre ya existe en otro apartamento';
    }

    // Validar números positivos
    if (formData.price && formData.price <= 0) {
      errors.price = 'El precio debe ser mayor a 0';
    }
    if (formData.capacity && formData.capacity <= 0) {
      errors.capacity = 'La capacidad debe ser mayor a 0';
    }
    if (formData.bedrooms && formData.bedrooms < 0) {
      errors.bedrooms = 'Los dormitorios no pueden ser negativos';
    }
    if (formData.bathrooms && formData.bathrooms < 0) {
      errors.bathrooms = 'Los baños no pueden ser negativos';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── GUARDAR APARTAMENTO ─────────────────────────────────────────────
  const handleSave = async () => {
    const isValid = await validateForm();
    if (!isValid) {
      setError('Por favor, corrige los errores en el formulario');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        name: formData.name,
        name_en: formData.name_en,
        tagline: formData.tagline,
        tagline_en: formData.tagline_en,
        price: formData.price,
        capacity: formData.capacity,
        bedrooms: formData.bedrooms,
        baths: formData.bathrooms,
        beds: formData.beds,
        min_stay: formData.min_stay,
        slug: formData.slug,
        description: formData.description,
        description_en: formData.description_en,
        color: formData.color,
        cancellation_days: formData.cancellation_days,
        deposit_percentage: formData.deposit_percentage,
        active: formData.active,
        amenities: selectedAmenities
      };

      if (editing === 'new') {
        const { error: insertError } = await supabase
          .from('apartments')
          .insert([payload]);

        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from('apartments')
          .update(payload)
          .eq('slug', editing);

        if (updateError) throw updateError;
      }

      setSuccess('✓ Cambios guardados correctamente');
      setTimeout(() => setSuccess(null), 3000);
      setEditing(null);
      loadApartments();
    } catch (err) {
      console.error('Error saving apartment:', err);
      const isRLS = err.code === '42501' || err.message?.includes('policy');
      setError(`Error al guardar: ${err.message}${isRLS ? '\n\nTIP: Es probable que falten permisos RLS en Supabase.' : ''}`);
    } finally {
      setSaving(false);
    }
  };

  // ─── GESTIÓN DE FOTOS ────────────────────────────────────────────────
  const addPhoto = async () => {
    if (!unsplashUrl.trim()) {
      setError('Por favor, ingresa una URL de foto');
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('apartment_photos')
        .insert([{
          apartment_slug: editing,
          photo_url: unsplashUrl,
          order_index: photos.length,
          is_main: photos.length === 0
        }])
        .select();

      if (insertError) throw insertError;

      setPhotos([...photos, data[0]]);
      setUnsplashUrl('');
      setSuccess('✓ Foto agregada correctamente');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error adding photo:', err);
      setError('Error al agregar foto: ' + err.message);
    }
  };

  const deletePhoto = async (photoId) => {
    try {
      const { error: deleteError } = await supabase
        .from('apartment_photos')
        .delete()
        .eq('id', photoId);

      if (deleteError) throw deleteError;

      setPhotos(photos.filter(p => p.id !== photoId));
      setSuccess('✓ Foto eliminada correctamente');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError('Error al eliminar foto: ' + err.message);
    }
  };

  const toggleFeaturedPhoto = async (photoId) => {
    try {
      // Quitar marcado de la foto principal anterior
      const mainPhoto = photos.find(p => p.is_main);
      if (mainPhoto) {
        await supabase
          .from('apartment_photos')
          .update({ is_main: false })
          .eq('id', mainPhoto.id);
      }

      // Marcar la nueva foto como principal
      await supabase
        .from('apartment_photos')
        .update({ is_main: true })
        .eq('id', photoId);

      // Actualizar local
      setPhotos(photos.map(p => ({
        ...p,
        is_main: p.id === photoId
      })));

      setSuccess('✓ Foto principal actualizada');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error updating featured photo:', err);
      setError('Error al actualizar foto principal: ' + err.message);
    }
  };

  // ─── GESTIÓN DE PRECIOS DE TEMPORADA ──────────────────────────────────
  const saveSeason = async () => {
    if (!newSeasonData.type || !newSeasonData.price || !newSeasonData.start_date || !newSeasonData.end_date) {
      setError('Por favor, completa todos los campos de la temporada');
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('season_prices')
        .insert([{
          apartment_slug: editing,
          season_name: newSeasonData.type,
          price_per_night: parseFloat(newSeasonData.price),
          start_date: newSeasonData.start_date,
          end_date: newSeasonData.end_date
        }])
        .select();

      if (insertError) throw insertError;

      setSeasonPrices([...seasonPrices, data[0]]);
      setNewSeasonData({ type: 'low', price: '', start_date: '', end_date: '' });
      setSuccess('✓ Temporada guardada correctamente');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error saving season:', err);
      setError('Error al guardar temporada: ' + err.message);
    }
  };

  const deleteSeaon = async (seasonId) => {
    try {
      const { error: deleteError } = await supabase
        .from('season_prices')
        .delete()
        .eq('id', seasonId);

      if (deleteError) throw deleteError;

      setSeasonPrices(seasonPrices.filter(s => s.id !== seasonId));
      setSuccess('✓ Temporada eliminada correctamente');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error deleting season:', err);
      setError('Error al eliminar temporada: ' + err.message);
    }
  };

  const toggleActiveStatus = async (apt) => {
    try {
      const { error: updateError } = await supabase
        .from('apartments')
        .update({ active: !apt.active })
        .eq('slug', apt.slug);

      if (updateError) throw updateError;
      loadApartments();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message || 'Error al actualizar estado');
    }
  };

  const handleDelete = async (apt) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el apartamento "${apt.name}"? Esta acción no se puede deshacer y fallará si hay reservas asociadas.`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('apartments')
        .delete()
        .eq('slug', apt.slug);

      if (deleteError) throw deleteError;

      setSuccess('✓ Apartamento eliminado correctamente');
      setTimeout(() => setSuccess(null), 3000);
      loadApartments();
    } catch (err) {
      console.error('Error deleting apartment:', err);
      setError(`Error al eliminar: ${err.message}. Asegúrate de que no tenga reservas, fotos o precios de temporada vinculados.`);
    } finally {
      setSaving(false);
    }
  };

  // ─── VISTA DE EDICIÓN ────────────────────────────────────────────────
  if (editing) {
    return (
      <>
        <div className="flex items-center justify-between pb-6 mb-6 px-8 pt-8" style={{ borderBottom: `4px solid ${PRIMARY_COLOR}` }}>
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
              onClick={() => setEditing(null)}
            >
              ← Volver
            </button>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: SECONDARY_COLOR }}>
                {editing === 'new' ? 'Nuevo Apartamento' : `Editando: ${formData.name}`}
              </div>
              <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
                {editing === 'new' ? 'Completa los datos iniciales y guarda para añadir fotos y temporadas' : 'Gestiona todos los aspectos de este apartamento'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px', background: LIGHT_BG, minHeight: 'calc(100vh - 120px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, maxWidth: 1600 }}>
            {/* PANEL IZQUIERDO - NAVEGACIÓN Y VISTA PREVIA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Tabs navegación */}
              <div style={{
                background: '#fff',
                border: `1px solid #ddd`,
                borderRadius: 12,
                overflow: 'hidden'
              }}>
                {[
                  { id: 'basic', label: '📋 Básico' },
                  ...(editing !== 'new' ? [
                    { id: 'photos', label: '📸 Fotos' },
                    { id: 'seasons', label: '🗓️ Temporadas' }
                  ] : []),
                  { id: 'amenities', label: '✨ Comodidades' },
                  { id: 'state', label: '⚙️ Estado' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: activeTab === tab.id ? PRIMARY_COLOR : '#fff',
                      color: activeTab === tab.id ? '#fff' : SECONDARY_COLOR,
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      borderBottom: tab.id !== 'state' ? '1px solid #eee' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Vista previa de foto principal */}
              {photos.length > 0 && (
                <div style={{
                  background: '#fff',
                  border: `1px solid #ddd`,
                  borderRadius: 12,
                  overflow: 'hidden',
                  padding: 12
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: PRIMARY_COLOR, marginBottom: 12 }}>
                    FOTO PRINCIPAL
                  </div>
                  <img
                    src={photos.find(p => p.is_main)?.photo_url || photos[0]?.photo_url}
                    alt="Principal"
                    style={{
                      width: '100%',
                      height: 200,
                      objectFit: 'cover',
                      borderRadius: 8
                    }}
                  />
                  <div style={{ marginTop: 12, fontSize: 11, color: '#666' }}>
                    {formData.name} · {formData.capacity} personas
                  </div>
                </div>
              )}
            </div>

            {/* PANEL DERECHO - CONTENIDO */}
            <div>
              {/* TAB: BÁSICO */}
              {activeTab === 'basic' && (
                <div style={{
                  background: '#fff',
                  border: `1px solid #ddd`,
                  borderRadius: 12,
                  padding: 28
                }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: PRIMARY_COLOR, marginBottom: 24 }}>
                    Información Básica
                  </div>

                  {/* Nombre */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                      Nombre (ES) {validationErrors.name && <span style={{ color: '#f44' }}>*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `2px solid ${validationErrors.name ? '#f44' : '#ddd'}`,
                        borderRadius: 6,
                        fontSize: 14,
                        fontFamily: 'inherit'
                      }}
                      placeholder="Ej: Apartamento Deluxe"
                    />
                    {validationErrors.name && (
                      <div style={{ fontSize: 12, color: '#f44', marginTop: 4 }}>
                        {validationErrors.name}
                      </div>
                    )}
                  </div>

                  {/* Nombre EN */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                      Name (EN)
                    </label>
                    <input
                      type="text"
                      value={formData.name_en || ''}
                      onChange={(e) => handleInputChange('name_en', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 14,
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  {/* Slug */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                      Slug (URL-safe) {validationErrors.slug && <span style={{ color: '#f44' }}>*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.slug || ''}
                      onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase())}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `2px solid ${validationErrors.slug ? '#f44' : '#ddd'}`,
                        borderRadius: 6,
                        fontSize: 14,
                        fontFamily: 'monospace'
                      }}
                      placeholder="ej: apartamento-deluxe"
                    />
                    {validationErrors.slug && (
                      <div style={{ fontSize: 12, color: '#f44', marginTop: 4 }}>
                        {validationErrors.slug}
                      </div>
                    )}
                  </div>

                  {/* Taglines */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                        Tagline (ES)
                      </label>
                      <input
                        type="text"
                        value={formData.tagline || ''}
                        onChange={(e) => handleInputChange('tagline', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 14
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                        Tagline (EN)
                      </label>
                      <input
                        type="text"
                        value={formData.tagline_en || ''}
                        onChange={(e) => handleInputChange('tagline_en', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 14
                        }}
                      />
                    </div>
                  </div>

                  {/* Números */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                        Capacidad {validationErrors.capacity && <span style={{ color: '#f44' }}>*</span>}
                      </label>
                      <input
                        type="number"
                        value={formData.capacity || ''}
                        onChange={(e) => handleInputChange('capacity', parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `2px solid ${validationErrors.capacity ? '#f44' : '#ddd'}`,
                          borderRadius: 6,
                          fontSize: 14
                        }}
                      />
                      {validationErrors.capacity && (
                        <div style={{ fontSize: 12, color: '#f44', marginTop: 4 }}>
                          {validationErrors.capacity}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                        Dormitorios {validationErrors.bedrooms && <span style={{ color: '#f44' }}>*</span>}
                      </label>
                      <input
                        type="number"
                        value={formData.bedrooms || ''}
                        onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `2px solid ${validationErrors.bedrooms ? '#f44' : '#ddd'}`,
                          borderRadius: 6,
                          fontSize: 14
                        }}
                      />
                      {validationErrors.bedrooms && (
                        <div style={{ fontSize: 12, color: '#f44', marginTop: 4 }}>
                          {validationErrors.bedrooms}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                        Baños {validationErrors.bathrooms && <span style={{ color: '#f44' }}>*</span>}
                      </label>
                      <input
                        type="number"
                        value={formData.bathrooms || ''}
                        onChange={(e) => handleInputChange('bathrooms', parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `2px solid ${validationErrors.bathrooms ? '#f44' : '#ddd'}`,
                          borderRadius: 6,
                          fontSize: 14
                        }}
                      />
                      {validationErrors.bathrooms && (
                        <div style={{ fontSize: 12, color: '#f44', marginTop: 4 }}>
                          {validationErrors.bathrooms}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Precio y Camas */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                        Precio por noche {validationErrors.price && <span style={{ color: '#f44' }}>*</span>}
                      </label>
                      <input
                        type="number"
                        value={formData.price || ''}
                        onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `2px solid ${validationErrors.price ? '#f44' : '#ddd'}`,
                          borderRadius: 6,
                          fontSize: 14
                        }}
                      />
                      {validationErrors.price && (
                        <div style={{ fontSize: 12, color: '#f44', marginTop: 4 }}>
                          {validationErrors.price}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                        Camas
                      </label>
                      <input
                        type="number"
                        value={formData.beds || ''}
                        onChange={(e) => handleInputChange('beds', parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 14
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                        Estancia mínima (noches)
                      </label>
                      <input
                        type="number"
                        value={formData.min_stay || 1}
                        onChange={(e) => handleInputChange('min_stay', parseInt(e.target.value) || 1)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 14
                        }}
                      />
                    </div>
                  </div>

                  {/* Color y Políticas */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                        Color de identificación
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="color"
                          value={formData.color || '#1a5f6e'}
                          onChange={(e) => handleInputChange('color', e.target.value)}
                          style={{
                            width: 50,
                            height: 50,
                            border: `1px solid #ddd`,
                            borderRadius: 6,
                            cursor: 'pointer'
                          }}
                        />
                        <input
                          type="text"
                          value={formData.color || ''}
                          onChange={(e) => handleInputChange('color', e.target.value)}
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            border: '1px solid #ddd',
                            borderRadius: 6,
                            fontSize: 14,
                            fontFamily: 'monospace'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                        Días de cancelación gratis
                      </label>
                      <input
                        type="number"
                        value={formData.cancellation_days !== undefined && formData.cancellation_days !== null ? formData.cancellation_days : 14}
                        onChange={(e) => handleInputChange('cancellation_days', parseInt(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 14
                        }}
                        min="0"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                        % Depósito inicial
                      </label>
                      <input
                        type="number"
                        value={formData.deposit_percentage !== undefined && formData.deposit_percentage !== null ? formData.deposit_percentage : 50}
                        onChange={(e) => handleInputChange('deposit_percentage', parseInt(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 14
                        }}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                      Descripción (ES)
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 14,
                        fontFamily: 'inherit',
                        minHeight: 120,
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 8 }}>
                      Description (EN)
                    </label>
                    <textarea
                      value={formData.description_en || ''}
                      onChange={(e) => handleInputChange('description_en', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 14,
                        fontFamily: 'inherit',
                        minHeight: 120,
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* TAB: FOTOS */}
              {activeTab === 'photos' && (
                <div style={{
                  background: '#fff',
                  border: `1px solid #ddd`,
                  borderRadius: 12,
                  padding: 28
                }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: PRIMARY_COLOR, marginBottom: 24 }}>
                    Gestionar Fotos
                  </div>

                  {/* Agregar foto */}
                  <div style={{
                    background: LIGHT_BG,
                    border: `2px dashed ${PRIMARY_COLOR}`,
                    borderRadius: 8,
                    padding: 20,
                    marginBottom: 24
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 12 }}>
                      Agregar foto (URL de Unsplash)
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={unsplashUrl}
                        onChange={(e) => setUnsplashUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 13
                        }}
                      />
                      <button
                        onClick={addPhoto}
                        style={{
                          background: ACCENT_COLOR,
                          border: 'none',
                          color: '#fff',
                          padding: '10px 20px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        + Agregar
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
                      💡 Tip: Usa URLs de Unsplash para fotos de calidad gratis
                    </div>
                  </div>

                  {/* Galería */}
                  {photos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                      No hay fotos aún. Agrega la primera foto.
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: 12
                    }}>
                      {photos.map(photo => (
                        <div
                          key={photo.id}
                          style={{
                            position: 'relative',
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: photo.is_main ? `3px solid ${ACCENT_COLOR}` : '1px solid #ddd'
                          }}
                        >
                          <img
                            src={photo.photo_url}
                            alt="Foto"
                            style={{
                              width: '100%',
                              height: 150,
                              objectFit: 'cover'
                            }}
                          />
                          {photo.is_main && (
                            <div style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              background: ACCENT_COLOR,
                              color: '#fff',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 600
                            }}>
                              PRINCIPAL
                            </div>
                          )}
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(0,0,0,0.8)',
                            display: 'flex',
                            gap: 4,
                            padding: 4
                          }}>
                            {!photo.is_main && (
                              <button
                                onClick={() => toggleFeaturedPhoto(photo.id)}
                                style={{
                                  flex: 1,
                                  background: ACCENT_COLOR,
                                  border: 'none',
                                  color: '#fff',
                                  padding: '4px 6px',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  fontSize: 10,
                                  fontWeight: 600
                                }}
                              >
                                ★ Principal
                              </button>
                            )}
                            <button
                              onClick={() => deletePhoto(photo.id)}
                              style={{
                                flex: 1,
                                background: '#dc2626',
                                border: 'none',
                                color: '#ffffff',
                                padding: '5px 4px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                textAlign: 'center',
                                lineHeight: 1
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
              )}

              {/* TAB: TEMPORADAS */}
              {activeTab === 'seasons' && (
                <div style={{
                  background: '#fff',
                  border: `1px solid #ddd`,
                  borderRadius: 12,
                  padding: 28
                }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: PRIMARY_COLOR, marginBottom: 24 }}>
                    Precios de Temporada
                  </div>

                  {/* Agregar temporada */}
                  <div style={{
                    background: LIGHT_BG,
                    borderRadius: 8,
                    padding: 20,
                    marginBottom: 24
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 12 }}>
                      Nueva Temporada
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                      <select
                        value={newSeasonData.type}
                        onChange={(e) => setNewSeasonData({ ...newSeasonData, type: e.target.value })}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 13
                        }}
                      >
                        {seasonTypes.map(st => (
                          <option key={st.id} value={st.id}>{st.label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Precio €"
                        value={newSeasonData.price}
                        onChange={(e) => setNewSeasonData({ ...newSeasonData, price: e.target.value })}
                        step="0.01"
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 13
                        }}
                      />
                      <input
                        type="date"
                        value={newSeasonData.start_date}
                        onChange={(e) => setNewSeasonData({ ...newSeasonData, start_date: e.target.value })}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 13
                        }}
                      />
                      <input
                        type="date"
                        value={newSeasonData.end_date}
                        onChange={(e) => setNewSeasonData({ ...newSeasonData, end_date: e.target.value })}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 13
                        }}
                      />
                    </div>
                    <button
                      onClick={saveSeason}
                      style={{
                        background: ACCENT_COLOR,
                        border: 'none',
                        color: '#fff',
                        padding: '10px 20px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    >
                      + Agregar Temporada
                    </button>
                  </div>

                  {/* Tabla de temporadas */}
                  {seasonPrices.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                      No hay temporadas configuradas
                    </div>
                  ) : (
                    <div style={{
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr 80px',
                        gap: 12,
                        padding: '12px 16px',
                        background: PRIMARY_COLOR,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        <div>Tipo</div>
                        <div>Precio</div>
                        <div>Inicio</div>
                        <div>Fin</div>
                        <div>Acción</div>
                      </div>
                      {seasonPrices.map((season, index) => {
                        const seasonType = seasonTypes.find(st => st.id === season.season_name);
                        return (
                          <div
                            key={season.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr 80px',
                              gap: 12,
                              alignItems: 'center',
                              padding: '12px 16px',
                              borderBottom: index < seasonPrices.length - 1 ? '1px solid #eee' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{
                                width: 12,
                                height: 12,
                                background: seasonType?.color,
                                borderRadius: 2
                              }} />
                              <span style={{ fontSize: 13 }}>{seasonType?.label}</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: PRIMARY_COLOR }}>
                              {season.price_per_night} €
                            </div>
                            <div style={{ fontSize: 13 }}>
                              {new Date(season.start_date).toLocaleDateString()}
                            </div>
                            <div style={{ fontSize: 13 }}>
                              {new Date(season.end_date).toLocaleDateString()}
                            </div>
                            <button
                              onClick={() => deleteSeaon(season.id)}
                              style={{
                                background: '#f44',
                                border: 'none',
                                color: '#fff',
                                padding: '4px 8px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: 600
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: COMODIDADES */}
              {activeTab === 'amenities' && (
                <div style={{
                  background: '#fff',
                  border: `1px solid #ddd`,
                  borderRadius: 12,
                  padding: 28
                }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: PRIMARY_COLOR, marginBottom: 24 }}>
                    Comodidades
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 16
                  }}>
                    {amenities.map(amenity => (
                      <label
                        key={amenity}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          cursor: 'pointer',
                          background: selectedAmenities.includes(amenity) ? LIGHT_BG : '#fff',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAmenities.includes(amenity)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAmenities([...selectedAmenities, amenity]);
                            } else {
                              setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
                            }
                          }}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 13, color: SECONDARY_COLOR }}>
                          {amenity}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: ESTADO */}
              {activeTab === 'state' && (
                <div style={{
                  background: '#fff',
                  border: `1px solid #ddd`,
                  borderRadius: 12,
                  padding: 28
                }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: PRIMARY_COLOR, marginBottom: 24 }}>
                    Estado
                  </div>

                  <div style={{
                    background: LIGHT_BG,
                    borderRadius: 8,
                    padding: 20
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR, marginBottom: 12 }}>
                      Estado de publicación
                    </div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px',
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={formData.active || false}
                        onChange={(e) => handleInputChange('active', e.target.checked)}
                        style={{ width: 18, height: 18 }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR }}>
                          Apartamento Activo
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                          {formData.active ? 'Visible en el sitio web' : 'Oculto en el sitio web'}
                        </div>
                      </div>
                    </label>

                    {formData.id && (
                      <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #ddd' }}>
                        <div style={{ fontSize: 12, color: '#888' }}>
                          <strong>ID:</strong> {formData.id}
                        </div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                          <strong>Creado:</strong> {formData.created_at ? new Date(formData.created_at).toLocaleDateString() : '-'}
                        </div>
                        {formData.updated_at && (
                          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                            <strong>Actualizado:</strong> {new Date(formData.updated_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER CON BOTONES */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          border: `1px solid #ddd`,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          zIndex: 999
        }}>
          <button
            onClick={() => setEditing(null)}
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
            onClick={handleSave}
            disabled={saving}
            style={{
              background: PRIMARY_COLOR,
              border: 'none',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? '⏳ Guardando...' : '✓ Guardar cambios'}
          </button>
        </div>

        {/* NOTIFICACIONES */}
        {success && (
          <div style={{
            position: 'fixed',
            bottom: 80,
            right: 24,
            background: '#4CAF50',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 1001,
            animation: 'slideIn 0.3s ease-out'
          }}>
            {success}
          </div>
        )}

        {error && (
          <div style={{
            position: 'fixed',
            bottom: 80,
            right: 24,
            background: '#f44',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 1001,
            animation: 'slideIn 0.3s ease-out'
          }}>
            ✗ {error}
          </div>
        )}

        <style>{`
          @keyframes slideIn {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </>
    );
  }

  // ─── LISTADO DE APARTAMENTOS ─────────────────────────────────────────
  return (
    <>
      <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8" style={{ borderBottom: `4px solid ${PRIMARY_COLOR}` }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: SECONDARY_COLOR }}>
            Apartamentos
          </div>
          <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
            Gestiona {apartments.length} unidades disponibles
          </div>
        </div>
        <button
          onClick={startCreate}
          style={{
            background: PRIMARY_COLOR,
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(26, 95, 110, 0.2)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          + Nuevo Apartamento
        </button>
      </div>

      <div style={{ padding: '24px', background: LIGHT_BG, minHeight: 'calc(100vh - 120px)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
            ⏳ Cargando apartamentos...
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
            <strong>⚠️ Error:</strong> {error}
          </div>
        ) : apartments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
            No hay apartamentos disponibles
          </div>
        ) : (
          <div style={{
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 12,
            overflow: 'hidden'
          }}>
            {apartments.map((apt, index) => (
              <div
                key={apt.id || apt.slug || index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1.5fr repeat(4, 1fr) auto auto',
                  gap: 16,
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: index < apartments.length - 1 ? '1px solid #eee' : 'none',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = LIGHT_BG}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                {/* Color thumbnail */}
                <div style={{
                  width: 40,
                  height: 40,
                  background: apt.color || '#ccc',
                  borderRadius: 6,
                  flexShrink: 0
                }} />

                {/* Info básica */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: SECONDARY_COLOR }}>
                    {apt.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    {apt.capacity} pers · {apt.bedrooms || apt.beds} dorm · {apt.baths} baño
                  </div>
                </div>

                {/* Precio */}
                <div style={{ fontSize: 13, color: PRIMARY_COLOR, fontWeight: 600 }}>
                  {formatPrice(apt.price)}<span style={{ fontSize: 11, color: '#888' }}>/noche</span>
                </div>

                {/* Estancia mínima */}
                <div style={{ fontSize: 12, color: '#888' }}>
                  Mín. {apt.min_stay} noches
                </div>

                {/* Rating */}
                <div style={{ fontSize: 12, color: ACCENT_COLOR, fontWeight: 600 }}>
                  ★ {apt.rating || '-'}
                </div>

                {/* Estado */}
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => toggleActiveStatus(apt)}
                    style={{
                      background: apt.active ? '#4CAF50' : '#ccc',
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
                    {apt.active ? '✓ Activo' : '✗ Inactivo'}
                  </button>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => startEdit(apt)}
                    style={{
                      background: PRIMARY_COLOR,
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
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(apt)}
                    style={{
                      background: '#fee2e2',
                      border: '1px solid #ef4444',
                      color: '#b91c1c',
                      padding: '6px 8px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    title="Eliminar apartamento"
                  >
                    <Ico d={paths.trash} size={14} color="currentColor" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
