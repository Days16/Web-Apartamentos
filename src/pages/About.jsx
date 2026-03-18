import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookingModal from '../components/BookingModal';
import Ico, { paths } from '../components/Ico';
import SEO from '../components/SEO';
import { fetchWebsiteContent } from '../services/supabaseService';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { safeHtml } from '../utils/sanitize';
import { useSettings } from '../contexts/SettingsContext';

export default function About() {
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const T = useT(lang);
  const A = T.about;
  const { settings } = useSettings();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [texts, setTexts] = useState({});

  useEffect(() => {
    fetchWebsiteContent('about').then(data => {
      const cmap = {};
      data.forEach(item => cmap[item.section_key] = item);
      setTexts(cmap);
    });
  }, []);

  const getText = (key, defaultContent) => {
    if (!texts[key]) return defaultContent;
    return lang === 'ES' ? texts[key].content_es : texts[key].content_en;
  };

  return (
    <>
      <SEO
        title={A.title}
        description={T.seo.homeDesc}
      />
      <Navbar onOpenBooking={() => setBookingOpen(true)} />

      {/* HERO */}
      <div className="py-20 md:py-28 px-4 bg-gradient-to-br from-navy to-navy-dark">
        <div className="max-w-4xl mx-auto text-center text-white">
          <div className="text-sm font-semibold text-teal uppercase tracking-widest mb-4">{A.history}</div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6" dangerouslySetInnerHTML={safeHtml(getText('about_hero_title', A.heroTitle))} />
          <p className="text-lg text-gray-100">
            {getText('about_hero_desc', A.heroDesc)}
          </p>
        </div>
      </div>

      {/* VALORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-20 px-4 max-w-6xl mx-auto">
        {[
          { icon: paths.cash, title: A.stats.commissions, desc: A.ctaDesc },
          { icon: paths.check, title: A.title, desc: A.ctaDesc },
          { icon: paths.leaf, title: A.title, desc: A.ctaDesc },
        ].map((v, i) => (
          <div key={i} className="flex flex-col items-center text-center">
            <div className="mb-4 p-4 bg-blue-100 rounded-lg">
              <Ico d={v.icon} size={32} color="#1a5f6e" />
            </div>
            <h3 className="text-xl font-serif font-bold text-navy mb-3">{v.title}</h3>
            <p className="text-gray-700">{v.desc}</p>
          </div>
        ))}
      </div>

      {/* HISTORIA */}
      <div className="py-20 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-serif font-bold text-navy mb-8" dangerouslySetInnerHTML={safeHtml(getText('about_story_title', A.storyTitle))} />
          <p className="text-gray-700 leading-relaxed mb-6 font-sans">
            {getText('about_story_text_1', A.storyText1)}
          </p>
          <p className="text-gray-700 leading-relaxed mb-6 font-sans">
            {getText('about_story_text_2', A.storyText2)}
          </p>
          <p className="text-gray-700 leading-relaxed font-sans">
            {getText('about_story_text_3', A.storyText3)}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 border-t border-gray-200 pt-12">
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="text-4xl font-serif font-bold text-teal mb-2">8</div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest">{A.stats.apts}</div>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="text-4xl font-serif font-bold text-teal mb-2">+220</div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest">{A.stats.reviews}</div>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="text-4xl font-serif font-bold text-teal mb-2">0%</div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest">{A.stats.commissions}</div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-20">
          <div className="aspect-[21/9] w-full bg-navy rounded-2xl overflow-hidden relative flex items-center justify-center">
            <Ico d={paths.map} size={64} color="rgba(255,255,255,0.15)" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col justify-end">
              <div className="text-xs font-bold tracking-[0.2em] text-teal-300 uppercase mb-2">
                {A.location}
              </div>
              <div className="text-2xl font-serif font-bold text-white mb-2 shadow-sm">
                Ribadeo, Lugo · Galicia
              </div>
              <div className="text-gray-200 leading-relaxed max-w-2xl text-shadow-sm">
                {A.locationDetail}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN: LA ZONA */}
      <div className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 transform -skew-x-12 translate-x-1/2 opacity-50" />
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1 space-y-8 animate-in slide-in-from-left duration-700">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/10 text-teal text-xs font-bold uppercase tracking-widest">
                <Ico d={paths.map} size={14} color="#1a5f6e" />
                {lang === 'EN' ? 'The Region' : 'La Zona'}
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy leading-tight" dangerouslySetInnerHTML={safeHtml(getText('about_ribadeo_title', A.whyRibadeo))} />
              <div className="w-20 h-1 bg-teal" />
              <div className="prose prose-lg text-gray-600 prose-p:leading-relaxed">
                <p>{getText('about_ribadeo_desc_1', A.ribadeoDesc1)}</p>
                <p>{getText('about_ribadeo_desc_2', A.ribadeoDesc2)}</p>
              </div>
            </div>
            <div className="flex-1 relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in duration-1000 delay-300 group">
              <img
                src="https://images.unsplash.com/photo-1598516244439-5095d3119156?q=80&w=1200"
                alt="Ribadeo"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white font-serif text-xl font-medium flex items-center gap-2">
                <Ico d={paths.location} size={20} color="#fff" />
                Ría de Ribadeo
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN: EXPERIENCIAS */}
      <div className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-6" dangerouslySetInnerHTML={safeHtml(getText('about_exp_title', A.experienceRibadeo))} />
          <div className="w-24 h-1 bg-teal mx-auto mb-10" />
          <div className="max-w-3xl mx-auto text-lg text-gray-600 space-y-6 mb-16">
            <p>{getText('about_exp_desc_1', A.expDesc1)}</p>
            <p>{getText('about_exp_desc_2', A.expDesc2)}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(A.poi || []).map((item, i) => (
              <div key={i} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-left">
                <div className="text-3xl font-serif font-bold text-teal mb-3">{item.t}</div>
                <div className="text-gray-700 font-medium text-lg">{item.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-24 px-4 bg-navy text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6" dangerouslySetInnerHTML={safeHtml(A.ctaTitle)} />
          <p className="text-xl text-gray-300 mb-10 leading-relaxed">
            {A.ctaDesc}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              className="w-full sm:w-auto px-8 py-4 bg-teal text-white hover:bg-teal-600 font-medium rounded transition-colors text-lg"
              onClick={() => settings?.booking_mode === 'redirect' ? navigate('/reservar') : setBookingOpen(true)}
            >
              {T.home.availability}
            </button>
            <button
              className="w-full sm:w-auto px-8 py-4 border-2 border-white/30 text-white hover:bg-white hover:text-navy font-medium rounded transition-colors text-lg"
              onClick={() => navigate('/contacto')}
            >
              {A.ctaContact}
            </button>
          </div>
        </div>
      </div>

      <Footer />

      {bookingOpen && <BookingModal onClose={() => setBookingOpen(false)} />}
    </>
  );
}
