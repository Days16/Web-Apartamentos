import { useState, useEffect } from 'react';
import React from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface PricingRule {
  id: string;
  type: string;
  label: string;
  condition_min: number | null;
  condition_max: number | null;
  modifier: number;
  active: boolean;
}

const RULE_TYPES = [
  {
    id: 'lead_time',
    label: 'Antelación',
    unit: 'días antes',
    desc: 'Días entre la reserva y el checkin',
  },
  {
    id: 'occupancy',
    label: 'Ocupación',
    unit: '% ocupación',
    desc: '% de apartamentos ocupados ese mes',
  },
  {
    id: 'time_of_day',
    label: 'Hora del día',
    unit: 'hora (0–23)',
    desc: 'Hora local en que se realiza la reserva',
  },
];

interface PricingRuleForm {
  type: string;
  label: string;
  condition_min: string | number;
  condition_max: string | number;
  modifier: string | number;
  active: boolean;
}

const EMPTY_FORM: PricingRuleForm = {
  type: 'lead_time',
  label: '',
  condition_min: '',
  condition_max: '',
  modifier: '',
  active: true,
};

function ModifierBadge({ value }: { value: number }) {
  const n = Number(value);
  if (!n) return <span className="text-gray-400">0%</span>;
  return (
    <span className={`font-semibold ${n > 0 ? 'text-green-600' : 'text-red-600'}`}>
      {n > 0 ? '+' : ''}
      {n}%
    </span>
  );
}

export default function Precios() {
  const toast = useToast();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PricingRuleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    const { data, error } = await supabase
      .from('dynamic_pricing_rules')
      .select('*')
      .order('type')
      .order('condition_min');
    if (error) {
      toast.error('Error al cargar reglas: ' + error.message);
    } else {
      setRules(data || []);
    }
    setLoading(false);
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  }

  function startEdit(rule: PricingRule) {
    setForm({
      type: rule.type,
      label: rule.label,
      condition_min: rule.condition_min ?? '',
      condition_max: rule.condition_max ?? '',
      modifier: rule.modifier,
      active: rule.active,
    });
    setEditingId(rule.id);
    setFormError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.label.trim()) {
      setFormError('La descripción es obligatoria.');
      return;
    }
    if (form.modifier === '' || form.modifier === null) {
      setFormError('El modificador (%) es obligatorio.');
      return;
    }
    if (form.condition_min === '') {
      setFormError('El valor mínimo es obligatorio.');
      return;
    }

    setSaving(true);
    setFormError(null);
    const payload = {
      type: form.type,
      label: form.label.trim(),
      condition_min: Number(form.condition_min),
      condition_max: form.condition_max !== '' ? Number(form.condition_max) : null,
      modifier: Number(form.modifier),
      active: form.active,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('dynamic_pricing_rules')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Regla actualizada');
      } else {
        const { error } = await supabase.from('dynamic_pricing_rules').insert(payload);
        if (error) throw error;
        toast.success('Regla creada');
      }
      setShowForm(false);
      loadRules();
    } catch (err) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rule: PricingRule) {
    const { error } = await supabase
      .from('dynamic_pricing_rules')
      .update({ active: !rule.active })
      .eq('id', rule.id);
    if (error) {
      toast.error('Error al actualizar');
      return;
    }
    setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, active: !r.active } : r)));
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta regla? No se puede deshacer.')) return;
    const { error } = await supabase.from('dynamic_pricing_rules').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar');
      return;
    }
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success('Regla eliminada');
  }

  const rulesByType = RULE_TYPES.map(t => ({
    ...t,
    rules: rules.filter(r => r.type === t.id),
  }));

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 pt-8 pb-6 flex justify-between items-start bg-slate-50">
        <div>
          <div className="text-2xl font-bold text-slate-900">Precios dinámicos</div>
          <div className="text-sm text-gray-400 mt-1">
            Reglas de modificación de precio por antelación, ocupación y hora del día. El precio
            final = precio base × (1 + suma de modificadores activos / 100).
          </div>
        </div>
        <button
          onClick={startNew}
          className="bg-[#1a5f6e] text-white px-4 py-2 rounded font-semibold text-sm hover:bg-opacity-90 transition-colors flex-shrink-0 ml-6"
        >
          + Nueva regla
        </button>
      </div>

      <div className="p-8">
        {/* Formulario */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8">
            <h2 className="font-bold text-slate-700 mb-5 text-base">
              {editingId ? 'Editar regla' : 'Nueva regla de precio dinámico'}
            </h2>

            {formError && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Tipo de regla *
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-[#1a5f6e]"
                  >
                    {RULE_TYPES.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.label} — {t.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Descripción *
                  </label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder={
                      form.type === 'lead_time'
                        ? 'Ej: Reserva de última hora'
                        : form.type === 'occupancy'
                          ? 'Ej: Alta demanda >80%'
                          : 'Ej: Horario pico tarde'
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Valor mínimo * ({RULE_TYPES.find(t => t.id === form.type)?.unit})
                  </label>
                  <input
                    type="number"
                    value={form.condition_min}
                    onChange={e => setForm(f => ({ ...f, condition_min: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Valor máximo ({RULE_TYPES.find(t => t.id === form.type)?.unit}, vacío = sin
                    límite)
                  </label>
                  <input
                    type="number"
                    value={form.condition_max}
                    onChange={e => setForm(f => ({ ...f, condition_max: e.target.value }))}
                    placeholder="Sin límite"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Modificador (%) *{' '}
                    <span className="text-gray-400 font-normal">
                      — positivo = sube, negativo = baja
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.modifier}
                    onChange={e => setForm(f => ({ ...f, modifier: e.target.value }))}
                    placeholder="Ej: 20 (sube 20%) o -10 (baja 10%)"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1a5f6e]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.active ? 'bg-[#1a5f6e]' : 'bg-gray-300'}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.active ? 'left-6' : 'left-1'}`}
                  />
                </button>
                <span className="text-sm text-slate-600">
                  {form.active ? 'Regla activa' : 'Regla desactivada'}
                </span>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#1a5f6e] text-white px-5 py-2 rounded text-sm font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {saving && (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {saving ? 'Guardando…' : editingId ? 'Actualizar regla' : 'Crear regla'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="px-5 py-2 rounded text-sm text-slate-600 border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reglas agrupadas por tipo */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Cargando reglas...</div>
        ) : (
          <div className="space-y-8">
            {rulesByType.map(group => (
              <div key={group.id}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    {group.label}
                  </h3>
                  <span className="text-xs text-gray-400">{group.desc}</span>
                  <span className="ml-auto text-xs text-gray-400">
                    {group.rules.filter(r => r.active).length} activas
                  </span>
                </div>

                {group.rules.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-lg px-5 py-4 text-sm text-gray-400 text-center">
                    No hay reglas de {group.label.toLowerCase()}. Créalas con "+ Nueva regla".
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    {/* Cabecera */}
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_auto_auto_auto] px-5 py-3 bg-slate-50 border-b-2 border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider gap-4">
                      <div>Descripción</div>
                      <div>Rango ({group.unit})</div>
                      <div>Modificador</div>
                      <div className="text-center">Estado</div>
                      <div className="text-right">Acciones</div>
                    </div>

                    {group.rules.map((rule, i) => (
                      <div
                        key={rule.id}
                        className={`grid grid-cols-[1.5fr_1fr_1fr_auto_auto_auto] px-5 py-4 items-center gap-4 hover:bg-gray-50 transition-colors ${i < group.rules.length - 1 ? 'border-b border-gray-100' : ''} ${!rule.active ? 'opacity-50' : ''}`}
                      >
                        <div className="text-sm font-medium text-slate-800">{rule.label}</div>

                        <div className="text-sm text-gray-500 font-mono">
                          {rule.condition_min ?? '—'}
                          {rule.condition_max != null ? ` – ${rule.condition_max}` : '+'}
                        </div>

                        <div className="text-sm">
                          <ModifierBadge value={rule.modifier} />
                        </div>

                        <div className="flex justify-center">
                          <button
                            onClick={() => toggleActive(rule)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${rule.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                          >
                            {rule.active ? 'Activa' : 'Inactiva'}
                          </button>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => startEdit(rule)}
                            className="px-3 py-1.5 bg-[#1a5f6e] text-white rounded text-xs font-semibold hover:bg-opacity-90 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="px-3 py-1.5 border border-red-300 text-red-600 rounded text-xs font-semibold hover:bg-red-50 transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info sobre integración en precio */}
        <div className="mt-8 bg-slate-50 border border-slate-200 rounded-lg p-5 text-sm">
          <div className="font-semibold text-slate-700 mb-2">ℹ Cómo se aplican las reglas</div>
          <ul className="space-y-1 text-slate-600 text-xs list-disc list-inside">
            <li>
              Se evalúan todas las reglas activas que apliquen a la reserva en el momento de
              crearla.
            </li>
            <li>Los modificadores se suman: si aplican +20% y -10%, el precio sube un 10%.</li>
            <li>
              La lógica de cálculo se implementa en la Edge Function{' '}
              <code className="bg-white px-1 rounded font-mono border border-slate-200">
                dynamic-pricing
              </code>
              .
            </li>
            <li>
              En el widget de reserva se muestra el precio base tachado y el precio dinámico final.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
