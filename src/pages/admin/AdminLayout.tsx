import { Outlet, useLocation, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import Ico, { paths } from '../../components/Ico';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import PanelSearch from '../../components/panel/PanelSearch';
import type { SearchItem } from '../../components/panel/PanelSearch';
import PanelNotifications from '../../components/panel/PanelNotifications';

type NavItem = { path: string; label: string; icon: string; exact?: boolean; badge?: string };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Contenido',
    items: [
      { path: '/admin', label: 'Apartamentos', icon: paths.building, exact: true },
      { path: '/admin/ofertas', label: 'Ofertas', icon: paths.star },
      { path: '/admin/extras', label: 'Servicios extra', icon: paths.plus },
      { path: '/admin/resenas', label: 'Reseñas', icon: paths.msg, badge: 'reviews' },
      { path: '/admin/faq', label: 'FAQ', icon: paths.check },
      //{ path: '/admin/web', label: 'Textos web', icon: paths.edit },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { path: '/admin/precios', label: 'Precios dinámicos', icon: paths.tag },
      { path: '/admin/descuentos', label: 'Códigos descuento', icon: paths.cash },
      { path: '/admin/reglas', label: 'Reglas de reserva', icon: paths.cal },
      { path: '/admin/cancelacion', label: 'Cancelaciones', icon: paths.close },
      { path: '/admin/emails', label: 'Emails automáticos', icon: paths.mail },
      { path: '/admin/ical', label: 'Booking.com iCal', icon: paths.sync },
      { path: '/admin/registro', label: 'Registro entrada', icon: paths.printer },
      { path: '/admin/pdf-editor', label: 'Editor de PDF', icon: paths.edit },
      { path: '/admin/configuracion', label: 'Ajustes generales', icon: paths.settings },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { path: '/admin/analytics', label: 'Analíticas', icon: paths.trend },
      { path: '/admin/auditoria', label: 'Reg. auditoría', icon: paths.check },
      //{ path: '/admin/usuarios', label: 'Usuarios', icon: paths.users },
      { path: '/admin/changelog', label: 'Changelog', icon: paths.download },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = {
  '/admin': 'Apartamentos',
  '/admin/configuracion': 'Ajustes generales',
  '/admin/ofertas': 'Ofertas',
  '/admin/extras': 'Servicios extra',
  '/admin/precios': 'Precios dinámicos',
  '/admin/descuentos': 'Códigos de descuento',
  '/admin/resenas': 'Reseñas',
  '/admin/faq': 'FAQ',
  '/admin/web': 'Textos web',
  '/admin/cancelacion': 'Cancelaciones',
  '/admin/reglas': 'Reglas de reserva',
  '/admin/emails': 'Emails automáticos',
  '/admin/analytics': 'Analíticas',
  '/admin/auditoria': 'Registro de auditoría',
  '/admin/ical': 'Booking.com iCal',
  '/admin/registro': 'Registro entrada',
  '/admin/pdf-editor': 'Editor de PDF',
  '/admin/changelog': 'Changelog',
  '/admin/usuarios': 'Usuarios',
};

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { dark, toggle } = useTheme();
  const [pendingReviews, setPendingReviews] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [topbarShadow, setTopbarShadow] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Add topbar shadow on scroll
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => setTopbarShadow(el.scrollTop > 4);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Close avatar menu on outside click
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  // Close sidebar with Escape + Ctrl+K for search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setAvatarMenuOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(v => !v);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Pending reviews + realtime
  useEffect(() => {
    fetchPendingCount();
    const channel = supabase
      .channel('admin_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, fetchPendingCount)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchPendingCount() {
    try {
      const { count, error } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('active', false);
      if (!error && count !== null) setPendingReviews(count);
    } catch (err) {
      console.warn('Error fetching pending reviews count:', err);
    }
  }

  const isActive = (item: NavItem) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? 'A';
  const currentLabel = ROUTE_LABELS[location.pathname] ?? 'Panel Admin';

  const SEARCH_PAGES: SearchItem[] = Object.entries(ROUTE_LABELS).map(([href, title]) => ({
    id: `page-${href}`,
    type: 'page' as const,
    title,
    subtitle: href,
    href,
  }));

  function SidebarNav() {
    return (
      <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col">
        {NAV_SECTIONS.map(section => (
          <div key={section.label} className="mb-5">
            <div className="panel-label px-2 mb-1.5">{section.label}</div>
            {section.items.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`panel-nav-item${isActive(item) ? ' active' : ''}`}
              >
                <Ico d={item.icon} size={17} color="currentColor" />
                <span className="flex-1">{item.label}</span>
                {item.badge === 'reviews' && pendingReviews > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center leading-none panel-badge-pulse">
                    {pendingReviews}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}

        {/* Quick access */}
        <div className="mt-auto pt-3 border-t border-white/10">
          <div className="panel-label px-2 mb-1.5">Acceso rápido</div>
          <Link to="/gestion" className="panel-nav-item">
            <Ico d={paths.home} size={17} color="currentColor" />
            Panel gestión
          </Link>
          <Link to="/" target="_blank" rel="noopener noreferrer" className="panel-nav-item">
            <Ico d={paths.eye} size={17} color="currentColor" />
            Ver web pública
          </Link>
        </div>
      </nav>
    );
  }

  function SidebarFooter() {
    return (
      <div className="flex-shrink-0 p-4 border-t border-white/10 admin-sidebar-footer">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 text-white bg-[#1a5f6e]">
            {avatarLetter}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white leading-tight truncate">
              Propietario
            </div>
            <div className="text-xs truncate mt-0.5 text-slate-500">{user?.email ?? ''}</div>
          </div>
          <button
            onClick={toggle}
            aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
            className="text-slate-400 hover:text-white p-1.5 flex-shrink-0 transition-colors rounded"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans panel-bg-color">
      {/* ── Sidebar desktop ──────────────────────────────── */}
      <aside className="hidden md:flex flex-col flex-shrink-0 admin-sidebar">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-white/10">
          <Link to="/" target="_blank" rel="noopener noreferrer" className="block no-underline">
            <div className="font-serif font-bold text-white text-xl tracking-wide leading-tight">
              Illa Pancha
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">
              Ribadeo · Galicia
            </div>
          </Link>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full admin-panel-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block flex-shrink-0" />
              Panel Admin
            </span>
          </div>
        </div>

        <SidebarNav />
        <SidebarFooter />
      </aside>

      {/* ── Mobile overlay ───────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden admin-mobile-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Mobile sidebar (drawer) ──────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 flex flex-col z-50 md:hidden transition-transform duration-300 ease-in-out admin-mobile-drawer ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Menú de administración"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div>
            <div className="font-serif font-bold text-white text-lg tracking-wide">Illa Pancha</div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 admin-panel-badge">
              Panel Admin
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-slate-400 hover:text-white p-2 transition-colors rounded min-w-[44px] min-h-[44px]"
            aria-label="Cerrar menú"
          >
            <Ico d={paths.close} size={18} color="currentColor" />
          </button>
        </div>
        <SidebarNav />
        <SidebarFooter />
      </aside>

      {/* ── Main content ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className={`flex-shrink-0 flex items-center gap-3 px-4 border-b transition-shadow duration-200 admin-topbar${topbarShadow ? ' shadow-[0_2px_8px_rgba(0,0,0,.08)]' : ''}`}
        >
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg transition-colors panel-text-muted min-w-[44px] min-h-[44px]"
            aria-label="Abrir menú"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>

          {/* Mobile logo */}
          <div className="md:hidden font-serif font-bold text-lg panel-text-main">Illa Pancha</div>

          {/* Breadcrumb desktop */}
          <nav className="hidden md:flex items-center gap-2 text-sm" aria-label="Breadcrumb">
            <span className="panel-text-muted">Admin</span>
            <span className="text-xs panel-text-subtle">›</span>
            <span className="font-medium panel-text-main">{currentLabel}</span>
          </nav>

          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors admin-search-btn"
            aria-label="Buscar (Ctrl+K)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Buscar…</span>
            <kbd className="ml-1 text-[10px] font-mono px-1 py-0.5 rounded admin-kbd">⌃K</kbd>
          </button>

          {/* Preview web button — desktop only */}
          <button
            onClick={() => setPreviewOpen(v => !v)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${previewOpen ? 'admin-preview-btn--active' : 'admin-preview-btn'}`}
            title="Vista previa de la web pública"
            aria-label="Abrir/cerrar vista previa web"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <span>Preview</span>
          </button>

          <div className="flex-1" />

          {/* Pending reviews badge on mobile */}
          {pendingReviews > 0 && (
            <span className="md:hidden panel-badge panel-badge-error">{pendingReviews} pend.</span>
          )}

          {/* Notifications */}
          <PanelNotifications userId={user?.id} />

          {/* Avatar + dropdown */}
          <div className="relative" ref={avatarMenuRef}>
            <button
              onClick={() => setAvatarMenuOpen(v => !v)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
              aria-label="Menú de usuario"
              aria-expanded={avatarMenuOpen}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0 bg-[#1a5f6e]">
                {avatarLetter}
              </div>
              <Ico d={paths.caret} size={14} color="var(--panel-text-muted)" />
            </button>

            {avatarMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 rounded-xl border z-50 py-1 min-w-[200px] panel-animate-in admin-dropdown"
                role="menu"
              >
                <div className="px-4 py-2.5 border-b panel-border-color">
                  <div className="text-xs font-semibold panel-text-main">Propietario</div>
                  <div className="text-xs truncate mt-0.5 panel-text-muted">
                    {user?.email ?? ''}
                  </div>
                </div>

                <button
                  onClick={() => {
                    toggle();
                    setAvatarMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 panel-text-main"
                  role="menuitem"
                >
                  {dark ? <SunIcon /> : <MoonIcon />}
                  {dark ? 'Modo claro' : 'Modo oscuro'}
                </button>

                <Link
                  to="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 no-underline panel-text-main"
                  onClick={() => setAvatarMenuOpen(false)}
                  role="menuitem"
                >
                  <Ico d={paths.eye} size={14} color="currentColor" />
                  Ver web pública
                </Link>

                <div className="border-t my-1 panel-border-color" />

                <button
                  onClick={() => {
                    logout();
                    setAvatarMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-left transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"
                  role="menuitem"
                >
                  <Ico d={paths.lock} size={14} color="currentColor" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden">
          <div
            ref={contentRef}
            className="flex-1 overflow-auto admin-content panel-bg-color panel-text-main"
          >
            <Outlet />
          </div>

          {/* NI-14 — Web preview iframe panel */}
          {previewOpen && (
            <div className="hidden md:flex flex-col flex-shrink-0 border-l admin-preview-panel">
              <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0 admin-preview-header">
                <span className="text-xs font-semibold panel-text-muted">
                  Vista previa — web pública
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    to="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs hover:underline panel-text-accent"
                  >
                    Abrir en nueva pestaña ↗
                  </Link>
                  <button
                    onClick={() => setPreviewOpen(false)}
                    className="p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-slate-700 panel-text-muted"
                    aria-label="Cerrar vista previa"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
              <iframe
                src="/"
                title="Vista previa de la web pública"
                className="flex-1 w-full border-0 min-h-0"
              />
            </div>
          )}
        </div>
      </div>

      {/* Global search */}
      <PanelSearch open={searchOpen} onClose={() => setSearchOpen(false)} items={SEARCH_PAGES} />
    </div>
  );
}
