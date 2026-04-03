const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const MESES_CORTO = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/**
 * "2026-07-12" → "12 de julio de 2026"
 */
export function formatDateLong(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} de ${MESES_ES[m - 1]} de ${y}`;
}

/**
 * "2026-07-12" → "12 jul 2026"
 */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MESES_CORTO[m - 1]} ${y}`;
}

/**
 * "2026-07-12" → "12/07/2026"
 */
export function formatDateNumeric(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Date object → "2026-07-12" (value para input type="date")
 */
export function toInputDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return dateToStr(d);
}

/**
 * "2026-07-12" → Date object medianoche local (evita desfase de zona horaria en el datepicker)
 */
export function strToDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  return new Date(str + 'T00:00:00');
}

/**
 * Date object → "2026-07-12" (usa métodos locales; funciona con fechas locales o UTC midnight en UTC+)
 */
export function dateToStr(date: Date | null | undefined): string {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * "2026-07-12" → "julio 2026"
 */
export function formatMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const [y, m] = dateStr.split('-').map(Number);
  return `${MESES_ES[m - 1]} ${y}`;
}

/**
 * Número de días entre dos fechas ISO
 */
export function diffDays(from: string | null | undefined, to: string | null | undefined): number {
  if (!from || !to) return 0;
  const diff = (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24);
  return diff > 0 ? Math.round(diff) : 0;
}

export function formatPrice(price: number | null | undefined): string {
  if (price === undefined || price === null) return '';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

const BOOKING_GUEST_LABEL = 'Reserva Booking';

function isBookingGuestPlaceholder(name: string): boolean {
  const n = name.trim();
  if (!n) return true;
  const lower = n.toLowerCase();
  if (lower.includes('not available')) return true;
  if (lower.includes('no disponible')) return true;
  if (/\bclosed\b/i.test(n) && (/\bhuésped\b/i.test(n) || /\bhuesped\b/i.test(n) || /\bguest\b/i.test(n))) {
    return true;
  }
  if (/^closed\b/i.test(n)) return true;
  if (/^huésped$/i.test(n) || /^huesped$/i.test(n) || /^guest$/i.test(n)) return true;
  return false;
}

/** Nombre a mostrar: en Booking oculta placeholders del iCal (p. ej. CLOSED - Not available). */
export function formatGuestDisplay(
  guest: string | null | undefined,
  source: string | null | undefined,
): string {
  const g = (guest ?? '').trim();
  if (source !== 'booking') return g || 'Sin nombre';
  if (!g || isBookingGuestPlaceholder(g)) return BOOKING_GUEST_LABEL;
  return g;
}

const WEB_REF_REGEX = /^IP-\d{6}$/;
const UUID_REF_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuidToWebStyleRef(uuid: string): string {
  const clean = uuid.replace(/-/g, '');
  let h = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    h ^= clean.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = (Math.abs(h) % 900000) + 100000;
  return `IP-${n}`;
}

/**
 * Reservas Booking importadas con id UUID: muestra referencia tipo web (IP-XXXXXX).
 * Los enlaces y la API siguen usando el id real.
 */
export function formatReservationReference(
  id: string | null | undefined,
  source: string | null | undefined,
): string {
  const raw = (id ?? '').trim();
  if (!raw) return '';
  if (source !== 'booking') return raw;
  if (WEB_REF_REGEX.test(raw)) return raw;
  if (UUID_REF_REGEX.test(raw)) return uuidToWebStyleRef(raw);
  return raw;
}

export const MESES = MESES_ES;

/**
 * Meta description ~158 caracteres: recorta en el último espacio para no cortar palabras.
 */
export function truncateMetaDescription(text: string | null | undefined, max = 158): string {
  if (!text?.trim()) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > 70 ? slice.slice(0, lastSpace) : slice;
  return base.replace(/[.,;:\s]+$/g, '').trim() + '…';
}
