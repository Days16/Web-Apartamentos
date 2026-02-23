/**
 * Capa de datos — usa Supabase si está configurado, fallback a mockData
 * Para activar Supabase: asegúrate de tener las tablas creadas (SQL en supabase.js)
 */
import { supabase } from '../lib/supabase';

// ─── APARTAMENTOS ─────────────────────────────────────────────────────────────
export async function getApartments() {
  try {
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      console.error('ERROR Supabase getApartments:', error);
      return [];
    }
    if (!data || data.length === 0) return [];
    return data.map(normalizeApartment);
  } catch (err) {
    console.error('CATCH getApartments:', err);
    return [];
  }
}

export async function getApartmentBySlug(slug) {
  try {
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error || !data) return null;
    return normalizeApartment(data);
  } catch {
    return null;
  }
}

export async function deleteApartment(slug) {
  const { error } = await supabase
    .from('apartments')
    .delete()
    .eq('slug', slug);
  if (error) throw error;
  return true;
}

// ─── RESERVAS ─────────────────────────────────────────────────────────────────
export async function getReservations() {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('ERROR Supabase getReservations:', error);
      return [];
    }
    if (!data || data.length === 0) return [];
    return data.map(normalizeReservation);
  } catch (err) {
    console.error('CATCH getReservations:', err);
    return [];
  }
}

export async function getReservationById(id) {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return normalizeReservation(data);
  } catch {
    return null;
  }
}

export async function createReservation(reservation) {
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      id: reservation.id,
      guest_name: reservation.guest,
      apartment_slug: reservation.aptSlug,
      check_in: reservation.checkin,
      check_out: reservation.checkout,
      nights: reservation.nights,
      total_price: reservation.total,
      deposit_paid: reservation.deposit,
      status: reservation.status || 'pending',
      source: reservation.source || 'web',
      fully_paid: reservation.cashPaid || false,
      guest_email: reservation.email || 'info@illapancha.com',
      guest_phone: reservation.phone || '',
      extras: reservation.extras || [],
    })
    .select()
    .single();

  if (error) throw error;
  return normalizeReservation(data);
}

export async function updateReservationStatus(id, status) {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

export async function markCashPaid(id) {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({ fully_paid: true })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}


export async function confirmAndMarkPaid(id) {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({
        status: 'confirmed',
        fully_paid: true
      })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

export async function deleteReservation(id) {
  try {
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

// ─── EXTRAS ──────────────────────────────────────────────────────────────────
export async function getExtras() {
  try {
    const { data, error } = await supabase
      .from('extras')
      .select('*')
      .order('price', { ascending: true });
    if (error || !data || data.length === 0) return [];
    return data;
  } catch {
    return [];
  }
}

export async function upsertExtra(extra) {
  const { data, error } = await supabase
    .from('extras')
    .upsert(extra)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExtra(id) {
  const { error } = await supabase.from('extras').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ─── RESEÑAS ─────────────────────────────────────────────────────────────────
export async function getReviews(aptSlug = null) {
  try {
    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (aptSlug) query = query.eq('apt', aptSlug);
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return [];
    }
    return data;
  } catch {
    return [];
  }
}

// ─── NORMALIZACIÓN DE CAMPOS (snake_case Supabase → camelCase React) ─────────
function normalizeApartment(d) {
  return {
    slug: d.slug,
    name: d.name,
    nameEn: d.name_en || d.nameEn || d.name,
    tagline: d.tagline,
    taglineEn: d.tagline_en || d.taglineEn || d.tagline,
    cap: d.capacity ?? d.cap ?? 2,
    beds: d.beds,
    baths: d.baths,
    price: d.price,
    rating: d.rating,
    reviewCount: d.review_count ?? d.reviewCount ?? 0,
    minStay: d.min_stay ?? d.minStay ?? 2,
    active: d.active ?? true,
    gradient: d.gradient || 'linear-gradient(135deg, #1a3a4e 0%, #2C4A5E 100%)',
    amenities: d.amenities || [],
    description: d.description || '',
    descriptionEn: d.description_en || d.descriptionEn || d.description || '',
    rules: d.rules || [],
    nearby: d.nearby || [],
    occupiedDays: d.occupied_days ?? d.occupiedDays ?? [],
    extraNight: d.extra_night ?? d.extraNight ?? 0,
    cancellation_days: d.cancellation_days ?? 14,
    deposit_percentage: d.deposit_percentage ?? 50,
  };
}

export function normalizeReservation(d) {
  return {
    id: d.id,
    guest: d.guest_name ?? d.guest ?? '',
    apt: d.apartment_slug ?? d.apt_slug ?? d.aptSlug ?? d.apt ?? '',
    aptSlug: d.apartment_slug ?? d.apt_slug ?? d.aptSlug ?? '',
    checkin: d.check_in ?? d.checkin,
    checkout: d.check_out ?? d.checkout,
    nights: d.nights,
    total: d.total_price ?? d.total,
    deposit: d.deposit_paid ?? d.deposit,
    status: d.status,
    source: d.source ?? 'web',
    cashPaid: d.fully_paid ?? d.cash_paid ?? d.cashPaid ?? false,
    email: d.guest_email ?? d.email ?? '',
    phone: d.guest_phone ?? d.phone ?? '',
    extras: d.extras || [],
    extrasTotal: d.extras_total ?? d.extrasTotal ?? 0,
  };
}
