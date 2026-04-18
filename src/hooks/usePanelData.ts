import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePanelDataOptions<T> {
  /** Función que devuelve la promesa de datos */
  fetcher: () => Promise<T>;
  /** Si es false, no lanza la petición inicial */
  enabled?: boolean;
  /** Dependencias que disparan un reload automático */
  deps?: unknown[];
}

interface UsePanelDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Hook genérico para fetching de datos en el panel.
 * Maneja loading, error y recarga manual/automática.
 */
export function usePanelData<T>(options: UsePanelDataOptions<T>): UsePanelDataResult<T> {
  const { fetcher, enabled = true, deps = [] } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const reloadCounterRef = useRef(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher]);

  const reload = useCallback(() => {
    reloadCounterRef.current += 1;
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (!enabled) return;
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, loading, error, reload };
}
