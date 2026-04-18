import { ReactNode, useEffect, useRef } from 'react';
import Ico, { paths } from '../Ico';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_WIDTHS: Record<ModalSize, string> = {
  sm: '420px',
  md: '580px',
  lg: '740px',
  xl: '960px',
};

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: ModalSize;
  /** Slot del footer — normalmente botones de acción */
  footer?: ReactNode;
  children: ReactNode;
}

export default function PanelModal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  footer,
  children,
}: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Bloquear scroll del body
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Foco en primer elemento interactivo
    const timer = setTimeout(() => {
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      focusable?.[0]?.focus();
    }, 60);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') trapFocus(e);
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  function trapFocus(e: KeyboardEvent) {
    if (!modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(3px)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-hidden={!open}
    >
      <div
        ref={modalRef}
        className="panel-modal-inner w-full sm:rounded-xl flex flex-col panel-animate-in"
        style={{
          maxWidth: SIZE_WIDTHS[size],
          background: 'var(--panel-surface)',
          border: '1px solid var(--panel-border)',
          boxShadow: 'var(--panel-shadow-lg)',
          maxHeight: '92dvh',
          borderRadius: '16px 16px 0 0',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-modal-title"
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4 px-6 py-5 border-b flex-shrink-0"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <div className="min-w-0">
            <h2 id="panel-modal-title" className="panel-h2">
              {title}
            </h2>
            {subtitle && <p className="panel-caption mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg transition-colors flex-shrink-0 -mr-1 -mt-0.5 hover:bg-gray-100 dark:hover:bg-slate-700"
            style={{
              color: 'var(--panel-text-muted)',
              minWidth: '36px',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ico d={paths.close} size={18} color="currentColor" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t"
            style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-surface-2)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
