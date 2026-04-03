import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Ico, { paths } from '../../components/Ico';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  registerPushSubscription,
  unregisterPushSubscription,
  isPushSupported,
} from '../../utils/pushNotifications';

const navItems = [
  { path: '/gestion', label: 'Dashboard', icon: paths.home, exact: true },
  { path: '/gestion/reservas', label: 'Reservas', icon: paths.cal },
  { path: '/gestion/calendario', label: 'Calendario', icon: paths.building },
  { path: '/gestion/mensajes', label: 'Mensajes', icon: paths.msg },
];

export default function GestionLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handlePushToggle = async () => {
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
  };

  const refreshUnread = () => {
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'unread')
      .then(({ count }) => setUnreadCount(count || 0));
  };

  useEffect(() => {
    refreshUnread();
    // Cerrar sidebar al navegar
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const channel = supabase
      .channel('layout-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, refreshUnread)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isActive = (item: { path: string; exact?: boolean }) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-white/10">
        <div
          className="text-2xl font-serif font-bold text-white cursor-pointer tracking-wide"
          onClick={() => {
            navigate('/');
            setSidebarOpen(false);
          }}
        >
          Illa Pancha
        </div>
        <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
          Panel gestión
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-2 px-2">
          Principal
        </div>
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item) ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}
          >
            <Ico d={item.icon} size={18} color="currentColor" />
            <span className="flex-1">{item.label}</span>
            {item.path === '/gestion/mensajes' && unreadCount > 0 && (
              <span className="bg-[#D4A843] text-[#0f172a] text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        ))}

        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-6 px-2">
          Acceso
        </div>
        <Link
          to="/admin"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white"
        >
          <Ico d={paths.settings} size={18} color="currentColor" />
          Administración
        </Link>
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white"
        >
          <Ico d={paths.eye} size={18} color="currentColor" />
          Ver web pública
        </Link>
        <Link
          to="/admin/changelog"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white"
        >
          <Ico d={paths.msg} size={18} color="currentColor" />
          Novedades
        </Link>
        {isPushSupported() && (
          <button
            onClick={handlePushToggle}
            disabled={pushLoading}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white w-full text-left"
          >
            <Ico d={paths.mail} size={18} color="currentColor" />
            {pushLoading
              ? 'Procesando...'
              : pushEnabled
                ? 'Desactivar notificaciones'
                : 'Activar notificaciones'}
          </button>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-red-500/10 text-red-400 mt-2 text-left w-full"
        >
          <Ico d={paths.lock} size={18} color="currentColor" />
          Cerrar sesión
        </button>
      </div>

      <div className="p-4 border-t border-white/10 flex items-center gap-3 bg-black/20">
        <div className="w-8 h-8 rounded-full bg-[#82c8bd] text-white flex items-center justify-center font-bold text-sm">
          A
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">Administrador</div>
          <div className="text-xs text-gray-500 truncate">
            {user?.email || 'info@apartamentosillapancha.com'}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden font-sans">
      {/* Sidebar desktop */}
      <div className="hidden md:flex w-64 bg-[#1C1810] text-gray-300 flex-col flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar móvil (drawer) */}
      <div
        className={`fixed inset-y-0 left-0 w-72 bg-[#1C1810] text-gray-300 flex flex-col z-50 transform transition-transform duration-300 ease-in-out md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <span className="text-xl font-serif font-bold text-white">Illa Pancha</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-white p-1"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-2 px-2">
            Principal
          </div>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${isActive(item) ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}
            >
              <Ico d={item.icon} size={20} color="currentColor" />
              <span className="flex-1">{item.label}</span>
              {item.path === '/gestion/mensajes' && unreadCount > 0 && (
                <span className="bg-[#D4A843] text-[#0f172a] text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          ))}
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-6 px-2">
            Acceso
          </div>
          <Link
            to="/admin"
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white"
          >
            <Ico d={paths.settings} size={20} color="currentColor" />
            Administración
          </Link>
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white"
          >
            <Ico d={paths.eye} size={20} color="currentColor" />
            Ver web pública
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-red-500/10 text-red-400 mt-2 text-left w-full"
          >
            <Ico d={paths.lock} size={20} color="currentColor" />
            Cerrar sesión
          </button>
        </div>
        <div className="p-4 border-t border-white/10 flex items-center gap-3 bg-black/20">
          <div className="w-8 h-8 rounded-full bg-[#82c8bd] text-white flex items-center justify-center font-bold text-sm">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">Administrador</div>
            <div className="text-xs text-gray-500 truncate">{user?.email || ''}</div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar móvil */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#1C1810] border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-300 hover:text-white p-1"
            aria-label="Abrir menú"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
          <span className="text-white font-serif font-bold text-lg">Illa Pancha</span>
          <span className="text-gray-400 text-xs ml-1">· Gestión</span>
          {unreadCount > 0 && (
            <span className="ml-auto bg-[#D4A843] text-[#0f172a] text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount} msg
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
