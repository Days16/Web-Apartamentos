import { ReactNode } from 'react';

interface Props {
  title?: string;
  description?: string;
  /** Número de columnas en desktop. En móvil siempre es 1 columna. */
  columns?: 1 | 2 | 3;
  children: ReactNode;
}

export default function FormSection({ title, description, columns = 1, children }: Props) {
  const gridClass = columns === 3 ? 'panel-form-grid-3' : columns === 2 ? 'panel-form-grid-2' : '';

  return (
    <div className="panel-form-section">
      {(title || description) && (
        <div>
          {title && <div className="panel-form-section-title">{title}</div>}
          {description && <p className="panel-caption mt-1">{description}</p>}
        </div>
      )}
      <div className={gridClass}>{children}</div>
    </div>
  );
}
