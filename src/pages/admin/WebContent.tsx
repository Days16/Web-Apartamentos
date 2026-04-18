/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchSettings,
  updateSetting,
  fetchWebsiteContent,
  updateWebsiteContent,
} from '../../services/supabaseService';
import Ico, { paths } from '../../components/Ico';
import { useToast } from '../../contexts/ToastContext';
import { PanelPageHeader, PanelConfirm } from '../../components/panel';

export default function WebTextos() {
  const navigate = useNavigate();
  const toast = useToast();
  const KEYS = [
    // ... HERO INICIO ...
    'home_hero_title',
    'home_hero_title_en',
    'home_hero_subtitle',
    'home_hero_subtitle_en',
    // ... BANNER INICIO ...
    'home_banner_title',
    'home_banner_title_en',
    'home_banner_desc',
    'home_banner_desc_en',

    // ... CARACTERÍSTICAS INICIO ...
    'home_features_1_title',
    'home_features_1_title_en',
    'home_features_1_desc',
    'home_features_1_desc_en',
    'home_features_2_title',
    'home_features_2_title_en',
    'home_features_2_desc',
    'home_features_2_desc_en',
    'home_features_3_title',
    'home_features_3_title_en',
    'home_features_3_desc',
    'home_features_3_desc_en',
    'home_features_4_title',
    'home_features_4_title_en',
    'home_features_4_desc',
    'home_features_4_desc_en',

    // ... HERO NOSOTROS ...
    'about_hero_title',
    'about_hero_title_en',
    'about_hero_desc',
    'about_hero_desc_en',

    // ... SECCIÓN HISTORIA ...
    'about_history_title',
    'about_history_title_en',
    'about_history_desc_1',
    'about_history_desc_1_en',
    'about_history_desc_2',
    'about_history_desc_2_en',

    // ... SECCIÓN RIBADEO ...
    'about_ribadeo_title',
    'about_ribadeo_title_en',
    'about_ribadeo_desc_1',
    'about_ribadeo_desc_1_en',
    'about_ribadeo_desc_2',
    'about_ribadeo_desc_2_en',

    // ... SECCIÓN EXPERIENCIAS ...
    'about_exp_title',
    'about_exp_title_en',
    'about_exp_desc_1',
    'about_exp_desc_1_en',
    'about_exp_desc_2',
    'about_exp_desc_2_en',
  ];
  const [settings, setSettings] = useState(() => {
    const initialState = {
      phone: '',
      email: '',
      address: '',
      metaEs: '',
      metaEn: '',
      maintenanceMode: false,
    };
    KEYS.forEach(key => {
      initialState[key] = '';
    });
    return initialState;
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inicio');

  useEffect(() => {
    async function load() {
      try {
        const [siteSet, webContent] = await Promise.all([fetchSettings(), fetchWebsiteContent()]);

        const newSettings = { ...settings };

        if (siteSet) {
          if (siteSet.site_phone !== undefined) newSettings.phone = siteSet.site_phone;
          if (siteSet.site_email !== undefined) newSettings.email = siteSet.site_email;
          if (siteSet.site_address !== undefined) newSettings.address = siteSet.site_address;
          if (siteSet.maintenance_mode !== undefined)
            newSettings.maintenanceMode = siteSet.maintenance_mode === true;
          if (siteSet.meta_description_es !== undefined)
            newSettings.metaEs = siteSet.meta_description_es;
          if (siteSet.meta_description_en !== undefined)
            newSettings.metaEn = siteSet.meta_description_en;
        }

        webContent.forEach(c => {
          if (KEYS.includes(c.section_key)) {
            newSettings[c.section_key] = c.content_es || '';
            if (c.section_key.endsWith('_en')) {
              newSettings[c.section_key] = c.content_en || '';
            } else {
              newSettings[c.section_key] = c.content_es || '';
            }
          }
        });

        setSettings(newSettings);
      } catch (err) {
        console.error('Error loading web textos:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const up = field => e => setSettings(p => ({ ...p, [field]: e.target.value }));

  const Field = ({ label, name, isTextarea = false, placeholder = '' }) => {
    const value = settings[name] || '';
    const isRequired =
      (name.includes('title') && !name.endsWith('_en')) || name === 'phone' || name === 'email';
    const hasError = isRequired && !value.trim();
    const inputClass = `w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 ${hasError ? 'border-red-500' : 'border-gray-300'}`;

    return (
      <div>
        <label className="block text-sm font-semibold text-navy mb-2">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        {isTextarea ? (
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            value={value}
            onChange={up(name)}
            placeholder={placeholder}
          />
        ) : (
          <input
            className={inputClass}
            type="text"
            value={value}
            onChange={up(name)}
            placeholder={placeholder}
          />
        )}
      </div>
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates = [
        updateSetting('site_phone', settings.phone),
        updateSetting('site_email', settings.email),
        updateSetting('site_address', settings.address),
        updateSetting('maintenance_mode', settings.maintenanceMode, 'boolean'),
        updateSetting('meta_description_es', settings.metaEs),
        updateSetting('meta_description_en', settings.metaEn),
      ];

      KEYS.forEach(key => {
        const page = key.startsWith('home_') ? 'home' : 'about';
        if (key.endsWith('_en')) {
          const baseKey = key.replace('_en', '');
          updates.push(updateWebsiteContent(baseKey, { page, content_en: settings[key] }));
        } else {
          updates.push(updateWebsiteContent(key, { page, content_es: settings[key] }));
        }
      });

      await Promise.all(updates);
      toast.success('Textos publicados correctamente');
    } catch (err) {
      console.error('Error saving texts:', err);
      const isRLS = err.code === '42501' || err.message?.includes('policy');
      toast.error(`Error al guardar: ${err.message}${isRLS ? ' (Revisa permisos RLS)' : ''}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenance = async active => {
    setSettings(p => ({ ...p, maintenanceMode: active }));
    try {
      await updateSetting('maintenance_mode', active, 'boolean');
    } catch (err) {
      console.error('Error al cambiar modo mantenimiento:', err);
      toast.error('No se pudo cambiar el modo mantenimiento.');
    }
  };

  if (loading) return <div className="panel-page-content">Cargando datos...</div>;

  return (
    <div className="panel-page-content pb-24">
      <PanelPageHeader
        title="Textos de la web"
        subtitle="Modifica el contenido sin tocar código"
        actions={
          <div className="flex gap-1">
            {[
              { key: 'inicio', label: 'Inicio' },
              { key: 'inicio_feat', label: 'Características' },
              { key: 'nosotros', label: 'Nosotros' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`panel-btn panel-btn-sm ${activeTab === t.key ? 'panel-btn-primary' : 'panel-btn-ghost'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      <div>
        <div className="panel-card max-w-3xl">
          {/* HOME TAB */}
          {activeTab === 'inicio' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* HOME HERO */}
              <div className="font-serif text-xl text-navy mb-5">Inicio: Hero principal</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                <div className="space-y-5">
                  <Field label="Título principal" name="home_hero_title" />
                  <Field label="Subtítulo" name="home_hero_subtitle" isTextarea />
                </div>
                <div className="space-y-5">
                  <Field label="Main title (EN)" name="home_hero_title_en" />
                  <Field label="Subtitle (EN)" name="home_hero_subtitle_en" isTextarea />
                </div>
              </div>

              {/* HOME BANNER */}
              <div className="font-serif text-xl text-navy mb-5 border-t border-gray-200 pt-5">
                Inicio: Banner «Reserva directa»
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                <div className="space-y-5">
                  <Field
                    label="Título banner"
                    name="home_banner_title"
                    placeholder="¿Por qué reservar directo con nosotros?"
                  />
                  <Field label="Descripción banner" name="home_banner_desc" isTextarea />
                </div>
                <div className="space-y-5">
                  <Field
                    label="Banner title (EN)"
                    name="home_banner_title_en"
                    placeholder="Why book direct with us?"
                  />
                  <Field label="Banner desc (EN)" name="home_banner_desc_en" isTextarea />
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA INICIO - CARACTERÍSTICAS */}
          {activeTab === 'inicio_feat' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Feature 1 */}
              <div className="panel-card">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center">
                    <Ico d={paths.star} size={16} color="#1a5f6e" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-navy">Característica 1</h2>
                    <p className="text-xs text-gray-500">Decoración de interiores</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                  <div className="space-y-5">
                    <Field label="Título" name="home_features_1_title" />
                    <Field label="Descripción" name="home_features_1_desc" isTextarea />
                  </div>
                  <div className="space-y-5">
                    <Field label="Title (EN)" name="home_features_1_title_en" />
                    <Field label="Description (EN)" name="home_features_1_desc_en" isTextarea />
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="panel-card">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center">
                    <Ico d={paths.wifi} size={16} color="#1a5f6e" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-navy">Característica 2</h2>
                    <p className="text-xs text-gray-500">Conectividad / Entorno de trabajo</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                  <div className="space-y-5">
                    <Field label="Título" name="home_features_2_title" />
                    <Field label="Descripción" name="home_features_2_desc" isTextarea />
                  </div>
                  <div className="space-y-5">
                    <Field label="Title (EN)" name="home_features_2_title_en" />
                    <Field label="Description (EN)" name="home_features_2_desc_en" isTextarea />
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="panel-card">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center">
                    <Ico d={paths.location} size={16} color="#1a5f6e" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-navy">Característica 3</h2>
                    <p className="text-xs text-gray-500">Ubicación céntrica</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                  <div className="space-y-5">
                    <Field label="Título" name="home_features_3_title" />
                    <Field label="Descripción" name="home_features_3_desc" isTextarea />
                  </div>
                  <div className="space-y-5">
                    <Field label="Title (EN)" name="home_features_3_title_en" />
                    <Field label="Description (EN)" name="home_features_3_desc_en" isTextarea />
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="panel-card">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center">
                    <Ico d={paths.check} size={16} color="#1a5f6e" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-navy">Característica 4</h2>
                    <p className="text-xs text-gray-500">Autonomía y check-in fácil</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                  <div className="space-y-5">
                    <Field label="Título" name="home_features_4_title" />
                    <Field label="Descripción" name="home_features_4_desc" isTextarea />
                  </div>
                  <div className="space-y-5">
                    <Field label="Title (EN)" name="home_features_4_title_en" />
                    <Field label="Description (EN)" name="home_features_4_desc_en" isTextarea />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABOUT TAB */}
          {activeTab === 'nosotros' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* ABOUT HERO */}
              <div className="font-serif text-xl text-navy mb-5">Nosotros: Hero</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                <div className="space-y-5">
                  <Field label="Título Nosotros" name="about_hero_title" />
                  <Field label="Descripción Hero" name="about_hero_desc" isTextarea />
                </div>
                <div className="space-y-5">
                  <Field label="About Hero Title (EN)" name="about_hero_title_en" />
                  <Field label="Hero Desc (EN)" name="about_hero_desc_en" isTextarea />
                </div>
              </div>

              {/* ABOUT STORY */}
              <div className="font-serif text-xl text-navy mb-5 mt-8 border-t-2 border-navy pt-5">
                Nosotros: Historia
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                <div className="space-y-5">
                  <Field label="Título Historia" name="about_history_title" />
                  <Field label="Texto Historia 1" name="about_history_desc_1" isTextarea />
                  <Field label="Texto Historia 2" name="about_history_desc_2" isTextarea />
                </div>
                <div className="space-y-5">
                  <Field label="Story Title (EN)" name="about_history_title_en" />
                  <Field label="Story Text 1 (EN)" name="about_history_desc_1_en" isTextarea />
                  <Field label="Story Text 2 (EN)" name="about_history_desc_2_en" isTextarea />
                </div>
              </div>

              {/* ABOUT RIBADEO */}
              <div className="font-serif text-xl text-navy mb-5 mt-8 border-t-2 border-navy pt-5">
                Nosotros: Ribadeo
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                <div className="space-y-5">
                  <Field label="Título Ribadeo" name="about_ribadeo_title" />
                  <Field label="Texto Ribadeo 1" name="about_ribadeo_desc_1" isTextarea />
                  <Field label="Texto Ribadeo 2" name="about_ribadeo_desc_2" isTextarea />
                </div>
                <div className="space-y-5">
                  <Field label="Ribadeo Title (EN)" name="about_ribadeo_title_en" />
                  <Field label="Ribadeo Text 1 (EN)" name="about_ribadeo_desc_1_en" isTextarea />
                  <Field label="Ribadeo Text 2 (EN)" name="about_ribadeo_desc_2_en" isTextarea />
                </div>
              </div>

              {/* ABOUT EXPERIENCES */}
              <div className="font-serif text-xl text-navy mb-5 mt-8 border-t-2 border-navy pt-5">
                Nosotros: Experiencias
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                <div className="space-y-5">
                  <Field label="Título Experiencias" name="about_exp_title" />
                  <Field label="Texto Experiencias 1" name="about_exp_desc_1" isTextarea />
                  <Field label="Texto Experiencias 2" name="about_exp_desc_2" isTextarea />
                </div>
                <div className="space-y-5">
                  <Field label="Experiences Title (EN)" name="about_exp_title_en" />
                  <Field label="Experiences Text 1 (EN)" name="about_exp_desc_1_en" isTextarea />
                  <Field label="Experiences Text 2 (EN)" name="about_exp_desc_2_en" isTextarea />
                </div>
              </div>
            </div>
          )}

          {/* CONTACT & SEO */}
          <div className="font-serif text-xl text-navy mb-5 border-t-2 border-navy pt-5">
            Contacto y SEO
          </div>
          <div className="flex gap-4 flex-wrap mb-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">
                Teléfono {!settings.phone.trim() && <span className="text-red-500">*</span>}
              </label>
              <input
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 ${!settings.phone.trim() ? 'border-red-500' : 'border-gray-300'}`}
                value={settings.phone}
                onChange={up('phone')}
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">
                Email {!settings.email.includes('@') && <span className="text-red-500">*</span>}
              </label>
              <input
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 ${!settings.email.includes('@') ? 'border-red-500' : 'border-gray-300'}`}
                value={settings.email}
                onChange={up('email')}
              />
            </div>
          </div>
          <div className="flex-1 min-w-0 mb-4">
            <label className="block text-sm font-semibold text-navy mb-2">
              Meta Descripción (ES)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 resize-none"
              value={settings.metaEs}
              onChange={up('metaEs')}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-semibold text-navy mb-2">
              Meta Description (EN)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 resize-none"
              value={settings.metaEn}
              onChange={up('metaEn')}
            />
          </div>
        </div>
      </div>

      <div className="panel-sticky-footer">
        <button
          className="panel-btn panel-btn-primary flex items-center gap-2"
          onClick={() => setConfirmOpen(true)}
          disabled={
            saving ||
            !settings.home_hero_title?.trim() ||
            !settings.email.includes('@') ||
            !settings.phone.trim()
          }
        >
          {saving && (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {saving ? 'Publicando...' : 'Guardar y publicar'}
        </button>
      </div>

      <PanelConfirm
        open={confirmOpen}
        title="¿Publicar cambios en la web?"
        description="Los textos actualizados se mostrarán en la web pública inmediatamente."
        confirmLabel="Confirmar y publicar"
        onConfirm={() => {
          setConfirmOpen(false);
          handleSave();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
