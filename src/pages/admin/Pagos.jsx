import { useState, useEffect } from 'react';
import { fetchSettings, updateSetting } from '../../services/supabaseService';
import { formatDateShort, formatPrice } from '../../utils/format';
import { supabase } from '../../lib/supabase';

export default function Pagos() {
  const [depositPct, setDepositPct] = useState(50);
  const [taxPct, setTaxPct] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const settings = await fetchSettings();
      if (settings.payment_deposit_percentage !== undefined) {
        setDepositPct(settings.payment_deposit_percentage);
      }
      if (settings.tax_percentage !== undefined) {
        setTaxPct(settings.tax_percentage);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      // 1. Guardar en site_settings para global
      await updateSetting('payment_deposit_percentage', depositPct, 'number');
      await updateSetting('tax_percentage', taxPct, 'number');

      // 2. Aplicar a todos los apartamentos para consistencia
      const { error } = await supabase
        .from('apartments')
        .update({ deposit_percentage: depositPct })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Todos

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error FULL saving payment settings:', err);
      const isRLS = err.code === '42501' || err.message?.includes('policy');
      alert(`Error al guardar: ${err.message}${isRLS ? '\n\nTIP: Esto suele ser un problema de permisos RLS en Supabase. Revisa el SQL de configuración.' : ''}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10">Cargando configuración...</div>;

  return (
    <>
      <div className="pl-6 pr-6 py-6 border-b border-gray-200 bg-white">
        <div>
          <div className="text-2xl font-bold text-navy">Configuración de pagos</div>
          <div className="text-sm text-gray-600 mt-1">Modelo tarjeta + efectivo</div>
        </div>
      </div>

      <div className="p-6 bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-3xl mb-4">
          <div className="font-serif text-xl text-navy mb-1.5">
            Porcentaje del depósito con tarjeta
          </div>
          <div className="text-xs text-slate-600 mb-7">
            El resto se cobra en efectivo al llegar al apartamento
          </div>

          <div className="flex items-center gap-6 mb-7">
            <input
              type="range"
              className="slider flex-1"
              min={10}
              max={100}
              step={5}
              value={depositPct}
              onChange={e => setDepositPct(+e.target.value)}
              style={{ height: '6px', borderRadius: '3px', appearance: 'none', background: '#e2e8f0' }}
            />
            <div className="text-center flex-shrink-0">
              <div className="font-serif text-5xl text-navy leading-none">
                {depositPct}%
              </div>
              <div className="text-xs text-slate-600">tarjeta</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-0.5 mb-6">
            <div className="bg-blue-50 p-6">
              <div className="text-xs font-bold uppercase tracking-widest text-blue-700 mb-2">
                💳 Tarjeta ahora
              </div>
              <div className="font-serif text-3xl text-blue-900">{depositPct}%</div>
              <div className="text-xs text-blue-700 mt-1">
                Ej: {formatPrice(Math.round(1020 * depositPct / 100))} de {formatPrice(1020)}
              </div>
            </div>
            <div className="bg-amber-50 p-6">
              <div className="text-xs font-bold uppercase tracking-widest text-amber-900 mb-2">
                💵 Efectivo al llegar
              </div>
              <div className="font-serif text-3xl text-amber-900">{100 - depositPct}%</div>
              <div className="text-xs text-amber-900 mt-1">
                Ej: {formatPrice(Math.round(1020 * (100 - depositPct) / 100))} de {formatPrice(1020)}
              </div>
            </div>
          </div>

          {success && (
            <div className="py-3 px-4 rounded-md bg-green-50 text-green-800 text-xs border border-green-200 mb-4">
              ✓ Configuración guardada correctamente
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-3xl mb-24">
          <div className="font-serif text-xl text-navy mb-1.5">
            Porcentaje de impuestos (IVA)
          </div>
          <div className="text-xs text-slate-600 mb-7">
            Este porcentaje se aplicará al precio total de la estancia en el momento del pago
          </div>

          <div className="flex items-center gap-6 mb-7">
            <input
              type="range"
              className="slider flex-1"
              min={0}
              max={25}
              step={1}
              value={taxPct}
              onChange={e => setTaxPct(+e.target.value)}
              style={{ height: '6px', borderRadius: '3px', appearance: 'none', background: '#e2e8f0' }}
            />
            <div className="text-center flex-shrink-0 min-w-[60px]">
              <div className="font-serif text-5xl text-navy leading-none">
                {taxPct}%
              </div>
              <div className="text-xs text-slate-600">impuestos</div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 right-0 left-0 bg-white border-t border-gray-200 py-4 px-6 flex justify-between items-center z-50">
        <span className="text-xs text-gray-600">Configuración actual: {depositPct}% tarjeta · {100 - depositPct}% efectivo</span>
        <button
          className="px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer border-0 bg-teal-600 text-white hover:bg-teal-700"
          onClick={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </>
  );
}
