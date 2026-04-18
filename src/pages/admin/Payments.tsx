import { useState, useEffect } from 'react';
import { fetchSettings, updateSetting } from '../../services/supabaseService';
import { formatPrice } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { PanelPageHeader } from '../../components/panel';

export default function Pagos() {
  const toast = useToast();
  const [depositPct, setDepositPct] = useState(50);
  const [taxPct, setTaxPct] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const settings = await fetchSettings();
      if (typeof settings.payment_deposit_percentage === 'number') {
        setDepositPct(settings.payment_deposit_percentage);
      }
      if (typeof settings.tax_percentage === 'number') {
        setTaxPct(settings.tax_percentage);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      // 1. Save to site_settings para global
      await updateSetting('payment_deposit_percentage', depositPct, 'number');
      await updateSetting('tax_percentage', taxPct, 'number');

      // 2. Aplicar a todos los apartamentos para consistencia
      const { error } = await supabase
        .from('apartments')
        .update({ deposit_percentage: depositPct })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Todos

      if (error) throw error;

      toast.success('Configuración de pagos guardada correctamente');
    } catch (err) {
      console.error('Error FULL saving payment settings:', err);
      const e = err as { code?: string; message?: string };
      const isRLS = e.code === '42501' || e.message?.includes('policy');
      toast.error(
        `Error al guardar: ${e.message}${isRLS ? ' (Revisa permisos RLS en Supabase)' : ''}`
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="panel-page-content">Cargando configuración...</div>;

  return (
    <div className="panel-page-content">
      <PanelPageHeader title="Configuración de pagos" subtitle="Modelo tarjeta + efectivo" />

      <div className="space-y-4">
        <div className="panel-card max-w-3xl">
          <div className="font-serif text-xl text-navy mb-1.5">
            Porcentaje del depósito con tarjeta
          </div>
          <div className="text-xs panel-text-muted mb-7">
            El resto se cobra en efectivo al llegar al apartamento
          </div>

          <div className="flex items-center gap-6 mb-7">
            <input
              type="range"
              className="slider flex-1 h-1.5 rounded-full appearance-none bg-slate-200"
              min={10}
              max={100}
              step={5}
              value={depositPct}
              onChange={e => setDepositPct(+e.target.value)}
            />
            <div className="text-center flex-shrink-0">
              <div className="font-serif text-5xl text-navy leading-none">{depositPct}%</div>
              <div className="text-xs panel-text-muted">tarjeta</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-blue-700 mb-2">
                💳 Tarjeta ahora
              </div>
              <div className="font-serif text-3xl text-blue-900">{depositPct}%</div>
              <div className="text-xs text-blue-600 mt-1">
                Ej: {formatPrice(Math.round((1020 * depositPct) / 100))} de {formatPrice(1020)}
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-2">
                💵 Efectivo al llegar
              </div>
              <div className="font-serif text-3xl text-amber-900">{100 - depositPct}%</div>
              <div className="text-xs text-amber-700 mt-1">
                Ej: {formatPrice(Math.round((1020 * (100 - depositPct)) / 100))} de{' '}
                {formatPrice(1020)}
              </div>
            </div>
          </div>
        </div>

        <div className="panel-card max-w-3xl">
          <div className="font-serif text-xl text-navy mb-1.5">Porcentaje de impuestos (IVA)</div>
          <div className="text-xs panel-text-muted mb-7">
            Este porcentaje se aplicará al precio total de la estancia en el momento del pago
          </div>

          <div className="flex items-center gap-6 mb-7">
            <input
              type="range"
              className="slider flex-1 h-1.5 rounded-full appearance-none bg-slate-200"
              min={0}
              max={25}
              step={1}
              value={taxPct}
              onChange={e => setTaxPct(+e.target.value)}
            />
            <div className="text-center flex-shrink-0 min-w-[60px]">
              <div className="font-serif text-5xl text-navy leading-none">{taxPct}%</div>
              <div className="text-xs panel-text-muted">impuestos</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 max-w-3xl">
        <span className="text-xs panel-text-muted">
          Configuración actual: {depositPct}% tarjeta · {100 - depositPct}% efectivo
        </span>
        <button className="panel-btn panel-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  );
}
