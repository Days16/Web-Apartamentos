import { supabase } from '../lib/supabase';

// ─── APARTAMENTOS ────────────────────────────────────────────────────────
export async function fetchApartments() {
  const { data, error } = await supabase
    .from('apartments')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) {
    console.error('Error fetching apartments:', error);
    return [];
  }
  return data;
}

export async function fetchApartmentBySlug(slug) {
  const { data, error } = await supabase
    .from('apartments')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching apartment:', error);
    return null;
  }
  return data;
}

export async function fetchAllApartments() {
  const { data, error } = await supabase
    .from('apartments')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching all apartments:', error);
    return [];
  }
  return data;
}

export async function fetchActiveOffers() {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Offers table might not exist yet:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching active offers', err);
    return [];
  }
}

export async function createApartment(apartment) {
  const { data, error } = await supabase
    .from('apartments')
    .insert([apartment]);

  if (error) throw error;
  return data;
}

export async function updateApartment(slug, updates) {
  const { data, error } = await supabase
    .from('apartments')
    .update(updates)
    .eq('slug', slug);

  if (error) throw error;
  return data;
}

export async function deleteApartment(slug) {
  const { data, error } = await supabase
    .from('apartments')
    .delete()
    .eq('slug', slug);

  if (error) throw error;
  return data;
}

// ─── PHOTOS ──────────────────────────────────────────────────────────────
const STORAGE_BUCKET = 'apartment-photos';

// Resuelve la URL pública de una foto (Storage o URL externa)
export function resolvePhotoUrl(photo) {
  if (photo?.storage_path) {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(photo.storage_path);
    return data.publicUrl;
  }
  return photo?.photo_url || null;
}

export async function fetchApartmentPhotos(slug) {
  const { data, error } = await supabase
    .from('apartment_photos')
    .select('*')
    .eq('apartment_slug', slug)
    .order('order_index');

  if (error) throw error;
  return (data || []).map(p => ({
    ...p,
    photo_url: resolvePhotoUrl(p),
  }));
}

// Sube un archivo al Storage de Supabase y devuelve { path, publicUrl }
export async function uploadPhotoToStorage(slug, file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${slug}/${safeName}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

// Elimina un archivo del Storage
export async function deletePhotoFromStorage(storagePath) {
  if (!storagePath) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
  if (error) console.warn('Error borrando del Storage:', error.message);
}

export async function addPhoto(slug, photo) {
  const { data, error } = await supabase
    .from('apartment_photos')
    .insert([{ apartment_slug: slug, ...photo }]);

  if (error) throw error;
  return data;
}

export async function deletePhoto(id, storagePath = null) {
  const { data, error } = await supabase
    .from('apartment_photos')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Eliminar también del Storage si tiene ruta
  if (storagePath) await deletePhotoFromStorage(storagePath);

  return data;
}

export async function updatePhoto(id, updates) {
  const { data, error } = await supabase
    .from('apartment_photos')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  return data;
}

// ─── SEASON PRICES ────────────────────────────────────────────────────────
export async function fetchSeasonPrices(slug) {
  const { data, error } = await supabase
    .from('season_prices')
    .select('*')
    .eq('apartment_slug', slug)
    .order('start_date');

  if (error) throw error;
  return data || [];
}

export async function addSeasonPrice(seasonPrice) {
  const { data, error } = await supabase
    .from('season_prices')
    .insert([seasonPrice]);

  if (error) throw error;
  return data;
}

export async function updateSeasonPrice(id, updates) {
  const { data, error } = await supabase
    .from('season_prices')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  return data;
}

export async function deleteSeasonPrice(id) {
  const { data, error } = await supabase
    .from('season_prices')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return data;
}

// ─── EXTRAS ──────────────────────────────────────────────────────────────
export async function fetchExtras() {
  const { data, error } = await supabase
    .from('extras')
    .select('*')
    .eq('active', true)
    .order('price');

  if (error) {
    console.error('Error fetching extras:', error);
    return [];
  }
  return data;
}

export async function fetchAllExtras() {
  const { data, error } = await supabase
    .from('extras')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createExtra(extra) {
  const { data, error } = await supabase
    .from('extras')
    .insert([extra]);

  if (error) throw error;
  return data;
}

export async function updateExtra(id, updates) {
  const { data, error } = await supabase
    .from('extras')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  return data;
}

export async function deleteExtra(id) {
  const { data, error } = await supabase
    .from('extras')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return data;
}

// ─── RESERVAS ────────────────────────────────────────────────────────────
export async function createReservation(reservation) {
  const { data, error } = await supabase
    .from('reservations')
    .insert([{
      ...reservation,
      created_at: new Date().toISOString(),
    }]);

  if (error) {
    console.error('Error creating reservation:', error);
    throw error;
  }
  return data;
}

export async function fetchReservationById(id) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching reservation:', error);
    return null;
  }
  return data;
}

export async function fetchAllReservations(status = null) {
  let query = supabase
    .from('reservations')
    .select('*');

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateReservation(id, updates) {
  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating reservation:', error);
    throw error;
  }
  return data;
}

// ─── MENSAJES ────────────────────────────────────────────────────────────
export async function createMessage(message) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{
      ...message,
      created_at: new Date().toISOString(),
    }]);

  if (error) throw error;
  return data;
}

export async function fetchAllMessages(status = null) {
  let query = supabase
    .from('messages')
    .select('*');

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateMessage(id, updates) {
  const { data, error } = await supabase
    .from('messages')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  return data;
}

export async function deleteMessage(id) {
  const { data, error } = await supabase
    .from('messages')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return data;
}

// ─── PÁGINAS ─────────────────────────────────────────────────────────────
export async function fetchPageBySlug(slug, lang = 'es') {
  const { data, error } = await supabase
    .from('site_pages')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchAllPages(lang = 'es') {
  const { data, error } = await supabase
    .from('site_pages')
    .select('*')
    .eq('active', true)
    .order('order_index');

  if (error) throw error;
  return data || [];
}

export async function updatePage(slug, updates) {
  const { data, error } = await supabase
    .from('site_pages')
    .update(updates)
    .eq('slug', slug);

  if (error) throw error;
  return data;
}

// ─── CONFIGURACIÓN ───────────────────────────────────────────────────────
export async function fetchSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value, type');

  if (error) {
    console.error('Error fetching settings:', error);
    return {};
  }

  const settings = {};
  data.forEach(row => {
    if (row.type === 'number') settings[row.key] = parseInt(row.value);
    else if (row.type === 'boolean') settings[row.key] = row.value === 'true';
    else settings[row.key] = row.value;
  });
  return settings;
}

export async function updateSetting(key, value, type = 'string') {
  const { data, error } = await supabase
    .from('site_settings')
    .upsert({ key, value: String(value), type }, { onConflict: 'key' })
    .select();

  if (error) {
    const errorMsg = `Error en updateSetting (${key}): [${error.code}] ${error.message}`;
    console.error(errorMsg, error);
    throw new Error(errorMsg);
  }
  return data;
}

// ─── MENSAJES DE CONTACTO ──────────────────────────────────────────────────
export async function submitContactMessage(message) {
  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        name: message.name,
        email: message.email,
        phone: message.phone || null,
        apartment_slug: message.apt || null,
        message: message.msg,
      }
    ]);

  if (error) throw error;
  return data;
}

// ─── REGLAS DE RESERVA (MIN STAY) ──────────────────────────────────────────
export async function fetchMinStayRules() {
  const { data, error } = await supabase
    .from('min_stay_rules')
    .select('*')
    .order('start_date');

  if (error) {
    console.error('Error fetching min stay rules:', error);
    return [];
  }
  return data || [];
}

export async function addMinStayRule(rule) {
  const { data, error } = await supabase
    .from('min_stay_rules')
    .insert([rule])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMinStayRule(id, updates) {
  const { data, error } = await supabase
    .from('min_stay_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMinStayRule(id) {
  const { error } = await supabase
    .from('min_stay_rules')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ─── CHANGELOG ─────────────────────────────────────────────────────────────
export async function fetchChangelog() {
  const { data, error } = await supabase
    .from('changelog')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching changelog:', error);
    return [];
  }
  return data || [];
}

export async function fetchWebsiteContent() {
  const { data, error } = await supabase
    .from('website_content')
    .select('section_key, content_es, content_en');
  if (error) {
    console.error('Error fetching website_content:', error);
    return [];
  }
  return data || [];
}

export async function updateWebsiteContent(key, fields) {
  const { error } = await supabase
    .from('website_content')
    .upsert({ section_key: key, ...fields }, { onConflict: 'section_key' });
  if (error) throw error;
}


