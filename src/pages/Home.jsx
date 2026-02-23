import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookingModal from '../components/BookingModal';
import Ico, { paths } from '../components/Ico';
import SEO from '../components/SEO';
import { fetchApartments, fetchWebsiteContent, fetchApartmentPhotos } from '../services/supabaseService';
import { formatPrice, strToDate, dateToStr } from '../utils/format';
import { safeHtml } from '../utils/sanitize';
import { getMockPhotosForApartment } from '../data/mockPhotos';

const reviews = [
  { text: "El apartamento estaba impecable y las vistas a la ría son increíbles. Repetiremos seguro.", author: "María Gómez", date: "Octubre 2025" },
  { text: "Ubicación perfecta para descubrir Ribadeo y Asturias. Todo muy nuevo y cómodo.", author: "David Ruiz", date: "Agosto 2025" },
  { text: "La comunicación fue genial y el check-in automático súper cómodo. Muy recomendable.", author: "Laura F.", date: "Julio 2025" }
];

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';

import { useSettings } from '../contexts/SettingsContext';

export default function Home() {
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const { settings } = useSettings();
  const T = useT(lang);

  const cancelDays = settings?.cancellation_free_days || 14;
  const depositPct = settings?.payment_deposit_percentage || 50;

  const [checkin, setCheckin] = useState('2026-07-12');
  const [checkout, setCheckout] = useState('2026-07-19');
  const [guests, setGuests] = useState(2);
  const [searched, setSearched] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);

  const [featuredApts, setFeaturedApts] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [texts, setTexts] = useState({});

  useEffect(() => {
    Promise.all([
      fetchApartments(),
      fetchWebsiteContent('home'),
      import('../services/dataService').then(m => m.getReservations())
    ]).then(async ([aptsData, homeTexts, resData]) => {
      setReservations(resData);

      const apts = aptsData.slice(0, 6);

      // Load one photo per apartment for the cover
      const aptsWithPhotos = await Promise.all(apts.map(async (apt) => {
        try {
          const photos = await fetchApartmentPhotos(apt.slug);
          if (photos && photos.length > 0) {
            return { ...apt, coverPhoto: photos[0].photo_url };
          }
          return { ...apt, coverPhoto: getMockPhotosForApartment(apt.slug)[0].photo_url };
        } catch {
          return { ...apt, coverPhoto: getMockPhotosForApartment(apt.slug)[0].photo_url };
        }
      }));
      setFeaturedApts(aptsWithPhotos);

      const cmap = {};
      homeTexts.forEach(item => cmap[item.section_key] = item);
      setTexts(cmap);
    });
  }, []);

  const getText = (key, defaultEs, defaultEn) => {
    if (!texts[key]) return t(defaultEs, defaultEn);
    return t(texts[key].content_es, texts[key].content_en);
  };


  const handleSearch = () => {
    setSearched(true);
    document.getElementById('apartments-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBook = (apt) => {
    setSelectedApt(apt);
    setBookingOpen(true);
  };

  return (
    <>
      <SEO
        title={T.seo.homeTitle}
        description={T.seo.homeDesc}
      />
      <Navbar onOpenBooking={() => setBookingOpen(true)} />

      {/* HERO */}
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-navy via-navy to-slate-900 py-20 px-4">
        {/* Background elements */}
        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: 'url(data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Cg fill="none" stroke="white" stroke-width="1"%3E%3Cpath d="M0,30 L30,0 L60,30 L30,60 Z"/%3E%3C/g%3E%3C/svg%3E)' }} />
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-4xl">
          <div className="text-sm font-semibold text-teal uppercase tracking-widest mb-4">Ribadeo, Galicia</div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 leading-tight" dangerouslySetInnerHTML={safeHtml(getText('home_hero_title', 'Alquila<br /><em>directo,</em><br />sin comisiones', 'Book<br /><em>direct,</em><br />no commissions'))} />
          <p className="text-lg md:text-xl text-gray-100 mb-12 leading-relaxed">
            {getText('home_hero_desc', 'Ocho apartamentos junto a la ría del Eo. Reserva con nosotros y paga menos que en cualquier plataforma.', 'Eight apartments by the Eo estuary. Book with us and pay less than on any platform.')}
          </p>
          <div className="flex gap-4 flex-wrap justify-center mb-16">
            <button className="bg-navy text-white px-8 py-4 rounded hover:bg-slate-900 transition-all font-semibold text-lg" onClick={handleSearch}>
              {t('Ver disponibilidad', 'Check availability')}
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded hover:bg-white hover:text-navy transition-all font-semibold text-lg" onClick={() => navigate('/apartamentos')}>
              {t('Conocer los apartamentos', 'Meet the apartments')}
            </button>
          </div>
        </div>

        {/* BUSCADOR */}
        <div className="relative z-20 w-full max-w-4xl">
          <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-3">
            <div className="flex flex-col w-full [&_.react-datepicker-wrapper]:w-full">
              <div className="text-xs font-semibold text-navy uppercase tracking-wider mb-2">{t('Llegada', 'Check-in')}</div>
              <DatePicker
                selected={strToDate(checkin)}
                onChange={date => setCheckin(dateToStr(date))}
                minDate={new Date()}
                maxDate={strToDate(checkout) ? new Date(strToDate(checkout).getTime() - 86400000) : null}
                dateFormat={lang === 'ES' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
                placeholderText={lang === 'ES' ? 'dd/mm/aaaa' : 'mm/dd/yyyy'}
                className="w-full h-[42px] px-3 py-2 border border-gray-300 rounded text-sm text-navy focus:outline-none focus:border-[#82c8bd] focus:ring-2 focus:ring-[#82c8bd]/20 transition-all"
              />
            </div>
            <div className="flex flex-col w-full [&_.react-datepicker-wrapper]:w-full">
              <div className="text-xs font-semibold text-navy uppercase tracking-wider mb-2">{t('Salida', 'Check-out')}</div>
              <DatePicker
                selected={strToDate(checkout)}
                onChange={date => setCheckout(dateToStr(date))}
                minDate={strToDate(checkin) ? new Date(strToDate(checkin).getTime() + 86400000) : new Date()}
                dateFormat={lang === 'ES' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
                placeholderText={lang === 'ES' ? 'dd/mm/aaaa' : 'mm/dd/yyyy'}
                className="w-full h-[42px] px-3 py-2 border border-gray-300 rounded text-sm text-navy focus:outline-none focus:border-[#82c8bd] focus:ring-2 focus:ring-[#82c8bd]/20 transition-all"
              />
            </div>
            <div className="flex flex-col w-full">
              <div className="text-xs font-semibold text-navy uppercase tracking-wider mb-2">{t('Huéspedes', 'Guests')}</div>
              <select
                value={guests}
                onChange={e => setGuests(+e.target.value)}
                className="w-full h-[42px] px-3 py-2 border border-gray-300 rounded text-sm text-navy cursor-pointer focus:outline-none focus:border-[#82c8bd] focus:ring-2 focus:ring-[#82c8bd]/20 transition-all"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>
                ))}
              </select>
            </div>
            <button className="md:col-span-2 bg-[#82c8bd] text-white px-6 w-full rounded hover:bg-[#6bb5a9] transition-all font-semibold text-sm h-[42px] flex items-center justify-center md:mt-6" onClick={handleSearch}>
              {T.home.searchApts}
            </button>
          </div>
        </div>
      </div>

      {/* CARACTERÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-20 px-4 max-w-7xl mx-auto">
        {[
          { icon: paths.cash, t: getText('home_features_1_title', 'Sin comisiones', 'No commissions'), d: getText('home_features_1_desc', 'Reserva directa. Lo que pagas es lo que recibimos nosotros, sin intermediarios ni sorpresas.', 'Direct booking. What you pay is what we receive, no middlemen or surprises.') },
          { icon: paths.lock, t: getText('home_features_2_title', 'Pago seguro', 'Secure payment'), d: getText('home_features_2_desc', `${depositPct}% ahora con tarjeta como depósito. El resto en efectivo cuando llegues al apartamento.`, `${depositPct}% now by card as deposit. The rest in cash upon arrival.`) },
          { icon: paths.sync, t: getText('home_features_3_title', 'Siempre actualizado', 'Always updated'), d: getText('home_features_3_desc', 'Nuestro calendario se sincroniza con Booking y Airbnb en tiempo real. Nunca habrá doble reserva.', 'Our calendar syncs with Booking and Airbnb in real-time. Double bookings will never happen.') },
          { icon: paths.map, t: getText('home_features_4_title', 'Ribadeo, Galicia', 'Ribadeo, Galicia'), d: getText('home_features_4_desc', 'A 5 minutos del puente internacional y de las mejores playas de la costa norte gallega.', '5 minutes from the international bridge and the best beaches on the northern Galician coast.') },
        ].map((f, i) => (
          <div key={i} className="flex flex-col items-center text-center">
            <div className="mb-4 p-3 bg-blue-100 rounded-lg">
              <Ico d={f.icon} size={28} color="#7dd3fc" />
            </div>
            <div className="text-lg font-serif font-bold text-navy mb-3">{f.t}</div>
            <div className="text-gray-700">{f.d}</div>
          </div>
        ))}
      </div>

      {/* APARTAMENTOS */}
      <div className="py-20 md:py-28 px-4" id="apartments-section">
        <div className="text-sm font-semibold text-teal uppercase tracking-widest mb-2">{t('Nuestros apartamentos', 'Our apartments')}</div>
        <div className="flex justify-between items-end gap-8 mb-12 flex-col md:flex-row">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy" dangerouslySetInnerHTML={safeHtml(t('Ocho espacios<br /><em>para descansar</em>', 'Eight spaces<br /><em>to rest</em>'))} />
          <div className="flex gap-4 flex-wrap items-center">
            {searched && (
              <div className="text-sm text-gray-600 font-light">
                Disponibilidad · {checkin} → {checkout}
              </div>
            )}
            <button
              className="border-2 border-navy text-navy hover:bg-navy hover:text-white px-5 py-3 rounded transition-all"
              onClick={() => navigate('/apartamentos')}
            >
              {T.home.viewAll}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {featuredApts
            .filter(a => {
              if (!searched) return true;
              if (guests > a.capacity) return false;
              // Chequear disponibilidad real
              const hasOverlap = reservations.some(r => {
                if (r.status === 'cancelled') return false;
                if (r.aptSlug !== a.slug && r.apt !== a.slug) return false;
                const rIn = new Date(r.checkin + 'T00:00:00');
                const rOut = new Date(r.checkout + 'T00:00:00');
                const sIn = new Date(checkin + 'T00:00:00');
                const sOut = new Date(checkout + 'T00:00:00');
                return (sIn < rOut && sOut > rIn);
              });
              return !hasOverlap;
            })
            .map((apt, i) => (
              <div
                key={apt.slug}
                className="group relative flex flex-col rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all h-full min-h-[300px]"
                onClick={() => navigate(`/apartamentos/${apt.slug}`)}
              >
                <div
                  className="relative w-full flex items-center justify-center bg-center bg-cover"
                  style={{
                    ...(apt.coverPhoto ? { backgroundImage: `url(${apt.coverPhoto})` } : { background: apt.gradient }),
                    height: i === 0 ? '100%' : 240,
                    position: i === 0 ? 'absolute' : 'relative',
                    inset: i === 0 ? 0 : 'auto',
                  }}
                >
                  {!apt.coverPhoto && <Ico d={paths.photo} size={40} color="rgba(255,255,255,0.12)" />}
                </div>
                {i === 0 && <div style={{ paddingTop: '100%' }} />}
                <div className="absolute top-4 right-4 bg-teal text-white px-3 py-1 rounded text-sm z-10 font-medium">{apt.tagline}</div>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all" />
                <div className="p-6 bg-white">
                  <h3 className="text-xl font-serif font-bold text-navy mb-2">{apt.name}</h3>
                  <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                    <span>{apt.capacity} pers · {apt.beds} dorm</span>
                    <span className="font-semibold text-teal text-lg">
                      {formatPrice(apt.price)}
                      <span className="text-xs text-gray-500">/{t('noche', 'night')}</span>
                    </span>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-white rounded-full px-3 py-1 text-sm font-semibold text-navy shadow">
                  ★ {apt.rating}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* RESEÑAS */}
      <div className="py-20 md:py-28 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-sm font-semibold text-teal uppercase tracking-widest mb-2">Lo que dicen nuestros huéspedes</div>
          <div className="flex justify-between items-start gap-8 mb-12 flex-col md:flex-row">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy">
              Opiniones<br /><em className="text-teal italic font-light">reales</em>
            </h2>
            <div className="text-xl font-semibold text-navy">
              4.9 ★ · +220 opiniones verificadas
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((r, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="text-gold text-lg mb-2">{'★'.repeat(r.stars)}</div>
                <div className="text-gray-700 italic mb-3">"{r.text}"</div>
                <div className="flex justify-between items-center">
                  <div className="text-sm font-semibold text-navy">{r.name} · {r.origin}</div>
                  <div className="text-xs text-gray-400">{r.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BANNER RESERVA DIRECTA */}
      <div className="py-20 px-4 bg-gradient-to-r from-navy to-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl font-serif font-bold text-white mb-6" dangerouslySetInnerHTML={safeHtml(getText('home_banner_title', '¿Por qué reservar<br /><em>directo con nosotros?</em>', 'Why book<br /><em>direct with us?</em>'))} />
              <p className="text-gray-100 mb-6 leading-relaxed text-lg">
                {getText('home_banner_desc', 'Ahorra entre un 15 y un 20% respecto a Booking.com o Airbnb. El mismo apartamento, el mismo servicio, sin comisiones de intermediarios.', 'Save between 15% and 20% compared to Booking.com or Airbnb. Same apartment, same service, no commissions.')}
              </p>
            </div>
            <div className="flex flex-col items-center md:items-start gap-4">
              <button
                className="bg-white text-navy px-8 py-4 rounded hover:bg-gray-100 transition-all font-semibold text-lg w-full md:w-auto"
                onClick={() => setBookingOpen(true)}
              >
                {T.home.bookNowNoComm}
              </button>
              <div className="text-teal text-sm font-medium">
                {T.home.freeCancelDays.replace('{days}', cancelDays)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {bookingOpen && (
        <BookingModal
          apartment={selectedApt}
          initialCheckin={checkin}
          initialCheckout={checkout}
          onClose={() => { setBookingOpen(false); setSelectedApt(null); }}
        />
      )}
    </>
  );
}
