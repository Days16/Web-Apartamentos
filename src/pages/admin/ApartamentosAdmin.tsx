/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { formatDateNumeric, formatPrice } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import {
  uploadPhotoToStorage,
  deletePhotoFromStorage,
  logAudit,
} from '../../services/supabaseService';
import Ico, { paths } from '../../components/Ico';
import { useToast } from '../../contexts/ToastContext';

const DEFAULT_AMENITIES = [
  'WiFi',
  'Parking',
  'Cocina equipada',
  'TV Smart',
  'A/C',
  'Calefacción',
  'Lavadora',
  'Terraza',
  'Vistas al mar',
  'Vistas a la ría',
  'Cuna disponible',
  'Barbacoa',
];

const seasonTypes = [
  { id: 'low', label: 'Baja', color: '#4CAF50' },
  { id: 'high', label: 'Alta', color: '#FF6B6B' },
  { id: 'christmas', label: 'Navidad', color: '#FFD700' },
  { id: 'easter', label: 'Semana Santa', color: '#9C27B0' },
];

const PRIMARY_COLOR = '#1a5f6e';
const SECONDARY_COLOR = '#0f172a';
const ACCENT_COLOR = '#D4A843';
const LIGHT_BG = '#f5f5f5';

// ─── VALIDADORES ────────────────────────────────────────────────────────
const validateSlug = slug => /^[a-z0-9-]+$/.test(slug);

const validateEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isUrlSafe = str => /^[a-zA-Z0-9-_]+$/.test(str);

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────
export default function ApartamentosAdmin() {
  const toast = useToast();
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [seasonPrices, setSeasonPrices] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [unsplashUrl, setUnsplashUrl] = useState('');
  const [newSeasonData, setNewSeasonData] = useState({
    type: 'low',
    price: '',
    start_date: '',
    end_date: '',
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [newRule, setNewRule] = useState('');
  const [newAmenity, setNewAmenity] = useState('');

  // Cargar apartamentos
  useEffect(() => {
    loadApartments();
  }, []);

  const parseInternalOrder = (apt) => {
    const raw = (apt.internal_name || apt.name || '').toString().trim();
    const match = raw.match(/(\d+)[º°]?\s*([A-Za-z])/);
    if (!match) {
      return { floor: Number.MAX_SAFE_INTEGER, unit: raw.toUpperCase() };
    }
    const floor = parseInt(match[1], 10);
    const unit = match[2].toUpperCase();
    return { floor, unit };
  };

  const compareApartments = (a, b) => {
    const aKey = parseInternalOrder(a);
    const bKey = parseInternalOrder(b);

    if (aKey.floor !== bKey.floor) return aKey.floor - bKey.floor;
    if (aKey.unit !== bKey.unit) return aKey.unit.localeCompare(bKey.unit);

    return (a.name || '').localeCompare(b.name || '');
  };

  const loadApartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('apartments')
        .select('*');

      if (fetchError) throw fetchError;
      const sortedData = (data || []).slice().sort(compareApartments);
      setApartments(sortedData);
    } catch (err) {
      console.error('Error loading apartments:', err);
      setError(err.message || 'Error al cargar apartamentos');
    } finally {
      setLoading(false);
    }
  };

  // Cargar precios de temporada
  const loadSeasonPrices = async apartmentSlug => {
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
  const loadPhotos = async apartmentSlug => {
    try {
      const { data, error: fetchError } = await supabase
        .from('apartment_photos')
        .select('*')
        .eq('apartment_slug', apartmentSlug)
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setPhotos(data || []);
    } catch (err) {
      console.error('Error loading photos:', err);
    }
  };

  const startEdit = apt => {
    setEditing(apt.slug);
    setFormData({
      ...apt,
      bathrooms: apt.baths,
      bedrooms: apt.bedrooms || apt.beds,
      rules: apt.rules || [],
    });
    setSelectedAmenities(apt.amenities || []);
    setNewRule('');
    setActiveTab('basic');
    loadSeasonPrices(apt.slug);
    loadPhotos(apt.slug);
  };

  const startCreate = () => {
    setEditing('new');
    setFormData({
      active: true,
      min_stay: 2,
      capacity: 2,
      price: 100,
      bedrooms: 1,
      bathrooms: 1,
      beds: 1,
      color: '#1a5f6e',
      cancellation_days: 14,
      deposit_percentage: 50,
      slug: '',
      rules: [],
    });
    setSelectedAmenities([]);
    setValidationErrors({});
    setNewRule('');
    setActiveTab('basic');
    setSeasonPrices([]);
    setPhotos([]);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Auto-generar slug al cambiar el nombre (nuevo o existente)
      if (field === 'name') {
        newData.slug = value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // remove accents
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
      if (
        !formData[field] ||
        (typeof formData[field] === 'string' && formData[field].trim() === '')
      ) {
        errors[field] =
          `${field === 'name' ? 'Nombre' : field === 'price' ? 'Precio' : field === 'capacity' ? 'Capacidad' : field === 'bedrooms' ? 'Dormitorios' : field === 'bathrooms' ? 'Baños' : 'Slug'} es obligatorio`;
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

      const basePayload = {
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
        description: formData.description,
        description_en: formData.description_en,
        color: formData.color,
        cancellation_days: formData.cancellation_days,
        deposit_percentage: formData.deposit_percentage,
        active: formData.active,
        amenities: selectedAmenities,
        slug: formData.slug,
        internal_name: formData.internal_name || null,
        maps_url: formData.maps_url || null,
        rules: formData.rules || [],
      };

      if (editing === 'new') {
        const payload = { ...basePayload };
        const { error: insertError } = await supabase.from('apartments').insert([payload]);

        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from('apartments')
          .update(basePayload)
          .eq('slug', editing);

        if (updateError) throw updateError;
      }

      logAudit(
        editing ? 'update_apartment' : 'create_apartment',
        'apartment',
        editing ?? formData.slug,
        { name: formData.name }
      );
      toast.success('Cambios guardados correctamente');
      setEditing(null);
      loadApartments();
    } catch (err) {
      console.error('Error saving apartment:', err);
      const isRLS = err.code === '42501' || err.message?.includes('policy');
      toast.error(
        `Error al guardar: ${err.message}${isRLS ? ' (Revisa permisos RLS en Supabase)' : ''}`
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── GESTIÓN DE FOTOS ────────────────────────────────────────────────
  const addPhotoFromFile = async e => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    const invalidFile = files.find(f => !allowed.includes(f.type));
    if (invalidFile) {
      setError(`"${invalidFile.name}" tiene un formato no permitido. Usa JPG, PNG, WebP o AVIF.`);
      e.target.value = '';
      return;
    }
    const oversizedFile = files.find(f => f.size > 10 * 1024 * 1024);
    if (oversizedFile) {
      setError(`"${oversizedFile.name}" supera los 10 MB.`);
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const newPhotos = [];
      let currentCount = photos.length;

      for (const file of files) {
        const { path, publicUrl } = await uploadPhotoToStorage(editing, file);

        const { data, error: insertError } = await supabase
          .from('apartment_photos')
          .insert([
            {
              apartment_slug: editing,
              photo_url: publicUrl,
              storage_path: path,
              order_index: currentCount,
              is_main: currentCount === 0,
            },
          ])
          .select();

        if (insertError) throw insertError;
        newPhotos.push(data[0]);
        currentCount++;
      }

      setPhotos(prev => [...prev, ...newPhotos]);
      setSuccess(
        `✓ ${newPhotos.length} foto${newPhotos.length > 1 ? 's' : ''} subida${newPhotos.length > 1 ? 's' : ''} correctamente`
      );
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Error al subir foto: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const addPhoto = async () => {
    if (!unsplashUrl.trim()) {
      setError('Por favor, ingresa una URL de foto');
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('apartment_photos')
        .insert([
          {
            apartment_slug: editing,
            photo_url: unsplashUrl,
            storage_path: null,
            order_index: photos.length,
            is_main: photos.length === 0,
          },
        ])
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

  const deletePhoto = async photoId => {
    try {
      const photo = photos.find(p => p.id === photoId);

      const { error: deleteError } = await supabase
        .from('apartment_photos')
        .delete()
        .eq('id', photoId);

      if (deleteError) throw deleteError;

      // Eliminar también del Storage si tiene ruta
      if (photo?.storage_path) {
        await deletePhotoFromStorage(photo.storage_path);
      }

      setPhotos(photos.filter(p => p.id !== photoId));
      setSuccess('✓ Foto eliminada correctamente');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError('Error al eliminar foto: ' + err.message);
    }
  };

  const toggleFeaturedPhoto = async photoId => {
    try {
      // Quitar marcado de la foto principal anterior
      const mainPhoto = photos.find(p => p.is_main);
      if (mainPhoto) {
        await supabase.from('apartment_photos').update({ is_main: false }).eq('id', mainPhoto.id);
      }

      // Marcar la nueva foto como principal
      await supabase.from('apartment_photos').update({ is_main: true }).eq('id', photoId);

      // Actualizar local
      setPhotos(
        photos.map(p => ({
          ...p,
          is_main: p.id === photoId,
        }))
      );

      setSuccess('✓ Foto principal actualizada');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error updating featured photo:', err);
      setError('Error al actualizar foto principal: ' + err.message);
    }
  };

  // ─── GESTIÓN DE PRECIOS DE TEMPORADA ──────────────────────────────────
  const saveSeason = async () => {
    if (
      !newSeasonData.type ||
      !newSeasonData.price ||
      !newSeasonData.start_date ||
      !newSeasonData.end_date
    ) {
      setError('Por favor, completa todos los campos de la temporada');
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('season_prices')
        .insert([
          {
            apartment_slug: editing,
            type: newSeasonData.type,
            price_per_night: parseFloat(newSeasonData.price),
            start_date: newSeasonData.start_date,
            end_date: newSeasonData.end_date,
          },
        ])
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

  const deleteSeaon = async seasonId => {
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

  const toggleActiveStatus = async apt => {
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

  const handleDelete = async apt => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar el apartamento "${apt.name}"? Esta acción no se puede deshacer y fallará si hay reservas asociadas.`
      )
    ) {
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

      logAudit('delete_apartment', 'apartment', apt.slug, { name: apt.name });
      setSuccess('✓ Apartamento eliminado correctamente');
      setTimeout(() => setSuccess(null), 3000);
      loadApartments();
    } catch (err) {
      console.error('Error deleting apartment:', err);
      setError(
        `Error al eliminar: ${err.message}. Asegúrate de que no tenga reservas, fotos o precios de temporada vinculados.`
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── VISTA DE EDICIÓN ────────────────────────────────────────────────
  if (editing) {
    return (
      <>
        <div
          className="apt-admin-edit-header flex items-center justify-between pb-6 mb-6 px-8 pt-8"
          style={{ borderBottom: `4px solid ${PRIMARY_COLOR}` }}
        >
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
                fontWeight: 600,
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
                {editing === 'new'
                  ? 'Completa los datos iniciales y guarda para añadir fotos y temporadas'
                  : 'Gestiona todos los aspectos de este apartamento'}
              </div>
            </div>
          </div>
        </div>

        <div
          className="apt-admin-edit-body"
          style={{
            padding: '24px 24px 80px 24px',
            background: LIGHT_BG,
            minHeight: 'calc(100vh - 120px)',
          }}
        >
          <div className="apt-admin-edit-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, maxWidth: 1600 }}>
            {/* PANEL IZQUIERDO - NAVEGACIÓN Y VISTA PREVIA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Tabs navegación */}
              <div
                style={{
                  background: '#fff',
                  border: `1px solid #ddd`,
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {[
                  { id: 'basic', label: '📋 Básico' },
                  ...(editing !== 'new'
                    ? [
                        { id: 'photos', label: '📸 Fotos' },
                        { id: 'seasons', label: '🗓️ Temporadas' },
                      ]
                    : []),
                  { id: 'rules', label: '🏠 Normas' },
                  { id: 'location', label: '📍 Ubicación' },
                  { id: 'amenities', label: '✨ Comodidades' },
                  { id: 'state', label: '⚙️ Estado' },
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
                      borderBottom: '1px solid #eee',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Vista previa de foto principal */}
              {photos.length > 0 && (
                <div
                  style={{
                    background: '#fff',
                    border: `1px solid #ddd`,
                    borderRadius: 12,
                    overflow: 'hidden',
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: PRIMARY_COLOR,
                      marginBottom: 12,
                    }}
                  >
                    FOTO PRINCIPAL
                  </div>
                  <img
                    src={photos.find(p => p.is_main)?.photo_url || photos[0]?.photo_url}
                    alt="Principal"
                    style={{
                      width: '100%',
                      height: 200,
                      objectFit: 'cover',
                      borderRadius: 8,
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
                <div
                  style={{
                    background: '#fff',
                    border: `1px solid #ddd`,
                    borderRadius: 12,
                    padding: 28,
                  }}
                >
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: PRIMARY_COLOR,
                      marginBottom: 24,
                    }}
                  >
                    Información Básica
                  </div>

                  {/* Nombre */}
                  <div style={{ marginBottom: 20 }}>
                    <label
                      htmlFor="apartment-name"
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: SECONDARY_COLOR,
                        marginBottom: 8,
                      }}
                    >
                      Nombre (ES){' '}
                      {validationErrors.name && <span style={{ color: '#f44' }}>*</span>}
                    </label>
                    <input
                      id="apartment-name"
                      type="text"
                      value={formData.name || ''}
                      onChange={e => handleInputChange('name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `2px solid ${validationErrors.name ? '#f44' : '#ddd'}`,
                        borderRadius: 6,
                        fontSize: 14,
                        fontFamily: 'inherit',
                      }}
                      placeholder="Ej: Apartamento Deluxe"
                    />
                    {validationErrors.name && (
                      <div style={{ fontSize: 12, color: '#f44', marginTop: 4 }}>
                        {validationErrors.name}
                      </div>
                    )}
                  </div>

                  {/* Nombre Interno */}
                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: SECONDARY_COLOR,
                        marginBottom: 8,
                      }}
                    >
                      Nombre Interno / Administración (Ej: Apto 1)
                    </label>
                    <input
                      type="text"
                      value={formData.internal_name || ''}
                      onChange={e => handleInputChange('internal_name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 14,
                        fontFamily: 'inherit',
                      }}
                      placeholder="Nombre para el calendario/dashboard"
                    />
                  </div>

                  {/* Nombre EN */}
                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: SECONDARY_COLOR,
                        marginBottom: 8,
                      }}
                    >
                      Name (EN)
                    </label>
                    <input
                      type="text"
                      value={formData.name_en || ''}
                      onChange={e => handleInputChange('name_en', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 14,
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Slug */}
                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: SECONDARY_COLOR,
                        marginBottom: 8,
                      }}
                    >
                      Slug (URL-safe){' '}
                      {validationErrors.slug && <span style={{ color: '#f44' }}>*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.slug || ''}
                      onChange={e => handleInputChange('slug', e.target.value.toLowerCase())}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `2px solid ${validationErrors.slug ? '#f44' : '#ddd'}`,
                        borderRadius: 6,
                        fontSize: 14,
                        fontFamily: 'monospace',
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
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 16,
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                          color: SECONDARY_COLOR,
                          marginBottom: 8,
                        }}
                      >
                        Tagline (ES)
                      </label>
                      <input
                        type="text"
                        value={formData.tagline || ''}
                        onChange={e => handleInputChange('tagline', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 14,
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                          color: SECONDARY_COLOR,
                          marginBottom: 8,
                        }}
                      >
                        Tagline (EN)
                      </label>
                      <input
                        type="text"
                        value={formData.tagline_en || ''}
                        onChange={e => handleInputChange('tagline_en', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 14,
                        }}
                      />
                    </div>
                  </div>

                  {/* Números */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 16,
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                          color: SECONDARY_COLOR,
                          marginBottom: 8,
                        }}
                      >
                        Capacidad{' '}
                        {validationErrors.capacity && <span style={{ color: '#f44' }}>*</span>}
                      </label>
                      <input
                        type="number"
                        value={formData.capacity || ''}
                        onChange={e => handleInputChange('capacity', parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `2px solid ${validationErrors.capacity ? '#f44' : '#ddd'}`,
                          borderRadius: 6,
                          fontSize: 14,
                        }}
                      />
                      {validationErrors.capacity && (
                        <div style={{ fontSize: 12, color: '#f44', marginTop: 4 }}>
                          {validationErrors.capacity}
                        </div>
                      )}
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                          color: SECONDARY_COLOR,
                          marginBottom: 8,
                        }}
                      >
                        Dormitorios{' '}
                        {validationErrors.bedrooms && <span style={{ color: '#f44' }}>*</span>}
                      </label>
                      <input
                        type="number"
                        value={formData.bedrooms || ''}
                        onChange={e => handleInputChange('bedrooms', parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `2px solid ${validationErrors.bedrooms ? '#f44' : '#ddd'}`,
                          borderRadius: 6,
                          fontSize: 14,
                        }}
                      />
                      {validationErrors.bedrooms && (
                        <div style={{ fontSize: 12, color: '#f44', marginTop: 4 }}>
                          {validationErrors.bedrooms}
                        </div>
                      )}
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                          color: SECONDARY_COLOR,
                          marginBottom: 8,
                        }}
                      >
                        Baños{' '}
                        {validationErrors.bathrooms && <span style={{ color: '#f44' }}>*</span>}
                      </label>
                      <input
                        type="number"
                        value={formData.bathrooms || ''}
                        onChange={e => handleInputChange('bathrooms', parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `2px solid ${validationErrors.bathrooms ? '#f44' : '#ddd'}`,
                          borderRadius: 6,
                          fontSize: 14,
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
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 16,
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                          color: SECONDARY_COLOR,
                          marginBottom: 8,
                        }}
                      >
                        Precio por noche{' '}
                        {validationErrors.price && <span style={{ color: '#f44' }}>*</span>}
                      </label>
                      <input
                        type="number"
                        value={formData.price || ''}
                        onChange={e => handleInputChange('price', parseFloat(e.target.value))}
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `2px solid ${validationErrors.price ? '#f44' : '#ddd'}`,
                          borderRadius: 6,
                          fontSize: 14,
                        }}
                      />
                      {validationErrors.price && (
                        <div style={{ fontSize: 12, color: '#f44', marginTop: 4 }}>
                          {validationErrors.price}
                        </div>
                      )}
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                          color: SECONDARY_COLOR,
                          marginBottom: 8,
                        }}
                      >
                        Camas
                      </label>
                      <input
                        type="number"
                        value={formData.beds || ''}
                        onChange={e => handleInputChange('beds', parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 14,
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                          color: SECONDARY_COLOR,
                          marginBottom: 8,
                        }}
                      >
                        Estancia mínima (noches)
                      </label>
                      <input
                        type="number"
                        value={formData.min_stay || 1}
                        onChange={e => handleInputChange('min_stay', parseInt(e.target.value) || 1)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 14,
                        }}
                      />
                    </div>
                  </div>

                  {/* Color y Políticas */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 16,
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                          color: SECONDARY_COLOR,
                          marginBottom: 8,
                        }}
                      >
                        Color de identificación
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="color"
                          value={formData.color || '#1a5f6e'}
                          onChange={e => handleInputChange('color', e.target.value)}
                          style={{
                            width: 50,
                            height: 50,
                            border: `1px solid #ddd`,
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        />
                        <input
                          type="text"
                          value={formData.color || ''}
                          onChange={e => handleInputChange('color', e.target.value)}
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            border: '1px solid #ddd',
                            borderRadius: 6,
                            fontSize: 14,
                            fontFamily: 'monospace',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                          color: SECONDARY_COLOR,
                          marginBottom: 8,
                        }}
                      >
                        Días de cancelación gratis
                      </label>
                      <input
                        type="number"
                        value={
                          formData.cancellation_days !== undefined &&
                          formData.cancellation_days !== null
                            ? formData.cancellation_days
                            : 14
                        }
                        onChange={e =>
                          handleInputChange('cancellation_days', parseInt(e.target.value) || 0)
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 14,
                        }}
                        min="0"
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                          color: SECONDARY_COLOR,
                          marginBottom: 8,
                        }}
                      >
                        % Depósito inicial
                      </label>
                      <input
                        type="number"
                        value={
                          formData.deposit_percentage !== undefined &&
                          formData.deposit_percentage !== null
                            ? formData.deposit_percentage
                            : 50
                        }
                        onChange={e =>
                          handleInputChange('deposit_percentage', parseInt(e.target.value) || 0)
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 14,
                        }}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: SECONDARY_COLOR,
                        marginBottom: 8,
                      }}
                    >
                      Descripción (ES)
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={e => handleInputChange('description', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 14,
                        fontFamily: 'inherit',
                        minHeight: 120,
                        resize: 'vertical',
                      }}
                    />
                    <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      Usa <strong>**texto**</strong> para poner en <strong>negrita</strong>
                    </p>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: SECONDARY_COLOR,
                        marginBottom: 8,
                      }}
                    >
                      Description (EN)
                    </label>
                    <textarea
                      value={formData.description_en || ''}
                      onChange={e => handleInputChange('description_en', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 14,
                        fontFamily: 'inherit',
                        minHeight: 120,
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* TAB: NORMAS */}
              {activeTab === 'rules' && (
                <div
                  style={{
                    background: '#fff',
                    border: `1px solid #ddd`,
                    borderRadius: 12,
                    padding: 28,
                  }}
                >
                  <div
                    style={{ fontSize: 20, fontWeight: 600, color: PRIMARY_COLOR, marginBottom: 8 }}
                  >
                    Normas de la casa
                  </div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
                    Estas normas se muestran en la página del apartamento.
                  </div>

                  {/* Añadir norma */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                    <input
                      type="text"
                      value={newRule}
                      onChange={e => setNewRule(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newRule.trim()) {
                          handleInputChange('rules', [...(formData.rules || []), newRule.trim()]);
                          setNewRule('');
                        }
                      }}
                      placeholder="Ej: No se permite fumar"
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 14,
                        fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={() => {
                        if (!newRule.trim()) return;
                        handleInputChange('rules', [...(formData.rules || []), newRule.trim()]);
                        setNewRule('');
                      }}
                      style={{
                        background: PRIMARY_COLOR,
                        border: 'none',
                        color: '#fff',
                        padding: '10px 20px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      + Añadir
                    </button>
                  </div>

                  {/* Lista de normas */}
                  {!formData.rules || formData.rules.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: '#aaa',
                        fontSize: 14,
                      }}
                    >
                      No hay normas definidas. Añade la primera.
                    </div>
                  ) : (
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      {formData.rules.map((rule, i) => (
                        <li
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 14px',
                            background: '#f8fafc',
                            borderRadius: 8,
                            border: '1px solid #e5e7eb',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              color: '#1a5f6e',
                              fontWeight: 600,
                              minWidth: 20,
                            }}
                          >
                            {i + 1}.
                          </span>
                          <span style={{ flex: 1, fontSize: 14, color: SECONDARY_COLOR }}>
                            {rule}
                          </span>
                          <button
                            onClick={() =>
                              handleInputChange(
                                'rules',
                                formData.rules.filter((_, idx) => idx !== i)
                              )
                            }
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#f44',
                              cursor: 'pointer',
                              fontSize: 18,
                              lineHeight: 1,
                              padding: '0 4px',
                            }}
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Botón guardar */}
                  <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        background: saving ? '#ccc' : PRIMARY_COLOR,
                        border: 'none',
                        color: '#fff',
                        padding: '12px 28px',
                        borderRadius: 8,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {saving ? 'Guardando…' : 'Guardar normas'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: FOTOS */}
              {activeTab === 'photos' && (
                <div
                  style={{
                    background: '#fff',
                    border: `1px solid #ddd`,
                    borderRadius: 12,
                    padding: 28,
                  }}
                >
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: PRIMARY_COLOR,
                      marginBottom: 24,
                    }}
                  >
                    Gestionar Fotos
                  </div>

                  {/* Agregar foto — subir archivo al Storage */}
                  <div
                    style={{
                      background: LIGHT_BG,
                      border: `2px dashed ${PRIMARY_COLOR}`,
                      borderRadius: 8,
                      padding: 20,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: SECONDARY_COLOR,
                        marginBottom: 12,
                      }}
                    >
                      Subir foto desde tu dispositivo
                    </div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        padding: '12px 20px',
                        background: uploading ? '#ccc' : PRIMARY_COLOR,
                        color: '#fff',
                        borderRadius: 6,
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {uploading ? '⏳ Subiendo…' : '📁 Elegir imágenes'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        style={{ display: 'none' }}
                        disabled={uploading}
                        multiple
                        onChange={addPhotoFromFile}
                      />
                    </label>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
                      JPG, PNG, WebP o AVIF · máx. 10 MB por foto · puedes seleccionar varias a la
                      vez
                    </div>
                  </div>

                  {/* Agregar foto — URL externa */}
                  <div
                    style={{
                      background: LIGHT_BG,
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 24,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 10 }}>
                      O pega una URL externa
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={unsplashUrl}
                        onChange={e => setUnsplashUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 13,
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
                          whiteSpace: 'nowrap',
                        }}
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>

                  {/* Galería */}
                  {photos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                      No hay fotos aún. Agrega la primera foto.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: 12,
                      }}
                    >
                      {photos.map(photo => (
                        <div
                          key={photo.id}
                          style={{
                            position: 'relative',
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: photo.is_main ? `3px solid ${ACCENT_COLOR}` : '1px solid #ddd',
                          }}
                        >
                          <img
                            src={photo.photo_url}
                            alt="Foto"
                            style={{
                              width: '100%',
                              height: 150,
                              objectFit: 'cover',
                            }}
                          />
                          {photo.is_main && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                background: ACCENT_COLOR,
                                color: '#fff',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 600,
                              }}
                            >
                              PRINCIPAL
                            </div>
                          )}
                          {photo.storage_path && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 4,
                                left: 4,
                                background: '#16a34a',
                                color: '#fff',
                                padding: '2px 5px',
                                borderRadius: 4,
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: '0.3px',
                              }}
                            >
                              STORAGE
                            </div>
                          )}
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'rgba(0,0,0,0.8)',
                              display: 'flex',
                              gap: 4,
                              padding: 4,
                            }}
                          >
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
                                  fontWeight: 600,
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
                                lineHeight: 1,
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
                <div
                  style={{
                    background: '#fff',
                    border: `1px solid #ddd`,
                    borderRadius: 12,
                    padding: 28,
                  }}
                >
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: PRIMARY_COLOR,
                      marginBottom: 24,
                    }}
                  >
                    Precios de Temporada
                  </div>

                  {/* Agregar temporada */}
                  <div
                    style={{
                      background: LIGHT_BG,
                      borderRadius: 8,
                      padding: 20,
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: SECONDARY_COLOR,
                        marginBottom: 12,
                      }}
                    >
                      Nueva Temporada
                    </div>
                    <div
                      className="apt-admin-season-form-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <select
                        value={newSeasonData.type}
                        onChange={e => setNewSeasonData({ ...newSeasonData, type: e.target.value })}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 13,
                        }}
                      >
                        {seasonTypes.map(st => (
                          <option key={st.id} value={st.id}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Precio €"
                        value={newSeasonData.price}
                        onChange={e =>
                          setNewSeasonData({ ...newSeasonData, price: e.target.value })
                        }
                        step="0.01"
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 13,
                        }}
                      />
                      <input
                        type="date"
                        value={newSeasonData.start_date}
                        onChange={e =>
                          setNewSeasonData({ ...newSeasonData, start_date: e.target.value })
                        }
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 13,
                        }}
                      />
                      <input
                        type="date"
                        value={newSeasonData.end_date}
                        onChange={e =>
                          setNewSeasonData({ ...newSeasonData, end_date: e.target.value })
                        }
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: 13,
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
                        fontWeight: 600,
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
                    <div
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        className="apt-admin-season-table-header"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr 80px',
                          gap: 12,
                          padding: '12px 16px',
                          background: PRIMARY_COLOR,
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <div>Tipo</div>
                        <div>Precio</div>
                        <div>Inicio</div>
                        <div>Fin</div>
                        <div>Acción</div>
                      </div>
                      {seasonPrices.map((season, index) => {
                        const seasonType = seasonTypes.find(st => st.id === season.type);
                        return (
                          <div
                            key={season.id}
                            className="apt-admin-season-row"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr 80px',
                              gap: 12,
                              alignItems: 'center',
                              padding: '12px 16px',
                              borderBottom:
                                index < seasonPrices.length - 1 ? '1px solid #eee' : 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div
                                style={{
                                  width: 12,
                                  height: 12,
                                  background: seasonType?.color,
                                  borderRadius: 2,
                                }}
                              />
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
                                fontWeight: 600,
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

              {/* TAB: UBICACIÓN */}
              {activeTab === 'location' && (
                <div
                  style={{
                    background: '#fff',
                    border: `1px solid #ddd`,
                    borderRadius: 12,
                    padding: 28,
                  }}
                >
                  <div
                    style={{ fontSize: 20, fontWeight: 600, color: PRIMARY_COLOR, marginBottom: 8 }}
                  >
                    Ubicación
                  </div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
                    Pega el enlace de Google Maps del apartamento. Aparecerá como botón en la página
                    del apartamento.
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: SECONDARY_COLOR,
                        marginBottom: 8,
                      }}
                    >
                      Enlace Google Maps
                    </label>
                    <input
                      type="url"
                      value={formData.maps_url || ''}
                      onChange={e => handleInputChange('maps_url', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 14,
                      }}
                      placeholder="https://maps.google.com/..."
                    />
                  </div>

                  {formData.maps_url && (
                    <div
                      style={{
                        background: '#f0faf9',
                        border: '1px solid #b2ddd8',
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: PRIMARY_COLOR,
                          marginBottom: 8,
                        }}
                      >
                        Vista previa del botón
                      </div>
                      <a
                        href={formData.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 16px',
                          background: '#fff',
                          border: '1px solid #ddd',
                          borderRadius: 8,
                          textDecoration: 'none',
                          color: '#0f172a',
                        }}
                      >
                        <span style={{ fontSize: 20 }}>📍</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            Ver ubicación en Google Maps
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: '#888',
                              marginTop: 2,
                              wordBreak: 'break-all',
                            }}
                          >
                            {formData.maps_url}
                          </div>
                        </div>
                        <span style={{ color: PRIMARY_COLOR, fontSize: 16 }}>→</span>
                      </a>
                    </div>
                  )}

                  {!formData.maps_url && (
                    <div
                      style={{
                        background: '#fafafa',
                        border: '1px dashed #ddd',
                        borderRadius: 8,
                        padding: 24,
                        textAlign: 'center',
                        color: '#aaa',
                        fontSize: 13,
                      }}
                    >
                      📍 Sin enlace de Maps configurado
                    </div>
                  )}
                </div>
              )}

              {/* TAB: COMODIDADES */}
              {activeTab === 'amenities' && (
                <div
                  style={{
                    background: '#fff',
                    border: `1px solid #ddd`,
                    borderRadius: 12,
                    padding: 28,
                  }}
                >
                  <div
                    style={{ fontSize: 20, fontWeight: 600, color: PRIMARY_COLOR, marginBottom: 8 }}
                  >
                    Comodidades
                  </div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
                    Las comodidades activas se muestran en la página del apartamento.
                  </div>

                  {/* Chips de comodidades activas */}
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: SECONDARY_COLOR,
                      marginBottom: 10,
                    }}
                  >
                    Activas
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 24,
                      minHeight: 40,
                    }}
                  >
                    {selectedAmenities.length === 0 && (
                      <span style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>
                        Ninguna seleccionada
                      </span>
                    )}
                    {selectedAmenities.map(amenity => (
                      <span
                        key={amenity}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: PRIMARY_COLOR,
                          color: '#fff',
                          padding: '5px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {amenity}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAmenities(selectedAmenities.filter(a => a !== amenity))
                          }
                          style={{
                            background: 'rgba(255,255,255,0.25)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '50%',
                            width: 16,
                            height: 16,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                            lineHeight: 1,
                            padding: 0,
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Predefinidas para añadir */}
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: SECONDARY_COLOR,
                      marginBottom: 10,
                    }}
                  >
                    Predefinidas (clic para añadir)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                    {DEFAULT_AMENITIES.filter(a => !selectedAmenities.includes(a)).map(amenity => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => setSelectedAmenities([...selectedAmenities, amenity])}
                        style={{
                          background: '#f5f5f5',
                          border: '1px dashed #ccc',
                          color: '#555',
                          padding: '5px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        + {amenity}
                      </button>
                    ))}
                    {DEFAULT_AMENITIES.filter(a => !selectedAmenities.includes(a)).length === 0 && (
                      <span style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>
                        Todas las predefinidas están activas
                      </span>
                    )}
                  </div>

                  {/* Añadir comodidad personalizada */}
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: SECONDARY_COLOR,
                      marginBottom: 10,
                    }}
                  >
                    Añadir personalizada
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={newAmenity}
                      onChange={e => setNewAmenity(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newAmenity.trim()) {
                          const v = newAmenity.trim();
                          if (!selectedAmenities.includes(v))
                            setSelectedAmenities([...selectedAmenities, v]);
                          setNewAmenity('');
                        }
                      }}
                      placeholder="Ej: Secador de pelo, Microondas..."
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const v = newAmenity.trim();
                        if (v && !selectedAmenities.includes(v)) {
                          setSelectedAmenities([...selectedAmenities, v]);
                          setNewAmenity('');
                        }
                      }}
                      style={{
                        background: PRIMARY_COLOR,
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: ESTADO */}
              {activeTab === 'state' && (
                <div
                  style={{
                    background: '#fff',
                    border: `1px solid #ddd`,
                    borderRadius: 12,
                    padding: 28,
                  }}
                >
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: PRIMARY_COLOR,
                      marginBottom: 24,
                    }}
                  >
                    Estado
                  </div>

                  <div
                    style={{
                      background: LIGHT_BG,
                      borderRadius: 8,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: SECONDARY_COLOR,
                        marginBottom: 12,
                      }}
                    >
                      Estado de publicación
                    </div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px',
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.active || false}
                        onChange={e => handleInputChange('active', e.target.checked)}
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
                          <strong>Creado:</strong>{' '}
                          {formData.created_at
                            ? new Date(formData.created_at).toLocaleDateString()
                            : '-'}
                        </div>
                        {formData.updated_at && (
                          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                            <strong>Actualizado:</strong>{' '}
                            {new Date(formData.updated_at).toLocaleDateString()}
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
        <div
          style={{
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
            zIndex: 999,
          }}
        >
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
              fontWeight: 600,
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
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <>
                <span
                  className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"
                  style={{ display: 'inline-block' }}
                />
                Guardando...
              </>
            ) : (
              '✓ Guardar cambios'
            )}
          </button>
        </div>
      </>
    );
  }

  // ─── LISTADO DE APARTAMENTOS ─────────────────────────────────────────
  return (
    <div className="bg-white">
      {/* Header */}
      <div className="apt-admin-page-header border-b border-gray-200 px-8 pt-8 pb-6 flex justify-between items-center bg-slate-50">
        <div>
          <div className="text-2xl font-bold text-slate-900">Apartamentos</div>
          <div className="text-sm text-gray-400 mt-0.5">
            {apartments.length} unidades · {apartments.filter(a => a.active).length} activos
          </div>
        </div>
        <button
          onClick={startCreate}
          className="bg-[#1a5f6e] text-white px-4 py-2 rounded font-semibold text-sm hover:bg-opacity-90 transition-colors"
        >
          + Nuevo apartamento
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Cargando apartamentos...</div>
        ) : error ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm mb-4">
            <strong>Error:</strong> {error}
          </div>
        ) : apartments.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No hay apartamentos disponibles
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            {/* Cabecera tabla */}
            <div className="apt-admin-list-header grid grid-cols-[40px_1.8fr_1fr_1fr_1fr_auto_auto] px-5 py-3 bg-slate-50 border-b-2 border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider gap-4 items-center">
              <div />
              <div>Apartamento</div>
              <div>Precio/noche</div>
              <div>Mín. estancia</div>
              <div>Valoración</div>
              <div className="text-center">Estado</div>
              <div className="text-right">Acciones</div>
            </div>

            {apartments.map((apt, index) => (
              <div
                key={apt.id || apt.slug || index}
                className={`apt-admin-list-row grid grid-cols-[40px_1.8fr_1fr_1fr_1fr_auto_auto] px-5 py-4 items-center gap-4 hover:bg-gray-50 transition-colors ${index < apartments.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                {/* Color thumbnail */}
                <div
                  className="w-9 h-9 rounded flex-shrink-0"
                  style={{ background: apt.color || '#ccc' }}
                />

                {/* Info básica */}
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {apt.internal_name || apt.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {apt.internal_name ? `${apt.name} · ` : ''}
                    {apt.capacity} pers · {apt.bedrooms || apt.beds} dorm · {apt.baths} baño
                  </div>
                </div>

                {/* Precio */}
                <div className="text-sm font-semibold text-[#1a5f6e]">
                  {formatPrice(apt.price)}
                  <span className="text-xs text-gray-400 font-normal">/noche</span>
                </div>

                {/* Estancia mínima */}
                <div className="text-xs text-gray-500">Mín. {apt.min_stay} noches</div>

                {/* Rating */}
                <div className="text-xs font-semibold text-[#D4A843]">★ {apt.rating || '—'}</div>

                {/* Estado */}
                <div className="flex justify-center">
                  <button
                    onClick={() => toggleActiveStatus(apt)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${apt.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {apt.active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => startEdit(apt)}
                    className="px-3 py-1.5 bg-[#1a5f6e] text-white rounded text-xs font-semibold hover:bg-opacity-90 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(apt)}
                    className="px-2.5 py-1.5 border border-red-300 text-red-600 rounded text-xs font-semibold hover:bg-red-50 transition-colors flex items-center"
                    title="Eliminar apartamento"
                  >
                    <Ico d={paths.trash} size={13} color="currentColor" />
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
