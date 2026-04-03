import React, { useState, useEffect } from 'react';
import {
  fetchFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  autoTranslateFromBase,
} from '../../services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import type { DbFaq } from '../../types';

type FaqForm = {
  question: string;
  question_en: string;
  question_fr: string;
  question_de: string;
  question_pt: string;
  answer: string;
  answer_en: string;
  answer_fr: string;
  answer_de: string;
  answer_pt: string;
  display_order: number;
  active: boolean;
};

const EMPTY: FaqForm = {
  question: '',
  question_en: '',
  question_fr: '',
  question_de: '',
  question_pt: '',
  answer: '',
  answer_en: '',
  answer_fr: '',
  answer_de: '',
  answer_pt: '',
  display_order: 0,
  active: true,
};

function trimOrNull(s: string): string | null {
  const t = s.trim();
  return t ? t : null;
}

type DeeplUiLang = 'EN' | 'FR' | 'DE' | 'PT';

async function applyAutoTranslations(f: FaqForm): Promise<FaqForm> {
  let next = { ...f };
  const q = f.question.trim();
  const a = f.answer.trim();

  const qNeed: DeeplUiLang[] = [];
  if (!f.question_en.trim()) qNeed.push('EN');
  if (!f.question_fr.trim()) qNeed.push('FR');
  if (!f.question_de.trim()) qNeed.push('DE');
  if (!f.question_pt.trim()) qNeed.push('PT');
  if (qNeed.length && q) {
    const tr = await autoTranslateFromBase(q, 'ES', qNeed);
    if (tr.EN) next.question_en = tr.EN;
    if (tr.FR) next.question_fr = tr.FR;
    if (tr.DE) next.question_de = tr.DE;
    if (tr.PT) next.question_pt = tr.PT;
  }

  const aNeed: DeeplUiLang[] = [];
  if (!f.answer_en.trim()) aNeed.push('EN');
  if (!f.answer_fr.trim()) aNeed.push('FR');
  if (!f.answer_de.trim()) aNeed.push('DE');
  if (!f.answer_pt.trim()) aNeed.push('PT');
  if (aNeed.length && a) {
    const tr = await autoTranslateFromBase(a, 'ES', aNeed);
    if (tr.EN) next.answer_en = tr.EN;
    if (tr.FR) next.answer_fr = tr.FR;
    if (tr.DE) next.answer_de = tr.DE;
    if (tr.PT) next.answer_pt = tr.PT;
  }

  return next;
}

export default function FaqAdmin() {
  const toast = useToast();
  const [faqs, setFaqs] = useState<DbFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FaqForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFaqs(false);
      setFaqs(data);
    } catch (err) {
      setError('Error cargando FAQs: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  const startNew = () => {
    setForm({ ...EMPTY, display_order: faqs.length });
    setEditing('new');
    setError(null);
  };

  const startEdit = (faq: DbFaq) => {
    setForm({
      question: faq.question,
      question_en: faq.question_en ?? '',
      question_fr: faq.question_fr ?? '',
      question_de: faq.question_de ?? '',
      question_pt: faq.question_pt ?? '',
      answer: faq.answer,
      answer_en: faq.answer_en ?? '',
      answer_fr: faq.answer_fr ?? '',
      answer_de: faq.answer_de ?? '',
      answer_pt: faq.answer_pt ?? '',
      display_order: faq.display_order,
      active: faq.active,
    });
    setEditing(faq.id);
    setError(null);
  };

  const handleFillTranslations = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      setError('Rellena primero la pregunta y la respuesta en español.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const filled = await applyAutoTranslations(form);
      setForm(filled);
      toast.success('Campos vacíos traducidos (revisa antes de guardar).');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('DeepL: ' + msg);
      toast.error('No se pudo traducir: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      setError('La pregunta y la respuesta (ES) son obligatorias.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let filled = { ...form };
      const needsQ =
        !form.question_en.trim() ||
        !form.question_fr.trim() ||
        !form.question_de.trim() ||
        !form.question_pt.trim();
      const needsA =
        !form.answer_en.trim() ||
        !form.answer_fr.trim() ||
        !form.answer_de.trim() ||
        !form.answer_pt.trim();
      if (needsQ || needsA) {
        toast.info('Traduciendo idiomas vacíos desde español…');
        filled = await applyAutoTranslations(form);
        setForm(filled);
      }

      const payload = {
        question: filled.question.trim(),
        question_en: trimOrNull(filled.question_en),
        question_fr: trimOrNull(filled.question_fr),
        question_de: trimOrNull(filled.question_de),
        question_pt: trimOrNull(filled.question_pt),
        answer: filled.answer.trim(),
        answer_en: trimOrNull(filled.answer_en),
        answer_fr: trimOrNull(filled.answer_fr),
        answer_de: trimOrNull(filled.answer_de),
        answer_pt: trimOrNull(filled.answer_pt),
        display_order: filled.display_order,
        active: filled.active,
      };

      if (editing === 'new') {
        await createFaq(payload);
      } else {
        await updateFaq(editing!, payload);
      }
      setEditing(null);
      toast.success('FAQ guardada correctamente');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Error guardando: ' + msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta FAQ?')) return;
    try {
      await deleteFaq(id);
      setFaqs(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      toast.error('Error eliminando: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleToggleActive = async (faq: DbFaq) => {
    await updateFaq(faq.id, { active: !faq.active });
    setFaqs(prev => prev.map(f => (f.id === faq.id ? { ...f, active: !f.active } : f)));
  };

  const f =
    (field: keyof FaqForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  const inputCls =
    'w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-[15px] leading-snug text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5f6e]/30 focus:border-[#1a5f6e]';
  const labelCls =
    'block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2';
  const hintCls = 'text-xs text-slate-500 mt-1.5 leading-relaxed';

  return (
    <div className="p-6 max-w-3xl lg:max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Preguntas frecuentes (FAQ)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visible en <code className="text-xs bg-slate-100 px-1 rounded">/faq</code> · JSON-LD para SEO
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="shrink-0 bg-[#1a5f6e] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#164e5a]"
        >
          + Nueva FAQ
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3 mb-5">
          {error}
        </div>
      )}

      {editing && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 mb-8 shadow-sm">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              {editing === 'new' ? 'Nueva FAQ' : 'Editar FAQ'}
            </h2>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 leading-relaxed space-y-2">
              <p className="font-medium text-slate-800">Cómo usar este formulario</p>
              <ol className="list-decimal list-inside space-y-1.5 text-[13px]">
                <li>
                  Escribe solo en <strong>español</strong> en el primer bloque (con buena ortografía:
                  tildes, ¿?).
                </li>
                <li>
                  En inglés, francés, alemán y portugués: <strong>déjalos vacíos</strong> y pulsa{' '}
                  <em>Guardar</em> o <em>Traducir campos vacíos</em> para generar texto en ese idioma.
                  No pegues español ahí.
                </li>
                <li>
                  Tras traducir, revisa el resultado; el servicio gratuito puede equivocarse en matices.
                </li>
              </ol>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/80 mt-2">
                Motor gratuito: MyMemory (límite diario). Con <code className="text-[11px] bg-white px-1 rounded border">DEEPL_API_KEY</code> en Supabase se usa DeepL.
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <section className="rounded-xl border-2 border-[#1a5f6e] bg-gradient-to-b from-[#1a5f6e]/[0.07] to-white px-5 py-6 sm:px-6 sm:py-7">
              <div className="flex flex-wrap items-center gap-2 gap-y-1 mb-1">
                <h3 className="text-base font-bold text-[#1a5f6e]">Versión en español</h3>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-[#1a5f6e] text-white px-2.5 py-1 rounded-md">
                  Base · obligatorio
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Es lo que verán los visitantes con el idioma <strong>ES</strong> en la web. A partir de
                este texto se generan las demás lenguas si las dejas en blanco.
              </p>
              <div className="space-y-6">
                <div>
                  <label className={labelCls} htmlFor="faq-q-es">
                    Pregunta
                  </label>
                  <input
                    id="faq-q-es"
                    value={form.question}
                    onChange={f('question')}
                    className={inputCls}
                    placeholder="¿A qué hora es la entrada al apartamento?"
                    autoComplete="off"
                  />
                  <p className={hintCls}>Una sola frase, con interrogación inicial si es pregunta.</p>
                </div>
                <div>
                  <label className={labelCls} htmlFor="faq-a-es">
                    Respuesta
                  </label>
                  <textarea
                    id="faq-a-es"
                    value={form.answer}
                    onChange={f('answer')}
                    rows={5}
                    className={`${inputCls} resize-y min-h-[130px] leading-relaxed`}
                    placeholder="La entrada es a partir de las 16:00. Si llegas antes, puedes dejar las maletas bajo petición."
                    autoComplete="off"
                  />
                  <p className={hintCls}>
                    Párrafo claro; aquí sí puedes varias frases. Revisa tildes (cómo, también…).
                  </p>
                </div>
              </div>
            </section>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Traducciones para otros idiomas</h3>
              <p className="text-xs text-slate-500 mb-5 max-w-2xl">
                Cada bloque es solo para texto en <strong>ese</strong> idioma. Vacío = se rellena desde el
                español al guardar o con el botón de traducir.
              </p>
            </div>

            {(
              [
                ['en', 'English', 'inglés', 'question_en', 'answer_en'],
                ['fr', 'Français', 'francés', 'question_fr', 'answer_fr'],
                ['de', 'Deutsch', 'alemán', 'question_de', 'answer_de'],
                ['pt', 'Português', 'portugués', 'question_pt', 'answer_pt'],
              ] as const
            ).map(([code, label, esLabel, qk, ak]) => (
              <section
                key={code}
                className="rounded-xl border border-slate-200 bg-white px-5 py-5 sm:px-6 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
              >
                <div className="flex flex-wrap items-baseline gap-2 border-b border-slate-100 pb-3 mb-4">
                  <h4 className="text-sm font-bold text-slate-800">{label}</h4>
                  <span className="text-xs text-slate-400">contenido en {esLabel}</span>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>Pregunta en {label}</label>
                    <input
                      value={form[qk]}
                      onChange={f(qk)}
                      className={inputCls}
                      placeholder={`Vacío = traducción automática desde español`}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Respuesta en {label}</label>
                    <textarea
                      value={form[ak]}
                      onChange={f(ak)}
                      rows={4}
                      className={`${inputCls} resize-y min-h-[110px] leading-relaxed`}
                      placeholder={`Vacío = traducción automática desde español`}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </section>
            ))}

            <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-5 flex flex-wrap items-end gap-6">
              <div className="w-28">
                <label className={labelCls}>Orden</label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={e =>
                    setForm(p => ({ ...p, display_order: Number(e.target.value) || 0 }))
                  }
                  className={inputCls}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  id="faq-active"
                  checked={form.active}
                  onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                  className="rounded border-slate-300 text-[#1a5f6e] focus:ring-[#1a5f6e]"
                />
                <span className="text-sm text-slate-700">Visible en la web</span>
              </label>
            </section>
          </div>

          <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-slate-200">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#1a5f6e] text-white px-5 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={handleFillTranslations}
              disabled={saving}
              className="border border-[#1a5f6e]/40 text-[#1a5f6e] bg-white px-5 py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-[#1a5f6e]/5"
            >
              Traducir campos vacíos
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 py-12 text-center">Cargando…</div>
      ) : faqs.length === 0 ? (
        <div className="text-slate-400 py-12 text-center rounded-xl border border-dashed border-slate-200">
          No hay FAQs. Crea la primera con el botón de arriba.
        </div>
      ) : (
        <ul className="space-y-3">
          {faqs.map(faq => (
            <li
              key={faq.id}
              className={`bg-white border rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-4 ${
                faq.active ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-70'
              }`}
            >
              <span className="text-xs font-mono text-slate-400 w-8 shrink-0 pt-0.5">
                {faq.display_order}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{faq.question}</p>
                {[
                  faq.question_en && 'EN',
                  faq.question_fr && 'FR',
                  faq.question_de && 'DE',
                  faq.question_pt && 'PT',
                ].filter(Boolean).length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Traducciones:{' '}
                    {[faq.question_en && 'EN', faq.question_fr && 'FR', faq.question_de && 'DE', faq.question_pt && 'PT']
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{faq.answer}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleActive(faq)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border ${
                    faq.active
                      ? 'border-emerald-200 text-emerald-800 bg-emerald-50'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {faq.active ? 'Activa' : 'Inactiva'}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(faq)}
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(faq.id)}
                  className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-700 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
