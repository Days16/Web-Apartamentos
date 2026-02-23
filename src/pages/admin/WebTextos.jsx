import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSettings, updateSetting, fetchWebsiteContent, updateWebsiteContent } from '../../services/supabaseService';

export default function WebTextos() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    titleEs: '', titleEn: '',
    subtitleEs: '', subtitleEn: '',
    aboutHeroTitleEs: '', aboutHeroTitleEn: '',
    aboutHeroDescEs: '', aboutHeroDescEn: '',
    aboutStoryTitleEs: '', aboutStoryTitleEn: '',
    aboutText1Es: '', aboutText1En: '',
    phone: '', email: '', address: '',
    metaEs: '', metaEn: '',
    maintenanceMode: false
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [siteSet, webContent] = await Promise.all([
          fetchSettings(),
          fetchWebsiteContent()
        ]);

        const newSettings = { ...settings };

        if (siteSet) {
          if (siteSet.site_phone !== undefined) newSettings.phone = siteSet.site_phone;
          if (siteSet.site_email !== undefined) newSettings.email = siteSet.site_email;
          if (siteSet.site_address !== undefined) newSettings.address = siteSet.site_address;
          if (siteSet.maintenance_mode !== undefined) newSettings.maintenanceMode = siteSet.maintenance_mode === true;
          if (siteSet.meta_description_es !== undefined) newSettings.metaEs = siteSet.meta_description_es;
          if (siteSet.meta_description_en !== undefined) newSettings.metaEn = siteSet.meta_description_en;
        }

        webContent.forEach(c => {
          if (c.section_key === 'home_hero_title') {
            newSettings.titleEs = c.content_es || '';
            newSettings.titleEn = c.content_en || '';
          }
          if (c.section_key === 'home_hero_desc') {
            newSettings.subtitleEs = c.content_es || '';
            newSettings.subtitleEn = c.content_en || '';
          }
          if (c.section_key === 'about_hero_title') {
            newSettings.aboutHeroTitleEs = c.content_es || '';
            newSettings.aboutHeroTitleEn = c.content_en || '';
          }
          if (c.section_key === 'about_hero_desc') {
            newSettings.aboutHeroDescEs = c.content_es || '';
            newSettings.aboutHeroDescEn = c.content_en || '';
          }
          if (c.section_key === 'about_story_title') {
            newSettings.aboutStoryTitleEs = c.content_es || '';
            newSettings.aboutStoryTitleEn = c.content_en || '';
          }
          if (c.section_key === 'about_story_text_1') {
            newSettings.aboutText1Es = c.content_es || '';
            newSettings.aboutText1En = c.content_en || '';
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

  const up = (field) => (e) => setSettings(p => ({ ...p, [field]: e.target.value }));

  const handleSave = async () => {
    try {
      setSaved(false);
      await Promise.all([
        updateSetting('site_phone', settings.phone),
        updateSetting('site_email', settings.email),
        updateSetting('site_address', settings.address),
        updateSetting('maintenance_mode', settings.maintenanceMode, 'boolean'),
        updateSetting('meta_description_es', settings.metaEs),
        updateSetting('meta_description_en', settings.metaEn),
        updateWebsiteContent('home_hero_title', { page: 'home', content_es: settings.titleEs, content_en: settings.titleEn }),
        updateWebsiteContent('home_hero_desc', { page: 'home', content_es: settings.subtitleEs, content_en: settings.subtitleEn }),
        updateWebsiteContent('about_hero_title', { page: 'about', content_es: settings.aboutHeroTitleEs, content_en: settings.aboutHeroTitleEn }),
        updateWebsiteContent('about_hero_desc', { page: 'about', content_es: settings.aboutHeroDescEs, content_en: settings.aboutHeroDescEn }),
        updateWebsiteContent('about_story_title', { page: 'about', content_es: settings.aboutStoryTitleEs, content_en: settings.aboutStoryTitleEn }),
        updateWebsiteContent('about_story_text_1', { page: 'about', content_es: settings.aboutText1Es, content_en: settings.aboutText1En })
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving texts:', err);
      const isRLS = err.code === '42501' || err.message?.includes('policy');
      alert(`Error al guardar los textos: ${err.message}${isRLS ? '\n\nTIP: Esto suele ser un problema de permisos RLS en Supabase.' : ''}`);
    }
  };

  const handleToggleMaintenance = async (active) => {
    setSettings(p => ({ ...p, maintenanceMode: active }));
    try {
      await updateSetting('maintenance_mode', active, 'boolean');
    } catch (err) {
      console.error('Error al cambiar modo mantenimiento:', err);
      alert('No se pudo cambiar el modo mantenimiento.');
    }
  };

  if (loading) return <div className="p-10">Cargando datos...</div>;

  return (
    <>
      <div className="pl-6 pr-6 py-6 border-b border-gray-200 bg-white">
        <div>
          <div className="text-2xl font-bold text-navy">Textos de la web</div>
          <div className="text-sm text-gray-600 mt-1">Modifica el contenido sin tocar código</div>
        </div>
      </div>

      <div className="p-6 bg-gray-50">

        {/* MANTENIMIENTO */}
        {/*
        <div className={`bg-white border rounded-lg p-8 max-w-3xl mb-5 ${settings.maintenanceMode ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <div className={`font-semibold ${settings.maintenanceMode ? 'text-red-700' : 'text-navy'}`}>
                {settings.maintenanceMode ? '⚠️ Modo Mantenimiento ACTIVO' : 'Modo Mantenimiento'}
              </div>
              <div className="text-xs text-slate-600">
                Cuando está activo, los clientes verán una pantalla de aviso.
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {settings.maintenanceMode && (
                <button
                  onClick={() => {
                    sessionStorage.setItem('maintenance_preview', 'true');
                    navigate('/');
                  }}
                  className="bg-navy text-white border-none py-1.5 px-3.5 rounded text-xs font-medium cursor-pointer whitespace-nowrap hover:bg-navy/90"
                >
                  👁️ Ver vista previa
                </button>
              )}
              <label className="premium-switch">
                <input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => handleToggleMaintenance(e.target.checked)} />
                <span className="premium-slider" />
              </label>
            </div>
          </div>
        </div>
        */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-3xl mb-4">
          {/* HOME HERO */}
          <div className="font-serif text-xl text-navy mb-5">
            Inicio: Hero principal
          </div>
          <div className="flex gap-4 flex-wrap mb-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">Título principal (ES) {!settings.titleEs.trim() && <span className="text-red-500">*</span>}</label>
              <input className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 ${!settings.titleEs.trim() ? 'border-red-500' : 'border-gray-300'}`} value={settings.titleEs} onChange={up('titleEs')} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">Main title (EN)</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20" value={settings.titleEn} onChange={up('titleEn')} />
            </div>
          </div>
          <div className="flex gap-4 flex-wrap mb-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">Subtítulo (ES)</label>
              <textarea className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 resize-none" value={settings.subtitleEs} onChange={up('subtitleEs')} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">Subtitle (EN)</label>
              <textarea className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 resize-none" value={settings.subtitleEn} onChange={up('subtitleEn')} />
            </div>
          </div>

          <div className="h-10" />

          {/* ABOUT HERO */}
          <div className="font-serif text-xl text-navy mb-5 border-t border-gray-200 pt-5">
            Nosotros: Hero
          </div>
          <div className="flex gap-4 flex-wrap mb-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">Título Nosotros (ES)</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20" value={settings.aboutHeroTitleEs} onChange={up('aboutHeroTitleEs')} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">About Hero Title (EN)</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20" value={settings.aboutHeroTitleEn} onChange={up('aboutHeroTitleEn')} />
            </div>
          </div>
          <div className="flex gap-4 flex-wrap mb-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">Descripción Hero (ES)</label>
              <textarea className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 resize-none" value={settings.aboutHeroDescEs} onChange={up('aboutHeroDescEs')} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">Hero Desc (EN)</label>
              <textarea className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 resize-none" value={settings.aboutHeroDescEn} onChange={up('aboutHeroDescEn')} />
            </div>
          </div>

          {/* ABOUT STORY */}
          <div className="font-serif text-xl text-navy mb-5 mt-8 border-t-2 border-navy pt-5">
            Nosotros: Historia
          </div>
          <div className="flex gap-4 flex-wrap mb-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">Título Historia (ES)</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20" value={settings.aboutStoryTitleEs} onChange={up('aboutStoryTitleEs')} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">Story Title (EN)</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20" value={settings.aboutStoryTitleEn} onChange={up('aboutStoryTitleEn')} />
            </div>
          </div>
          <div className="flex gap-4 flex-wrap mb-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">Texto Historia 1 (ES)</label>
              <textarea className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 resize-none" style={{ minHeight: '120px' }} value={settings.aboutText1Es} onChange={up('aboutText1Es')} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">Story Text 1 (EN)</label>
              <textarea className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 resize-none" style={{ minHeight: '120px' }} value={settings.aboutText1En} onChange={up('aboutText1En')} />
            </div>
          </div>

          <div className="h-10" />

          {/* CONTACT & SEO */}
          <div className="font-serif text-xl text-navy mb-5 border-t-2 border-navy pt-5">
            Contacto y SEO
          </div>
          <div className="flex gap-4 flex-wrap mb-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">Teléfono {!settings.phone.trim() && <span className="text-red-500">*</span>}</label>
              <input className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 ${!settings.phone.trim() ? 'border-red-500' : 'border-gray-300'}`} value={settings.phone} onChange={up('phone')} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-navy mb-2">Email {!settings.email.includes('@') && <span className="text-red-500">*</span>}</label>
              <input className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 ${!settings.email.includes('@') ? 'border-red-500' : 'border-gray-300'}`} value={settings.email} onChange={up('email')} />
            </div>
          </div>
          <div className="flex-1 min-w-0 mb-4">
            <label className="block text-sm font-semibold text-navy mb-2">Meta Descripción (ES)</label>
            <textarea className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 resize-none" value={settings.metaEs} onChange={up('metaEs')} />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-semibold text-navy mb-2">Meta Description (EN)</label>
            <textarea className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 resize-none" value={settings.metaEn} onChange={up('metaEn')} />
          </div>
        </div>

        {saved && (
          <div className="bg-blue-50 border border-blue-200 py-3 px-5 rounded-lg text-blue-900 mb-5 max-w-3xl text-xs">
            ✓ Cambios guardados con éxito
          </div>
        )}
      </div>

      <div className="fixed bottom-0 right-0 left-0 bg-white border-t border-gray-200 py-4 px-6 z-50">
        <button
          className="px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer border-0 bg-teal-600 text-white hover:bg-teal-700"
          onClick={handleSave}
          disabled={!settings.titleEs.trim() || !settings.email.includes('@') || !settings.phone.trim()}
          style={{ opacity: (!settings.titleEs.trim() || !settings.email.includes('@') || !settings.phone.trim()) ? 0.5 : 1 }}
        >
          Guardar y publicar
        </button>
      </div>
    </>
  );
}
