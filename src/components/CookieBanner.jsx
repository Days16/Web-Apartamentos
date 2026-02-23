import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [accepted, setAccepted] = useState(() => {
    return localStorage.getItem('cookieConsent') !== null;
  });

  if (accepted) return null;

  const accept = (all) => {
    localStorage.setItem('cookieConsent', all ? 'all' : 'essential');
    setAccepted(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white py-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4 z-50 shadow-lg">
      <div className="text-sm leading-relaxed flex-1">
        Usamos cookies propias y de terceros para mejorar tu experiencia y analizar el tráfico.{' '}
        <Link to="/cookies" className="text-gold hover:opacity-80 transition-opacity">Más información →</Link>
      </div>
      <div className="flex gap-3">
        <button
          className="border border-white/25 text-white/55 text-xs bg-transparent px-4 py-2 rounded hover:opacity-80 transition-opacity cursor-pointer"
          onClick={() => accept(false)}
        >
          Solo esenciales
        </button>
        <button
          className="bg-gold text-navy border-0 px-5 py-2 text-xs font-bold tracking-widest uppercase cursor-pointer hover:opacity-90 transition-all"
          onClick={() => accept(true)}
        >
          Aceptar todas
        </button>
      </div>
    </div>
  );
}
