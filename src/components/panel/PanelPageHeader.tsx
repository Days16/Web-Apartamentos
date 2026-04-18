import { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PanelPageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="panel-page-header">
      <div className="panel-page-header-text">
        <h1 className="panel-h1">{title}</h1>
        {subtitle && <p className="panel-caption">{subtitle}</p>}
      </div>
      {actions && <div className="panel-page-header-actions">{actions}</div>}
    </div>
  );
}
