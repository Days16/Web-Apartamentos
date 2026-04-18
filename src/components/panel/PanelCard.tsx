import { ReactNode } from 'react';

interface Props {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Si false, no añade padding al body. Útil para tablas que ocupan el ancho completo. */
  padded?: boolean;
  className?: string;
}

export default function PanelCard({
  title,
  subtitle,
  actions,
  children,
  padded = true,
  className = '',
}: Props) {
  const hasHeader = title || actions;

  return (
    <div className={`panel-card ${className}`}>
      {hasHeader && (
        <div
          className="flex items-start justify-between gap-4 px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <div className="min-w-0">
            {title && <h2 className="panel-h3">{title}</h2>}
            {subtitle && <p className="panel-caption mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </div>
  );
}
