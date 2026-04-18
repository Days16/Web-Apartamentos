import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface SearchItem {
  id: string;
  type: 'reservation' | 'apartment' | 'message' | 'page';
  title: string;
  subtitle?: string;
  href?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: SearchItem[];
}

const TYPE_ICONS: Record<string, string> = {
  reservation:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  apartment: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  message:
    'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  page: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
};

const TYPE_LABELS: Record<string, string> = {
  reservation: 'Reserva',
  apartment: 'Apartamento',
  message: 'Mensaje',
  page: 'Página',
};

export default function PanelSearch({ open, onClose, items }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results =
    query.trim().length < 1
      ? items.filter(i => i.type === 'page').slice(0, 8)
      : items
          .filter(i => {
            const q = query.toLowerCase();
            return (
              i.title.toLowerCase().includes(q) || (i.subtitle ?? '').toLowerCase().includes(q)
            );
          })
          .slice(0, 10);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const go = useCallback(
    (item: SearchItem) => {
      if (item.href) navigate(item.href);
      onClose();
    },
    [navigate, onClose]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(a => Math.min(a + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(a => Math.max(a - 1, 0));
      } else if (e.key === 'Enter' && results[active]) {
        go(results[active]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [results, active, go, onClose]
  );

  // Scroll el item activo dentro de la lista
  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center"
      style={{
        background: 'rgba(0,0,0,.55)',
        backdropFilter: 'blur(4px)',
        paddingTop: 'clamp(3rem, 12vh, 8rem)',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full mx-4 rounded-2xl overflow-hidden panel-animate-in"
        style={{
          maxWidth: '600px',
          background: 'var(--panel-surface)',
          border: '1px solid var(--panel-border)',
          boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        }}
        role="dialog"
        aria-label="Búsqueda global"
        aria-modal
      >
        {/* Input */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 border-b"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            style={{ color: 'var(--panel-text-muted)', flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar reservas, apartamentos, páginas…"
            aria-label="Búsqueda global"
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--panel-text)', fontFamily: 'Jost, sans-serif' }}
          />
          <kbd
            className="hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{
              background: 'var(--panel-surface-2)',
              color: 'var(--panel-text-muted)',
              border: '1px solid var(--panel-border)',
            }}
          >
            Esc
          </kbd>
        </div>

        {/* Resultados */}
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Resultados de búsqueda"
          className="overflow-y-auto"
          style={{ maxHeight: '360px' }}
        >
          {results.length === 0 && (
            <li
              className="px-5 py-10 text-center text-sm"
              style={{ color: 'var(--panel-text-muted)' }}
            >
              Sin resultados para «{query}»
            </li>
          )}
          {results.map((item, i) => (
            <li
              key={item.id}
              role="option"
              aria-selected={i === active}
              onClick={() => go(item)}
              onMouseEnter={() => setActive(i)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
              style={{
                background: i === active ? 'var(--panel-surface-2)' : 'transparent',
                borderBottom: i < results.length - 1 ? `1px solid var(--panel-border)` : 'none',
              }}
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--panel-surface-2)' }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  style={{ color: 'var(--panel-accent)' }}
                >
                  <path d={TYPE_ICONS[item.type] || TYPE_ICONS.page} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--panel-text)' }}
                >
                  {item.title}
                </div>
                {item.subtitle && (
                  <div
                    className="text-xs truncate mt-0.5"
                    style={{ color: 'var(--panel-text-muted)' }}
                  >
                    {item.subtitle}
                  </div>
                )}
              </div>
              <span
                className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--panel-text-muted)' }}
              >
                {TYPE_LABELS[item.type]}
              </span>
              {i === active && (
                <kbd
                  className="flex-shrink-0 text-[10px] px-1 py-0.5 rounded font-mono hidden sm:inline-flex"
                  style={{
                    background: 'var(--panel-surface)',
                    color: 'var(--panel-text-muted)',
                    border: '1px solid var(--panel-border)',
                  }}
                >
                  ↵
                </kbd>
              )}
            </li>
          ))}
        </ul>

        {/* Footer hint */}
        <div
          className="px-4 py-2.5 border-t flex items-center gap-4 text-[11px]"
          style={{
            borderColor: 'var(--panel-border)',
            color: 'var(--panel-text-muted)',
            background: 'var(--panel-surface-2)',
          }}
        >
          <span>
            <kbd className="font-mono">↑↓</kbd> navegar
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> abrir
          </span>
          <span>
            <kbd className="font-mono">Esc</kbd> cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
