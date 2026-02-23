import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';

export default function Navbar({ onOpenBooking }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang } = useLang();
  const T = useT(lang);
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
    if (location.pathname === '/') {
      document.getElementById('apartments-section')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/apartamentos');
    }
  };

  return (
    <nav 
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white" 
      ref={navRef}
      style={{ boxShadow: scrolled ? '0 2px 20px rgba(15,23,42,0.08)' : 'none', transition: 'box-shadow 0.3s' }}
    >
      <Link to="/" className="text-2xl font-serif font-bold text-navy">Illa Pancha</Link>

      {/* Links - escritorio y menú móvil */}
      <div className={`flex flex-col md:flex-row md:items-center md:gap-8 absolute md:relative top-16 md:top-0 left-0 md:left-auto right-0 md:right-auto w-full md:w-auto bg-white md:bg-transparent px-6 md:px-0 py-4 md:py-0 border-b md:border-0 transition-all duration-300 ${mobileOpen ? 'max-h-64 opacity-100' : 'md:max-h-full md:opacity-100 max-h-0 opacity-0 overflow-hidden md:overflow-visible'}`}>
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
          className={`text-sm font-semibold transition-colors ${lang === 'ES' ? 'text-teal' : 'text-navy'}`}
          onClick={() => setLang('ES')}
          aria-label="Español"
        >ES</button>
        <span className="text-gray-300" aria-hidden="true">|</span>
        <button
          className={`text-sm font-semibold transition-colors ${lang === 'EN' ? 'text-teal' : 'text-navy'}`}
          onClick={() => setLang('EN')}
          aria-label="English"
        >EN</button>

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
