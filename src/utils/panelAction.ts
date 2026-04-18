/**
 * Wrapper para acciones async del panel.
 * Muestra un toast de éxito/error y devuelve { ok, error }.
 *
 * Uso:
 *   const { ok } = await panelAction(
 *     () => supabase.from('apartments').update(data).eq('id', id),
 *     { success: 'Apartamento guardado', error: 'No se pudo guardar' }
 *   );
 */

type ToastFn = (msg: string, type: 'success' | 'error') => void;

let _toast: ToastFn | null = null;

/** Registrar la función de toast desde el contexto de la app */
export function registerPanelToast(fn: ToastFn) {
  _toast = fn;
}

function showToast(msg: string, type: 'success' | 'error') {
  if (_toast) {
    _toast(msg, type);
    return;
  }
  // Fallback: native panel toast if no function registered
  const el = document.createElement('div');
  el.className = `panel-toast panel-toast-${type}`;
  el.textContent = msg;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

interface PanelActionOptions {
  success?: string;
  error?: string;
  /** Si es true, no muestra toast de error (el componente lo maneja) */
  silentError?: boolean;
}

interface PanelActionResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

export async function panelAction<T>(
  action: () => Promise<T>,
  options: PanelActionOptions = {}
): Promise<PanelActionResult<T>> {
  const { success, error: errorMsg = 'Ha ocurrido un error', silentError = false } = options;
  try {
    const data = await action();
    if (success) showToast(success, 'success');
    return { ok: true, data, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : errorMsg;
    if (!silentError) showToast(msg, 'error');
    return { ok: false, data: null, error: msg };
  }
}
