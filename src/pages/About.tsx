import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookingModal from '../components/BookingModal';
import Ico, { paths } from '../components/Ico';
import SEO from '../components/SEO';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { safeHtml } from '../utils/sanitize';
import { useSettings } from '../contexts/SettingsContext';

export default function About() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const T = useT(lang);
  const A = T.about;
  const { settings } = useSettings();
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <>
      <SEO title={T.seo.aboutTitle} description={T.seo.aboutDesc} />
      <Navbar onOpenBooking={() => setBookingOpen(true)} />

      {/* HERO */}
      <div className="py-20 md:py-28 px-4 bg-gradient-to-br from-navy to-navy-dark">
        <div className="max-w-4xl mx-auto text-center text-white">
          <div className="text-sm font-semibold text-teal uppercase tracking-widest mb-4">
            {A.history}
          </div>
          <h1
            className="text-4xl md:text-5xl font-serif font-bold mb-6"
            dangerouslySetInnerHTML={safeHtml(A.heroTitle)}
          />
          <p className="text-lg text-gray-100">{A.heroDesc}</p>
        </div>
      </div>

      {/* VALORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-20 px-4 max-w-6xl mx-auto">
        {[
          { icon: paths.cash, title: A.value1Title, desc: A.value1Desc },
          { icon: paths.check, title: A.value2Title, desc: A.value2Desc },
          { icon: paths.leaf, title: A.value3Title, desc: A.value3Desc },
        ].map((v, i) => (
          <div key={i} className="flex flex-col items-center text-center">
            <div className="mb-4 p-4 bg-teal/10 dark:bg-teal/5 rounded-lg">
              <Ico d={v.icon} size={32} color="#1a5f6e" />
            </div>
            <h3 className="text-xl font-serif font-bold text-navy mb-3">{v.title}</h3>
            <p className="text-gray-700">{v.desc}</p>
          </div>
        ))}
      </div>

      {/* HISTORIA */}
      <div className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-4xl font-serif font-bold text-navy mb-8"
            dangerouslySetInnerHTML={safeHtml(A.storyTitle)}
          />
          <p className="text-gray-700 leading-relaxed mb-6 font-sans">{A.storyText1}</p>
          <p className="text-gray-700 leading-relaxed mb-6 font-sans">{A.storyText2}</p>
          <p className="text-gray-700 leading-relaxed font-sans">{A.storyText3}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 border-t border-gray-200 dark:border-gray-700 pt-12">
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-4xl font-serif font-bold text-teal mb-2">8</div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
                {A.stats.apts}
              </div>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-4xl font-serif font-bold text-teal mb-2">+220</div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
                {A.stats.reviews}
              </div>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-4xl font-serif font-bold text-teal mb-2">0%</div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
                {A.stats.commissions}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-20">
          <div className="aspect-[21/9] w-full bg-navy rounded-2xl overflow-hidden relative flex items-center justify-center">
            <iframe
              src="https://maps.google.com/maps?q=43.5399657,-7.0410569&z=16&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0, display: 'block' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación apartamentos Illa Pancha"
            />
            <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
              <div className="text-xs font-bold tracking-[0.2em] text-teal-300 uppercase mb-2">
                {A.location}
              </div>
              <div className="text-2xl font-serif font-bold text-white mb-2">{A.locationLabel}</div>
              <div className="text-gray-200 leading-relaxed max-w-2xl">{A.locationDetail}</div>
            </div>
            <a
              href="https://www.google.com/maps/place/Av.+de+Rosal%C3%ADa+de+Castro,+25,+27700+Ribadeo,+Lugo/@43.5397524,-7.0411052,199m/data=!3m1!1e3!4m6!3m5!1s0xd317e5724d77fed:0x5b60c517683c15a5!8m2!3d43.5399657!4d-7.0410569!16s%2Fg%2F11c19xgmd5?entry=ttu&g_ep=EgoyMDI2MDMxNS4wIKXMDSoASAFQAw%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-navy text-xs font-semibold px-3 py-1.5 rounded-full shadow hover:bg-teal hover:text-white transition-colors"
            >
              {T.common.openMaps}
            </a>
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
                {A.zone}
              </div>
              <h2
                className="text-4xl md:text-5xl font-serif font-bold text-navy leading-tight"
                dangerouslySetInnerHTML={safeHtml(A.whyRibadeo)}
              />
              <div className="w-20 h-1 bg-teal" />
              <div className="prose prose-lg text-gray-600 prose-p:leading-relaxed">
                <p>{A.ribadeoDesc1}</p>
                <p>{A.ribadeoDesc2}</p>
              </div>
            </div>
            <div className="flex-1 relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in duration-1000 delay-300 group">
              <img
                src="https://images.unsplash.com/photo-1694092771894-3745d59a1462?auto=format&fit=crop&q=80&w=1200"
                alt="Ría de Ribadeo, Galicia"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white font-serif text-xl font-medium flex items-center gap-2">
                <Ico d={paths.location} size={20} color="#fff" />
                {A.riaLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN: EXPERIENCIAS */}
      <div id="experiencias" className="py-24 bg-slate-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2
            className="text-4xl md:text-5xl font-serif font-bold text-navy mb-6"
            dangerouslySetInnerHTML={safeHtml(A.experienceRibadeo)}
          />
          <div className="w-24 h-1 bg-teal mx-auto mb-10" />
          <div className="max-w-3xl mx-auto text-lg text-gray-600 space-y-6 mb-16">
            <p>{A.expDesc1}</p>
            <p>{A.expDesc2}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(A.poi || []).map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-left group"
              >
                {item.photo && (
                  <div className="h-44 overflow-hidden">
                    <img
                      src={item.photo}
                      alt={item.d}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="text-2xl font-serif font-bold text-teal mb-1">{item.t}</div>
                  <div className="text-gray-700 font-medium">{item.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-24 px-4 bg-navy text-center">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-4xl md:text-5xl font-serif font-bold text-white mb-6"
            dangerouslySetInnerHTML={safeHtml(A.ctaTitle)}
          />
          <p className="text-xl text-gray-300 mb-10 leading-relaxed">{A.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              className="w-full sm:w-auto px-8 py-4 bg-teal text-white hover:bg-teal-600 font-medium rounded transition-colors text-lg"
              onClick={() =>
                settings?.booking_mode === 'redirect' ? navigate('/reservar') : setBookingOpen(true)
              }
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
