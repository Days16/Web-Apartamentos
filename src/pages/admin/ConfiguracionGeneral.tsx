/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { fetchSettings, updateSetting, logAudit } from '../../services/supabaseService';
import { formatPrice } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import Ico, { paths } from '../../components/Ico';
import { useSettings } from '../../contexts/SettingsContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';

export default function ConfiguracionGeneral() {
  const { refreshSettings } = useSettings();
  const toast = useToast();
  const [settings, setSettings] = useState({
    cancellation_free_days: 14,
    payment_deposit_percentage: 50,
    tax_percentage: 10,
    maintenance_mode: false,
    booking_mode: 'modal',
    booking_com_url: '',
    checkin_lock_code: '',
    checkin_access_info: '',
    checkin_house_rules: '',
    contact_phone: '',
    contact_whatsapp: '',
    property_address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchSettings();
        setSettings({
          cancellation_free_days: data.cancellation_free_days ?? 14,
          payment_deposit_percentage: data.payment_deposit_percentage ?? 50,
          tax_percentage: data.tax_percentage ?? 10,
          maintenance_mode: data.maintenance_mode ?? false,
          booking_mode: data.booking_mode ?? 'modal',
          booking_com_url: data.booking_com_url ?? '',
          checkin_lock_code: data.checkin_lock_code ?? '',
          checkin_access_info: data.checkin_access_info ?? '',
          checkin_house_rules: data.checkin_house_rules ?? '',
          contact_phone: data.contact_phone ?? '',
          contact_whatsapp: data.contact_whatsapp ?? '',
          property_address: data.property_address ?? '',
        });
      } catch (err) {
        console.error('Error cargando ajustes:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // 1. Guardar en site_settings
      await Promise.all([
        updateSetting('cancellation_free_days', settings.cancellation_free_days, 'number'),
        updateSetting('payment_deposit_percentage', settings.payment_deposit_percentage, 'number'),
        updateSetting('tax_percentage', settings.tax_percentage, 'number'),
        updateSetting('maintenance_mode', settings.maintenance_mode, 'boolean'),
        updateSetting('booking_mode', settings.booking_mode, 'string'),
        updateSetting('booking_com_url', settings.booking_com_url, 'string'),
        updateSetting('checkin_lock_code', settings.checkin_lock_code, 'string'),
        updateSetting('checkin_access_info', settings.checkin_access_info, 'string'),
        updateSetting('checkin_house_rules', settings.checkin_house_rules, 'string'),
        updateSetting('contact_phone', settings.contact_phone, 'string'),
        updateSetting('contact_whatsapp', settings.contact_whatsapp, 'string'),
        updateSetting('property_address', settings.property_address, 'string'),
      ]);

      // 2. Sincronizar con la tabla de apartamentos (Propagación manual)
      // Actualizamos todos los apartamentos para que usen estos nuevos valores por defecto
      const { error: syncError } = await supabase
        .from('apartments')
        .update({
          cancellation_days: settings.cancellation_free_days,
          deposit_percentage: settings.payment_deposit_percentage,
        })
        .neq('slug', 'template'); // Actualizar todos los reales

      if (syncError) throw syncError;

      // 3. Refrescar el contexto global
      await refreshSettings();

      logAudit('update_settings', 'settings', 'global');
      toast.success('Configuración guardada y aplicada correctamente');
    } catch (err) {
      console.error('Error guardando configuración:', err);
      toast.error('Error al guardar los cambios: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-gray-500">Cargando configuración global...</div>;

  return (
    <>
      <div className="pb-24">
        {/* HEADER */}
        <div className="pl-6 pr-6 py-8 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Ico d={paths.settings} size={24} color="currentColor" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy">Ajustes Generales</h1>
              <p className="text-sm text-gray-500">
                Configura las políticas globales de la plataforma
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
          {/* POLÍTICA DE CANCELACIÓN */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 flex items-start gap-4">
              <div className="mt-1">
                <Ico d={paths.calendar} size={20} color="#64748b" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-navy">Política de Cancelación</h2>
                <p className="text-xs text-gray-500">
                  Define cuántos días antes el cliente puede cancelar gratis
                </p>
              </div>
            </div>
            <div className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 w-full translate-y-2">
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={settings.cancellation_free_days}
                    onChange={e => handleChange('cancellation_free_days', +e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">
                    <span>1 día</span>
                    <span>30 días</span>
                    <span>60 días</span>
                  </div>
                </div>
                <div className="w-32 h-32 rounded-2xl bg-navy text-white flex flex-col items-center justify-center shadow-lg transform rotate-2">
                  <span className="text-4xl font-serif font-bold">
                    {settings.cancellation_free_days}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold">
                    Días
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="text-[10px] font-bold text-green-700 uppercase mb-1">
                    Más de {settings.cancellation_free_days} días
                  </div>
                  <div className="text-lg font-serif font-bold text-green-900">Reembolso 100%</div>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                  <div className="text-[10px] font-bold text-red-700 uppercase mb-1">
                    Menos de {settings.cancellation_free_days} días
                  </div>
                  <div className="text-lg font-serif font-bold text-red-900">Sin reembolso</div>
                </div>
              </div>
            </div>
          </section>

          {/* PAGOS E IMPUESTOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-100 flex items-start gap-4">
                <div className="mt-1">
                  <Ico d={paths.tag} size={20} color="#64748b" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy">Pagos y Reservas</h2>
                  <p className="text-xs text-gray-500">Distribución de pago Tarjeta / Efectivo</p>
                </div>
              </div>
              <div className="p-8">
                <div className="mb-6">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-4">
                    Deposito con Tarjeta: {settings.payment_deposit_percentage}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.payment_deposit_percentage}
                    onChange={e => handleChange('payment_deposit_percentage', +e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-xs text-blue-700 font-medium">💳 Pago online</span>
                    <span className="text-lg font-bold text-blue-900">
                      {settings.payment_deposit_percentage}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                    <span className="text-xs text-amber-700 font-medium">💵 Pago en llegada</span>
                    <span className="text-lg font-bold text-amber-900">
                      {100 - settings.payment_deposit_percentage}%
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-100 flex items-start gap-4">
                <div className="mt-1">
                  <Ico d={paths.check} size={20} color="#64748b" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy">Tasas e Impuestos</h2>
                  <p className="text-xs text-gray-500">Porcentaje aplicado al total bruto</p>
                </div>
              </div>
              <div className="p-8">
                <div className="mb-6">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-4">
                    IVA / Tasas: {settings.tax_percentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={settings.tax_percentage}
                    onChange={e => handleChange('tax_percentage', +e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>
                <div className="p-5 bg-navy rounded-xl text-white">
                  <div className="text-[10px] font-bold opacity-50 uppercase mb-2">
                    Simulación de precio
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs opacity-80">Subtotal: {formatPrice(100)}</div>
                      <div className="text-xs opacity-80">Extras: {formatPrice(20)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-teal-400 font-bold">
                        +{settings.tax_percentage}% Impuestos
                      </div>
                      <div className="text-2xl font-serif font-bold">
                        {formatPrice(Math.round(120 * (1 + settings.tax_percentage / 100)))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* MODO BOTONES DE RESERVA */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 flex items-start gap-4">
              <div className="mt-1">
                <Ico d={paths.tag} size={20} color="#64748b" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-navy">Botones de Reserva</h2>
                <p className="text-xs text-gray-500">
                  Decide qué ocurre cuando un cliente pulsa "Reservar" en la web
                </p>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Selector de modo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => handleChange('booking_mode', 'modal')}
                  className={`flex flex-col items-start gap-2 p-5 rounded-xl border-2 text-left transition-all ${settings.booking_mode !== 'redirect' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${settings.booking_mode !== 'redirect' ? 'border-teal-600' : 'border-gray-300'}`}
                    >
                      {settings.booking_mode !== 'redirect' && (
                        <div className="w-2 h-2 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <span className="font-bold text-navy text-sm">Modal de reserva</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed pl-6">
                    Abre el formulario de reserva integrado en la web (comportamiento actual)
                  </p>
                </button>

                <button
                  onClick={() => handleChange('booking_mode', 'redirect')}
                  className={`flex flex-col items-start gap-2 p-5 rounded-xl border-2 text-left transition-all ${settings.booking_mode === 'redirect' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${settings.booking_mode === 'redirect' ? 'border-teal-600' : 'border-gray-300'}`}
                    >
                      {settings.booking_mode === 'redirect' && (
                        <div className="w-2 h-2 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <span className="font-bold text-navy text-sm">Página de reserva</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed pl-6">
                    Redirige a <code className="bg-gray-100 px-1 rounded">/reservar</code> con
                    formulario de contacto directo
                  </p>
                </button>
              </div>

              {/* Preview */}
              {settings.booking_mode === 'redirect' && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="2"
                    className="mt-0.5 flex-shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Los botones "Reservar" de toda la web redirigirán a <strong>/reservar</strong>{' '}
                    con el formulario de contacto.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* CHECK-IN Y CONTACTO */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 flex items-start gap-4">
              <div className="mt-1">
                <Ico d={paths.lock} size={20} color="#64748b" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-navy">Check-in y Contacto</h2>
                <p className="text-xs text-gray-500">
                  Se muestra al huésped 48h antes de su llegada en el portal de reservas
                </p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Código de cerradura
                  </label>
                  <input
                    type="text"
                    value={settings.checkin_lock_code}
                    onChange={e => handleChange('checkin_lock_code', e.target.value)}
                    placeholder="Ej: 4281"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg font-mono text-navy focus:outline-none focus:ring-2 focus:ring-teal/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Dirección del alojamiento
                  </label>
                  <input
                    type="text"
                    value={settings.property_address}
                    onChange={e => handleChange('property_address', e.target.value)}
                    placeholder="Ej: Calle Illa Pancha 1, 27700 Ribadeo"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-navy focus:outline-none focus:ring-2 focus:ring-teal/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Teléfono de contacto
                  </label>
                  <input
                    type="text"
                    value={settings.contact_phone}
                    onChange={e => handleChange('contact_phone', e.target.value)}
                    placeholder="Ej: +34 600 000 000"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-navy focus:outline-none focus:ring-2 focus:ring-teal/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    WhatsApp (solo dígitos)
                  </label>
                  <input
                    type="text"
                    value={settings.contact_whatsapp}
                    onChange={e => handleChange('contact_whatsapp', e.target.value)}
                    placeholder="Ej: 34600000000"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-navy focus:outline-none focus:ring-2 focus:ring-teal/20"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Prefijo + número sin espacios ni signos. Ej: 34600000000
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Instrucciones de acceso
                </label>
                <textarea
                  value={settings.checkin_access_info}
                  onChange={e => handleChange('checkin_access_info', e.target.value)}
                  rows={2}
                  placeholder="Ej: La caja de llaves está junto a la puerta principal. Introduce el código en el teclado numérico."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-navy focus:outline-none focus:ring-2 focus:ring-teal/20 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Normas de la finca
                </label>
                <textarea
                  value={settings.checkin_house_rules}
                  onChange={e => handleChange('checkin_house_rules', e.target.value)}
                  rows={4}
                  placeholder="Ej: No se permiten mascotas. Horario de silencio de 23:00 a 08:00. Check-out antes de las 12:00."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-navy focus:outline-none focus:ring-2 focus:ring-teal/20 resize-none"
                />
              </div>
            </div>
          </section>

          {/* ESTADO DEL SITIO */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <Ico
                    d={paths.lock}
                    size={20}
                    color={settings.maintenance_mode ? '#e11d48' : '#64748b'}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy">Modo Mantenimiento</h2>
                  <p className="text-xs text-gray-500">
                    Si se activa, los clientes verán una pantalla de "Próximamente"
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleChange('maintenance_mode', !settings.maintenance_mode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.maintenance_mode ? 'bg-red-500' : 'bg-gray-200'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.maintenance_mode ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </section>
        </div>

        {/* FOOTER ACCIONES */}
        <div className="fixed bottom-0 right-0 left-0 lg:left-64 bg-white border-t border-gray-200 py-4 px-8 flex justify-end items-center z-40">
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={saving}
            className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-900/10 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Guardar configuración?"
        message="Se aplicarán los cambios globales de cancelación, depósito e impuestos a todos los apartamentos."
        onConfirm={() => {
          setConfirmOpen(false);
          handleSave();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
