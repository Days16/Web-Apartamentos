import { useState, useEffect } from 'react';
import { fetchApartments } from '../../services/supabaseService';

export default function IcalAdmin() {
  const [apartments, setApartments] = useState([]);

  useEffect(() => {
    fetchApartments().then(setApartments);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8 border-b-2 border-gray-200">
        <div>
          <div className="text-2xl font-bold text-gray-800">Canales iCal</div>
          <div className="text-gray-500 text-sm mt-1">Gestiona la sincronización con Booking.com y Airbnb</div>
        </div>
      </div>

      <div className="px-8 pb-8">
        {apartments.map((a, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded shrink-0" style={{ background: a.gradient || '#1a5f6e' }} />
              <div className="font-semibold text-sm text-slate-900">{a.name}</div>
            </div>

            <div className="grid grid-cols-[80px_1fr_60px_auto] items-center gap-4 py-3 border-b border-gray-100">
              <div className="font-medium text-[11px] tracking-wider uppercase text-[#1A4A8B]">Booking</div>
              <div className="text-[11px] font-mono text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">
                {i < 3
                  ? `https://admin.booking.com/hotel/hoteladmin/ical.html?t=abc${i}xyz...`
                  : '— Sin configurar —'}
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider text-center ${i < 3 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {i < 3 ? 'OK' : 'Falta'}
              </span>
              <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-xs font-medium">
                {i < 3 ? 'Editar' : '+ Añadir'}
              </button>
            </div>

            <div className="grid grid-cols-[80px_1fr_60px_auto] items-center gap-4 py-3">
              <div className="font-medium text-[11px] tracking-wider uppercase text-[#C0392B]">Airbnb</div>
              <div className="text-[11px] font-mono text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">
                {i < 5
                  ? `https://www.airbnb.es/calendar/ical/${12340 + i}.ics?s=abc...`
                  : '— Sin configurar —'}
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider text-center ${i < 5 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {i < 5 ? 'OK' : 'Falta'}
              </span>
              <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-xs font-medium">
                {i < 5 ? 'Editar' : '+ Añadir'}
              </button>
            </div>
          </div>
        ))}

        {/* URLs de exportación */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <div className="font-serif text-xl text-slate-900 mb-2">
            URLs de exportación (tu web → plataformas)
          </div>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-4">
            Copia estas URLs y pégalas en la configuración de sincronización de Booking.com y Airbnb para que reciban tus reservas directas.
          </p>
          {apartments.slice(0, 3).map((a, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <div className="text-xs font-semibold w-[140px] shrink-0 text-slate-700">{a.name}</div>
              <div className="flex-1 text-[11px] font-mono bg-slate-50 px-2.5 py-1.5 text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap rounded">
                https://illapancha.com/api/ical/{a.slug}.ics
              </div>
              <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-xs font-medium">
                Copiar
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
