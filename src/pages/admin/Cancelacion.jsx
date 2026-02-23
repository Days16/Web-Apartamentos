import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchSettings, updateSetting } from '../../services/supabaseService';

export default function Cancelacion() {
  const [cancelDays, setCancelDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const settings = await fetchSettings();
      if (settings.cancellation_days !== undefined) {
        setCancelDays(settings.cancellation_days);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Bulk update cancellation days for all active apartments
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // 1. Guardar en site_settings
      await updateSetting('cancellation_days', cancelDays, 'number');

      // 2. Aplicar a todos los apartamentos
      const { error: updateError } = await supabase
        .from('apartments')
        .update({ cancellation_days: cancelDays })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // update all

      if (updateError) throw updateError;

      setSuccess('✓ Política guardada y aplicada a todos los apartamentos');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error FULL saving policy:', err);
      const isRLS = err.code === '42501' || err.message?.includes('policy');
      setError(`Error al guardar política: ${err.message}${isRLS ? '\n\nTIP: Esto suele ser un problema de permisos RLS en Supabase. Asegúrate de haber ejecutado el SQL de configuración.' : ''}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="pl-6 pr-6 py-6 border-b border-gray-200 bg-white">
        <div>
          <div className="text-2xl font-bold text-navy">Política de cancelación</div>
          <div className="text-sm text-gray-600 mt-1">Configura el reembolso del depósito</div>
        </div>
      </div>

      <div className="p-6 bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-3xl mb-4">
          <div className="font-serif text-xl text-navy mb-1.5">
            Días para cancelar con reembolso
          </div>
          <div className="text-xs text-slate-600 mb-7">
            Si el huésped cancela antes de este periodo, recupera el 100% del depósito
          </div>

          <div className="flex items-center gap-6 mb-7">
            <input
              type="range"
              className="slider"
              min={1}
              max={60}
              value={cancelDays}
              onChange={e => setCancelDays(+e.target.value)}
            />
            <div className="text-center flex-shrink-0">
              <div className="font-serif text-5xl text-navy leading-none">
                {cancelDays}
              </div>
              <div className="text-xs text-slate-600">días</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <div className="bg-green-50 p-6">
              <div className="text-xs font-bold text-green-700 mb-2">Cancela con más de {cancelDays} días</div>
              <div className="font-serif text-2xl text-green-900">100% reembolso</div>
            </div>
            <div className="bg-red-50 p-6">
              <div className="text-xs font-bold text-red-700 mb-2">Cancela con menos de {cancelDays} días</div>
              <div className="font-serif text-2xl text-red-900">Sin reembolso</div>
            </div>
          </div>

          <div className="bg-amber-50 p-4 mt-5 text-xs text-amber-900 leading-relaxed">
            ⚠️ Esta política se muestra al cliente antes de confirmar el pago. Los cambios solo aplican a nuevas reservas.
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 right-0 left-0 bg-white border-t border-gray-200 py-4 px-6 flex justify-between items-center z-50">
        <span className="text-xs text-gray-600">Política global: se aplicará a todos los apartamentos.</span>
        <button className="px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer border-0 bg-teal-600 text-white hover:bg-teal-700" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Guardando...' : 'Guardar política'}
        </button>
      </div>

      {/* NOTIFICACIONES */}
      {success && (
        <div className="fixed bottom-20 right-6 bg-green-500 text-white px-5 py-3 rounded-lg text-xs font-semibold z-[1001]">
          {success}
        </div>
      )}
      {error && (
        <div className="fixed bottom-20 right-6 bg-red-500 text-white px-5 py-3 rounded-lg text-xs font-semibold z-[1001]">
          ✗ {error}
        </div>
      )}
    </>
  );
}
