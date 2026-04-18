import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  /** destructive: botón rojo + icono de alerta */
  variant?: 'default' | 'destructive';
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function PanelConfirm({
  open,
  title,
  description,
  variant = 'default',
  confirmLabel,
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const defaultLabel = variant === 'destructive' ? 'Eliminar' : 'Confirmar';

  // Scroll lock + Escape + focus on confirm button
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => confirmRef.current?.focus(), 60);

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(3px)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-sm rounded-xl panel-animate-in"
        style={{
          background: 'var(--panel-surface)',
          border: '1px solid var(--panel-border)',
          boxShadow: 'var(--panel-shadow-lg)',
        }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? 'confirm-desc' : undefined}
      >
        {/* Body */}
        <div className="p-6">
          {variant === 'destructive' && (
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center mb-4 flex-shrink-0"
              style={{ background: 'rgba(220,38,38,.1)' }}
              aria-hidden
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          )}

          <h3 id="confirm-title" className="panel-h3 mb-1.5">
            {title}
          </h3>
          {description && (
            <p id="confirm-desc" className="panel-caption leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Acciones */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-surface-2)' }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="panel-btn panel-btn-ghost panel-btn-sm"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`panel-btn panel-btn-sm ${variant === 'destructive' ? 'panel-btn-danger' : 'panel-btn-primary'}`}
          >
            {loading ? 'Procesando…' : (confirmLabel ?? defaultLabel)}
          </button>
        </div>
      </div>
    </div>
  );
}
