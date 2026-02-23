import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import Ico, { paths } from '../../components/Ico';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { path: '/admin', label: 'Apartamentos', icon: paths.building, exact: true },
  { path: '/admin/configuracion', label: 'Ajustes Generales', icon: paths.settings },
  { path: '/admin/precios', label: 'Precios', icon: paths.tag },
  { path: '/admin/ofertas', label: 'Ofertas', icon: paths.star },
  { path: '/admin/extras', label: 'Servicios extra', icon: paths.plus },
  { path: '/admin/web', label: 'Textos web', icon: paths.edit },
  { path: '/admin/reglas', label: 'Reglas de reserva', icon: paths.calendar },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className="w-64 bg-[#1C1810] text-gray-300 flex flex-col flex-shrink-0">
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
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-2 px-2">Contenido</div>
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

          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-6 px-2">Configuración</div>
          {navItems.slice(1).map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item) ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}
            >
              <Ico d={item.icon} size={18} color="currentColor" />
              {item.label}
            </Link>
          ))}

          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-6 px-2">Acceso</div>
          <Link to="/gestion" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white">
            <Ico d={paths.home} size={18} color="currentColor" />
            Panel gestión
          </Link>
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 hover:text-white">
            <Ico d={paths.eye} size={18} color="currentColor" />
            Ver web pública
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-red-500/10 text-red-400 mt-2 text-left w-full"
          >
            <Ico d={paths.lock} size={18} color="currentColor" />
            Cerrar sesión
          </button>
        </div>

        <div className="p-4 border-t border-white/10 flex items-center gap-3 bg-black/20">
          <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">A</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">Propietario</div>
            <div className="text-xs text-gray-500 truncate">{user?.email || 'Admin total'}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 text-slate-800">
        <Outlet />
      </div>
    </div>
  );
}
