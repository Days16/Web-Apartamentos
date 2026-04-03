/* eslint-disable */
// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { trackEvent, EVENTS } from '../utils/analytics';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookingModal from '../components/BookingModal';
import Ico, { paths } from '../components/Ico';
import SEO from '../components/SEO';
import { fetchApartmentPhotos } from '../services/supabaseService';
import { getApartments } from '../services/dataService';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatDateShort, strToDate, dateToStr } from '../utils/format';

export default function Apartments() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useLang();
  const T = useT(lang);
  const { convertPrice } = useCurrency();
  const A = T.apartments;

  const [apartments, setApartments] = useState([]);
  const [loadingApts, setLoadingApts] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all');
  const [checkin, setCheckin] = useState(searchParams.get('checkin') || '');
  const [checkout, setCheckout] = useState(searchParams.get('checkout') || '');
  const [guests, setGuests] = useState(Number(searchParams.get('guests')) || 2);
  const [searched, setSearched] = useState(!!searchParams.get('checkin'));
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [priceRange, setPriceRange] = useState(searchParams.get('price') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'default');
  const [amenityFilters, setAmenityFilters] = useState(
    searchParams.get('amenities') ? searchParams.get('amenities').split(',') : []
  );
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Cargar apartamentos y reservas desde la capa de servicios unificada
  useEffect(() => {
    Promise.all([getApartments(), import('../services/dataService').then(m => m.getReservations())])
      .then(async ([data, resData]) => {
        setReservations(resData);
        const aptsWithPhotos = await Promise.all(
          data.map(async apt => {
            try {
              // Intentar obtener fotos reales de Supabase
              const photos = await fetchApartmentPhotos(apt.slug);
              if (photos && photos.length > 0) {
                return { ...apt, coverPhoto: photos[0].photo_url };
              }
              return { ...apt, coverPhoto: null };
            } catch (err) {
              console.warn(`Photos fail for ${apt.slug}`, err);
              return { ...apt, coverPhoto: null };
            }
          })
        );
        setApartments(aptsWithPhotos);
        setLoadingApts(false);
      })
      .catch(err => {
        console.error('Error loading apartments:', err);
        setLoadError('No se pudieron cargar los apartamentos. Por favor, recarga la página.');
        setLoadingApts(false);
      });
  }, []);

  // Sincronizar filtros → URL (replace para no contaminar el historial)
  useEffect(() => {
    const params = {};
    if (checkin) params.checkin = checkin;
    if (checkout) params.checkout = checkout;
    if (guests !== 2) params.guests = String(guests);
    if (filter !== 'all') params.filter = filter;
    if (priceRange !== 'all') params.price = priceRange;
    if (sortBy !== 'default') params.sort = sortBy;
    if (amenityFilters.length > 0) params.amenities = amenityFilters.join(',');
    setSearchParams(params, { replace: true });
  }, [checkin, checkout, guests, filter, priceRange, sortBy, amenityFilters, setSearchParams]);

  const FILTERS = [
    { id: 'all', label: A.filters.all },
    { id: '2', label: A.filters.f2 },
    { id: '4', label: A.filters.f4 },
    { id: '6', label: A.filters.f6 },
    { id: 'sea', label: A.filters.sea },
  ];

  const handleSearch = () => {
    setSearched(true);
    trackEvent(EVENTS.SEARCH, { checkin, checkout, guests });
  };

  const checkOverlap = apt => {
    if (!searched || !checkin || !checkout) return false;
    return reservations.some(r => {
      if (r.status === 'cancelled') return false;
      if (r.aptSlug !== apt.slug && r.apt !== apt.slug) return false;
      const rIn = new Date(r.checkin + 'T00:00:00');
      const rOut = new Date(r.checkout + 'T00:00:00');
      const sIn = new Date(checkin + 'T00:00:00');
      const sOut = new Date(checkout + 'T00:00:00');
      return sIn < rOut && sOut > rIn;
    });
  };

  const AMENITY_OPTIONS = [
    { key: 'WiFi', label: 'WiFi' },
    { key: 'Parking', label: lang === 'EN' ? 'Parking' : 'Parking' },
    { key: 'Terraza', label: lang === 'EN' ? 'Terrace' : 'Terraza' },
    { key: 'Vistas', label: lang === 'EN' ? 'Sea views' : 'Vistas al mar' },
    { key: 'Barbacoa', label: lang === 'EN' ? 'BBQ' : 'Barbacoa' },
  ];

  const toggleAmenity = key => {
    setAmenityFilters(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  const filtered = useMemo(
    () =>
      apartments
        .filter(apt => {
          if (!apt.active) return false;
          const capacity = apt.cap || apt.capacity || 2;
          const amenities = apt.amenities || [];
          // Filtro categoría
          if (filter === '2' && capacity > 2) return false;
          if (filter === '4' && (capacity < 3 || capacity > 4)) return false;
          if (filter === '6' && capacity < 5) return false;
          if (
            filter === 'sea' &&
            !amenities.some(a => typeof a === 'string' && a.includes('Vistas'))
          )
            return false;
          // Filtro huéspedes
          if (searched && guests > capacity) return false;
          // Filtro precio
          const price = apt.price || 0;
          if (priceRange === '<100' && price >= 100) return false;
          if (priceRange === '100-150' && (price < 100 || price > 150)) return false;
          if (priceRange === '150+' && price <= 150) return false;
          // Filtro comodidades
          if (amenityFilters.length > 0) {
            if (
              !amenityFilters.every(f =>
                amenities.some(
                  a => typeof a === 'string' && a.toLowerCase().includes(f.toLowerCase())
                )
              )
            )
              return false;
          }
          return true;
        })
        .map(apt => ({ ...apt, dateAvailable: !checkOverlap(apt) }))
        .sort((a, b) => {
          // Disponibles primero si hay búsqueda de fechas
          if (searched && checkin && checkout) {
            if (a.dateAvailable && !b.dateAvailable) return -1;
            if (!a.dateAvailable && b.dateAvailable) return 1;
          }
          // Ordenación secundaria por el criterio del usuario
          if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
          if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
          if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
          if (sortBy === 'capacity') return (b.cap || 0) - (a.cap || 0);
          return 0;
        }),
    [
      apartments,
      filter,
      guests,
      searched,
      checkin,
      checkout,
      priceRange,
      amenityFilters,
      sortBy,
      reservations,
    ]
  );

  const getAvailStatus = apt => {
    if (!apt.active) return 'inactive';
    if (!searched || !checkin || !checkout) return 'unknown';
    return apt.dateAvailable ? 'available' : 'unavailable';
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
              <label className="text-xs font-bold text-navy uppercase tracking-wider">
                {T.booking.checkin}
              </label>
              <DatePicker
                selected={strToDate(checkin)}
                onChange={d => setCheckin(dateToStr(d))}
                minDate={new Date()}
                dateFormat={lang === 'ES' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
                placeholderText={lang === 'ES' ? 'dd/mm/aaaa' : 'mm/dd/yyyy'}
                className="w-full h-11 px-4 border border-gray-300 rounded focus:ring-2 focus:ring-teal/20 outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-2 [&_.react-datepicker-wrapper]:w-full">
              <label className="text-xs font-bold text-navy uppercase tracking-wider">
                {T.booking.checkout}
              </label>
              <DatePicker
                selected={strToDate(checkout)}
                onChange={d => setCheckout(dateToStr(d))}
                minDate={strToDate(checkin) || new Date()}
                dateFormat={lang === 'ES' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
                placeholderText={lang === 'ES' ? 'dd/mm/aaaa' : 'mm/dd/yyyy'}
                className="w-full h-11 px-4 border border-gray-300 rounded focus:ring-2 focus:ring-teal/20 outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-navy uppercase tracking-wider">
                {T.booking.guests}
              </label>
              <select
                value={guests}
                onChange={e => setGuests(+e.target.value)}
                className="h-11 px-4 border border-gray-300 rounded focus:ring-2 focus:ring-teal/20 outline-none transition-all bg-white"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? T.common.person : T.common.persons}
                  </option>
                ))}
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
        {searched && checkin && checkout && (
          <div className="mb-4 text-sm text-gray-600">
            <span className="font-semibold text-navy">{availableCount}</span>{' '}
            {lang === 'EN'
              ? `apartment${availableCount !== 1 ? 's' : ''} available`
              : `apartamento${availableCount !== 1 ? 's' : ''} disponible${availableCount !== 1 ? 's' : ''}`}{' '}
            · {checkin} → {checkout}
          </div>
        )}

        {/* FILTROS DE CATEGORÍA + BOTÓN MÁS FILTROS */}
        <div className="flex flex-wrap gap-2 items-center mb-3">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${filter === f.id ? 'bg-teal text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setShowMoreFilters(v => !v)}
            className={`ml-auto px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${showMoreFilters || priceRange !== 'all' || sortBy !== 'default' || amenityFilters.length > 0 ? 'bg-navy text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-100'}`}
          >
            {lang === 'EN' ? 'More filters' : 'Más filtros'}
            {(priceRange !== 'all' || sortBy !== 'default' || amenityFilters.length > 0) && (
              <span className="bg-white text-navy rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">
                {[
                  priceRange !== 'all' ? 1 : 0,
                  sortBy !== 'default' ? 1 : 0,
                  amenityFilters.length > 0 ? 1 : 0,
                ].reduce((a, b) => a + b, 0)}
              </span>
            )}
            <span className={`transition-transform ${showMoreFilters ? 'rotate-180' : ''}`}>▾</span>
          </button>
        </div>

        {/* PANEL DE MÁS FILTROS */}
        {showMoreFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 space-y-5">
            {/* PRECIO */}
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {lang === 'EN' ? 'Price per night' : 'Precio por noche'}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: lang === 'EN' ? 'All' : 'Todos' },
                  { id: '<100', label: lang === 'EN' ? 'Under 100€' : 'Hasta 100€' },
                  { id: '100-150', label: '100 – 150€' },
                  { id: '150+', label: lang === 'EN' ? 'Over 150€' : 'Más de 150€' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setPriceRange(opt.id)}
                    className={`px-4 py-1.5 rounded-full text-sm transition-all ${priceRange === opt.id ? 'bg-navy text-white font-semibold' : 'bg-white border border-gray-300 text-gray-600 hover:border-navy'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ORDENAR */}
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {lang === 'EN' ? 'Sort by' : 'Ordenar por'}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'default', label: lang === 'EN' ? 'Default' : 'Por defecto' },
                  { id: 'price_asc', label: lang === 'EN' ? 'Price ↑' : 'Precio ↑' },
                  { id: 'price_desc', label: lang === 'EN' ? 'Price ↓' : 'Precio ↓' },
                  { id: 'rating', label: lang === 'EN' ? 'Rating' : 'Puntuación' },
                  { id: 'capacity', label: lang === 'EN' ? 'Capacity' : 'Capacidad' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSortBy(opt.id)}
                    className={`px-4 py-1.5 rounded-full text-sm transition-all ${sortBy === opt.id ? 'bg-navy text-white font-semibold' : 'bg-white border border-gray-300 text-gray-600 hover:border-navy'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* COMODIDADES */}
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {lang === 'EN' ? 'Amenities' : 'Comodidades'}
              </div>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => toggleAmenity(opt.key)}
                    className={`px-4 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5 ${amenityFilters.includes(opt.key) ? 'bg-teal text-white font-semibold' : 'bg-white border border-gray-300 text-gray-600 hover:border-teal'}`}
                  >
                    {amenityFilters.includes(opt.key) && <span>✓</span>}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* LIMPIAR */}
            {(priceRange !== 'all' || sortBy !== 'default' || amenityFilters.length > 0) && (
              <button
                onClick={() => {
                  setPriceRange('all');
                  setSortBy('default');
                  setAmenityFilters([]);
                }}
                className="text-sm text-red-500 hover:text-red-700 font-semibold transition-colors"
              >
                {lang === 'EN' ? '× Clear filters' : '× Limpiar filtros'}
              </button>
            )}
          </div>
        )}

        <div className="mb-6" />

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-5 py-4 mb-6">
            {loadError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {loadingApts
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse"
                >
                  <div className="h-60 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                    <div className="flex gap-3">
                      <div className="h-3 bg-gray-100 rounded w-16" />
                      <div className="h-3 bg-gray-100 rounded w-16" />
                      <div className="h-3 bg-gray-100 rounded w-16" />
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <div className="h-5 bg-gray-100 rounded-full w-14" />
                      <div className="h-5 bg-gray-100 rounded-full w-14" />
                      <div className="h-5 bg-gray-100 rounded-full w-14" />
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-2">
                      <div className="h-6 bg-gray-200 rounded w-24" />
                      <div className="h-4 bg-gray-100 rounded w-16" />
                    </div>
                  </div>
                </div>
              ))
            : filtered.map(apt => {
                const status = getAvailStatus(apt);
                const tagline =
                  lang === 'EN' ? apt.tagline_en || apt.taglineEn || apt.tagline : apt.tagline;
                const topAmenities = (apt.amenities || []).slice(0, 3);
                return (
                  <div
                    key={apt.slug}
                    className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:-translate-y-1"
                    onClick={() => navigate(`/apartamentos/${apt.slug}`)}
                  >
                    {/* IMAGEN */}
                    <div className="relative h-60 overflow-hidden">
                      {apt.coverPhoto ? (
                        <img
                          src={apt.coverPhoto}
                          alt={apt.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center gap-3"
                          style={{
                            background: apt.color
                              ? `linear-gradient(135deg, ${apt.color}cc, ${apt.color}88)`
                              : 'linear-gradient(135deg, #1a5f6e, #0f3d47)',
                          }}
                        >
                          <Ico d={paths.photo} size={40} color="rgba(255,255,255,0.25)" />
                          <span className="text-white/50 text-xs font-medium uppercase tracking-widest">
                            Sin foto
                          </span>
                        </div>
                      )}

                      {/* Overlay degradado inferior */}
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />

                      {/* Badge disponibilidad / tagline */}
                      {status === 'unavailable' ? (
                        <div className="absolute top-3 left-3 bg-gray-800/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {lang === 'EN' ? 'Not available' : 'No disponible'}
                        </div>
                      ) : tagline ? (
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm shadow-sm px-3 py-1 rounded-full text-[10px] font-bold text-navy uppercase tracking-wider">
                          {tagline}
                        </div>
                      ) : null}

                      {/* Rating badge */}
                      {apt.rating && (
                        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm shadow px-2.5 py-1 rounded-full text-[11px] font-bold text-navy flex items-center gap-1">
                          ★ {apt.rating}
                        </div>
                      )}

                      {/* Overlay no disponible */}
                      {status === 'unavailable' && (
                        <div className="absolute inset-0 bg-gray-900/30" />
                      )}
                      {!apt.active && (
                        <div className="absolute inset-0 bg-navy/60 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="text-white font-serif text-lg border-2 border-white px-6 py-2 uppercase tracking-widest">
                            {A.unavailable}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CONTENIDO */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-xl font-serif font-bold text-navy mb-1 group-hover:text-teal transition-colors leading-tight">
                        {apt.name}
                      </h3>

                      {/* Capacidad + dormitorios */}
                      <div className="flex gap-3 text-xs text-slate-500 font-medium mb-3">
                        <span className="flex items-center gap-1">
                          <Ico d={paths.users} size={13} /> {apt.cap} {T.common.persons}
                        </span>
                        <span className="flex items-center gap-1">
                          <Ico d={paths.bed} size={13} /> {apt.bedrooms} {A.bedrooms}
                        </span>
                        {apt.baths && (
                          <span className="flex items-center gap-1">
                            <Ico d={paths.bath || paths.home} size={13} /> {apt.baths} baño
                            {apt.baths > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Amenities top */}
                      {topAmenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {topAmenities.map((a, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium"
                            >
                              {a}
                            </span>
                          ))}
                          {(apt.amenities || []).length > 3 && (
                            <span className="text-[10px] text-slate-400 px-2 py-0.5">
                              +{(apt.amenities || []).length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Precio + CTA */}
                      <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-auto">
                        <div>
                          <span className="text-xl font-bold text-navy">
                            {convertPrice(apt.price)}
                          </span>
                          <span className="text-xs text-slate-400 font-normal ml-1">
                            {T.apartments.perNight}
                          </span>
                        </div>
                        <span className="text-teal font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                          {T.common.seeMore} →
                        </span>
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
