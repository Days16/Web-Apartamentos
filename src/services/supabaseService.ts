import { supabase } from '../lib/supabase';
import type {
  DbApartment,
  DbApartmentPhoto,
  DbSeasonPrice,
  DbMinStayRule,
  DbExtra,
  DbReservation,
  DbFaq,
} from '../types';

// ─── APARTAMENTOS ────────────────────────────────────────────────────────
export async function fetchApartments(): Promise<DbApartment[]> {
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

export async function fetchApartmentBySlug(slug: string): Promise<DbApartment | null> {
  const { data, error } = await supabase.from('apartments').select('*').eq('slug', slug).single();

  if (error) {
    console.error('Error fetching apartment:', error);
    return null;
  }
  return data;
}

export async function fetchAllApartments(): Promise<DbApartment[]> {
  const { data, error } = await supabase.from('apartments').select('*').order('name');

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
      console.warn('Offers table might not exist yet:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching active offers', err);
    return [];
  }
}

export async function createApartment(apartment: Partial<DbApartment>) {
  const { data, error } = await supabase.from('apartments').insert([apartment]);

  if (error) throw error;
  return data;
}

export async function updateApartment(slug: string, updates: Partial<DbApartment>) {
  const { data, error } = await supabase.from('apartments').update(updates).eq('slug', slug);

  if (error) throw error;
  return data;
}

export async function deleteApartment(slug: string) {
  const { data, error } = await supabase.from('apartments').delete().eq('slug', slug);

  if (error) throw error;
  return data;
}

// ─── PHOTOS ──────────────────────────────────────────────────────────────
const STORAGE_BUCKET = 'apartment-photos';

// Resuelve la URL pública de una foto (Storage o URL externa)
export function resolvePhotoUrl(photo: Partial<DbApartmentPhoto> | null): string | null {
  if (photo?.storage_path) {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(photo.storage_path);
    return data.publicUrl;
  }
  return photo?.photo_url || null;
}

export async function fetchApartmentPhotos(slug: string): Promise<DbApartmentPhoto[]> {
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
export async function uploadPhotoToStorage(
  slug: string,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
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
export async function deletePhotoFromStorage(storagePath: string | null): Promise<void> {
  if (!storagePath) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
  if (error) console.warn('Error borrando del Storage:', error.message);
}

export async function addPhoto(slug: string, photo: Partial<DbApartmentPhoto>) {
  const { data, error } = await supabase
    .from('apartment_photos')
    .insert([{ apartment_slug: slug, ...photo }]);

  if (error) throw error;
  return data;
}

export async function deletePhoto(id: string, storagePath: string | null = null) {
  const { data, error } = await supabase.from('apartment_photos').delete().eq('id', id);

  if (error) throw error;

  // Eliminar también del Storage si tiene ruta
  if (storagePath) await deletePhotoFromStorage(storagePath);

  return data;
}

export async function updatePhoto(id: string, updates: Partial<DbApartmentPhoto>) {
  const { data, error } = await supabase.from('apartment_photos').update(updates).eq('id', id);

  if (error) throw error;
  return data;
}

// ─── SEASON PRICES ────────────────────────────────────────────────────────
export async function fetchSeasonPrices(slug: string): Promise<DbSeasonPrice[]> {
  const { data, error } = await supabase
    .from('season_prices')
    .select('*')
    .eq('apartment_slug', slug)
    .order('start_date');

  if (error) throw error;
  return data || [];
}

export async function addSeasonPrice(seasonPrice: Omit<DbSeasonPrice, 'id'>) {
  const { data, error } = await supabase.from('season_prices').insert([seasonPrice]);

  if (error) throw error;
  return data;
}

export async function updateSeasonPrice(id: string, updates: Partial<DbSeasonPrice>) {
  const { data, error } = await supabase.from('season_prices').update(updates).eq('id', id);

  if (error) throw error;
  return data;
}

export async function deleteSeasonPrice(id: string) {
  const { data, error } = await supabase.from('season_prices').delete().eq('id', id);

  if (error) throw error;
  return data;
}

// ─── EXTRAS ──────────────────────────────────────────────────────────────
export async function fetchExtras(): Promise<DbExtra[]> {
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

export async function fetchAllExtras(): Promise<DbExtra[]> {
  const { data, error } = await supabase.from('extras').select('*').order('name');

  if (error) throw error;
  return data || [];
}

export async function createExtra(extra: Omit<DbExtra, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('extras').insert([extra]);

  if (error) throw error;
  return data;
}

export async function updateExtra(id: string, updates: Partial<DbExtra>) {
  const { data, error } = await supabase.from('extras').update(updates).eq('id', id);

  if (error) throw error;
  return data;
}

export async function deleteExtra(id: string) {
  const { data, error } = await supabase.from('extras').delete().eq('id', id);

  if (error) throw error;
  return data;
}

// ─── RESERVAS ────────────────────────────────────────────────────────────
export async function createReservation(reservation: Partial<DbReservation>) {
  const { data, error } = await supabase.from('reservations').insert([
    {
      ...reservation,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error('Error creating reservation:', error);
    throw error;
  }
  return data;
}

export async function fetchReservationById(id: string): Promise<DbReservation | null> {
  const { data, error } = await supabase.from('reservations').select('*').eq('id', id).single();

  if (error) {
    console.error('Error fetching reservation:', error);
    return null;
  }
  return data;
}

export async function fetchAllReservations(status: string | null = null): Promise<DbReservation[]> {
  let query = supabase.from('reservations').select('*');

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateReservation(id: string, updates: Partial<DbReservation>) {
  const { data, error } = await supabase.from('reservations').update(updates).eq('id', id);

  if (error) {
    console.error('Error updating reservation:', error);
    throw error;
  }
  return data;
}

// ─── MENSAJES ────────────────────────────────────────────────────────────
export async function createMessage(message: Record<string, unknown>) {
  const { data, error } = await supabase.from('messages').insert([
    {
      ...message,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) throw error;
  return data;
}

export async function fetchAllMessages(status: string | null = null) {
  let query = supabase.from('messages').select('*');

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateMessage(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.from('messages').update(updates).eq('id', id);

  if (error) throw error;
  return data;
}

export async function deleteMessage(id: string) {
  const { data, error } = await supabase.from('messages').delete().eq('id', id);

  if (error) throw error;
  return data;
}

// ─── PÁGINAS ─────────────────────────────────────────────────────────────
export async function fetchPageBySlug(slug: string, _lang = 'es') {
  const { data, error } = await supabase
    .from('site_pages')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchAllPages(_lang = 'es') {
  const { data, error } = await supabase
    .from('site_pages')
    .select('*')
    .eq('active', true)
    .order('order_index');

  if (error) throw error;
  return data || [];
}

export async function updatePage(slug: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.from('site_pages').update(updates).eq('slug', slug);

  if (error) throw error;
  return data;
}

// ─── CONFIGURACIÓN ───────────────────────────────────────────────────────
export async function fetchSettings(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from('site_settings').select('key, value, type');

  if (error) {
    console.error('Error fetching settings:', error);
    return {};
  }

  const settings: Record<string, unknown> = {};
  data.forEach(row => {
    if (row.type === 'number') settings[row.key] = parseInt(row.value);
    else if (row.type === 'boolean') settings[row.key] = row.value === 'true';
    else settings[row.key] = row.value;
  });
  return settings;
}

export async function updateSetting(
  key: string,
  value: string | number | boolean,
  type = 'string'
) {
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
export async function submitContactMessage(message: {
  name: string;
  email: string;
  phone?: string;
  apt?: string;
  msg: string;
}) {
  const { data, error } = await supabase.from('messages').insert([
    {
      name: message.name,
      email: message.email,
      phone: message.phone || null,
      apartment_slug: message.apt || null,
      message: message.msg,
    },
  ]);

  if (error) throw error;
  return data;
}

// ─── REGLAS DE RESERVA (MIN STAY) ──────────────────────────────────────────
export async function fetchMinStayRules() {
  const { data, error } = await supabase.from('min_stay_rules').select('*').order('start_date');

  if (error) {
    console.error('Error fetching min stay rules:', error);
    return [];
  }
  return data || [];
}

export async function addMinStayRule(rule: Omit<DbMinStayRule, 'id'>): Promise<DbMinStayRule> {
  const { data, error } = await supabase.from('min_stay_rules').insert([rule]).select().single();

  if (error) throw error;
  return data;
}

export async function updateMinStayRule(
  id: string,
  updates: Partial<DbMinStayRule>
): Promise<DbMinStayRule> {
  const { data, error } = await supabase
    .from('min_stay_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMinStayRule(id: string): Promise<boolean> {
  const { error } = await supabase.from('min_stay_rules').delete().eq('id', id);

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

export async function updateWebsiteContent(key: string, fields: Record<string, unknown>) {
  const { error } = await supabase
    .from('website_content')
    .upsert({ section_key: key, ...fields }, { onConflict: 'section_key' });
  if (error) throw error;
}

// ─── FAQS ────────────────────────────────────────────────────────────────────

type DeeplUiLang = 'EN' | 'FR' | 'DE' | 'PT';

export async function autoTranslateFromBase(
  text: string,
  sourceLang: 'ES' | 'EN',
  targets: DeeplUiLang[]
): Promise<Partial<Record<DeeplUiLang, string>>> {
  if (!targets.length) return {};
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const { data, error } = await supabase.functions.invoke('auto-translate', {
    body: { text, sourceLang, targets },
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
    },
  });
  if (error) throw new Error(error.message);
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: string }).error));
  }
  return (data || {}) as Partial<Record<DeeplUiLang, string>>;
}

export async function fetchFaqs(onlyActive = true): Promise<DbFaq[]> {
  let q = supabase.from('faqs').select('*').order('display_order', { ascending: true });
  if (onlyActive) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createFaq(faq: Omit<DbFaq, 'id' | 'created_at'>): Promise<DbFaq> {
  const { data, error } = await supabase.from('faqs').insert(faq).select().single();
  if (error) throw error;
  return data;
}

export async function updateFaq(id: string, updates: Partial<DbFaq>): Promise<void> {
  const { error } = await supabase.from('faqs').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteFaq(id: string): Promise<void> {
  const { error } = await supabase.from('faqs').delete().eq('id', id);
  if (error) throw error;
}

// ─── AUDITORÍA ───────────────────────────────────────────────────────────────

export async function logAudit(
  action: string,
  entity: string,
  entityId: string | number | null,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from('audit_log').insert({
      user_email: user?.email ?? null,
      action,
      entity,
      entity_id: entityId ? String(entityId) : null,
      details,
    });
  } catch {
    // Fallo silencioso — el audit log no debe interrumpir operaciones
  }
}
