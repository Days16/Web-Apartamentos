import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useCurrency, CURRENCIES } from '../contexts/CurrencyContext';
import type { Lang } from '../types';

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'ES', label: 'Español', flag: '🇪🇸' },
  { code: 'EN', label: 'English', flag: '🇬🇧' },
  { code: 'FR', label: 'Français', flag: '🇫🇷' },
  { code: 'DE', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'PT', label: 'Português', flag: '🇵🇹' },
];

export default function Navbar({ onOpenBooking: _onOpenBooking }: { onOpenBooking?: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  const { lang, setLang } = useLang();
  const T = useT(lang);
  const { dark, toggle } = useTheme();
  const { settings } = useSettings();
  const { currency, setCurrency } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileOpen && navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
      if (langOpen && langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
      if (currencyOpen && currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setCurrencyOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileOpen, langOpen, currencyOpen]);

  // Prevent scroll when menu is open
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

  const isActive = (path: string) => {
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
      className={`sticky z-50 flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 dark:border-b dark:border-slate-700 transition-[box-shadow] duration-300 ${scrolled ? 'shadow-[0_2px_20px_rgba(15,23,42,0.08)] dark:shadow-slate-900/50' : 'shadow-none'}`}
      style={{ top: 'var(--banner-height, 0px)' }}
      ref={navRef}
    >
      <Link to="/">
        <picture>
          <source srcSet="/logo_lineas.webp" type="image/webp" />
          <img src="/logo_lineas.png" alt="Illa Pancha" className="h-10 w-auto" />
        </picture>
      </Link>

      {/* Links - desktop and mobile menu */}
      <div
        className={`flex flex-col md:flex-row md:items-center md:gap-8 absolute top-16 md:top-1/2 md:-translate-y-1/2 left-0 md:left-1/2 md:-translate-x-1/2 right-0 md:right-auto w-full md:w-auto bg-white dark:bg-slate-900 dark:border-slate-700 md:bg-transparent md:dark:bg-transparent px-6 md:px-0 py-4 md:py-0 border-b md:border-0 transition-all duration-300 ${mobileOpen ? 'max-h-64 opacity-100' : 'md:max-h-full md:opacity-100 max-h-0 opacity-0 overflow-hidden md:overflow-visible'}`}
      >
        <Link
          to="/apartamentos"
          className={`py-2 md:py-0 text-navy dark:text-slate-200 hover:text-teal transition-colors font-medium ${isActive('/apartamentos') ? 'text-teal border-b-2 border-teal' : ''}`}
        >
          {T.nav.apartments}
        </Link>
        <Link
          to="/nosotros"
          className={`py-2 md:py-0 text-navy dark:text-slate-200 hover:text-teal transition-colors font-medium ${isActive('/nosotros') ? 'text-teal border-b-2 border-teal' : ''}`}
        >
          {T.nav.ribadeo}
        </Link>
        <span
          className="py-2 md:py-0 text-navy dark:text-slate-200 hover:text-teal transition-colors font-medium cursor-pointer"
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
        <Link
          to="/contacto"
          className={`py-2 md:py-0 text-navy dark:text-slate-200 hover:text-teal transition-colors font-medium ${isActive('/contacto') ? 'text-teal border-b-2 border-teal' : ''}`}
        >
          {T.nav.contact}
        </Link>

        {/* Book button visible only in mobile menu */}
        <button
          className="md:hidden bg-teal text-white px-5 py-3 rounded hover:bg-teal-600 transition-all font-semibold mt-2 w-full"
          onClick={handleBook}
        >
          {T.nav.book}
        </button>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        {/* Selector de idioma */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(o => !o)}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-200 hover:text-teal transition-colors"
            aria-label="Cambiar idioma"
          >
            <span>{LANGS.find(l => l.code === lang)?.flag}</span>
            <span className="text-teal">{lang}</span>
            <svg
              className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {langOpen && (
            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-50 min-w-[140px]">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code);
                    setLangOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 ${lang === l.code ? 'font-semibold text-teal bg-teal/5' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  <span className="text-base">{l.flag}</span>
                  <span>{l.label}</span>
                  {lang === l.code && <span className="ml-auto text-teal text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={currencyRef}>
          <button
            onClick={() => setCurrencyOpen(o => !o)}
            className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-teal transition-colors px-2 py-1 rounded border border-slate-200 dark:border-slate-600 hover:border-teal"
            aria-label="Cambiar moneda"
          >
            <span>{CURRENCIES.find(c => c.code === currency)?.symbol}</span>
            <span>{currency}</span>
            <svg
              className={`w-2.5 h-2.5 transition-transform ${currencyOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {currencyOpen && (
            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-50 min-w-[150px]">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCurrency(c.code);
                    setCurrencyOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 ${currency === c.code ? 'font-semibold text-teal bg-teal/5' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  <span className="w-5 text-center font-bold">{c.symbol}</span>
                  <span>{c.label}</span>
                  {currency === c.code && <span className="ml-auto text-teal text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={toggle}
          aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
          className="text-slate-900 dark:text-slate-200 hover:text-teal transition-colors p-1"
        >
          {dark ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
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
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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

        {/* Hamburger - mobile only */}
        <button
          className="md:hidden flex flex-col gap-1.5 ml-4"
          onClick={() => setMobileOpen(o => !o)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          <span
            className={`w-6 h-0.5 bg-navy dark:bg-white transition-all transform origin-center ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`}
          />
          <span
            className={`w-6 h-0.5 bg-navy dark:bg-white transition-all ${mobileOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`w-6 h-0.5 bg-navy dark:bg-white transition-all transform origin-center ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`}
          />
        </button>
      </div>
    </nav>
  );
}
