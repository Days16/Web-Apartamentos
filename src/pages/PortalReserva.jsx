import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Ico, { paths } from '../components/Ico';
import { getReservationById, getApartmentBySlug, updateReservationStatus } from '../services/dataService';
import { sendCancellationEmail, sendOwnerNotification } from '../services/resendService';
import { fetchSettings } from '../services/supabaseService';
import { formatPrice } from '../utils/format';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';

export default function PortalReserva() {
    const { lang } = useLang();
    const T = useT(lang);
    const navigate = useNavigate();

    const [form, setForm] = useState({ code: '', email: '' });
    const [reservation, setReservation] = useState(null);
    const [apt, setApt] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [settings, setSettings] = useState(null);

    // Cargar settings globales preventivamente
    useEffect(() => {
        fetchSettings().then(setSettings);
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!form.code || !form.email) return;

        setLoading(true);
        setError('');
        setReservation(null);

        try {
            const res = await getReservationById(form.code.toUpperCase());
            if (res && res.email.toLowerCase() === form.email.toLowerCase()) {
                setReservation(res);
                const a = await getApartmentBySlug(res.aptSlug);
                setApt(a);
            } else {
                setError('Reserva no encontrada o datos incorrectos.');
            }
        } catch (err) {
            setError('Error al consultar la reserva.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!reservation || !apt) return;
        try {
            const { default: generateInvoice } = await import('../utils/generateInvoice');
            generateInvoice({
                id: reservation.id,
                guest_name: reservation.guest,
                guest_email: reservation.email,
                apartment_name: apt.name,
                checkin: reservation.checkin,
                checkout: reservation.checkout,
                nights: reservation.nights,
                total: reservation.total,
                deposit: reservation.deposit,
            });
        } catch (err) {
            setError('Error al generar el PDF.');
        }
    };

    const handleCancelReservation = async () => {
        if (!reservation || !apt) return;
        if (!window.confirm(T.common?.confirmCancel || '¿Estás seguro de que deseas cancelar la reserva?')) return;

        setCancelling(true);
        setError('');
        try {
            const success = await updateReservationStatus(reservation.id, 'cancelled');
            if (success) {
                setReservation(prev => ({ ...prev, status: 'cancelled' }));

                // Notificar por email a usuario y gestor
                await Promise.all([
                    sendCancellationEmail({
                        guestEmail: reservation.email,
                        guestName: reservation.guest,
                        reservationId: reservation.id,
                        apartmentName: apt.name
                    }),
                    sendOwnerNotification({
                        type: 'cancellation',
                        reservationId: reservation.id,
                        guestName: reservation.guest,
                        guestEmail: reservation.email,
                        apartmentName: apt.name,
                        checkin: reservation.checkin,
                        checkout: reservation.checkout,
                        nights: reservation.nights,
                        total: reservation.total,
                    })
                ]);
            } else {
                setError('Error al cancelar la reserva. Por favor contacta con nosotros directamente.');
            }
        } catch (err) {
            setError('Ocurrió un error inesperado al cancelar.');
        } finally {
            setCancelling(false);
        }
    };

    // Información de check-in visible desde 48h antes hasta fin del checkout
    const isCheckinInfoVisible = () => {
        if (!reservation || reservation.status === 'cancelled') return false;
        const checkinDate = new Date(reservation.checkin + 'T00:00:00');
        const checkoutDate = new Date(reservation.checkout + 'T23:59:59');
        const now = new Date();
        return (checkinDate - now) <= 48 * 60 * 60 * 1000 && now <= checkoutDate;
    };

    // Check-in aún no próximo (más de 48h) pero la reserva está confirmada y en el futuro
    const isCheckinPending = () => {
        if (!reservation || reservation.status === 'cancelled') return false;
        const checkinDate = new Date(reservation.checkin + 'T00:00:00');
        const now = new Date();
        return (checkinDate - now) > 48 * 60 * 60 * 1000;
    };

    // Calcular si la reserva se puede cancelar sin penalización
    const canCancel = () => {
        if (!reservation || !apt || reservation.status === 'cancelled') return false;

        const cancelDays = apt.cancellation_days ?? settings?.cancellation_free_days ?? 14;
        const checkinDate = new Date(reservation.checkin + 'T00:00:00');
        const now = new Date();
        const diffTime = Math.abs(checkinDate - now);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays >= cancelDays;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
            <Navbar />

            <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 md:py-20">
                <div className="max-w-md mx-auto mb-12 text-center">
                    <h1 className="text-4xl font-serif font-bold text-navy mb-4">Mi Reserva</h1>
                    <p className="text-gray-600">Introduce tus datos para consultar el estado de tu estancia o descargar tu factura.</p>
                </div>

                {!reservation ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md mx-auto border border-gray-100 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
                        <form onSubmit={handleSearch} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Código de Reserva</label>
                                <input
                                    type="text"
                                    placeholder="Ej: IP-123456"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal/20 outline-none transition-all uppercase"
                                    value={form.code}
                                    onChange={e => setForm({ ...form, code: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email de contacto</label>
                                <input
                                    type="email"
                                    placeholder="Tu correo electrónico"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal/20 outline-none transition-all"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>

                            {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 font-medium">{error}</div>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-teal text-white py-4 rounded-xl font-bold hover:bg-teal-600 transition-all flex items-center justify-center shadow-lg hover:shadow-teal/20 disabled:opacity-50"
                            >
                                {loading ? 'Buscando...' : 'Consultar Reserva'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-navy p-6 md:p-8 flex justify-between items-center text-white">
                            <div>
                                <div className="text-xs opacity-60 uppercase tracking-widest mb-1">Estado de Reserva</div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="font-bold uppercase tracking-wider text-sm">{reservation.status === 'confirmed' ? 'Confirmada' : reservation.status}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs opacity-60 uppercase tracking-widest mb-1">Localizador</div>
                                <div className="text-lg font-mono font-bold text-teal">{reservation.id}</div>
                            </div>
                        </div>

                        <div className="p-8 md:p-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                                <div>
                                    <h3 className="font-serif text-xl font-bold text-navy mb-6 flex items-center gap-2">
                                        <Ico d={paths.home} size={20} color="#1a5f6e" />
                                        Detalles del Alojamiento
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                            <span className="text-sm text-gray-500">Apartamento</span>
                                            <span className="font-bold text-navy">{apt?.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                            <span className="text-sm text-gray-500">Check-in</span>
                                            <span className="font-bold text-navy">{reservation.checkin}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                            <span className="text-sm text-gray-500">Check-out</span>
                                            <span className="font-bold text-navy">{reservation.checkout}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-serif text-xl font-bold text-navy mb-6 flex items-center gap-2">
                                        <Ico d={paths.cash} size={20} color="#1a5f6e" />
                                        Resumen Económico
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                            <span className="text-sm text-gray-500">Total Estancia</span>
                                            <span className="font-bold text-navy">{formatPrice(reservation.total)}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                            <span className="text-sm text-gray-500">Depósito Pagado</span>
                                            <span className="font-bold text-green-600 font-mono">{formatPrice(reservation.deposit)} ✓</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg mt-2 font-bold">
                                            <span className="text-sm text-gray-600">Pendiente al llegar</span>
                                            <span className="text-navy">{formatPrice(reservation.total - reservation.deposit)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* AVISO CHECK-IN PRÓXIMO */}
                            {isCheckinPending() && (
                                <div className="mt-8 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                                    <Ico d={paths.lock} size={18} color="#d97706" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-800">Instrucciones de acceso</p>
                                        <p className="text-xs text-amber-700 mt-0.5">El código de cerradura y las instrucciones de check-in estarán disponibles 48 horas antes de tu llegada.</p>
                                    </div>
                                </div>
                            )}

                            {/* INFORMACIÓN DE CHECK-IN */}
                            {isCheckinInfoVisible() && (
                                <div className="mt-10 pt-10 border-t border-gray-100">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                                            <Ico d={paths.check} size={16} color="#16a34a" />
                                        </div>
                                        <div>
                                            <h3 className="font-serif text-xl font-bold text-navy">Instrucciones de Check-in</h3>
                                            <p className="text-xs text-gray-400">Información disponible para tu llegada</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        {/* Código de acceso */}
                                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Ico d={paths.lock} size={16} color="#d97706" />
                                                <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Código de Acceso</span>
                                            </div>
                                            <div className="font-mono text-3xl font-bold text-navy tracking-widest">
                                                {settings?.checkin_lock_code || '—'}
                                            </div>
                                            {settings?.checkin_access_info && (
                                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{settings.checkin_access_info}</p>
                                            )}
                                        </div>

                                        {/* Normas de la finca */}
                                        <div className="bg-teal/5 border border-teal/20 rounded-xl p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Ico d={paths.home} size={16} color="#1a5f6e" />
                                                <span className="text-xs font-bold text-teal uppercase tracking-widest">Normas de la Finca</span>
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                                {settings?.checkin_house_rules || 'Consulta las normas en el tablón de bienvenida del apartamento.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Contacto de emergencia */}
                                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Ico d={paths.phone} size={16} color="#334155" />
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Contacto de Emergencia</span>
                                            </div>
                                            <div className="space-y-3">
                                                {settings?.contact_phone && (
                                                    <a href={`tel:${settings.contact_phone}`} className="block text-lg font-bold text-navy hover:text-teal transition-colors">
                                                        {settings.contact_phone}
                                                    </a>
                                                )}
                                                {settings?.contact_whatsapp && (
                                                    <a
                                                        href={`https://wa.me/${settings.contact_whatsapp}?text=${encodeURIComponent(`Hola, soy ${reservation.guest} y tengo la reserva ${reservation.id} para ${apt?.name} del ${reservation.checkin} al ${reservation.checkout}. Necesito ayuda.`)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-green-600 transition-colors"
                                                    >
                                                        <Ico d={paths.msg} size={16} color="#fff" />
                                                        WhatsApp con el anfitrión
                                                    </a>
                                                )}
                                                {!settings?.contact_phone && !settings?.contact_whatsapp && (
                                                    <p className="text-sm text-gray-500">info@apartamentosillapancha.com</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Cómo llegar */}
                                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Ico d={paths.map} size={16} color="#334155" />
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cómo Llegar</span>
                                            </div>
                                            {settings?.property_address ? (
                                                <>
                                                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">{settings.property_address}</p>
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.property_address)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-teal font-bold text-sm hover:underline"
                                                    >
                                                        Abrir en Google Maps →
                                                    </a>
                                                </>
                                            ) : (
                                                <p className="text-sm text-gray-500">El anfitrión te enviará las indicaciones de acceso por correo.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-4 pt-8 border-t border-gray-100">
                                <button
                                    onClick={handleDownloadPDF}
                                    className="flex-1 bg-teal text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-teal-600 transition-all shadow-lg hover:shadow-teal/20"
                                >
                                    <Ico d={paths.download} size={20} color="#fff" />
                                    Descargar Factura PDF
                                </button>
                                {canCancel() ? (
                                    <button
                                        onClick={handleCancelReservation}
                                        disabled={cancelling}
                                        className="flex-1 bg-white border-2 border-red-500 text-red-600 px-8 py-4 rounded-xl font-bold flex items-center justify-center hover:bg-red-50 transition-all disabled:opacity-50"
                                    >
                                        {cancelling ? 'Cancelando...' : 'Cancelar Reserva'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setReservation(null)}
                                        className="flex-1 bg-white border-2 border-slate-200 text-navy px-8 py-4 rounded-xl font-bold flex items-center justify-center hover:bg-gray-50 transition-all"
                                    >
                                        Nueva consulta
                                    </button>
                                )}
                            </div>
                            {reservation.status === 'confirmed' && !canCancel() && (
                                <div className="mt-4 text-center text-xs text-amber-600">
                                    Periodo de cancelación gratuita superado. Contacta con nosotros para gestionar tu reserva info@apartamentosillapancha.com.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
