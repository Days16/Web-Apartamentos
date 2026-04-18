import { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'pending';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'panel-badge-success',
  warning: 'panel-badge-warning',
  error: 'panel-badge-error',
  info: 'panel-badge-info',
  neutral: 'panel-badge-neutral',
  pending: 'panel-badge-pending',
};

interface Props {
  variant?: BadgeVariant;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export default function PanelBadge({
  variant = 'neutral',
  children,
  dot = false,
  pulse = false,
  className = '',
}: Props) {
  return (
    <span
      className={`panel-badge ${VARIANT_CLASSES[variant]}${pulse ? ' panel-badge-pulse' : ''} ${className}`}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
          style={{ background: 'currentColor' }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
