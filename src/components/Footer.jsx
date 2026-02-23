import { useState } from 'react';
import { Link } from 'react-router-dom';
import Ico, { paths } from './Ico';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';

export default function Footer() {
  const { lang } = useLang();
  const T = useT(lang);
  const F = T.footer;
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
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
                <span className="text-sm">+34 982 XXX XXX</span>
              </div>
              <div className="flex items-center gap-2">
                <Ico d={paths.mail} size={13} color="rgba(255,255,255,0.4)" />
                <span className="text-sm">info@illapancha.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Ico d={paths.map} size={13} color="rgba(255,255,255,0.4)" />
                <span className="text-sm">Ribadeo, Lugo, Galicia</span>
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
              <span className={`text-lg transition-transform md:hidden ${expandedSection === 'apartments' ? 'rotate-45' : ''}`}>+</span>
            </button>
            <div className={`flex flex-col gap-3 pl-0 max-h-0 overflow-hidden transition-all duration-300 md:max-h-full md:overflow-visible ${expandedSection === 'apartments' ? 'max-h-64 mt-3' : 'md:mt-4'}`}>
              {['Cantábrico', 'Ribadeo', 'Illa Pancha', 'Eo', 'Castro'].map(name => (
                <Link key={name} to="/apartamentos" className="text-gray-300 hover:text-teal transition-colors text-sm">Apt. {name}</Link>
              ))}
              <Link to="/apartamentos" className="text-gray-300 hover:text-teal transition-colors text-sm">{T.home.viewAll}</Link>
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
              <span className={`text-lg transition-transform md:hidden ${expandedSection === 'info' ? 'rotate-45' : ''}`}>+</span>
            </button>
            <div className={`flex flex-col gap-3 pl-0 max-h-0 overflow-hidden transition-all duration-300 md:max-h-full md:overflow-visible ${expandedSection === 'info' ? 'max-h-64 mt-3' : 'md:mt-4'}`}>
              <Link to="/nosotros" className="text-gray-300 hover:text-teal transition-colors text-sm">{F.about}</Link>
              <Link to="/contacto" className="text-gray-300 hover:text-teal transition-colors text-sm">{F.contact}</Link>
              <Link to="/apartamentos" className="text-gray-300 hover:text-teal transition-colors text-sm">{F.availability}</Link>
              <Link to="/mi-reserva" className="text-teal font-semibold hover:text-white transition-colors text-sm">{F.myReservation} ↗</Link>
              <span className="text-gray-300 hover:text-teal transition-colors text-sm cursor-default">{F.howToGet}</span>
              <span className="text-gray-300 hover:text-teal transition-colors text-sm cursor-default">{F.faq}</span>
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
              <span className={`text-lg transition-transform md:hidden ${expandedSection === 'book' ? 'rotate-45' : ''}`}>+</span>
            </button>
            <div className={`flex flex-col gap-3 pl-0 max-h-0 overflow-hidden transition-all duration-300 md:max-h-full md:overflow-visible ${expandedSection === 'book' ? 'max-h-64 mt-3' : 'md:mt-4'}`}>
              <span className="text-gray-300 hover:text-teal transition-colors text-sm cursor-default">Booking.com ↗</span>
              <span className="text-gray-300 hover:text-teal transition-colors text-sm cursor-default">Airbnb ↗</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="border-t border-gray-700 px-4 py-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-col md:flex-row gap-4">
          <span className="text-xs text-gray-500">{F.rights}</span>
          <div className="flex gap-6 flex-wrap justify-center md:justify-end">
            <Link to="/terminos" className="text-xs text-gray-400 hover:text-teal transition-colors">{F.terms}</Link>
            <Link to="/privacidad" className="text-xs text-gray-400 hover:text-teal transition-colors">{F.privacy}</Link>
            <Link to="/proteccion-datos" className="text-xs text-gray-400 hover:text-teal transition-colors">{F.dataProtection}</Link>
            <Link to="/cookies" className="text-xs text-gray-400 hover:text-teal transition-colors">{F.cookies}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
