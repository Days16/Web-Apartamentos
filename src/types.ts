// ─────────────────────────────────────────────────────────────────────────────
// DATABASE TYPES (snake_case — raw Supabase response)
// ─────────────────────────────────────────────────────────────────────────────

export interface DbApartment {
  slug: string;
  name: string;
  name_en: string | null;
  tagline: string | null;
  tagline_en: string | null;
  description: string | null;
  description_en: string | null;
  capacity: number;
  bedrooms: number;
  baths: number;
  beds: number;
  price: number;
  extra_night: number;
  min_stay: number;
  cancellation_days: number;
  deposit_percentage: number;
  active: boolean;
  rating: number;
  review_count: number;
  color: string;
  maps_url: string | null;
  amenities: string[];
  rules: string[];
  nearby: string[];
  occupied_days: string[];
  internal_name: string | null;
  cover_photo_url: string | null;
  created_at: string;
}

export interface DbReservation {
  id: string;
  guest: string;
  apt: string;
  apt_slug: string;
  checkin: string; // 'YYYY-MM-DD'
  checkout: string; // 'YYYY-MM-DD'
  nights: number;
  total: number;
  deposit: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  source: 'web' | 'manual' | 'booking';
  cash_paid: boolean;
  email: string;
  phone: string | null;
  extras: string[];
  extras_total: number;
  created_at: string;
}

export interface DbExtra {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  created_at: string;
}

export interface DbApartmentPhoto {
  id: string;
  apartment_slug: string;
  photo_url: string;
  storage_path: string | null;
  order_index: number;
  is_main: boolean;
  caption: string | null;
  created_at: string;
}

export interface DbReview {
  id: string;
  apt: string;
  text: string;
  name: string;
  origin: string | null;
  stars: number;
  date: string | null;
  active: boolean;
  created_at: string;
}

export interface DbMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  apartment_slug: string | null;
  message: string;
  status: 'pending' | 'read' | 'replied';
  created_at: string;
}

export interface DbSeasonPrice {
  id: string;
  apartment_slug: string;
  start_date: string;
  end_date: string;
  price: number;
  type: string | null;
}

export interface DbMinStayRule {
  id: string;
  apartment_slug: string;
  start_date: string;
  end_date: string;
  min_nights: number;
}

export interface DbFaq {
  id: string;
  question: string;
  question_en: string | null;
  question_fr: string | null;
  question_de: string | null;
  question_pt: string | null;
  answer: string;
  answer_en: string | null;
  answer_fr: string | null;
  answer_de: string | null;
  answer_pt: string | null;
  display_order: number;
  active: boolean;
  created_at: string;
}

export interface DbSetting {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
}

export interface DbAuditLog {
  id: string;
  user_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZED TYPES FOR REACT (camelCase — from dataService.ts)
// ─────────────────────────────────────────────────────────────────────────────

export interface Apartment {
  slug: string;
  name: string;
  nameEn: string | null;
  tagline: string | null;
  taglineEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  /** capacity field in DB */
  cap: number;
  bedrooms: number;
  baths: number;
  beds: number;
  price: number;
  extraNight: number;
  minStay: number;
  cancellation_days: number;
  deposit_percentage: number;
  active: boolean;
  rating: number;
  reviewCount: number;
  color: string;
  gradient: string;
  maps_url: string | null;
  amenities: string[];
  rules: string[];
  nearby: string[];
  occupiedDays: string[];
  /** ISO dates derived from active reservations, generated in ApartmentDetail */
  internalName: string | null;
  coverPhotoUrl: string | null;
  occupiedDatesList?: string[];
  /** Raw apartment reservations, used by BookingWidget */
  rawReservations?: Reservation[];
  /** Apartment minimum stay rules */
  minStayRules?: DbMinStayRule[];
}

export interface Reservation {
  id: string;
  guest: string;
  apt: string;
  aptSlug: string;
  checkin: string;
  checkout: string;
  nights: number;
  total: number;
  deposit: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  source: 'web' | 'manual' | 'booking';
  cashPaid: boolean;
  email: string;
  phone: string | null;
  extras: string[];
  extrasTotal: number;
  created_at?: string;
}

export interface Extra {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  name_ES?: string;
  name_EN?: string;
  name_FR?: string;
  name_DE?: string;
  name_PT?: string;
  description_ES?: string;
  description_EN?: string;
  description_FR?: string;
  description_DE?: string;
  description_PT?: string;
}

export interface ApartmentPhoto {
  id: string;
  apartmentSlug: string;
  photoUrl: string;
  storagePath: string | null;
  orderIndex: number;
  isMain: boolean;
  caption: string | null;
}

export interface Review {
  id: string;
  apt: string;
  text: string;
  name: string;
  origin: string | null;
  stars: number;
  date: string | null;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  apartmentSlug: string | null;
  message: string;
  status: 'pending' | 'read' | 'replied';
  created_at: string;
}

export interface SiteSettings {
  tax_percentage: number;
  payment_deposit_percentage: number;
  cancellation_days: number;
  booking_mode: 'modal' | 'redirect';
  maintenance_mode: boolean;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type Lang = 'ES' | 'EN' | 'FR' | 'DE' | 'PT';

export type BookingStatus = Reservation['status'];
export type ReservationSource = Reservation['source'];
export type MessageStatus = Message['status'];

/** Contact form data from BookingModal step 2 */
export interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  phonePrefix: string;
}

/** Price breakdown computed in BookingWidget / BookingModal */
export interface PriceBreakdown {
  nights: number;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  extra: number;
  taxes: number;
  total: number;
  deposit: number;
}
