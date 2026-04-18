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
import { PanelPageHeader, PanelConfirm } from '../../components/panel';

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
  const [confirmDeleteApt, setConfirmDeleteApt] = useState(null);

  // Load apartments
  useEffect(() => {
    loadApartments();
  }, []);

  const parseInternalOrder = apt => {
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
      const { data, error: fetchError } = await supabase.from('apartments').select('*');

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

  // Load seasonal prices
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

  // Load photos
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

      // Auto-generate slug on name change (nuevo o existente)
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

    // Validate positive numbers
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

      // Also delete from Storage if it has a path
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

      // Update local state
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
    setConfirmDeleteApt(apt);
  };

  const handleDeleteConfirmed = async () => {
    const apt = confirmDeleteApt;
    setConfirmDeleteApt(null);
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
        <div className="panel-page-content pb-2">
          <PanelPageHeader
            title={editing === 'new' ? 'Nuevo Apartamento' : `Editando: ${formData.name}`}
            subtitle={
              editing === 'new'
                ? 'Completa los datos iniciales y guarda para añadir fotos y temporadas'
                : 'Gestiona todos los aspectos de este apartamento'
            }
            actions={
              <button
                className="panel-btn panel-btn-ghost panel-btn-sm"
                onClick={() => setEditing(null)}
              >
                ← Volver
              </button>
            }
          />
        </div>

        <div className="apt-admin-edit-body">
          <div className="apt-admin-edit-grid">
            {/* PANEL IZQUIERDO */}
            <div className="apt-admin-left-col">
              <nav className="apt-admin-tab-nav">
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
                    className={`apt-admin-tab-btn${activeTab === tab.id ? ' apt-admin-tab-btn--active' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              {photos.length > 0 && (
                <div className="apt-admin-preview-card">
                  <div className="apt-admin-preview-label">Foto principal</div>
                  <img
                    src={photos.find(p => p.is_main)?.photo_url || photos[0]?.photo_url}
                    alt="Principal"
                    className="apt-admin-preview-img"
                  />
                  <div className="apt-admin-preview-caption">
                    {formData.name} · {formData.capacity} personas
                  </div>
                </div>
              )}
            </div>

            {/* PANEL DERECHO */}
            <div>
              {/* TAB: BÁSICO */}
              {activeTab === 'basic' && (
                <div className="apt-admin-panel">
                  <div className="apt-admin-panel-title">Información Básica</div>

                  <div className="apt-admin-field">
                    <label htmlFor="apartment-name" className="apt-admin-label">
                      Nombre (ES) {validationErrors.name && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      id="apartment-name"
                      type="text"
                      value={formData.name || ''}
                      onChange={e => handleInputChange('name', e.target.value)}
                      className={`panel-input${validationErrors.name ? ' panel-input--error' : ''}`}
                      placeholder="Ej: Apartamento Deluxe"
                    />
                    {validationErrors.name && (
                      <div className="apt-admin-field-error">{validationErrors.name}</div>
                    )}
                  </div>

                  <div className="apt-admin-field">
                    <label className="apt-admin-label">
                      Nombre Interno / Administración (Ej: Apto 1)
                    </label>
                    <input
                      type="text"
                      value={formData.internal_name || ''}
                      onChange={e => handleInputChange('internal_name', e.target.value)}
                      className="panel-input"
                      placeholder="Nombre para el calendario/dashboard"
                    />
                  </div>

                  <div className="apt-admin-field">
                    <label className="apt-admin-label">Name (EN)</label>
                    <input
                      type="text"
                      value={formData.name_en || ''}
                      onChange={e => handleInputChange('name_en', e.target.value)}
                      className="panel-input"
                    />
                  </div>

                  <div className="apt-admin-field">
                    <label className="apt-admin-label">
                      Slug (URL-safe){' '}
                      {validationErrors.slug && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.slug || ''}
                      onChange={e => handleInputChange('slug', e.target.value.toLowerCase())}
                      className={`panel-input font-mono${validationErrors.slug ? ' panel-input--error' : ''}`}
                      placeholder="ej: apartamento-deluxe"
                    />
                    {validationErrors.slug && (
                      <div className="apt-admin-field-error">{validationErrors.slug}</div>
                    )}
                  </div>

                  <div className="panel-form-grid-2 apt-admin-field">
                    <div>
                      <label className="apt-admin-label">Tagline (ES)</label>
                      <input
                        type="text"
                        value={formData.tagline || ''}
                        onChange={e => handleInputChange('tagline', e.target.value)}
                        className="panel-input"
                      />
                    </div>
                    <div>
                      <label className="apt-admin-label">Tagline (EN)</label>
                      <input
                        type="text"
                        value={formData.tagline_en || ''}
                        onChange={e => handleInputChange('tagline_en', e.target.value)}
                        className="panel-input"
                      />
                    </div>
                  </div>

                  <div className="panel-form-grid-3 apt-admin-field">
                    <div>
                      <label className="apt-admin-label">
                        Capacidad{' '}
                        {validationErrors.capacity && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="number"
                        value={formData.capacity || ''}
                        onChange={e => handleInputChange('capacity', parseInt(e.target.value))}
                        className={`panel-input${validationErrors.capacity ? ' panel-input--error' : ''}`}
                      />
                      {validationErrors.capacity && (
                        <div className="apt-admin-field-error">{validationErrors.capacity}</div>
                      )}
                    </div>
                    <div>
                      <label className="apt-admin-label">
                        Dormitorios{' '}
                        {validationErrors.bedrooms && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="number"
                        value={formData.bedrooms || ''}
                        onChange={e => handleInputChange('bedrooms', parseInt(e.target.value))}
                        className={`panel-input${validationErrors.bedrooms ? ' panel-input--error' : ''}`}
                      />
                      {validationErrors.bedrooms && (
                        <div className="apt-admin-field-error">{validationErrors.bedrooms}</div>
                      )}
                    </div>
                    <div>
                      <label className="apt-admin-label">
                        Baños{' '}
                        {validationErrors.bathrooms && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="number"
                        value={formData.bathrooms || ''}
                        onChange={e => handleInputChange('bathrooms', parseInt(e.target.value))}
                        className={`panel-input${validationErrors.bathrooms ? ' panel-input--error' : ''}`}
                      />
                      {validationErrors.bathrooms && (
                        <div className="apt-admin-field-error">{validationErrors.bathrooms}</div>
                      )}
                    </div>
                  </div>

                  <div className="panel-form-grid-3 apt-admin-field">
                    <div>
                      <label className="apt-admin-label">
                        Precio por noche{' '}
                        {validationErrors.price && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="number"
                        value={formData.price || ''}
                        onChange={e => handleInputChange('price', parseFloat(e.target.value))}
                        step="0.01"
                        className={`panel-input${validationErrors.price ? ' panel-input--error' : ''}`}
                      />
                      {validationErrors.price && (
                        <div className="apt-admin-field-error">{validationErrors.price}</div>
                      )}
                    </div>
                    <div>
                      <label className="apt-admin-label">Camas</label>
                      <input
                        type="number"
                        value={formData.beds || ''}
                        onChange={e => handleInputChange('beds', parseInt(e.target.value))}
                        className="panel-input"
                      />
                    </div>
                    <div>
                      <label className="apt-admin-label">Estancia mínima (noches)</label>
                      <input
                        type="number"
                        value={formData.min_stay || 1}
                        onChange={e => handleInputChange('min_stay', parseInt(e.target.value) || 1)}
                        className="panel-input"
                      />
                    </div>
                  </div>

                  <div className="panel-form-grid-3 apt-admin-field">
                    <div>
                      <label className="apt-admin-label">Color de identificación</label>
                      <div className="apt-admin-color-row">
                        <input
                          type="color"
                          value={formData.color || '#1a5f6e'}
                          onChange={e => handleInputChange('color', e.target.value)}
                          className="apt-admin-color-swatch"
                        />
                        <input
                          type="text"
                          value={formData.color || ''}
                          onChange={e => handleInputChange('color', e.target.value)}
                          className="panel-input font-mono flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="apt-admin-label">Días de cancelación gratis</label>
                      <input
                        type="number"
                        value={formData.cancellation_days ?? 14}
                        onChange={e =>
                          handleInputChange('cancellation_days', parseInt(e.target.value) || 0)
                        }
                        className="panel-input"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="apt-admin-label">% Depósito inicial</label>
                      <input
                        type="number"
                        value={formData.deposit_percentage ?? 50}
                        onChange={e =>
                          handleInputChange('deposit_percentage', parseInt(e.target.value) || 0)
                        }
                        className="panel-input"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="apt-admin-field">
                    <label className="apt-admin-label">Descripción (ES)</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={e => handleInputChange('description', e.target.value)}
                      className="panel-input resize-y min-h-[120px]"
                    />
                    <p className="apt-admin-hint">
                      Usa <strong>**texto**</strong> para poner en <strong>negrita</strong>
                    </p>
                  </div>

                  <div className="apt-admin-field">
                    <label className="apt-admin-label">Description (EN)</label>
                    <textarea
                      value={formData.description_en || ''}
                      onChange={e => handleInputChange('description_en', e.target.value)}
                      className="panel-input resize-y min-h-[120px]"
                    />
                  </div>
                </div>
              )}

              {/* TAB: NORMAS */}
              {activeTab === 'rules' && (
                <div className="apt-admin-panel">
                  <div className="apt-admin-panel-title">Normas de la casa</div>
                  <p className="apt-admin-panel-subtitle">
                    Estas normas se muestran en la página del apartamento.
                  </p>

                  <div className="flex gap-2 mb-6">
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
                      className="panel-input flex-1"
                    />
                    <button
                      onClick={() => {
                        if (!newRule.trim()) return;
                        handleInputChange('rules', [...(formData.rules || []), newRule.trim()]);
                        setNewRule('');
                      }}
                      className="panel-btn panel-btn-primary panel-btn-sm whitespace-nowrap"
                    >
                      + Añadir
                    </button>
                  </div>

                  {!formData.rules || formData.rules.length === 0 ? (
                    <div className="text-center py-10 text-sm panel-text-muted">
                      No hay normas definidas. Añade la primera.
                    </div>
                  ) : (
                    <ul className="apt-admin-rules-list">
                      {formData.rules.map((rule, i) => (
                        <li key={i} className="apt-admin-rule-item">
                          <span className="apt-admin-rule-num">{i + 1}.</span>
                          <span className="flex-1 text-sm panel-text-main">{rule}</span>
                          <button
                            onClick={() =>
                              handleInputChange(
                                'rules',
                                formData.rules.filter((_, idx) => idx !== i)
                              )
                            }
                            className="apt-admin-rule-del"
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex justify-end mt-7">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="panel-btn panel-btn-primary panel-btn-sm"
                    >
                      {saving ? 'Guardando…' : 'Guardar normas'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: FOTOS */}
              {activeTab === 'photos' && (
                <div className="apt-admin-panel">
                  <div className="apt-admin-panel-title">Gestionar Fotos</div>

                  <div className="apt-admin-upload-zone">
                    <div className="apt-admin-sublabel mb-3">Subir foto desde tu dispositivo</div>
                    <label
                      className={`apt-admin-upload-label${uploading ? ' apt-admin-upload-label--busy' : ''}`}
                    >
                      {uploading ? '⏳ Subiendo…' : '📁 Elegir imágenes'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="hidden"
                        disabled={uploading}
                        multiple
                        onChange={addPhotoFromFile}
                      />
                    </label>
                    <div className="apt-admin-hint mt-2">
                      JPG, PNG, WebP o AVIF · máx. 10 MB por foto · puedes seleccionar varias a la
                      vez
                    </div>
                  </div>

                  <div className="apt-admin-url-zone">
                    <div className="apt-admin-sublabel mb-2 text-xs">O pega una URL externa</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={unsplashUrl}
                        onChange={e => setUnsplashUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="panel-input flex-1"
                      />
                      <button
                        onClick={addPhoto}
                        className="panel-btn panel-btn-gold panel-btn-sm whitespace-nowrap"
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>

                  {photos.length === 0 ? (
                    <div className="text-center py-10 text-sm panel-text-muted">
                      No hay fotos aún. Agrega la primera foto.
                    </div>
                  ) : (
                    <div className="apt-admin-photo-grid">
                      {photos.map(photo => (
                        <div
                          key={photo.id}
                          className={`apt-admin-photo-item${photo.is_main ? ' apt-admin-photo-item--main' : ''}`}
                        >
                          <img src={photo.photo_url} alt="Foto" className="apt-admin-photo-img" />
                          {photo.is_main && <div className="apt-admin-photo-badge">PRINCIPAL</div>}
                          {photo.storage_path && (
                            <div className="apt-admin-photo-badge apt-admin-photo-badge--storage">
                              STORAGE
                            </div>
                          )}
                          <div className="apt-admin-photo-actions">
                            {!photo.is_main && (
                              <button
                                onClick={() => toggleFeaturedPhoto(photo.id)}
                                className="apt-admin-photo-btn-main"
                              >
                                ★ Principal
                              </button>
                            )}
                            <button
                              onClick={() => deletePhoto(photo.id)}
                              className="apt-admin-photo-btn-del"
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
                <div className="apt-admin-panel">
                  <div className="apt-admin-panel-title">Precios de Temporada</div>

                  <div className="apt-admin-season-form">
                    <div className="apt-admin-sublabel mb-3">Nueva Temporada</div>
                    <div className="apt-admin-season-grid">
                      <select
                        value={newSeasonData.type}
                        onChange={e => setNewSeasonData({ ...newSeasonData, type: e.target.value })}
                        className="panel-input"
                        aria-label="Tipo de temporada"
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
                        className="panel-input"
                      />
                      <input
                        type="date"
                        value={newSeasonData.start_date}
                        onChange={e =>
                          setNewSeasonData({ ...newSeasonData, start_date: e.target.value })
                        }
                        className="panel-input"
                      />
                      <input
                        type="date"
                        value={newSeasonData.end_date}
                        onChange={e =>
                          setNewSeasonData({ ...newSeasonData, end_date: e.target.value })
                        }
                        className="panel-input"
                      />
                    </div>
                    <button onClick={saveSeason} className="panel-btn panel-btn-gold panel-btn-sm">
                      + Agregar Temporada
                    </button>
                  </div>

                  {seasonPrices.length === 0 ? (
                    <div className="text-center py-10 text-sm panel-text-muted">
                      No hay temporadas configuradas
                    </div>
                  ) : (
                    <div className="apt-admin-season-table">
                      <div className="apt-admin-season-header">
                        <div>Tipo</div>
                        <div>Precio</div>
                        <div>Inicio</div>
                        <div>Fin</div>
                        <div>Acción</div>
                      </div>
                      {seasonPrices.map(season => {
                        const seasonType = seasonTypes.find(st => st.id === season.type);
                        return (
                          <div key={season.id} className="apt-admin-season-row">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="apt-admin-season-dot"
                                style={{ background: seasonType?.color }}
                              />
                              <span className="text-sm">{seasonType?.label}</span>
                            </div>
                            <div className="text-sm font-semibold panel-text-accent">
                              {season.price_per_night} €
                            </div>
                            <div className="text-sm">
                              {new Date(season.start_date).toLocaleDateString()}
                            </div>
                            <div className="text-sm">
                              {new Date(season.end_date).toLocaleDateString()}
                            </div>
                            <button
                              onClick={() => deleteSeaon(season.id)}
                              className="panel-btn panel-btn-danger panel-btn-sm"
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
                <div className="apt-admin-panel">
                  <div className="apt-admin-panel-title">Ubicación</div>
                  <p className="apt-admin-panel-subtitle">
                    Pega el enlace de Google Maps del apartamento. Aparecerá como botón en la página
                    del apartamento.
                  </p>

                  <div className="apt-admin-field">
                    <label className="apt-admin-label">Enlace Google Maps</label>
                    <input
                      type="url"
                      value={formData.maps_url || ''}
                      onChange={e => handleInputChange('maps_url', e.target.value)}
                      className="panel-input"
                      placeholder="https://maps.google.com/..."
                    />
                  </div>

                  {formData.maps_url ? (
                    <div className="apt-admin-maps-preview">
                      <div className="text-xs font-semibold panel-text-accent mb-2">
                        Vista previa del botón
                      </div>
                      <a
                        href={formData.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="apt-admin-maps-link"
                      >
                        <span className="text-xl">📍</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold">Ver ubicación en Google Maps</div>
                          <div className="text-[11px] panel-text-muted mt-0.5 break-all">
                            {formData.maps_url}
                          </div>
                        </div>
                        <span className="panel-text-accent text-base">→</span>
                      </a>
                    </div>
                  ) : (
                    <div className="apt-admin-maps-empty">📍 Sin enlace de Maps configurado</div>
                  )}
                </div>
              )}

              {/* TAB: COMODIDADES */}
              {activeTab === 'amenities' && (
                <div className="apt-admin-panel">
                  <div className="apt-admin-panel-title">Comodidades</div>
                  <p className="apt-admin-panel-subtitle">
                    Las comodidades activas se muestran en la página del apartamento.
                  </p>

                  <div className="apt-admin-sublabel">Activas</div>
                  <div className="apt-admin-chips">
                    {selectedAmenities.length === 0 && (
                      <span className="text-sm panel-text-muted italic">Ninguna seleccionada</span>
                    )}
                    {selectedAmenities.map(amenity => (
                      <span key={amenity} className="apt-admin-chip">
                        {amenity}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAmenities(selectedAmenities.filter(a => a !== amenity))
                          }
                          className="apt-admin-chip-del"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="apt-admin-sublabel">Predefinidas (clic para añadir)</div>
                  <div className="apt-admin-chips">
                    {DEFAULT_AMENITIES.filter(a => !selectedAmenities.includes(a)).map(amenity => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => setSelectedAmenities([...selectedAmenities, amenity])}
                        className="apt-admin-chip-add"
                      >
                        + {amenity}
                      </button>
                    ))}
                    {DEFAULT_AMENITIES.filter(a => !selectedAmenities.includes(a)).length === 0 && (
                      <span className="text-sm panel-text-muted italic">
                        Todas las predefinidas están activas
                      </span>
                    )}
                  </div>

                  <div className="apt-admin-sublabel">Añadir personalizada</div>
                  <div className="flex gap-2">
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
                      className="panel-input flex-1"
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
                      className="panel-btn panel-btn-primary panel-btn-sm"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: ESTADO */}
              {activeTab === 'state' && (
                <div className="apt-admin-panel">
                  <div className="apt-admin-panel-title">Estado</div>
                  <div className="apt-admin-state-box">
                    <div className="apt-admin-sublabel mb-3">Estado de publicación</div>
                    <label className="apt-admin-active-label">
                      <input
                        type="checkbox"
                        checked={formData.active || false}
                        onChange={e => handleInputChange('active', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="text-sm font-semibold panel-text-main">
                          Apartamento Activo
                        </div>
                        <div className="text-xs panel-text-muted mt-0.5">
                          {formData.active ? 'Visible en el sitio web' : 'Oculto en el sitio web'}
                        </div>
                      </div>
                    </label>
                    {formData.id && (
                      <div className="apt-admin-meta">
                        <div>
                          <strong>ID:</strong> {formData.id}
                        </div>
                        <div>
                          <strong>Creado:</strong>{' '}
                          {formData.created_at
                            ? new Date(formData.created_at).toLocaleDateString()
                            : '-'}
                        </div>
                        {formData.updated_at && (
                          <div>
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

        {/* FOOTER */}
        <div className="panel-sticky-footer">
          <button
            onClick={() => setEditing(null)}
            className="panel-btn panel-btn-ghost panel-btn-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="panel-btn panel-btn-primary panel-btn-sm"
          >
            {saving ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
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
    <div className="panel-page-content">
      <PanelPageHeader
        title="Apartamentos"
        subtitle={`${apartments.length} unidades · ${apartments.filter(a => a.active).length} activos`}
        actions={
          <button className="panel-btn panel-btn-primary panel-btn-sm" onClick={startCreate}>
            + Nuevo apartamento
          </button>
        }
      />
      <div>
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
          <div className="panel-card overflow-hidden !p-0">
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

                {/* Basic info */}
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

                {/* Minimum stay */}
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

      <PanelConfirm
        open={!!confirmDeleteApt}
        variant="destructive"
        title={`¿Eliminar "${confirmDeleteApt?.name}"?`}
        description="Esta acción no se puede deshacer y fallará si hay reservas, fotos o precios de temporada vinculados."
        confirmLabel="Eliminar"
        loading={saving}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDeleteApt(null)}
      />
    </div>
  );
}
