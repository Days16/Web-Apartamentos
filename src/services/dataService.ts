/**
 * Data layer — uses Supabase if configured, fallback to mockData
 * To enable Supabase: ensure tables are created (SQL in supabase.js)
 */
import { supabase } from '../lib/supabase';
import type { Apartment, Reservation } from '../types';

// ─── APARTMENTS ─────────────────────────────────────────────────────────────
export async function getApartments(): Promise<Apartment[]> {
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

export async function getApartmentBySlug(slug: string): Promise<Apartment | null> {
  try {
    const { data, error } = await supabase.from('apartments').select('*').eq('slug', slug).single();
    if (error || !data) return null;
    return normalizeApartment(data);
  } catch {
    return null;
  }
}

export async function deleteApartment(slug: string): Promise<boolean> {
  const { error } = await supabase.from('apartments').delete().eq('slug', slug);
  if (error) throw error;
  return true;
}

// ─── RESERVATIONS ─────────────────────────────────────────────────────────────────
export async function getReservations(): Promise<Reservation[]> {
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

export async function getReservationById(id: string): Promise<Reservation | null> {
  try {
    const { data, error } = await supabase.from('reservations').select('*').eq('id', id).single();
    if (error || !data) return null;
    return normalizeReservation(data);
  } catch {
    return null;
  }
}

export async function createReservation(
  reservation: Omit<Reservation, 'created_at'>
): Promise<Reservation> {
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      id: reservation.id,
      guest: reservation.guest,
      apt: reservation.apt || '',
      apt_slug: reservation.aptSlug,
      checkin: reservation.checkin,
      checkout: reservation.checkout,
      nights: reservation.nights,
      total: reservation.total,
      deposit: reservation.deposit,
      status: reservation.status || 'pending',
      source: reservation.source || 'web',
      cash_paid: reservation.cashPaid || false,
      email: reservation.email || '',
      phone: reservation.phone || '',
      extras: reservation.extras || [],
    })
    .select()
    .single();

  if (error) throw error;
  return normalizeReservation(data);
}

export async function updateReservationStatus(
  id: string,
  status: Reservation['status']
): Promise<boolean> {
  try {
    const { error } = await supabase.from('reservations').update({ status }).eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

export async function markCashPaid(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('reservations').update({ fully_paid: true }).eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

export async function confirmAndMarkPaid(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({
        status: 'confirmed',
        fully_paid: true,
      })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

export async function deleteReservation(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('reservations').delete().eq('id', id);
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

export async function upsertExtra(extra: Record<string, unknown>) {
  const isNew = !extra.id;
  const payload = isNew ? { ...extra, id: crypto.randomUUID() } : extra;
  const { data, error } = await supabase.from('extras').upsert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteExtra(id: string): Promise<boolean> {
  const { error } = await supabase.from('extras').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ─── REVIEWS ─────────────────────────────────────────────────────────────────
export async function getReviews(aptSlug: string | null = null) {
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

// ─── FIELD NORMALIZATION (snake_case Supabase → camelCase React) ─────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeApartment(d: any): Apartment {
  return {
    slug: d.slug,
    name: d.name,
    nameEn: d.name_en || d.nameEn || d.name,
    tagline: d.tagline,
    taglineEn: d.tagline_en || d.taglineEn || d.tagline,
    cap: d.capacity ?? d.cap ?? 2,
    bedrooms: d.bedrooms ?? d.beds ?? 1,
    beds: d.beds ?? d.bedrooms ?? 1,
    baths: d.baths ?? 1,
    price: d.price,
    rating: d.rating,
    reviewCount: d.review_count ?? d.reviewCount ?? 0,
    minStay: d.min_stay ?? d.minStay ?? 2,
    active: d.active ?? true,
    color: d.color || '#1a5f6e',
    gradient:
      d.gradient ||
      (d.color
        ? `linear-gradient(135deg, ${d.color} 0%, #2C4A5E 100%)`
        : 'linear-gradient(135deg, #1a3a4e 0%, #2C4A5E 100%)'),
    amenities: d.amenities || [],
    description: d.description || '',
    descriptionEn: d.description_en || d.descriptionEn || d.description || '',
    rules: d.rules || [],
    nearby: d.nearby || [],
    occupiedDays: d.occupied_days ?? d.occupiedDays ?? [],
    extraNight: d.extra_night ?? d.extraNight ?? 0,
    cancellation_days: d.cancellation_days ?? 14,
    deposit_percentage: d.deposit_percentage ?? 50,
    maps_url: d.maps_url || null,
    internalName: d.internal_name || d.internalName || d.name,
    coverPhotoUrl: d.cover_photo_url || d.coverPhotoUrl || null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeReservation(d: any): Reservation {
  return {
    id: d.id,
    guest: d.guest ?? '',
    apt: d.apt ?? d.apt_slug ?? '',
    aptSlug: d.apt_slug ?? '',
    checkin: d.checkin,
    checkout: d.checkout,
    nights: d.nights,
    total: d.total,
    deposit: d.deposit,
    status: d.status,
    source: d.source ?? 'web',
    cashPaid: d.cash_paid ?? false,
    email: d.email ?? '',
    phone: d.phone ?? '',
    extras: d.extras || [],
    extrasTotal: d.extras_total ?? 0,
  };
}
