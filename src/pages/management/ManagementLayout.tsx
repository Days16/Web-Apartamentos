import { Outlet, useLocation, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Ico, { paths } from '../../components/Ico';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import PanelSearch from '../../components/panel/PanelSearch';
import type { SearchItem } from '../../components/panel/PanelSearch';
import PanelNotifications from '../../components/panel/PanelNotifications';
import {
  registerPushSubscription,
  unregisterPushSubscription,
  isPushSupported,
} from '../../utils/pushNotifications';

type NavItem = { path: string; label: string; icon: string; exact?: boolean };

const NAV_ITEMS: NavItem[] = [
  { path: '/gestion', label: 'Dashboard', icon: paths.home, exact: true },
  { path: '/gestion/reservas', label: 'Reservas', icon: paths.cal },
  { path: '/gestion/calendario', label: 'Calendario', icon: paths.building },
  { path: '/gestion/mensajes', label: 'Mensajes', icon: paths.msg },
  { path: '/gestion/tareas', label: 'Mantenimiento', icon: paths.check },
];

const ROUTE_LABELS: Record<string, string> = {
  '/gestion': 'Dashboard',
  '/gestion/reservas': 'Reservas',
  '/gestion/calendario': 'Calendario',
  '/gestion/mensajes': 'Mensajes',
  '/gestion/tareas': 'Mantenimiento',
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

export default function ManagementLayout() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { dark, toggle } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [topbarShadow, setTopbarShadow] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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

  // Close with Escape + Ctrl+K for search
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

  // Unread messages + realtime
  useEffect(() => {
    refreshUnread();
    const channel = supabase
      .channel('layout-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, refreshUnread)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function refreshUnread() {
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'unread')
      .then(({ count }) => setUnreadCount(count || 0));
  }

  /* ── Occupancy widget ── */
  const [occupancyWidget, setOccupancyWidget] = useState<{
    today: number;
    total: number;
    checkinsToday: string[];
    checkoutsToday: string[];
  } | null>(null);

  useEffect(() => {
    async function loadOccupancy() {
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: reservations } = await supabase
        .from('reservations')
        .select('guest, apt_slug, checkin, checkout')
        .eq('status', 'confirmed');
      const { count: aptCount } = await supabase
        .from('apartments')
        .select('*', { count: 'exact', head: true });
      if (!reservations) return;
      const occupied = reservations.filter(r => {
        const ci = r.checkin?.slice(0, 10) ?? '';
        const co = r.checkout?.slice(0, 10) ?? '';
        return ci <= todayStr && co > todayStr;
      });
      const checkinsToday = reservations
        .filter(r => r.checkin?.slice(0, 10) === todayStr)
        .map(r => r.guest || 'Huésped');
      const checkoutsToday = reservations
        .filter(r => r.checkout?.slice(0, 10) === todayStr)
        .map(r => r.guest || 'Huésped');
      setOccupancyWidget({
        today: occupied.length,
        total: aptCount || 0,
        checkinsToday: checkinsToday.slice(0, 3),
        checkoutsToday: checkoutsToday.slice(0, 3),
      });
    }
    loadOccupancy();
  }, []);

  async function handlePushToggle() {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unregisterPushSubscription();
        setPushEnabled(false);
      } else {
        await registerPushSubscription();
        setPushEnabled(true);
      }
    } catch {
      // permission denied or not supported
    } finally {
      setPushLoading(false);
    }
  }

  const isActive = (item: NavItem) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? 'G';
  const currentLabel = ROUTE_LABELS[location.pathname] ?? 'Gestión';

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
        <div className="mb-5">
          <div className="panel-label px-2 mb-1.5">Principal</div>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`panel-nav-item${isActive(item) ? ' active' : ''}`}
            >
              <Ico d={item.icon} size={17} color="currentColor" />
              <span className="flex-1">{item.label}</span>
              {item.path === '/gestion/mensajes' && unreadCount > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center leading-none panel-badge-pulse"
                  style={{ background: '#D4A843', color: '#0f172a' }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Occupancy widget today */}
        {occupancyWidget && (
          <div
            className="mx-2 mb-3 rounded-lg p-3"
            style={{
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.08)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[10px] uppercase tracking-widest font-semibold"
                style={{ color: '#64748b' }}
              >
                Ocupación hoy
              </span>
              <span className="text-xs font-bold text-white">
                {occupancyWidget.today}/{occupancyWidget.total}
              </span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden mb-2"
              style={{ background: 'rgba(255,255,255,.1)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width:
                    occupancyWidget.total > 0
                      ? `${Math.round((occupancyWidget.today / occupancyWidget.total) * 100)}%`
                      : '0%',
                  background: '#D4A843',
                }}
              />
            </div>
            {occupancyWidget.checkinsToday.length > 0 && (
              <div className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>
                🟢 Entradas: {occupancyWidget.checkinsToday.join(', ')}
                {occupancyWidget.checkinsToday.length < occupancyWidget.checkinsToday.length && '…'}
              </div>
            )}
            {occupancyWidget.checkoutsToday.length > 0 && (
              <div className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
                🔴 Salidas: {occupancyWidget.checkoutsToday.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Quick access */}
        <div className="mt-auto pt-3 border-t border-white/10">
          <div className="panel-label px-2 mb-1.5">Acceso rápido</div>
          <Link to="/admin" className="panel-nav-item">
            <Ico d={paths.settings} size={17} color="currentColor" />
            Administración
          </Link>
          <Link to="/" target="_blank" rel="noopener noreferrer" className="panel-nav-item">
            <Ico d={paths.eye} size={17} color="currentColor" />
            Ver web pública
          </Link>
          {isPushSupported() && (
            <button
              onClick={handlePushToggle}
              disabled={pushLoading}
              className="panel-nav-item w-full text-left"
              style={{ minHeight: '40px' }}
            >
              <Ico d={paths.mail} size={17} color="currentColor" />
              <span className="flex-1 truncate">
                {pushLoading
                  ? 'Procesando...'
                  : pushEnabled
                    ? 'Desactivar notif.'
                    : 'Activar notif.'}
              </span>
            </button>
          )}
        </div>
      </nav>
    );
  }

  function SidebarFooter() {
    return (
      <div
        className="flex-shrink-0 p-4 border-t border-white/10"
        style={{ background: 'rgba(0,0,0,.2)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ background: '#D4A843', color: '#0f172a' }}
          >
            {avatarLetter}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white leading-tight truncate">Gestor</div>
            <div className="text-xs truncate mt-0.5" style={{ color: '#64748b' }}>
              {user?.email ?? ''}
            </div>
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
    <div
      className="flex h-screen overflow-hidden font-sans"
      style={{ background: 'var(--panel-bg)' }}
    >
      {/* ── Sidebar desktop ──────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0"
        style={{ width: 'var(--panel-sidebar-width)', background: 'var(--panel-sidebar-bg)' }}
      >
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
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(212,168,67,.18)', color: '#D4A843' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                style={{ background: '#D4A843' }}
              />
              Panel Gestión
            </span>
          </div>
        </div>

        <SidebarNav />
        <SidebarFooter />
      </aside>

      {/* ── Overlay móvil ───────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Mobile sidebar (drawer) ──────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 flex flex-col z-50 md:hidden transition-transform duration-300 ease-in-out"
        style={{
          width: '280px',
          background: 'var(--panel-sidebar-bg)',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
        aria-label="Menú de gestión"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div>
            <div className="font-serif font-bold text-white text-lg tracking-wide">Illa Pancha</div>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1"
              style={{ background: 'rgba(212,168,67,.18)', color: '#D4A843' }}
            >
              Panel Gestión
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-slate-400 hover:text-white p-2 transition-colors rounded"
            aria-label="Cerrar menú"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <Ico d={paths.close} size={18} color="currentColor" />
          </button>
        </div>
        <SidebarNav />
        <SidebarFooter />
      </aside>

      {/* ── Contenido principal ─────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className="flex-shrink-0 flex items-center gap-3 px-4 border-b transition-shadow duration-200"
          style={{
            height: 'var(--panel-topbar-h)',
            background: 'var(--panel-surface)',
            borderColor: 'var(--panel-border)',
            boxShadow: topbarShadow ? '0 2px 8px rgba(0,0,0,.08)' : 'none',
          }}
        >
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--panel-text-muted)', minWidth: '44px', minHeight: '44px' }}
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
          <div
            className="md:hidden font-serif font-bold text-lg"
            style={{ color: 'var(--panel-text)' }}
          >
            Illa Pancha
          </div>

          {/* Breadcrumb desktop */}
          <nav className="hidden md:flex items-center gap-2 text-sm" aria-label="Breadcrumb">
            <span style={{ color: 'var(--panel-text-muted)' }}>Gestión</span>
            <span style={{ color: 'var(--panel-text-subtle)', fontSize: '0.75rem' }}>›</span>
            <span className="font-medium" style={{ color: 'var(--panel-text)' }}>
              {currentLabel}
            </span>
          </nav>

          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              background: 'var(--panel-surface-2)',
              color: 'var(--panel-text-muted)',
              border: '1px solid var(--panel-border)',
              minHeight: '34px',
            }}
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
            <kbd
              className="ml-1 text-[10px] font-mono px-1 py-0.5 rounded"
              style={{
                background: 'var(--panel-surface)',
                border: '1px solid var(--panel-border)',
              }}
            >
              ⌃K
            </kbd>
          </button>

          <div className="flex-1" />

          {/* Unread messages badge on mobile */}
          {unreadCount > 0 && (
            <Link
              to="/gestion/mensajes"
              className="md:hidden panel-badge no-underline"
              style={{ background: 'rgba(212,168,67,.15)', color: '#92650a', fontSize: '10px' }}
            >
              {unreadCount} msg
            </Link>
          )}

          {/* Notifications */}
          <PanelNotifications userId={user?.id} />

          {/* Avatar + dropdown */}
          <div className="relative" ref={avatarMenuRef}>
            <button
              onClick={() => setAvatarMenuOpen(v => !v)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
              style={{ minHeight: '44px' }}
              aria-label="Menú de usuario"
              aria-expanded={avatarMenuOpen}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                style={{ background: '#D4A843', color: '#0f172a' }}
              >
                {avatarLetter}
              </div>
              <Ico d={paths.caret} size={14} color="var(--panel-text-muted)" />
            </button>

            {avatarMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 rounded-xl border z-50 py-1 min-w-[200px] panel-animate-in"
                style={{
                  background: 'var(--panel-surface)',
                  borderColor: 'var(--panel-border)',
                  boxShadow: 'var(--panel-shadow-md)',
                }}
                role="menu"
              >
                <div
                  className="px-4 py-2.5 border-b"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  <div className="text-xs font-semibold" style={{ color: 'var(--panel-text)' }}>
                    Gestor
                  </div>
                  <div
                    className="text-xs truncate mt-0.5"
                    style={{ color: 'var(--panel-text-muted)' }}
                  >
                    {user?.email ?? ''}
                  </div>
                </div>

                <button
                  onClick={() => {
                    toggle();
                    setAvatarMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700"
                  style={{ color: 'var(--panel-text)' }}
                  role="menuitem"
                >
                  {dark ? <SunIcon /> : <MoonIcon />}
                  {dark ? 'Modo claro' : 'Modo oscuro'}
                </button>

                <Link
                  to="/admin"
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 no-underline"
                  style={{ color: 'var(--panel-text)' }}
                  onClick={() => setAvatarMenuOpen(false)}
                  role="menuitem"
                >
                  <Ico d={paths.settings} size={14} color="currentColor" />
                  Administración
                </Link>

                <Link
                  to="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 no-underline"
                  style={{ color: 'var(--panel-text)' }}
                  onClick={() => setAvatarMenuOpen(false)}
                  role="menuitem"
                >
                  <Ico d={paths.eye} size={14} color="currentColor" />
                  Ver web pública
                </Link>

                {isPushSupported() && (
                  <button
                    onClick={() => {
                      handlePushToggle();
                      setAvatarMenuOpen(false);
                    }}
                    disabled={pushLoading}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700"
                    style={{ color: 'var(--panel-text)' }}
                    role="menuitem"
                  >
                    <Ico d={paths.mail} size={14} color="currentColor" />
                    {pushLoading
                      ? 'Procesando...'
                      : pushEnabled
                        ? 'Desactivar notificaciones'
                        : 'Activar notificaciones'}
                  </button>
                )}

                <div className="border-t my-1" style={{ borderColor: 'var(--panel-border)' }} />

                <button
                  onClick={() => {
                    logout();
                    setAvatarMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-left transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                  style={{ color: '#dc2626' }}
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
        <div
          ref={contentRef}
          className="flex-1 overflow-auto admin-content"
          style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}
        >
          <Outlet />
        </div>
      </div>

      {/* Global search */}
      <PanelSearch open={searchOpen} onClose={() => setSearchOpen(false)} items={SEARCH_PAGES} />
    </div>
  );
}
