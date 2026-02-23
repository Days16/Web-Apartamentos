import { useState, useEffect } from 'react';
import { fetchMinStayRules, addMinStayRule, updateMinStayRule, deleteMinStayRule, fetchAllApartments } from '../../services/supabaseService';
import Ico, { paths } from '../../components/Ico';

export default function ReglasReserva() {
    const [rules, setRules] = useState([]);
    const [apartments, setApartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [formData, setFormData] = useState({
        apartment_slug: '',
        start_date: '',
        end_date: '',
        min_nights: 1,
        description: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [r, a] = await Promise.all([fetchMinStayRules(), fetchAllApartments()]);
            setRules(r);
            setApartments(a);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingRule) {
                await updateMinStayRule(editingRule.id, formData);
            } else {
                await addMinStayRule(formData);
            }
            setIsModalOpen(false);
            setEditingRule(null);
            setFormData({ apartment_slug: '', start_date: '', end_date: '', min_nights: 1, description: '' });
            loadData();
        } catch (err) {
            alert('Error guardando la regla');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Seguro que quieres eliminar esta regla?')) return;
        try {
            await deleteMinStayRule(id);
            loadData();
        } catch (err) {
            alert('Error eliminando la regla');
        }
    };

    const openEdit = (rule) => {
        setEditingRule(rule);
        setFormData({
            apartment_slug: rule.apartment_slug,
            start_date: rule.start_date,
            end_date: rule.end_date,
            min_nights: rule.min_nights,
            description: rule.description
        });
        setIsModalOpen(true);
    };

    if (loading) return <div className="p-8 text-slate-400">Cargando reglas...</div>;

    return (
        <div className="p-4 md:p-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-navy mb-2">Reglas de Reserva</h1>
                    <p className="text-slate-500 text-sm">Define estancias mínimas obligatorias para fechas especiales.</p>
                </div>
                <button
                    onClick={() => { setEditingRule(null); setIsModalOpen(true); }}
                    className="bg-teal text-white px-6 py-2.5 rounded-lg font-bold shadow-lg hover:bg-teal-600 transition-all flex items-center gap-2"
                >
                    <Ico d={paths.plus} size={18} />
                    <span>Nueva Regla</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Apartamento</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Período</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Noches Mín.</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {rules.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">No hay reglas definidas todavía.</td>
                            </tr>
                        ) : (
                            rules.map(rule => (
                                <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-navy">
                                        {apartments.find(a => a.slug === rule.apartment_slug)?.name || 'Todos'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-300">📅</span>
                                            <span>{new Date(rule.start_date).toLocaleDateString()}</span>
                                            <span className="text-slate-300">→</span>
                                            <span>{new Date(rule.end_date).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                                            {rule.min_nights} noches
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 italic max-w-xs truncate">
                                        {rule.description || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(rule)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                                <Ico d={paths.edit} size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(rule.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                <Ico d={paths.trash} size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-serif font-bold text-navy mb-6">
                            {editingRule ? 'Editar Regla' : 'Nueva Regla'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Apartamento</label>
                                <select
                                    required
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-teal focus:ring-1 focus:ring-teal outline-none"
                                    value={formData.apartment_slug}
                                    onChange={e => setFormData({ ...formData, apartment_slug: e.target.value })}
                                >
                                    <option value="">Selecciona alojamiento...</option>
                                    {apartments.map(a => <option key={a.slug} value={a.slug}>{a.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Inicio</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-teal"
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fin</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-teal"
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Noches Mínimas</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-teal"
                                    value={formData.min_nights}
                                    onChange={e => setFormData({ ...formData, min_nights: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descripción / Nota (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Temporada alta"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-teal"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-2.5 rounded-lg border border-slate-200 font-bold text-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-2.5 rounded-lg bg-teal text-white font-bold shadow-lg hover:bg-teal-600 transition-colors"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
