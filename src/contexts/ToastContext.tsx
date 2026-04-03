import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warn' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastApi {
  show: (message: string, type?: ToastType, duration?: number) => void;
  success: (msg: string, duration?: number) => void;
  error: (msg: string, duration?: number) => void;
  warn: (msg: string, duration?: number) => void;
  info: (msg: string, duration?: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

let nextId = 0;

const STYLES: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  warn: 'bg-amber-500',
  info: 'bg-slate-700',
};

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warn: '⚠',
  info: 'ℹ',
};

function ToastItem({ id, message, type, onDismiss }: Toast & { onDismiss: (id: number) => void }) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-2xl max-w-sm w-full ${STYLES[type] || STYLES.info}`}
    >
      <span className="shrink-0 mt-0.5 opacity-90 font-bold">{ICONS[type] || ICONS.info}</span>
      <span className="flex-1 leading-snug">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 text-white/60 hover:text-white text-lg leading-none ml-1"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = ++nextId;
      setToasts(prev => [...prev, { id, message, type }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (msg, dur) => show(msg, 'success', dur),
      error: (msg, dur) => show(msg, 'error', dur),
      warn: (msg, dur) => show(msg, 'warn', dur),
      info: (msg, dur) => show(msg, 'info', dur),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem {...t} onDismiss={dismiss} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
