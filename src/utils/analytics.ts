/**
 * Wrapper sobre Plausible Analytics.
 * Si Plausible no está cargado (dev, bloqueador, etc.) la llamada es silenciosa.
 *
 * Para activar: añadir en index.html el script de Plausible con el dominio correcto.
 * Eventos clave: apartment_view, booking_start, booking_complete, search
 */
declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, unknown> }) => void;
  }
}

export function trackEvent(name: string, props: Record<string, unknown> = {}): void {
  if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
    window.plausible(name, { props });
  }
}

export const EVENTS = {
  APARTMENT_VIEW: 'apartment_view',
  BOOKING_START: 'booking_start',
  BOOKING_COMPLETE: 'booking_complete',
  SEARCH: 'search',
  CONTACT_SUBMIT: 'contact_submit',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
