/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Ico, { paths } from './Ico';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { useSettings } from '../contexts/SettingsContext';
import { fetchApartments } from '../services/supabaseService';

export default function Footer() {
  const { lang } = useLang();
  const T = useT(lang);
  const F = T.footer;
  const { settings } = useSettings();
  const [expandedSection, setExpandedSection] = useState(null);
  const [apartments, setApartments] = useState([]);

  useEffect(() => {
    fetchApartments().then(data => {
      if (data) setApartments(data);
    });
  }, []);

  const phone = (settings?.site_phone || 'XXX XXX XXX').replace(/^\+34\s?/, '');
  const email = settings?.site_email || 'info@apartamentosillapancha.com';
  const address = settings?.site_address || 'Ribadeo, Lugo, Galicia';

  const toggleSection = section => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <footer className="bg-navy text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Brand Section */}
          <div>
            <span className="text-2xl font-serif font-bold text-white block mb-4">Illa Pancha</span>
            <p className="text-sm text-gray-400 mb-6">{F.tagline}</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Ico d={paths.phone} size={13} color="rgba(255,255,255,0.4)" />
                <span className="text-sm">{phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Ico d={paths.mail} size={13} color="rgba(255,255,255,0.4)" />
                <span className="text-sm">{email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Ico d={paths.map} size={13} color="rgba(255,255,255,0.4)" />
                <span className="text-sm">{address}</span>
              </div>
            </div>
          </div>

          {/* Apartments Section */}
          <div>
            <button
              className="w-full text-left font-semibold text-white cursor-pointer flex justify-between items-center hover:text-teal transition-colors md:pb-2 md:border-0"
              onClick={() => toggleSection('apartments')}
              aria-expanded={expandedSection === 'apartments'}
            >
              {T.nav.apartments}
              <span
                className={`text-lg transition-transform md:hidden ${expandedSection === 'apartments' ? 'rotate-45' : ''}`}
              >
                +
              </span>
            </button>
            <div
              className={`flex flex-col gap-3 pl-0 max-h-0 overflow-hidden transition-all duration-300 md:max-h-full md:overflow-visible ${expandedSection === 'apartments' ? 'max-h-64 mt-3' : 'md:mt-4'}`}
            >
              {apartments.map(apt => (
                <Link
                  key={apt.slug}
                  to={`/apartamentos/${apt.slug}`}
                  className="text-gray-300 hover:text-teal transition-colors text-sm"
                >
                  {apt.name}
                </Link>
              ))}
              <Link
                to="/apartamentos"
                className="text-gray-300 hover:text-teal transition-colors text-sm"
              >
                {T.home.viewAll}
              </Link>
            </div>
          </div>

          {/* Info Section */}
          <div>
            <button
              className="w-full text-left font-semibold text-white cursor-pointer flex justify-between items-center hover:text-teal transition-colors md:pb-2 md:border-0"
              onClick={() => toggleSection('info')}
              aria-expanded={expandedSection === 'info'}
            >
              {F.infoCol}
              <span
                className={`text-lg transition-transform md:hidden ${expandedSection === 'info' ? 'rotate-45' : ''}`}
              >
                +
              </span>
            </button>
            <div
              className={`flex flex-col gap-3 pl-0 max-h-0 overflow-hidden transition-all duration-300 md:max-h-full md:overflow-visible ${expandedSection === 'info' ? 'max-h-64 mt-3' : 'md:mt-4'}`}
            >
              <Link
                to="/nosotros"
                className="text-gray-300 hover:text-teal transition-colors text-sm"
              >
                {F.about}
              </Link>
              <Link
                to="/contacto"
                className="text-gray-300 hover:text-teal transition-colors text-sm"
              >
                {F.contact}
              </Link>
              <Link
                to="/apartamentos"
                className="text-gray-300 hover:text-teal transition-colors text-sm"
              >
                {F.availability}
              </Link>
              {/*<Link to="/mi-reserva" className="text-teal font-semibold hover:text-white transition-colors text-sm">{F.myReservation} ↗</Link>*/}
              <Link
                to="/como-llegar"
                className="text-gray-300 hover:text-teal transition-colors text-sm"
              >
                {F.howToGet}
              </Link>
              <Link to="/faq" className="text-gray-300 hover:text-teal transition-colors text-sm">
                {F.faq}
              </Link>
            </div>
          </div>

          {/* Book On Section */}
          <div>
            <button
              className="w-full text-left font-semibold text-white cursor-pointer flex justify-between items-center hover:text-teal transition-colors md:pb-2 md:border-0"
              onClick={() => toggleSection('book')}
              aria-expanded={expandedSection === 'book'}
            >
              {F.bookOn}
              <span
                className={`text-lg transition-transform md:hidden ${expandedSection === 'book' ? 'rotate-45' : ''}`}
              >
                +
              </span>
            </button>
            <div
              className={`flex flex-col gap-3 pl-0 max-h-0 overflow-hidden transition-all duration-300 md:max-h-full md:overflow-visible ${expandedSection === 'book' ? 'max-h-64 mt-3' : 'md:mt-4'}`}
            >
              {settings?.booking_com_url ? (
                <a
                  href={settings.booking_com_url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-teal transition-colors text-sm"
                >
                  Booking.com ↗
                </a>
              ) : (
                <span className="text-gray-300 text-sm cursor-default">Booking.com ↗</span>
              )}
              {/*<span className="text-gray-300 hover:text-teal transition-colors text-sm cursor-default">Airbnb ↗</span>*/}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="border-t border-gray-700 px-4 py-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-col md:flex-row gap-4">
          <span className="text-xs text-gray-500">{F.rights}</span>
          <div className="flex gap-6 flex-wrap justify-center md:justify-end">
            <Link
              to="/terminos"
              className="text-xs text-gray-400 hover:text-teal transition-colors"
            >
              {F.terms}
            </Link>
            <Link
              to="/privacidad"
              className="text-xs text-gray-400 hover:text-teal transition-colors"
            >
              {F.privacy}
            </Link>
            <Link
              to="/proteccion-datos"
              className="text-xs text-gray-400 hover:text-teal transition-colors"
            >
              {F.dataProtection}
            </Link>
            <Link to="/cookies" className="text-xs text-gray-400 hover:text-teal transition-colors">
              {F.cookies}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
