import { ReactNode, useEffect } from 'react';
import Ico, { paths } from '../Ico';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Ancho del panel en desktop. En móvil siempre es fullscreen. */
  width?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export default function PanelSlideOver({
  open,
  onClose,
  title,
  subtitle,
  width = '480px',
  footer,
  children,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,.4)',
          backdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        className="fixed inset-y-0 right-0 z-50 flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          width,
          maxWidth: '100vw',
          background: 'var(--panel-surface)',
          borderLeft: '1px solid var(--panel-border)',
          boxShadow: '-4px 0 32px rgba(0,0,0,.15)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
        aria-label={title}
        aria-hidden={!open}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4 px-6 py-5 border-b flex-shrink-0"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <div className="min-w-0">
            <h2 className="panel-h2">{title}</h2>
            {subtitle && <p className="panel-caption mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
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
            className="panel-slideover-footer flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t"
            style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-surface-2)' }}
          >
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}
