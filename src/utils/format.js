const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * "2026-07-12" → "12 de julio de 2026"
 */
export function formatDateLong(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} de ${MESES_ES[m - 1]} de ${y}`;
}

/**
 * "2026-07-12" → "12 jul 2026"
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MESES_CORTO[m - 1]} ${y}`;
}

/**
 * "2026-07-12" → "12/07/2026"
 */
export function formatDateNumeric(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Date object → "2026-07-12" (value para input type="date")
 */
export function toInputDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return dateToStr(d);
}

/**
 * "2026-07-12" → Date object (sin problemas de zona horaria)
 */
export function strToDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Date object → "2026-07-12"
 */
export function dateToStr(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * "2026-07-12" → "julio 2026"
 */
export function formatMonthYear(dateStr) {
  if (!dateStr) return '';
  const [y, m] = dateStr.split('-').map(Number);
  return `${MESES_ES[m - 1]} ${y}`;
}

/**
 * Número de días entre dos fechas ISO
 */
export function diffDays(from, to) {
  if (!from || !to) return 0;
  const diff = (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24);
  return diff > 0 ? Math.round(diff) : 0;
}

export function formatPrice(price) {
  if (price === undefined || price === null) return '';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

export const MESES = MESES_ES;
