import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookingModal from '../components/BookingModal';
import Ico, { paths } from '../components/Ico';
import SEO from '../components/SEO';
import { fetchApartmentPhotos, fetchWebsiteContent } from '../services/supabaseService';
import { getApartments } from '../services/dataService';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { formatDateShort, formatPrice, strToDate, dateToStr } from '../utils/format';
import { getMockPhotosForApartment } from '../data/mockPhotos';

export default function Apartments() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const T = useT(lang);
  const A = T.apartments;

  const [apartments, setApartments] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [guests, setGuests] = useState(2);
  const [searched, setSearched] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);

  // Cargar apartamentos y reservas desde la capa de servicios unificada
  useEffect(() => {
    Promise.all([
      getApartments(),
      import('../services/dataService').then(m => m.getReservations())
    ]).then(async ([data, resData]) => {
      setReservations(resData);
      const aptsWithPhotos = await Promise.all(data.map(async (apt) => {
        try {
          // Intentar obtener fotos reales de Supabase
          const photos = await fetchApartmentPhotos(apt.slug);
          if (photos && photos.length > 0) {
            return { ...apt, coverPhoto: photos[0].photo_url };
          }
          // Si no hay fotos, usar mockData (ahora asegurado con fallback)
          const mocks = getMockPhotosForApartment(apt.slug);
          return { ...apt, coverPhoto: mocks && mocks.length > 0 ? mocks[0].photo_url : null };
        } catch (err) {
          console.warn(`Photos fail for ${apt.slug}`, err);
          const mocks = getMockPhotosForApartment(apt.slug);
          return { ...apt, coverPhoto: mocks && mocks.length > 0 ? mocks[0].photo_url : null };
        }
      }));
      setApartments(aptsWithPhotos);
    }).catch(err => {
      console.error('Error loading apartments:', err);
      setApartments([]);
    });
  }, []);

  const FILTERS = [
    { id: 'all', label: A.filters.all },
    { id: '2', label: A.filters.f2 },
    { id: '4', label: A.filters.f4 },
    { id: '6', label: A.filters.f6 },
    { id: 'sea', label: A.filters.sea },
  ];

  const handleSearch = () => {
    setSearched(true);
  };

  const filtered = apartments.filter(apt => {
    if (!apt.active) return false;
    const capacity = apt.cap || apt.capacity || 2;
    const amenities = apt.amenities || [];

    // Filtros de categoría/comodidades
    if (filter === '2' && capacity > 2) return false;
    if (filter === '4' && (capacity < 3 || capacity > 4)) return false;
    if (filter === '6' && capacity < 5) return false;
    if (filter === 'sea' && !amenities.some(a => typeof a === 'string' && a.includes('Vistas'))) return false;

    // Filtro de búsqueda (Fechas + Personas)
    if (searched) {
      if (guests > capacity) return false;
      if (checkin && checkout) {
        const hasOverlap = reservations.some(r => {
          if (r.status === 'cancelled') return false;
          if (r.aptSlug !== apt.slug && r.apt !== apt.slug) return false;
          const rIn = new Date(r.checkin + 'T00:00:00');
          const rOut = new Date(r.checkout + 'T00:00:00');
          const sIn = new Date(checkin + 'T00:00:00');
          const sOut = new Date(checkout + 'T00:00:00');
          return (sIn < rOut && sOut > rIn);
        });
        if (hasOverlap) return false;
      }
    }
    return true;
  });

  const getAvailStatus = (apt) => {
    if (!apt.active) return 'inactive';
    if (!searched || !checkin || !checkout) return 'unknown';
    // Lógica simplificada de disponibilidad para la vista
    return 'available';
  };

  const availableCount = filtered.filter(a => getAvailStatus(a) === 'available').length;

  return (
    <>
      <SEO title={T.seo.aptsTitle} description={T.seo.aptsDesc} />
      <Navbar onOpenBooking={() => setBookingOpen(true)} />

      <div className="bg-navy py-16 md:py-24 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">{A.title}</h1>
        <p className="text-gray-300 max-w-2xl mx-auto">{A.desc}</p>
      </div>

      <div className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-2 [&_.react-datepicker-wrapper]:w-full">
              <label className="text-xs font-bold text-navy uppercase tracking-wider">{T.booking.checkin}</label>
              <DatePicker
                selected={strToDate(checkin)}
                onChange={d => setCheckin(dateToStr(d))}
                minDate={new Date()}
                placeholderText="Entrada"
                className="w-full h-11 px-4 border border-gray-300 rounded focus:ring-2 focus:ring-teal/20 outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-2 [&_.react-datepicker-wrapper]:w-full">
              <label className="text-xs font-bold text-navy uppercase tracking-wider">{T.booking.checkout}</label>
              <DatePicker
                selected={strToDate(checkout)}
                onChange={d => setCheckout(dateToStr(d))}
                minDate={strToDate(checkin) || new Date()}
                placeholderText="Salida"
                className="w-full h-11 px-4 border border-gray-300 rounded focus:ring-2 focus:ring-teal/20 outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-navy uppercase tracking-wider">{T.booking.guests}</label>
              <select
                value={guests}
                onChange={e => setGuests(+e.target.value)}
                className="h-11 px-4 border border-gray-300 rounded focus:ring-2 focus:ring-teal/20 outline-none transition-all bg-white"
              >
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? T.common.person : T.common.persons}</option>)}
              </select>
            </div>
            <button
              onClick={handleSearch}
              className="h-11 bg-teal text-white rounded font-bold hover:bg-teal-600 transition-colors shadow-sm"
            >
              {A.search}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-12">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${filter === f.id ? 'bg-teal text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {filtered.map(apt => {
            const status = getAvailStatus(apt);
            return (
              <div
                key={apt.slug}
                className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
                onClick={() => navigate(`/apartamentos/${apt.slug}`)}
              >
                <div className="relative h-64 overflow-hidden bg-gray-100 flex items-center justify-center">
                  {apt.coverPhoto ? (
                    <img
                      src={apt.coverPhoto}
                      alt={apt.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: apt.gradient }}>
                      <Ico d={paths.photo} size={48} color="rgba(255,255,255,0.2)" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur shadow-sm px-3 py-1 rounded-full text-[11px] font-bold text-navy uppercase tracking-wider">
                    {lang === 'EN' ? (apt.taglineEn || apt.tagline) : apt.tagline}
                  </div>
                  {!apt.active && (
                    <div className="absolute inset-0 bg-navy/60 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="text-white font-serif text-xl border-2 border-white px-6 py-2 uppercase tracking-widest">{A.unavailable}</span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-serif font-bold text-navy mb-2 group-hover:text-teal transition-colors">{apt.name}</h3>
                  <div className="flex gap-4 text-xs text-slate-500 font-medium mb-6">
                    <span className="flex items-center gap-1"><Ico d={paths.users} size={14} /> {apt.cap} {T.common.persons}</span>
                    <span className="flex items-center gap-1"><Ico d={paths.bed} size={14} /> {apt.bedrooms} {A.bedrooms}</span>
                  </div>
                  <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                    <div className="text-xl font-bold text-navy">
                      {formatPrice(apt.price)}<span className="text-xs text-slate-400 font-normal">/{T.detail.perNight}</span>
                    </div>
                    <button className="text-teal font-bold text-sm hover:translate-x-1 transition-transform flex items-center gap-1">
                      {T.common.seeMore} →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Footer />
      {bookingOpen && <BookingModal apt={selectedApt} onClose={() => setBookingOpen(false)} />}
    </>
  );
}
