import { ReactNode, useId } from 'react';

interface Props {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Si se omite, se genera un id automático */
  htmlFor?: string;
  children: ReactNode;
}

export default function FormField({ label, error, hint, required, htmlFor, children }: Props) {
  const autoId = useId();
  const id = htmlFor ?? autoId;

  // Clonar el hijo para inyectar el id si es un input/select/textarea sin id
  const child = (() => {
    if (!children) return children;
    const el = children as React.ReactElement<{ id?: string; 'aria-describedby'?: string }>;
    if (!el || typeof el !== 'object' || !('props' in el)) return children;
    const descId = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
    return React.cloneElement(el, {
      id: el.props.id ?? id,
      ...(descId ? { 'aria-describedby': descId } : {}),
    });
  })();

  return (
    <div className="panel-form-field">
      <label className="panel-form-field-label" htmlFor={id}>
        {label}
        {required && (
          <span className="required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>

      {child}

      {error && (
        <span id={`${id}-err`} className="panel-form-field-error" role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${id}-hint`} className="panel-form-field-hint">
          {hint}
        </span>
      )}
    </div>
  );
}

// Necesario para el React.cloneElement
import React from 'react';
