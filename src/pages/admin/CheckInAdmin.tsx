/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { fetchSettings, updateSetting } from '../../services/supabaseService';
import { fetchAllApartments } from '../../services/supabaseService';
import { printCheckIn } from '../../components/CheckInForm';
import { PanelPageHeader } from '../../components/panel';

const FIELDS = [
  {
    key: 'registro_titulo',
    label: 'Título del documento',
    placeholder: 'REGISTRO DE ENTRADA RUA ILLA PANCHA',
    help: 'Aparece en la cabecera del papel. Puedes incluir el nombre del apartamento.',
    type: 'text',
  },
  {
    key: 'registro_identificador',
    label: 'Identificador (esquina superior derecha)',
    placeholder: 'Ej: 1C, 2A, Cantábrico…',
    help: 'Número o código del apartamento. Aparece en la esquina superior derecha.',
    type: 'text',
  },
  {
    key: 'registro_notas',
    label: 'Notas al pie del documento',
    placeholder: 'Ej: Información tratada conforme al RGPD. Responsable: …',
    help: 'Texto opcional que aparece al final del documento.',
    type: 'textarea',
  },
];

export default function RegistroAdmin() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apartments, setApartments] = useState([]);
  const [previewApt, setPreviewApt] = useState('');

  useEffect(() => {
    Promise.all([fetchSettings(), fetchAllApartments()]).then(([settings, apts]) => {
      const v: Record<string, string> = {};
      FIELDS.forEach(f => {
        v[f.key] = (settings[f.key] as string) || '';
      });
      setValues(v);
      setApartments(apts || []);
      if (apts?.length) setPreviewApt(apts[0].slug);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await Promise.all(FIELDS.map(f => updateSetting(f.key, values[f.key] || '', 'string')));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePreview = () => {
    const apt = apartments.find(a => a.slug === previewApt);
    printCheckIn({
      reservation: {
        guest: 'Nombre Apellido Ejemplo',
        email: 'ejemplo@correo.com',
        phone: '+34 600 000 000',
        checkin: new Date().toISOString().slice(0, 10),
        checkout: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        apt_slug: previewApt,
      },
      settings: values,
      apartmentName: apt?.name,
    });
  };

  return (
    <div className="panel-page-content space-y-5">
      <PanelPageHeader
        title="Registro de Entrada"
        subtitle="Configura el papel de registro que se imprime al hacer check-in de cada huésped."
      />

      {/* Ejemplo visual del papel */}
      <div className="panel-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="panel-h3">Vista previa</h2>
          <div className="flex items-center gap-3">
            {apartments.length > 1 && (
              <select
                value={previewApt}
                onChange={e => setPreviewApt(e.target.value)}
                className="panel-input text-xs py-1 px-2"
              >
                {apartments.map(a => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handlePreview}
              className="flex items-center gap-1.5 text-xs border border-teal-600 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              ⎙ Vista previa / Imprimir
            </button>
          </div>
        </div>

        {/* Miniatura del documento */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-5 font-mono text-xs bg-gray-50 dark:bg-gray-900 max-w-lg">
          <div className="flex justify-between items-start mb-3">
            <strong className="text-navy dark:text-white uppercase text-[11px] leading-tight max-w-[75%]">
              {values.registro_titulo || 'REGISTRO DE ENTRADA'}
              {apartments.find(a => a.slug === previewApt)?.name
                ? ' — ' + apartments.find(a => a.slug === previewApt)?.name
                : ''}
            </strong>
            {values.registro_identificador && (
              <span className="border border-gray-400 dark:border-gray-500 px-1.5 py-0.5 text-[10px] font-bold text-navy dark:text-white shrink-0 ml-2">
                {values.registro_identificador}
              </span>
            )}
          </div>
          <table className="w-full border-collapse text-[10px]">
            <tbody>
              {[
                ['Nombre / Name', 'Apellidos / Surname'],
                ['DNI / Identity card / Passport', 'Teléfono / Telephone'],
                ['Población / City', 'País / Country'],
                ['Correo electrónico / Email', 'Fecha de entrada'],
                ['Fecha de salida', 'Fecha de hoy / Date of today'],
              ].map(([a, b], i) => (
                <tr key={i}>
                  <td className="border border-gray-400 dark:border-gray-600 px-2 py-2 w-1/2 text-gray-500 dark:text-gray-400">
                    {a}
                  </td>
                  <td className="border border-gray-400 dark:border-gray-600 px-2 py-2 w-1/2 text-gray-500 dark:text-gray-400">
                    {b}
                  </td>
                </tr>
              ))}
              <tr>
                <td
                  colSpan={2}
                  className="border border-gray-400 dark:border-gray-600 px-2 py-3 text-gray-500 dark:text-gray-400"
                >
                  Firma / Signature
                </td>
              </tr>
            </tbody>
          </table>
          {values.registro_notas && (
            <p className="text-[9px] text-gray-400 mt-2 border-t border-gray-300 dark:border-gray-600 pt-2">
              {values.registro_notas}
            </p>
          )}
        </div>
      </div>

      {/* Configuration form */}
      <div className="panel-card space-y-5">
        <h2 className="panel-h3">Configuración del documento</h2>

        {FIELDS.map(field => (
          <div key={field.key}>
            <label className="panel-form-field-label">{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                value={values[field.key] || ''}
                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                rows={3}
                className="panel-input"
              />
            ) : (
              <input
                type="text"
                value={values[field.key] || ''}
                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="panel-input"
              />
            )}
            <p className="text-xs text-gray-400 mt-1">{field.help}</p>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="panel-btn panel-btn-primary disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400">✓ Guardado</span>}
        </div>
      </div>

      {/* Info legal */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <strong>Obligación legal:</strong> En España, los establecimientos de alojamiento
          turístico deben registrar los datos de los viajeros y comunicarlos a la Guardia Civil o
          Policía Nacional (Orden INT/1922/2003). Este documento es la hoja de registro oficial que
          firman los huéspedes al hacer check-in. Guarda los registros al menos 3 años.
        </p>
      </div>
    </div>
  );
}
