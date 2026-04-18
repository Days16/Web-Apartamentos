/* eslint-disable */
// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { fetchSettings, updateSetting } from '../../services/supabaseService';
import PanelPageHeader from '../../components/panel/PanelPageHeader';

// Escala: 1 punto PDF = 1 px (595 × 842 px)
const SCALE = 1;
const PDF_W  = 595;
const PDF_H  = 842;

export type PdfElement = {
  id: string;
  label: string;
  type: 'static' | 'dynamic';
  content: string;
  x: number;   // puntos PDF desde la izquierda
  y: number;   // puntos PDF desde arriba
  fontSize: number;
  bold: boolean;
  color: string;
};

export const PDF_VARS = [
  { key: '{{ref}}',             label: 'Nº Reserva (ej: IP-001)' },
  { key: '{{fecha}}',           label: 'Fecha emisión PDF' },
  { key: '{{apt_nombre}}',      label: 'Nombre del apartamento' },
  { key: '{{checkin_fecha}}',   label: 'Fecha entrada larga' },
  { key: '{{checkout_fecha}}',  label: 'Fecha salida larga' },
  { key: '{{noches_num}}',      label: 'Número de noches' },
  { key: '{{fuente_canal}}',    label: 'Canal de reserva' },
  { key: '{{deposit_eur}}',     label: 'Depósito pagado (€)' },
  { key: '{{pending_eur}}',     label: 'Importe pendiente (€)' },
  { key: '{{total_eur}}',       label: 'Total reserva (€)' },
  { key: '{{nombre_huesped}}',  label: 'Nombre del huésped' },
  { key: '{{apt_descripcion}}', label: 'Descripción apartamento (texto)' },
  { key: '{{apt_amenidades}}',  label: 'Amenidades (lista con bullets)' },
  { key: '{{apt_tagline}}',     label: 'Frase de cierre del apartamento' },
];

const PREVIEW: Record<string, string> = {
  '{{ref}}':             'IP-001',
  '{{fecha}}':           '16/04/2026',
  '{{apt_nombre}}':      'Apartamento Cantil (hasta 4 personas)',
  '{{checkin_fecha}}':   'SÁBADO 11 DE ABRIL DE 2026',
  '{{checkout_fecha}}':  'DOMINGO 12 DE ABRIL DE 2026',
  '{{noches_num}}':      '1',
  '{{fuente_canal}}':    'Reserva directa',
  '{{deposit_eur}}':     '120€',
  '{{pending_eur}}':     '120€',
  '{{total_eur}}':       '240€',
  '{{nombre_huesped}}':  'Juan García',
  '{{apt_descripcion}}': 'Amplio y cómodo apartamento de 97 m², perfecto para familias o grupos.',
  '{{apt_amenidades}}':  '3 habitaciones (2 matrimonio + 3 individuales)\nSalón-comedor con 2 sofás cama\n2 baños completos\nCocina totalmente equipada\nIncluye menaje, ropa de cama y toallas',
  '{{apt_tagline}}':    'Todo lo que necesitas para una estancia cómoda y sin preocupaciones.',
};

export const DEFAULT_PDF_ELEMENTS: PdfElement[] = [
  { id: 'ref',     label: 'Nº Reserva',       type: 'dynamic', content: '{{ref}}',                                                        x: 498, y: 237, fontSize: 9,  bold: true,  color: '#1a5f6e' },
  { id: 'fecha',   label: 'Fecha emisión',    type: 'dynamic', content: '{{fecha}}',                                                      x: 454, y: 261, fontSize: 9,  bold: true,  color: '#1a5f6e' },
  { id: 'apt',     label: 'Nombre apt.',      type: 'dynamic', content: '{{apt_nombre}}',                                                  x: 135, y: 344, fontSize: 9,  bold: true,  color: '#0e0e0e' },
  { id: 'desc',    label: 'Descripción apt.', type: 'dynamic', content: '{{apt_descripcion}}',                                             x: 135, y: 358, fontSize: 8,  bold: false, color: '#444444' },
  { id: 'amen',    label: 'Amenidades',       type: 'dynamic', content: '{{apt_amenidades}}',                                              x: 148, y: 374, fontSize: 8,  bold: false, color: '#1a5f6e' },
  { id: 'tagline', label: 'Frase cierre',     type: 'dynamic', content: '{{apt_tagline}}',                                                 x: 135, y: 458, fontSize: 8,  bold: false, color: '#444444' },
  { id: 'entrada', label: 'Fecha entrada',    type: 'dynamic', content: 'Fecha de entrada:  {{checkin_fecha}}',                            x: 124, y: 513, fontSize: 9,  bold: true,  color: '#0e0e0e' },
  { id: 'salida',  label: 'Fecha salida',     type: 'dynamic', content: 'Fecha de salida:  {{checkout_fecha}}',                            x: 124, y: 549, fontSize: 9,  bold: true,  color: '#0e0e0e' },
  { id: 'noches',  label: 'Nº de noches',     type: 'dynamic', content: 'Nº de noches:  {{noches_num}}',                                   x: 124, y: 567, fontSize: 9,  bold: true,  color: '#0e0e0e' },
  { id: 'fuente',  label: 'Canal reserva',    type: 'dynamic', content: 'Total estancia:  {{fuente_canal}}',                               x: 124, y: 585, fontSize: 9,  bold: true,  color: '#0e0e0e' },
  { id: 'total',   label: 'Total/Pendiente',  type: 'dynamic', content: 'TOTAL PAGADO: {{deposit_eur}}   |   PENDIENTE: {{pending_eur}}',   x: 124, y: 603, fontSize: 9,  bold: true,  color: '#0e0e0e' },
];

function resolvePreview(content: string): string {
  return content.replace(/\{\{[\w_]+\}\}/g, (m) => PREVIEW[m] ?? m);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

const COLOR_PRESETS = [
  { hex: '#1a5f6e', name: 'Teal' },
  { hex: '#0e0e0e', name: 'Oscuro' },
  { hex: '#D4A843', name: 'Dorado' },
  { hex: '#6b7280', name: 'Gris' },
  { hex: '#ffffff', name: 'Blanco' },
];

export default function PdfEditorAdmin() {
  const wrapperRef   = useRef<HTMLDivElement>(null);

  const [elements,   setElements]   = useState<PdfElement[]>(DEFAULT_PDF_ELEMENTS);
  const [selected,   setSelected]   = useState<string | null>(null);
  const [dragging,   setDragging]   = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number }>({});
  const [saving,     setSaving]     = useState(false);
  const [status,     setStatus]     = useState('');
  const [loaded,     setLoaded]     = useState(false);

  // Ref para leer elementos actuales dentro del listener sin closure stale
  const elementsRef = useRef(elements);
  useEffect(() => { elementsRef.current = elements; }, [elements]);

  const selectedEl = elements.find(e => e.id === selected) ?? null;

  const SNAP_DIST = 5; // pt

  // ── Cargar layout guardado ────────────────────────────────────────
  const layoutLoaded = useRef(false);
  useEffect(() => {
    if (layoutLoaded.current) return;
    layoutLoaded.current = true;
    fetchSettings().then(s => {
      const raw = (s as any)?.pdf_layout;
      if (raw) {
        try {
          const stored = JSON.parse(raw);
          // Formato v2: { _v: 2, elements: [...] } — respeta lo que el usuario guardó sin migrar
          // Formato v1 (legacy): array directo — migra para añadir desc/amen si faltan
          let parsed: PdfElement[];
          let isMigrated = false;
          if (stored && typeof stored === 'object' && !Array.isArray(stored) && stored._v >= 2) {
            parsed = stored.elements;
          } else if (Array.isArray(stored) && stored.length > 0) {
            parsed = stored;
            isMigrated = true; // layout viejo, aplicar migración
          } else {
            setLoaded(true); return;
          }
          if (isMigrated) {
            const hasDesc = parsed.some(el => el.content.includes('{{apt_descripcion}}'));
            const hasAmen = parsed.some(el => el.content.includes('{{apt_amenidades}}'));
            if (!hasDesc || !hasAmen) {
              const aptIdx = parsed.findIndex(el => el.id === 'apt');
              const toAdd: PdfElement[] = [];
              if (!hasDesc) toAdd.push({ id: 'desc', label: 'Descripción apt.', type: 'dynamic', content: '{{apt_descripcion}}', x: 135, y: 358, fontSize: 8, bold: false, color: '#444444' });
              if (!hasAmen) toAdd.push({ id: 'amen', label: 'Amenidades',       type: 'dynamic', content: '{{apt_amenidades}}',  x: 155, y: 410, fontSize: 8, bold: false, color: '#1a5f6e' });
              parsed = aptIdx >= 0
                ? [...parsed.slice(0, aptIdx + 1), ...toAdd, ...parsed.slice(aptIdx + 1)]
                : [...parsed, ...toAdd];
            }
          }
          // Deduplicar por ID
          { const seen = new Set<string>(); parsed = parsed.filter(el => seen.has(el.id) ? false : (seen.add(el.id), true)); }
          if (parsed.length > 0) setElements(parsed);
        } catch {}
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  // ── Arrastre + snap ───────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging || !wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      let x = Math.max(0, Math.min(PDF_W - 4, (e.clientX - rect.left - dragging.ox) / SCALE));
      let y = Math.max(0, Math.min(PDF_H - 4, (e.clientY - rect.top  - dragging.oy) / SCALE));

      const guides: { x?: number; y?: number } = {};

      // Snap al centro del canvas
      if (Math.abs(x - PDF_W / 2) < SNAP_DIST) { x = PDF_W / 2; guides.x = x; }
      if (Math.abs(y - PDF_H / 2) < SNAP_DIST) { y = PDF_H / 2; guides.y = y; }

      // Snap a otros campos (misma X o misma Y)
      for (const el of elementsRef.current) {
        if (el.id === dragging.id) continue;
        if (guides.x === undefined && Math.abs(x - el.x) < SNAP_DIST) { x = el.x; guides.x = x; }
        if (guides.y === undefined && Math.abs(y - el.y) < SNAP_DIST) { y = el.y; guides.y = y; }
      }

      setSnapGuides(guides);
      setElements(els => els.map(el => el.id === dragging.id ? { ...el, x: Math.round(x), y: Math.round(y) } : el));
    };
    const onUp = () => { setDragging(null); setSnapGuides({}); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',  onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',  onUp);
    };
  }, [dragging]);

  function startDrag(e: React.MouseEvent, el: PdfElement) {
    e.stopPropagation(); e.preventDefault();
    setSelected(el.id);
    const wr = wrapperRef.current!.getBoundingClientRect();
    setDragging({ id: el.id, ox: e.clientX - wr.left - el.x * SCALE, oy: e.clientY - wr.top - el.y * SCALE });
  }

  function updateEl(id: string, patch: Partial<PdfElement>) {
    setElements(els => els.map(el => el.id === id ? { ...el, ...patch } : el));
  }

  function deleteEl(id: string) {
    setElements(els => els.filter(el => el.id !== id));
    if (selected === id) setSelected(null);
  }

  function addEl(type: 'static' | 'dynamic') {
    const id = uid();
    setElements(els => [...els, {
      id, label: type === 'static' ? 'Texto nuevo' : 'Campo nuevo',
      type, content: type === 'static' ? 'Texto de ejemplo' : '{{ref}}',
      x: 100, y: 420, fontSize: 10, bold: false, color: '#0e0e0e',
    }]);
    setSelected(id);
  }

  async function handleSave() {
    setSaving(true); setStatus('');
    try {
      await updateSetting('pdf_layout', JSON.stringify({ _v: 2, elements }), 'string');
      setStatus('✓ Guardado');
      setTimeout(() => setStatus(''), 3000);
    } catch (err: any) {
      setStatus('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function resetToDefault() {
    if (!confirm('¿Restablecer el diseño predeterminado?')) return;
    setElements(DEFAULT_PDF_ELEMENTS);
    setSelected(null);
    setStatus('');
  }

  if (!loaded) return (
    <div className="panel-page-content">
      <PanelPageHeader title="Editor de PDF" />
      <p className="panel-caption">Cargando…</p>
    </div>
  );

  return (
    <div className="panel-page-content pdf-editor-root">
      <PanelPageHeader
        title="Editor de PDF"
        subtitle="Arrastra los campos para moverlos. Los campos dinámicos se rellenan con los datos de cada reserva al generar el PDF."
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {status && (
              <span style={{ fontSize: 13, color: status.startsWith('✓') ? '#22c55e' : '#ef4444' }}>
                {status}
              </span>
            )}
            <button className="panel-btn panel-btn-ghost panel-btn-sm" onClick={resetToDefault}>
              Restablecer
            </button>
            <button className="panel-btn panel-btn-primary panel-btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar diseño'}
            </button>
          </div>
        }
      />

      <div className="pdf-editor-layout">

        {/* ── SIDEBAR IZQUIERDA ── */}
        <aside className="pdf-editor-sidebar">
          <div className="panel-card pdf-editor-sidebar-card">

            {/* Añadir campo */}
            <div className="pdf-editor-sidebar-section">
              <p className="pdf-editor-section-title">Añadir campo</p>
              <button className="panel-btn panel-btn-primary panel-btn-sm pdf-editor-add-btn" onClick={() => addEl('dynamic')}>
                + Campo dinámico
              </button>
              <button className="panel-btn panel-btn-ghost panel-btn-sm pdf-editor-add-btn" onClick={() => addEl('static')}>
                + Texto fijo
              </button>
            </div>

            <div className="pdf-editor-divider" />

            {/* Lista de campos */}
            <div className="pdf-editor-sidebar-section">
              <p className="pdf-editor-section-title">Campos ({elements.length})</p>
              <div className="pdf-editor-list">
                {elements.map(el => (
                  <div
                    key={el.id}
                    onClick={() => setSelected(el.id)}
                    className={`pdf-editor-item${selected === el.id ? ' pdf-editor-item--active' : ''}`}
                  >
                    <span className={`pdf-editor-badge pdf-editor-badge--${el.type}`}>
                      {el.type === 'dynamic' ? '↺' : 'T'}
                    </span>
                    <span className="pdf-editor-item-label">{el.label}</span>
                    <button
                      className="pdf-editor-item-del"
                      onClick={e => { e.stopPropagation(); deleteEl(el.id); }}
                      title="Eliminar"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </aside>

        {/* ── CANVAS CENTRAL ── */}
        <div className="pdf-editor-canvas-scroll">
          <div className="pdf-editor-canvas-inner">
            <div
              ref={wrapperRef}
              className="pdf-editor-canvas"
              style={{ width: PDF_W * SCALE, height: PDF_H * SCALE }}
              onClick={() => setSelected(null)}
            >
              {/* Plantilla PDF como fondo — iframe nativo, sin dependencias */}
              <iframe
                src="/reserva-template.pdf#toolbar=0&navpanes=0&scrollbar=0"
                style={{ position: 'absolute', top: 0, left: 0, width: PDF_W, height: PDF_H, border: 'none', pointerEvents: 'none' }}
                title="Plantilla PDF"
              />

              {/* ── Guías estáticas (centro) ── */}
              <div className="pdf-guide-center-h" style={{ top: Math.round((PDF_H / 2) * SCALE) }} />
              <div className="pdf-guide-center-v" style={{ left: Math.round((PDF_W / 2) * SCALE) }} />

              {/* ── Guías de snap (activas al arrastrar) ── */}
              {dragging && snapGuides.x !== undefined && (
                <div className="pdf-guide-snap-v" style={{ left: Math.round(snapGuides.x * SCALE) }} />
              )}
              {dragging && snapGuides.y !== undefined && (
                <div className="pdf-guide-snap-h" style={{ top: Math.round(snapGuides.y * SCALE) }} />
              )}

              {elements.map((el, idx) => {
                const preview    = resolvePreview(el.content);
                const isSelected = el.id === selected;
                return (
                  <div
                    key={el.id}
                    onMouseDown={e => startDrag(e, el)}
                    onClick={e => e.stopPropagation()}
                    className={`pdf-editor-field${isSelected ? ' pdf-editor-field--sel' : ''}`}
                    style={{
                      left:       Math.round(el.x * SCALE),
                      top:        Math.round(el.y * SCALE),
                      fontSize:   el.fontSize,
                      fontWeight: el.bold ? 700 : 400,
                      color:      el.color,
                      fontFamily: "'Josefin Sans', Arial, sans-serif",
                      whiteSpace: preview.includes('\n') ? 'pre-line' : 'nowrap',
                      lineHeight: `${el.fontSize + 5}px`,
                      zIndex:     isSelected ? 999 : idx + 1,
                    }}
                    title={el.label}
                  >
                    {preview.includes('\n')
                      ? preview.split('\n').map((line, i) => (
                          <span key={i} style={{ display: 'block' }}>
                            {line ? `\u2022\u00a0${line}` : ''}
                          </span>
                        ))
                      : preview
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── PANEL PROPIEDADES ── */}
        <aside className="pdf-editor-props">
          {selectedEl ? (
            <div className="panel-card pdf-editor-props-card">
              <p className="pdf-editor-section-title" style={{ marginBottom: 14 }}>Propiedades</p>

              <label className="panel-label">Nombre interno</label>
              <input className="panel-input" value={selectedEl.label}
                onChange={e => updateEl(selectedEl.id, { label: e.target.value })} />

              <label className="panel-label" style={{ marginTop: 10 }}>Tipo</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {(['static', 'dynamic'] as const).map(t => (
                  <button key={t}
                    className={`panel-btn panel-btn-sm${selectedEl.type === t ? ' panel-btn-primary' : ' panel-btn-ghost'}`}
                    onClick={() => updateEl(selectedEl.id, { type: t, content: t === 'dynamic' ? '{{ref}}' : 'Texto nuevo' })}
                  >
                    {t === 'static' ? 'Texto fijo' : 'Dinámico'}
                  </button>
                ))}
              </div>

              <label className="panel-label">Contenido</label>
              <textarea className="panel-input" rows={3} value={selectedEl.content}
                onChange={e => updateEl(selectedEl.id, { content: e.target.value })}
                style={{ resize: 'vertical', marginBottom: 8 }} />

              {selectedEl.type === 'dynamic' && (
                <>
                  <p className="panel-caption" style={{ marginBottom: 5 }}>Insertar variable:</p>
                  <div className="pdf-editor-vars">
                    {PDF_VARS.map(v => (
                      <button key={v.key} className="pdf-editor-var-btn" title={v.label}
                        onClick={() => updateEl(selectedEl.id, { content: selectedEl.content + v.key })}>
                        {v.key}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="panel-label">Tamaño (pt)</label>
                  <input type="number" className="panel-input" min={6} max={48}
                    value={selectedEl.fontSize}
                    onChange={e => updateEl(selectedEl.id, { fontSize: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="panel-label">Negrita</label>
                  <div style={{ paddingTop: 10 }}>
                    <input type="checkbox" checked={selectedEl.bold}
                      onChange={e => updateEl(selectedEl.id, { bold: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  </div>
                </div>
              </div>

              <label className="panel-label" style={{ marginTop: 10 }}>Color</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                {COLOR_PRESETS.map(({ hex, name }) => (
                  <button key={hex} title={name}
                    onClick={() => updateEl(selectedEl.id, { color: hex })}
                    style={{
                      width: 26, height: 26, borderRadius: 5, background: hex, cursor: 'pointer',
                      border: selectedEl.color === hex ? '2px solid #1a5f6e' : '2px solid var(--panel-border)',
                      boxShadow: selectedEl.color === hex ? '0 0 0 2px rgba(26,95,110,0.25)' : 'none',
                    }} />
                ))}
                <input type="color" value={selectedEl.color}
                  onChange={e => updateEl(selectedEl.id, { color: e.target.value })}
                  style={{ width: 28, height: 28, borderRadius: 5, cursor: 'pointer', border: 'none', padding: 0 }}
                  title="Color personalizado" />
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--panel-text-subtle)' }}>
                  {selectedEl.color}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="panel-label">X (pt)</label>
                  <input type="number" className="panel-input" min={0} max={595}
                    value={selectedEl.x}
                    onChange={e => updateEl(selectedEl.id, { x: Number(e.target.value) })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="panel-label">Y (pt)</label>
                  <input type="number" className="panel-input" min={0} max={842}
                    value={selectedEl.y}
                    onChange={e => updateEl(selectedEl.id, { y: Number(e.target.value) })} />
                </div>
              </div>

              <button className="panel-btn panel-btn-ghost panel-btn-sm"
                style={{ marginTop: 14, width: '100%', color: '#ef4444', borderColor: '#ef4444' }}
                onClick={() => deleteEl(selectedEl.id)}>
                Eliminar campo
              </button>
            </div>
          ) : (
            <div className="panel-card pdf-editor-props-empty">
              <p className="panel-caption" style={{ textAlign: 'center', padding: '24px 8px', lineHeight: 1.6 }}>
                Selecciona un campo para editar sus propiedades, o arrástralo en el canvas para moverlo.
              </p>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}
