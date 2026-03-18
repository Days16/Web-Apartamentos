import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';

export default function Navbar({ onOpenBooking }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang } = useLang();
  const T = useT(lang);
  const { dark, toggle } = useTheme();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cerrar menú al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileOpen && navRef.current && !navRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileOpen]);

  // Prevenir scroll cuando el menú está abierto
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileOpen]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleBook = () => {
    setMobileOpen(false);
    if (settings?.booking_mode === 'redirect') {
      navigate('/reservar');
    } else if (location.pathname === '/') {
      document.getElementById('apartments-section')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/apartamentos');
    }
  };

  return (
    <nav
      className={`sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 dark:border-b dark:border-slate-700 transition-[box-shadow] duration-300 ${scrolled ? 'shadow-[0_2px_20px_rgba(15,23,42,0.08)] dark:shadow-slate-900/50' : 'shadow-none'}`}
      ref={navRef}
    >
      <Link to="/" className="text-2xl font-serif font-bold text-navy">Illa Pancha</Link>

      {/* Links - escritorio y menú móvil */}
      <div className={`flex flex-col md:flex-row md:items-center md:gap-8 absolute md:relative top-16 md:top-0 left-0 md:left-auto right-0 md:right-auto w-full md:w-auto bg-white dark:bg-slate-900 dark:border-slate-700 md:bg-transparent md:dark:bg-transparent px-6 md:px-0 py-4 md:py-0 border-b md:border-0 transition-all duration-300 ${mobileOpen ? 'max-h-64 opacity-100' : 'md:max-h-full md:opacity-100 max-h-0 opacity-0 overflow-hidden md:overflow-visible'}`}>
        <Link to="/apartamentos" className={`py-2 md:py-0 text-navy hover:text-teal transition-colors font-medium ${isActive('/apartamentos') ? 'text-teal border-b-2 border-teal' : ''}`}>
          {T.nav.apartments}
        </Link>
        <Link to="/nosotros" className={`py-2 md:py-0 text-navy hover:text-teal transition-colors font-medium ${isActive('/nosotros') ? 'text-teal border-b-2 border-teal' : ''}`}>
          {T.nav.ribadeo}
        </Link>
        <span
          className="py-2 md:py-0 text-navy hover:text-teal transition-colors font-medium cursor-pointer"
          onClick={() => {
            setMobileOpen(false);
            if (location.pathname === '/nosotros') {
              document.getElementById('experiencias')?.scrollIntoView({ behavior: 'smooth' });
            } else {
              navigate('/nosotros');
              setTimeout(() => {
                document.getElementById('experiencias')?.scrollIntoView({ behavior: 'smooth' });
              }, 500);
            }
          }}
          role="button"
          tabIndex={0}
        >
          {T.nav.experiences}
        </span>
        <Link to="/contacto" className={`py-2 md:py-0 text-navy hover:text-teal transition-colors font-medium ${isActive('/contacto') ? 'text-teal border-b-2 border-teal' : ''}`}>
          {T.nav.contact}
        </Link>

        {/* Botón reservar visible solo en el menú móvil */}
        <button className="md:hidden bg-teal text-white px-5 py-3 rounded hover:bg-teal-600 transition-all font-semibold mt-2 w-full" onClick={handleBook}>
          {T.nav.book}
        </button>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <button
          className={`text-sm font-semibold transition-colors ${lang === 'ES' ? 'text-teal' : 'text-slate-900 dark:text-slate-200'}`}
          onClick={() => setLang('ES')}
          aria-label="Español"
        >ES</button>
        <span className="text-gray-400 dark:text-slate-400" aria-hidden="true">|</span>
        <button
          className={`text-sm font-semibold transition-colors ${lang === 'EN' ? 'text-teal' : 'text-slate-900 dark:text-slate-200'}`}
          onClick={() => setLang('EN')}
          aria-label="English"
        >EN</button>

        <button
          onClick={toggle}
          aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
          className="text-slate-900 dark:text-slate-200 hover:text-teal transition-colors p-1"
        >
          {dark ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        <button
          className="hidden md:inline-block bg-teal text-white px-6 py-2 rounded hover:bg-teal-600 transition-all font-semibold"
          onClick={handleBook}
          aria-label={T.nav.book}
        >
          {T.nav.book}
        </button>

        {/* Hamburger - solo visible en móvil */}
        <button
          className="md:hidden flex flex-col gap-1.5 ml-4"
          onClick={() => setMobileOpen(o => !o)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          <span className={`w-6 h-0.5 bg-navy transition-all transform origin-center ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`w-6 h-0.5 bg-navy transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`w-6 h-0.5 bg-navy transition-all transform origin-center ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>
    </nav>
  );
}
