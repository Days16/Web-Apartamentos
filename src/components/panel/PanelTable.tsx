import { ReactNode, useRef, useEffect, useState } from 'react';

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  /** Function to extract a unique key from each row */
  rowKey?: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyText?: string;
  emptyIcon?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Multiple selection with checkbox */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  /** Slot below the table (pagination, count...) */
  footer?: ReactNode;
}

// ── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr aria-hidden>
      {Array.from({ length: cols }).map((_, i) => (
        <td
          key={i}
          style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--panel-border)' }}
        >
          <div
            className="panel-skeleton h-4 rounded"
            style={{ width: `${55 + ((i * 17) % 35)}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PanelTable<T extends { id?: string | number }>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 5,
  emptyText = 'No hay datos que mostrar',
  emptyIcon,
  onRowClick,
  selectable = false,
  selectedIds,
  onSelectionChange,
  footer,
}: Props<T>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hasScroll, setHasScroll] = useState(false);
  const colCount = columns.length + (selectable ? 1 : 0);

  // Detect horizontal scroll to show fade indicator
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    function check() {
      if (!el) return;
      setHasScroll(
        el.scrollWidth > el.clientWidth + 2 && el.scrollLeft < el.scrollWidth - el.clientWidth - 2
      );
    }

    check();
    el.addEventListener('scroll', check);
    const ro = new ResizeObserver(check);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
    };
  }, [data.length, columns.length]);

  function getKey(row: T): string {
    if (rowKey) return rowKey(row);
    return String(row.id ?? '');
  }

  function toggleAll() {
    if (!onSelectionChange) return;
    if (selectedIds && selectedIds.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(getKey)));
    }
  }

  function toggleRow(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  const allSelected = selectable && data.length > 0 && selectedIds?.size === data.length;
  const someSelected = selectable && !!selectedIds?.size && selectedIds.size < data.length;

  return (
    <div ref={wrapRef} className={`panel-table-wrap${hasScroll ? ' has-scroll' : ''}`}>
      <table className="panel-table">
        <thead>
          <tr>
            {selectable && (
              <th style={{ width: '44px', paddingLeft: '1rem', paddingRight: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={!!allSelected}
                  ref={el => {
                    if (el) el.indeterminate = !!someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Seleccionar todos"
                  className="w-4 h-4 rounded cursor-pointer"
                />
              </th>
            )}
            {columns.map(col => (
              <th key={col.key} style={{ width: col.width, textAlign: col.align ?? 'left' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <SkeletonRow key={i} cols={colCount} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="panel-table-empty">
                <div className="flex flex-col items-center gap-3 py-4">
                  {emptyIcon && (
                    <div style={{ color: 'var(--panel-text-subtle)' }}>{emptyIcon}</div>
                  )}
                  <span>{emptyText}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map(row => {
              const id = getKey(row);
              const isSelected = selectable && !!selectedIds?.has(id);

              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{
                    cursor: onRowClick ? 'pointer' : undefined,
                    background: isSelected ? 'rgba(26,95,110,.06)' : undefined,
                  }}
                >
                  {selectable && (
                    <td
                      style={{ paddingLeft: '1rem', paddingRight: '0.5rem', width: '44px' }}
                      onClick={e => toggleRow(id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        aria-label={`Seleccionar fila ${id}`}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map(col => {
                    const val = (row as Record<string, unknown>)[col.key];
                    return (
                      <td key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                        {col.render ? col.render(val, row) : val != null ? String(val) : '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {footer && (
        <div
          className="px-4 py-3 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
