import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getApartments, createReservation, getReservations, normalizeReservation } from '../services/dataService';
import { formatPrice } from '../utils/format';
import Ico, { paths } from './Ico';

export default function ManualBookingModal({ onClose, onSuccess }) {
    const [apartments, setApartments] = useState([]);
    const [form, setForm] = useState({
        name: '', email: '', phone: '', aptSlug: '',
        checkin: null, checkout: null, price: 0, deposit: 0,
        status: 'confirmed', source: 'direct'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});

    useEffect(() => {
        getApartments().then(apts => {
            setApartments(apts);
            if (apts.length > 0) {
                setForm(f => ({ ...f, aptSlug: apts[0].slug }));
            }
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const errors = {};
            if (!form.name.trim()) errors.name = 'El nombre es obligatorio';
            if (!form.checkin || !form.checkout) errors.dates = 'Las fechas son obligatorias';
            else if (form.checkout <= form.checkin) errors.dates = 'La salida debe ser después de la entrada';
            if (!form.price || form.price <= 0) errors.price = 'El precio debe ser mayor a 0';

            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                setLoading(false);
                return;
            }

            const formatDate = (date) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
            const resId = 'IP-' + Math.floor(Math.random() * 900000 + 100000);
            const diffTime = Math.abs(form.checkout - form.checkin);
            const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const data = await createReservation({
                id: resId,
                guest: form.name,
                apt: apartments.find(a => a.slug === form.aptSlug)?.name || form.aptSlug,
                email: form.email || '',
                phone: form.phone,
                aptSlug: form.aptSlug,
                checkin: formatDate(form.checkin),
                checkout: formatDate(form.checkout),
                nights: nights,
                total: parseFloat(form.price),
                deposit: parseFloat(form.deposit),
                status: form.status,
                source: form.source
            });

            onSuccess(data);
        } catch (err) {
            setError(err.message || 'Error al crear la reserva.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-lg w-full max-w-md shadow-xl overflow-hidden">
                <div className="px-6 py-5 bg-teal text-white flex justify-between items-center">
                    <div className="text-lg font-semibold">Nueva Reserva Manual</div>
                    <button onClick={onClose} className="bg-transparent border-0 text-white cursor-pointer hover:opacity-80">
                        <Ico d={paths.close} size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="form-label">Nombre del huésped *</label>
                            <input
                                className={`form-input ${validationErrors.name ? 'border-red-500' : ''}`}
                                value={form.name}
                                onChange={e => {
                                    setForm(f => ({ ...f, name: e.target.value }));
                                    if (validationErrors.name) setValidationErrors(p => ({ ...p, name: null }));
                                }}
                                required
                            />
                            {validationErrors.name && <div className="text-red-500 text-xs mt-1">{validationErrors.name}</div>}
                        </div>
                        <div>
                            <label className="form-label">Teléfono</label>
                            <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Apartamento *</label>
                        <select className="form-input" value={form.aptSlug} onChange={e => setForm(f => ({ ...f, aptSlug: e.target.value }))}>
                            {apartments.map(a => <option key={a.slug} value={a.slug}>{a.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className={`form-label ${validationErrors.dates ? 'text-red-500' : ''}`}>Fecha de Entrada *</label>
                            <DatePicker
                                selected={form.checkin}
                                onChange={d => {
                                    setForm(f => ({ ...f, checkin: d }));
                                    setValidationErrors(p => ({ ...p, dates: null }));
                                }}
                                dateFormat="dd/MM/yyyy"
                                className={`form-input ${validationErrors.dates ? 'border-red-500' : ''}`}
                                placeholderText="Entrada"
                            />
                        </div>
                        <div>
                            <label className={`form-label ${validationErrors.dates ? 'text-red-500' : ''}`}>Fecha de Salida *</label>
                            <DatePicker
                                selected={form.checkout}
                                onChange={d => {
                                    setForm(f => ({ ...f, checkout: d }));
                                    setValidationErrors(p => ({ ...p, dates: null }));
                                }}
                                dateFormat="dd/MM/yyyy"
                                className={`form-input ${validationErrors.dates ? 'border-red-500' : ''}`}
                                placeholderText="Salida"
                                minDate={form.checkin}
                            />
                        </div>
                        {validationErrors.dates && <div className="text-red-500 text-xs col-span-2">{validationErrors.dates}</div>}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="form-label">Precio Total *</label>
                            <input
                                type="number"
                                step="0.01"
                                className={`form-input ${validationErrors.price ? 'border-red-500' : ''}`}
                                min="1"
                                value={form.price}
                                onChange={e => {
                                    setForm(f => ({ ...f, price: e.target.value }));
                                    if (validationErrors.price) setValidationErrors(p => ({ ...p, price: null }));
                                }}
                                required
                            />
                            {validationErrors.price && <div className="text-red-500 text-xs mt-1">{validationErrors.price}</div>}
                        </div>
                        <div>
                            <label className="form-label">Depósito Pagado</label>
                            <input type="number" step="0.01" className="form-input" min="0" value={form.deposit} onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="form-label">Estado</label>
                            <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="confirmed">Confirmada</option>
                                <option value="pending">Pendiente</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Origen</label>
                            <select className="form-input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                                <option value="direct">Manual (Teléfono/Email)</option>
                                <option value="booking">Booking.com</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button type="button" onClick={onClose} className="border border-gray-300 text-slate-900 px-4 py-1.5 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50" disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="px-4 py-1.5 bg-teal text-white rounded-lg font-semibold hover:bg-teal-700 transition-all disabled:opacity-50" disabled={loading}>
                            {loading ? 'Guardando...' : 'Crear Reserva'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
