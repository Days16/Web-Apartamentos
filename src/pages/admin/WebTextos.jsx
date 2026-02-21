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

  if (loading) return <div style={{ padding: 40 }}>Cargando datos...</div>;

  return (
    <>
      <div className="main-header">
        <div>
          <div className="main-title">Textos de la web</div>
          <div className="main-sub">Modifica el contenido sin tocar código</div>
        </div>
      </div>

      <div className="main-body">
        {/* MANTENIMIENTO */}
        <div className="card" style={{
          padding: '28px 32px',
          maxWidth: 760,
          marginBottom: 20,
          border: '1px solid',
          borderColor: settings.maintenanceMode ? '#fecaca' : '#e2e8f0',
          background: settings.maintenanceMode ? '#fff5f5' : '#ffffff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: settings.maintenanceMode ? '#b91c1c' : '#0f172a' }}>
                {settings.maintenanceMode ? '⚠️ Modo Mantenimiento ACTIVO' : 'Modo Mantenimiento'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Cuando está activo, los clientes verán una pantalla de aviso.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {settings.maintenanceMode && (
                <button
                  onClick={() => {
                    sessionStorage.setItem('maintenance_preview', 'true');
                    navigate('/');
                  }}
                  style={{
                    background: '#0f172a',
                    color: 'white',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
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

        <div className="card" style={{ padding: 32, maxWidth: 760, marginBottom: 16 }}>
          {/* HOME HERO */}
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: '#0f172a', marginBottom: 20 }}>
            Inicio: Hero principal
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-group-label">Título principal (ES) {!settings.titleEs.trim() && <span style={{ color: '#f44' }}>*</span>}</label>
              <input className="form-control" value={settings.titleEs} onChange={up('titleEs')} style={{ borderColor: !settings.titleEs.trim() ? '#f44' : '#ddd' }} />
            </div>
            <div className="form-group">
              <label className="form-group-label">Main title (EN)</label>
              <input className="form-control" value={settings.titleEn} onChange={up('titleEn')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-group-label">Subtítulo (ES)</label>
              <textarea className="form-control" value={settings.subtitleEs} onChange={up('subtitleEs')} />
            </div>
            <div className="form-group">
              <label className="form-group-label">Subtitle (EN)</label>
              <textarea className="form-control" value={settings.subtitleEn} onChange={up('subtitleEn')} />
            </div>
          </div>

          <div style={{ height: 40 }} />

          {/* ABOUT HERO */}
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: '#0f172a', marginBottom: 20, borderTop: '1px solid #eee', paddingTop: 20 }}>
            Nosotros: Hero
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-group-label">Título Nosotros (ES)</label>
              <input className="form-control" value={settings.aboutHeroTitleEs} onChange={up('aboutHeroTitleEs')} />
            </div>
            <div className="form-group">
              <label className="form-group-label">About Hero Title (EN)</label>
              <input className="form-control" value={settings.aboutHeroTitleEn} onChange={up('aboutHeroTitleEn')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-group-label">Descripción Hero (ES)</label>
              <textarea className="form-control" value={settings.aboutHeroDescEs} onChange={up('aboutHeroDescEs')} />
            </div>
            <div className="form-group">
              <label className="form-group-label">Hero Desc (EN)</label>
              <textarea className="form-control" value={settings.aboutHeroDescEn} onChange={up('aboutHeroDescEn')} />
            </div>
          </div>

          {/* ABOUT STORY */}
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: '#0f172a', margin: '30px 0 20px', borderTop: '1px solid #eee', paddingTop: 20 }}>
            Nosotros: Historia
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-group-label">Título Historia (ES)</label>
              <input className="form-control" value={settings.aboutStoryTitleEs} onChange={up('aboutStoryTitleEs')} />
            </div>
            <div className="form-group">
              <label className="form-group-label">Story Title (EN)</label>
              <input className="form-control" value={settings.aboutStoryTitleEn} onChange={up('aboutStoryTitleEn')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-group-label">Texto Historia 1 (ES)</label>
              <textarea className="form-control" style={{ minHeight: 120 }} value={settings.aboutText1Es} onChange={up('aboutText1Es')} />
            </div>
            <div className="form-group">
              <label className="form-group-label">Story Text 1 (EN)</label>
              <textarea className="form-control" style={{ minHeight: 120 }} value={settings.aboutText1En} onChange={up('aboutText1En')} />
            </div>
          </div>

          <div style={{ height: 40 }} />

          {/* CONTACT & SEO */}
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: '#0f172a', marginBottom: 20, borderTop: '2px solid #0f172a', paddingTop: 20 }}>
            Contacto y SEO
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-group-label">Teléfono {!settings.phone.trim() && <span style={{ color: '#f44' }}>*</span>}</label>
              <input className="form-control" value={settings.phone} onChange={up('phone')} style={{ borderColor: !settings.phone.trim() ? '#f44' : '#ddd' }} />
            </div>
            <div className="form-group">
              <label className="form-group-label">Email {!settings.email.includes('@') && <span style={{ color: '#f44' }}>*</span>}</label>
              <input className="form-control" value={settings.email} onChange={up('email')} style={{ borderColor: !settings.email.includes('@') ? '#f44' : '#ddd' }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-group-label">Meta Descripción (ES)</label>
            <textarea className="form-control" value={settings.metaEs} onChange={up('metaEs')} />
          </div>
          <div className="form-group">
            <label className="form-group-label">Meta Description (EN)</label>
            <textarea className="form-control" value={settings.metaEn} onChange={up('metaEn')} />
          </div>
        </div>

        {saved && (
          <div style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', padding: '12px 20px', borderRadius: 8, color: '#164e63', marginBottom: 20, maxWidth: 760 }}>
            ✓ Cambios guardados con éxito
          </div>
        )}
      </div>

      <div className="save-bar">
        <button
          className="action-btn"
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
