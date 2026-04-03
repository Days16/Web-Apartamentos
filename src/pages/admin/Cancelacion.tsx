/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchSettings } from '../../services/supabaseService';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';

export default function Cancelacion() {
  const toast = useToast();
  const [globalDays, setGlobalDays] = useState(14);
  const [globalDeposit, setGlobalDeposit] = useState(50);
  const [apartments, setApartments] = useState([]);
  const [overrides, setOverrides] = useState({}); // { slug: { days, deposit, useGlobal } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [settings, { data: apts }] = await Promise.all([
      fetchSettings(),
      supabase
        .from('apartments')
        .select('slug, name, cancellation_days, deposit_percentage')
        .order('name'),
    ]);

    const days = settings?.cancellation_days ?? settings?.cancellation_free_days ?? 14;
    const deposit = settings?.payment_deposit_percentage ?? 50;
    setGlobalDays(days);
    setGlobalDeposit(deposit);

    const overrideMap = {};
    (apts || []).forEach(apt => {
      const hasDaysOverride = apt.cancellation_days != null && apt.cancellation_days !== days;
      const hasDepositOverride =
        apt.deposit_percentage != null && apt.deposit_percentage !== deposit;
      overrideMap[apt.slug] = {
        days: apt.cancellation_days ?? days,
        deposit: apt.deposit_percentage ?? deposit,
        useGlobal: !hasDaysOverride && !hasDepositOverride,
      };
    });
    setApartments(apts || []);
    setOverrides(overrideMap);
    setLoading(false);
  }

  const setOverride = (slug, field, value) => {
    setOverrides(prev => ({
      ...prev,
      [slug]: { ...prev[slug], [field]: value, useGlobal: false },
    }));
  };

  const resetToGlobal = slug => {
    setOverrides(prev => ({
      ...prev,
      [slug]: { days: globalDays, deposit: globalDeposit, useGlobal: true },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        apartments.map(apt => {
          const ov = overrides[apt.slug];
          const days = ov?.useGlobal ? null : (ov?.days ?? null);
          const deposit = ov?.useGlobal ? null : (ov?.deposit ?? null);
          return supabase
            .from('apartments')
            .update({ cancellation_days: days, deposit_percentage: deposit })
            .eq('slug', apt.slug);
        })
      );

      toast.success('Excepciones guardadas correctamente');
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const applyGlobalToAll = () => {
    const updated = {};
    apartments.forEach(apt => {
      updated[apt.slug] = { days: globalDays, deposit: globalDeposit, useGlobal: true };
    });
    setOverrides(updated);
  };

  if (loading) return <div className="p-10 text-slate-500 text-sm">Cargando...</div>;

  return (
    <>
      <div className="pl-6 pr-6 py-6 border-b border-gray-200 bg-white">
        <div className="text-2xl font-bold text-navy">Políticas de cancelación</div>
        <div className="text-sm text-gray-600 mt-1">
          Excepciones por apartamento respecto a la política global
        </div>
      </div>

      <div className="p-6 bg-gray-50 space-y-6 pb-24">
        {/* INFO POLÍTICA GLOBAL (solo lectura) */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 max-w-3xl flex items-start gap-4">
          <div className="text-blue-400 text-xl leading-none mt-0.5">ℹ</div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-blue-900 mb-1">Política global activa</div>
            <div className="text-sm text-blue-800">
              Cancelación gratuita hasta <strong>{globalDays} días</strong> antes · Depósito{' '}
              <strong>{globalDeposit}%</strong> al reservar
            </div>
            <Link
              to="/admin/configuracion"
              className="text-xs text-blue-600 hover:underline font-semibold mt-2 inline-block"
            >
              Cambiar política global en Ajustes Generales →
            </Link>
          </div>
          <button
            onClick={applyGlobalToAll}
            className="text-xs text-blue-700 font-semibold hover:underline whitespace-nowrap"
          >
            ↺ Resetear todos a global
          </button>
        </div>

        {/* POR APARTAMENTO */}
        <div className="bg-white border border-gray-200 rounded-xl max-w-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="font-serif text-lg text-navy">Excepciones por apartamento</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Deja en «Usando global» para seguir la política por defecto, o activa una excepción
              personalizada
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {apartments.map(apt => {
              const ov = overrides[apt.slug] || {
                days: globalDays,
                deposit: globalDeposit,
                useGlobal: true,
              };
              return (
                <div
                  key={apt.slug}
                  className={`p-5 ${ov.useGlobal ? 'bg-white' : 'bg-amber-50/40'}`}
                >
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="font-semibold text-slate-800 text-sm">{apt.name}</div>
                    <div className="flex items-center gap-3">
                      {!ov.useGlobal && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-semibold">
                          Excepción activa
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          ov.useGlobal
                            ? setOverrides(prev => ({
                                ...prev,
                                [apt.slug]: { ...prev[apt.slug], useGlobal: false },
                              }))
                            : resetToGlobal(apt.slug)
                        }
                        className={`text-xs transition-colors ${
                          ov.useGlobal
                            ? 'text-[#1a5f6e] hover:underline font-semibold'
                            : 'text-slate-500 hover:underline'
                        }`}
                      >
                        {ov.useGlobal ? '+ Añadir excepción' : '↺ Volver a global'}
                      </button>
                    </div>
                  </div>

                  {!ov.useGlobal && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                          Días para cancelar
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={1}
                            max={60}
                            value={ov.days}
                            onChange={e => setOverride(apt.slug, 'days', +e.target.value)}
                            className="flex-1"
                          />
                          <div className="text-center w-12 font-serif text-2xl font-bold text-navy">
                            {ov.days}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                          Depósito
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={10}
                            max={100}
                            step={5}
                            value={ov.deposit}
                            onChange={e => setOverride(apt.slug, 'deposit', +e.target.value)}
                            className="flex-1"
                          />
                          <div className="text-center w-12 font-serif text-2xl font-bold text-navy">
                            {ov.deposit}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {ov.useGlobal && (
                    <div className="text-xs text-slate-400">
                      Usando: {globalDays} días · {globalDeposit}% depósito
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-3xl text-xs text-amber-900 leading-relaxed">
          ⚠️ Los cambios solo aplican a nuevas reservas. Las reservas existentes mantienen las
          condiciones con las que fueron creadas.
        </div>
      </div>

      {/* BARRA INFERIOR */}
      <div className="fixed bottom-0 right-0 left-0 bg-white border-t border-gray-200 py-4 px-6 flex justify-between items-center z-50">
        <span className="text-xs text-gray-500">
          {apartments.filter(a => overrides[a.slug] && !overrides[a.slug].useGlobal).length}{' '}
          apartamento(s) con excepción activa
        </span>
        <button
          className="px-5 py-2 rounded-lg font-semibold bg-[#1a5f6e] text-white hover:bg-[#154e5b] transition-colors disabled:opacity-50"
          onClick={() => setConfirmOpen(true)}
          disabled={saving}
        >
          {saving && (
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          )}
          {saving ? 'Guardando...' : 'Guardar excepciones'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Guardar excepciones?"
        message="Se actualizarán las políticas de cancelación por apartamento. Solo afecta a nuevas reservas."
        onConfirm={() => {
          setConfirmOpen(false);
          handleSave();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
