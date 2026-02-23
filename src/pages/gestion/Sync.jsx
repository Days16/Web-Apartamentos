import { useState } from 'react';

const syncData = [
  { apt: 'Apt. Cantábrico', bk: 'hace 12 min', ab: 'hace 8 min', ok: true },
  { apt: 'Apt. Ribadeo', bk: 'hace 15 min', ab: 'hace 15 min', ok: true },
  { apt: 'Apt. Illa Pancha', bk: 'Error — URL caducada', ab: 'hace 18 min', ok: false },
  { apt: 'Apt. Eo', bk: 'hace 22 min', ab: 'hace 22 min', ok: true },
  { apt: 'Apt. Castro', bk: 'hace 28 min', ab: 'hace 28 min', ok: true },
  { apt: 'Apt. Pedrido', bk: 'hace 30 min', ab: 'hace 30 min', ok: true },
  { apt: 'Apt. Figueirido', bk: 'hace 31 min', ab: 'hace 31 min', ok: true },
  { apt: 'Apt. San Damián', bk: 'hace 32 min', ab: 'hace 32 min', ok: true },
];

export default function Sync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('hace 4 min');

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSync('ahora mismo');
    }, 2000);
  };

  return (
    <>
      <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8 border-b-2 border-gray-200">
        <div>
          <div className="text-2xl font-bold text-gray-800">Sincronización iCal</div>
          <div className="text-gray-500 text-sm mt-1">
            Sync automático cada 30 min · Última vez: {lastSync}
          </div>
        </div>
        <button
          className={`px-4 py-2 text-white rounded font-medium transition-colors ${syncing ? 'bg-slate-500 cursor-not-allowed' : 'bg-[#1a5f6e] hover:bg-opacity-90 cursor-pointer'}`}
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? '⟳ Sincronizando...' : 'Sincronizar todo ahora'}
        </button>
      </div>

      <div className="px-8 pb-8">
        {/* Aviso error */}
        <div className="bg-red-50 border border-red-200/50 p-3 mb-4 rounded flex items-center gap-3 text-sm">
          <span className="text-red-700 font-semibold">⚠</span>
          <span className="text-red-900">
            <strong>Apt. Illa Pancha · Booking.com:</strong> URL de iCal caducada. Es necesario renovarla desde el panel de Booking para evitar dobles reservas.
          </span>
          <a href="/admin/ical" className="ml-auto text-red-700 text-xs font-bold tracking-widest uppercase hover:underline">
            Solucionar →
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden text-sm">
          {syncData.map((s, i) => (
            <div
              key={i}
              className="grid grid-cols-[1.5fr_2fr_2fr_auto] gap-6 items-center px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-slate-900">{s.apt}</div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">
                  Booking.com
                </span>
                <span className={`text-xs ${s.bk.startsWith('Error') ? 'text-red-600' : 'text-slate-700'}`}>
                  {s.bk}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">
                  Airbnb
                </span>
                <span className="text-xs text-slate-700">{s.ab}</span>
              </div>

              <div className="flex gap-2 items-center">
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider ${s.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {s.ok ? 'OK' : 'Error'}
                </span>
                <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors text-xs font-medium">
                  Sync
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Ayuda */}
        <div className="mt-6 bg-slate-50 p-6 rounded-lg">
          <div className="font-serif text-xl text-slate-900 mb-2">
            ¿Cómo funciona la sincronización?
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Nuestra web importa los calendarios iCal de Booking.com y Airbnb cada 30 minutos para bloquear automáticamente las fechas ya reservadas. También puedes sincronizar manualmente en cualquier momento.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-1.5">
                Importación (Booking/Airbnb → Tu web)
              </div>
              <div className="text-sm text-slate-700 leading-relaxed">
                Cada 30 min se descarga el .ics de cada plataforma y se bloquean esas fechas en tu calendario.
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-1.5">
                Exportación (Tu web → Booking/Airbnb)
              </div>
              <div className="text-sm text-slate-700 leading-relaxed">
                Tu web genera URLs iCal para cada apartamento que debes configurar en Booking y Airbnb.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
