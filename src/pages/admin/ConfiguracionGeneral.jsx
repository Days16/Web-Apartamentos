import { useState, useEffect } from 'react';
import { fetchSettings, updateSetting } from '../../services/supabaseService';
import { formatPrice } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import Ico, { paths } from '../../components/Ico';
import { useSettings } from '../../contexts/SettingsContext';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function ConfiguracionGeneral() {
    const { refreshSettings } = useSettings();
    const [settings, setSettings] = useState({
        cancellation_free_days: 14,
        payment_deposit_percentage: 50,
        tax_percentage: 10,
        maintenance_mode: false,
        booking_mode: 'modal',
        booking_com_url: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
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
                    booking_com_url: data.booking_com_url ?? ''
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
            setError(null);
            setSuccess(null);

            // 1. Guardar en site_settings
            await Promise.all([
                updateSetting('cancellation_free_days', settings.cancellation_free_days, 'number'),
                updateSetting('payment_deposit_percentage', settings.payment_deposit_percentage, 'number'),
                updateSetting('tax_percentage', settings.tax_percentage, 'number'),
                updateSetting('maintenance_mode', settings.maintenance_mode, 'boolean'),
                updateSetting('booking_mode', settings.booking_mode, 'string'),
                updateSetting('booking_com_url', settings.booking_com_url, 'string')
            ]);

            // 2. Sincronizar con la tabla de apartamentos (Propagación manual)
            // Actualizamos todos los apartamentos para que usen estos nuevos valores por defecto
            const { error: syncError } = await supabase
                .from('apartments')
                .update({
                    cancellation_days: settings.cancellation_free_days,
                    deposit_percentage: settings.payment_deposit_percentage
                })
                .neq('slug', 'template'); // Actualizar todos los reales

            if (syncError) throw syncError;

            // 3. Refrescar el contexto global
            await refreshSettings();

            setSuccess('✓ Configuración guardada y aplicada correctamente');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error guardando configuración:', err);
            setError('Error al guardar los cambios: ' + err.message);
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
                        <p className="text-sm text-gray-500">Configura las políticas globales de la plataforma</p>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">

                {/* POLÍTICA DE CANCELACIÓN */}
                <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-gray-100 flex items-start gap-4">
                        <div className="mt-1"><Ico d={paths.calendar} size={20} color="#64748b" /></div>
                        <div>
                            <h2 className="text-lg font-bold text-navy">Política de Cancelación</h2>
                            <p className="text-xs text-gray-500">Define cuántos días antes el cliente puede cancelar gratis</p>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1 w-full translate-y-2">
                                <input
                                    type="range" min="1" max="60"
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
                                <span className="text-4xl font-serif font-bold">{settings.cancellation_free_days}</span>
                                <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold">Días</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                                <div className="text-[10px] font-bold text-green-700 uppercase mb-1">Más de {settings.cancellation_free_days} días</div>
                                <div className="text-lg font-serif font-bold text-green-900">Reembolso 100%</div>
                            </div>
                            <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                                <div className="text-[10px] font-bold text-red-700 uppercase mb-1">Menos de {settings.cancellation_free_days} días</div>
                                <div className="text-lg font-serif font-bold text-red-900">Sin reembolso</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PAGOS E IMPUESTOS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-100 flex items-start gap-4">
                            <div className="mt-1"><Ico d={paths.tag} size={20} color="#64748b" /></div>
                            <div>
                                <h2 className="text-lg font-bold text-navy">Pagos y Reservas</h2>
                                <p className="text-xs text-gray-500">Distribución de pago Tarjeta / Efectivo</p>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="mb-6">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-4">Deposito con Tarjeta: {settings.payment_deposit_percentage}%</label>
                                <input
                                    type="range" min="10" max="100" step="5"
                                    value={settings.payment_deposit_percentage}
                                    onChange={e => handleChange('payment_deposit_percentage', +e.target.value)}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                    <span className="text-xs text-blue-700 font-medium">💳 Pago online</span>
                                    <span className="text-lg font-bold text-blue-900">{settings.payment_deposit_percentage}%</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                                    <span className="text-xs text-amber-700 font-medium">💵 Pago en llegada</span>
                                    <span className="text-lg font-bold text-amber-900">{100 - settings.payment_deposit_percentage}%</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-100 flex items-start gap-4">
                            <div className="mt-1"><Ico d={paths.check} size={20} color="#64748b" /></div>
                            <div>
                                <h2 className="text-lg font-bold text-navy">Tasas e Impuestos</h2>
                                <p className="text-xs text-gray-500">Porcentaje aplicado al total bruto</p>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="mb-6">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-4">IVA / Tasas: {settings.tax_percentage}%</label>
                                <input
                                    type="range" min="0" max="25" step="1"
                                    value={settings.tax_percentage}
                                    onChange={e => handleChange('tax_percentage', +e.target.value)}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                                />
                            </div>
                            <div className="p-5 bg-navy rounded-xl text-white">
                                <div className="text-[10px] font-bold opacity-50 uppercase mb-2">Simulación de precio</div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-xs opacity-80">Subtotal: {formatPrice(100)}</div>
                                        <div className="text-xs opacity-80">Extras: {formatPrice(20)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-teal-400 font-bold">+{settings.tax_percentage}% Impuestos</div>
                                        <div className="text-2xl font-serif font-bold">{formatPrice(Math.round(120 * (1 + settings.tax_percentage / 100)))}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>

                {/* MODO BOTONES DE RESERVA */}
                <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-gray-100 flex items-start gap-4">
                        <div className="mt-1"><Ico d={paths.tag} size={20} color="#64748b" /></div>
                        <div>
                            <h2 className="text-lg font-bold text-navy">Botones de Reserva</h2>
                            <p className="text-xs text-gray-500">Decide qué ocurre cuando un cliente pulsa "Reservar" en la web</p>
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
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${settings.booking_mode !== 'redirect' ? 'border-teal-600' : 'border-gray-300'}`}>
                                        {settings.booking_mode !== 'redirect' && <div className="w-2 h-2 rounded-full bg-teal-600" />}
                                    </div>
                                    <span className="font-bold text-navy text-sm">Modal de reserva</span>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed pl-6">Abre el formulario de reserva integrado en la web (comportamiento actual)</p>
                            </button>

                            <button
                                onClick={() => handleChange('booking_mode', 'redirect')}
                                className={`flex flex-col items-start gap-2 p-5 rounded-xl border-2 text-left transition-all ${settings.booking_mode === 'redirect' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${settings.booking_mode === 'redirect' ? 'border-teal-600' : 'border-gray-300'}`}>
                                        {settings.booking_mode === 'redirect' && <div className="w-2 h-2 rounded-full bg-teal-600" />}
                                    </div>
                                    <span className="font-bold text-navy text-sm">Página de reserva</span>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed pl-6">Redirige a <code className="bg-gray-100 px-1 rounded">/reservar</code> con formulario de contacto y enlace a Booking.com</p>
                            </button>
                        </div>

                        {/* URL de Booking.com — solo visible cuando está en modo redirect */}
                        <div className={`transition-all ${settings.booking_mode === 'redirect' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                URL de tu propiedad en Booking.com
                            </label>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#003580' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                        <path d="M3.5 2A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h5a.5.5 0 00.5-.5V17h6v4.5a.5.5 0 00.5.5h5a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2h-17zm5 11a2.5 2.5 0 110-5 2.5 2.5 0 010 5zm7 0a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
                                    </svg>
                                </div>
                                <input
                                    type="url"
                                    value={settings.booking_com_url}
                                    onChange={e => handleChange('booking_com_url', e.target.value)}
                                    placeholder="https://www.booking.com/hotel/es/tu-propiedad.es.html"
                                    className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5">
                                Copia la URL completa de tu alojamiento en Booking.com. Se mostrará en la página <code>/reservar</code>.
                            </p>
                        </div>

                        {/* Preview */}
                        {settings.booking_mode === 'redirect' && (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    Los botones "Reservar" de toda la web redirigirán a <strong>/reservar</strong> en lugar de abrir el modal. Esa página muestra el formulario de contacto y el enlace a Booking.com.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {/* ESTADO DEL SITIO */}
                <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-start gap-4">
                            <div className="mt-1"><Ico d={paths.lock} size={20} color={settings.maintenance_mode ? '#e11d48' : '#64748b'} /></div>
                            <div>
                                <h2 className="text-lg font-bold text-navy">Modo Mantenimiento</h2>
                                <p className="text-xs text-gray-500">Si se activa, los clientes verán una pantalla de "Próximamente"</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleChange('maintenance_mode', !settings.maintenance_mode)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.maintenance_mode ? 'bg-red-500' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.maintenance_mode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </section>

            </div>

            {/* FOOTER ACCIONES */}
            <div className="fixed bottom-0 right-0 left-0 lg:left-64 bg-white border-t border-gray-200 py-4 px-8 flex justify-between items-center z-40">
                <div className="hidden md:block">
                    {success && <span className="text-green-600 text-sm font-bold flex items-center gap-2 animate-bounce">
                        <Ico d={paths.check} size={16} color="currentColor" /> {success}
                    </span>}
                    {error && <span className="text-red-600 text-sm font-bold">{error}</span>}
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <button
                        onClick={() => setConfirmOpen(true)}
                        disabled={saving}
                        className="flex-1 md:flex-none bg-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-900/10 disabled:opacity-50"
                    >
                        {saving ? 'Guardando cambios...' : 'Guardar Configuración'}
                    </button>
                </div>
            </div>

        </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Guardar configuración?"
        message="Se aplicarán los cambios globales de cancelación, depósito e impuestos a todos los apartamentos."
        onConfirm={() => { setConfirmOpen(false); handleSave(); }}
        onCancel={() => setConfirmOpen(false)}
      />
        </>
    );
}
