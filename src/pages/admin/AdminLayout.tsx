import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Ico, { paths } from '../../components/Ico';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { path: '/admin', label: 'Apartamentos', icon: paths.building, exact: true },
  { path: '/admin/configuracion', label: 'Ajustes Generales', icon: paths.settings },
  { path: '/admin/ofertas', label: 'Ofertas', icon: paths.star },
  { path: '/admin/extras', label: 'Servicios extra', icon: paths.plus },
  { path: '/admin/precios', label: 'Precios dinámicos', icon: paths.tag },
  { path: '/admin/resenas', label: 'Reseñas', icon: paths.msg },
  { path: '/admin/faq', label: 'FAQ', icon: paths.check },
  { path: '/admin/cancelacion', label: 'Cancelaciones', icon: paths.close },
  { path: '/admin/reglas', label: 'Reglas de reserva', icon: paths.cal },
  { path: '/admin/analytics', label: 'Analíticas', icon: paths.trend },
  { path: '/admin/ical', label: 'Booking.com iCal', icon: paths.sync },
  { path: '/admin/registro', label: 'Registro de Entrada', icon: paths.edit },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [pendingReviews, setPendingReviews] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchPendingCount();

    const channel = supabase
      .channel('admin_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
        fetchPendingCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Cerrar sidebar al navegar
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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

  const isActive = (item: { path: string; exact?: boolean }) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const NavLinks = () => (
    <>
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-2 px-2">
        Contenido
      </div>
      {navItems.slice(0, 1).map(item => (
        <Link
          key={item.path}
          to={item.path}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item) ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}
        >
          <Ico d={item.icon} size={18} color="currentColor" />
          {item.label}
        </Link>
      ))}

      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-6 px-2">
        Configuración
      </div>
      {navItems.slice(1).map(item => (
        <Link
          key={item.path}
          to={item.path}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${isActive(item) ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}
        >
          <Ico d={item.icon} size={18} color="currentColor" />
          <span className="flex-1">{item.label}</span>
          {item.path === '/admin/resenas' && pendingReviews > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center shadow-sm">
              {pendingReviews}
            </span>
          )}
        </Link>
      ))}

      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-6 px-2">
        Acceso
      </div>
      <Link
        to="/gestion"
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white"
      >
        <Ico d={paths.home} size={18} color="currentColor" />
        Panel gestión
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
      <button
        onClick={logout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-red-500/10 text-red-400 mt-2 text-left w-full"
      >
        <Ico d={paths.lock} size={18} color="currentColor" />
        Cerrar sesión
      </button>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden font-sans">
      {/* Sidebar desktop */}
      <div className="hidden md:flex w-64 bg-[#1C1810] text-gray-300 flex-col flex-shrink-0">
        <div className="p-6 border-b border-white/10">
          <div
            className="text-2xl font-serif font-bold text-white cursor-pointer tracking-wide"
            onClick={() => navigate('/')}
          >
            Illa Pancha
          </div>
          <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            ⚙ Administración
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          <NavLinks />
        </div>
        <div className="p-4 border-t border-white/10 flex items-center gap-3 bg-black/20">
          <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">Propietario</div>
            <div className="text-xs text-gray-500 truncate">{user?.email || 'Admin total'}</div>
          </div>
        </div>
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
          <div>
            <span className="text-xl font-serif font-bold text-white">Illa Pancha</span>
            <div className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider">
              ⚙ Administración
            </div>
          </div>
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
          <NavLinks />
        </div>
        <div className="p-4 border-t border-white/10 flex items-center gap-3 bg-black/20">
          <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">Propietario</div>
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
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
          <span className="text-white font-serif font-bold text-lg">Illa Pancha</span>
          <span className="text-gray-400 text-xs ml-1">· Admin</span>
          {pendingReviews > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {pendingReviews} pend.
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
