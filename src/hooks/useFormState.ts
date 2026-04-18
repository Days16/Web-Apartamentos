import { useState, useCallback } from 'react';

type Validator<T> = (values: T) => Partial<Record<keyof T, string>>;

interface UseFormStateOptions<T extends object> {
  initialValues: T;
  validate?: Validator<T>;
}

interface UseFormStateResult<T extends object> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  isDirty: boolean;
  saving: boolean;
  /** Actualiza un campo concreto */
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Reemplaza todos los valores (ej: al abrir un registro existente) */
  setValues: (values: T) => void;
  /** Resetea al estado inicial */
  reset: () => void;
  /** Ejecuta la validación y devuelve true si no hay errores */
  validate: () => boolean;
  /** Envuelve un handler async: activa saving, ejecuta, desactiva */
  handleSubmit: (handler: (values: T) => Promise<void>) => () => Promise<void>;
}

/**
 * Hook de gestión de estado de formularios del panel.
 * Provee valores, errores, dirty-state, saving y helpers.
 */
export function useFormState<T extends object>(
  options: UseFormStateOptions<T>
): UseFormStateResult<T> {
  const { initialValues, validate: validatorFn } = options;

  const [values, setValuesState] = useState<T>(initialValues);
  const [initial] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [saving, setSaving] = useState(false);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValuesState(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setValues = useCallback((v: T) => {
    setValuesState(v);
    setErrors({});
  }, []);

  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
  }, [initialValues]);

  const validate = useCallback((): boolean => {
    if (!validatorFn) return true;
    const errs = validatorFn(values);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [validatorFn, values]);

  const handleSubmit = useCallback(
    (handler: (values: T) => Promise<void>) => async () => {
      if (!validate()) return;
      setSaving(true);
      try {
        await handler(values);
      } finally {
        setSaving(false);
      }
    },
    [validate, values]
  );

  return { values, errors, isDirty, saving, setField, setValues, reset, validate, handleSubmit };
}
