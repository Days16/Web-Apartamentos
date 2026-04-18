interface Props {
  saving?: boolean;
  disabled?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  /** Variante roja para acciones destructivas */
  destructive?: boolean;
  onCancel?: () => void;
  /** Si se omite, el botón actúa como type="submit" */
  onSubmit?: () => void;
  /** Slot extra a la izquierda (ej: botón "Eliminar") */
  extra?: React.ReactNode;
}

import React from 'react';

export default function FormActions({
  saving = false,
  disabled = false,
  submitLabel = 'Guardar cambios',
  cancelLabel = 'Cancelar',
  destructive = false,
  onCancel,
  onSubmit,
  extra,
}: Props) {
  return (
    <div className="panel-form-actions">
      {extra && <div className="mr-auto">{extra}</div>}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="panel-btn panel-btn-ghost panel-btn-sm"
        >
          {cancelLabel}
        </button>
      )}

      <button
        type={onSubmit ? 'button' : 'submit'}
        onClick={onSubmit}
        disabled={saving || disabled}
        className={`panel-btn panel-btn-sm ${destructive ? 'panel-btn-danger' : 'panel-btn-primary'}`}
      >
        {saving && (
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        )}
        {saving ? 'Guardando…' : submitLabel}
      </button>
    </div>
  );
}
