import { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  loading?: boolean;
}

export default function PanelKpiCard({
  icon,
  label,
  value,
  trend,
  trendUp,
  loading = false,
}: Props) {
  if (loading) {
    return (
      <div className="panel-kpi-card">
        <div className="panel-skeleton w-10 h-10 rounded-xl mb-3" />
        <div className="panel-skeleton h-3.5 w-24 mb-2" />
        <div className="panel-skeleton h-7 w-32 mb-2" />
        <div className="panel-skeleton h-3 w-16" />
      </div>
    );
  }

  return (
    <div className="panel-kpi-card">
      <div className="panel-kpi-icon">{icon}</div>
      <div className="panel-kpi-label mt-2">{label}</div>
      <div className="panel-kpi-value">{value}</div>
      {trend && (
        <div
          className={`panel-kpi-trend ${trendUp ? 'panel-kpi-trend--up' : 'panel-kpi-trend--down'}`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
            style={{ transform: trendUp ? 'rotate(0)' : 'rotate(180deg)' }}
          >
            <path d="M6 2l4 6H2l4-6z" fill="currentColor" />
          </svg>
          {trend}
        </div>
      )}
    </div>
  );
}
