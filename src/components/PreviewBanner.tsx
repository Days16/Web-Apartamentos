import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

export default function PreviewBanner() {
  const [active, setActive] = useState(false);
  const { user } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {
    const isMaintenanceOn = settings?.maintenance_mode === true;
    const isPreviewSession = sessionStorage.getItem('maintenance_preview') === 'true';
    const isAdmin = !!user;

    setActive(isMaintenanceOn && (isPreviewSession || isAdmin));
  }, [user, settings]);

  if (!active) return null;

  const handleExit = () => {
    sessionStorage.removeItem('maintenance_preview');
    window.location.href = '/admin/configuracion';
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-navy text-white px-6 py-3 rounded-full flex items-center gap-4 shadow-2xl z-[9999] border border-white/10">
      <div className="flex items-center gap-2">
        <span className="text-lg">👁️</span>
        <span className="text-xs font-medium tracking-tight">MODO VISTA PREVIA ACTIVO</span>
      </div>

      <div className="w-px h-4 bg-white/20" />

      <button
        onClick={handleExit}
        className="bg-red-700 text-white border-0 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer hover:bg-red-800 transition-all"
      >
        Salir y Volver al Panel
      </button>
    </div>
  );
}
