import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assets, siteUrl } from '../constants/assets';
import type { Apartment, Reservation, DbApartment } from '../types';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookingModal from '../components/BookingModal';
import Ico, { paths } from '../components/Ico';
import SEO from '../components/SEO';
import { fetchApartments, fetchApartmentPhotos, fetchFaqs } from '../services/supabaseService';
import { getReservations, getReviews } from '../services/dataService';
import type { DbFaq } from '../types';
import { strToDate, dateToStr, formatDateShort } from '../utils/format';
import { useCurrency } from '../contexts/CurrencyContext';
import { safeHtml } from '../utils/sanitize';

import DatePicker from 'react-datepicker';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';

import { useSettings } from '../contexts/SettingsContext';

export default function Home() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { convertPrice } = useCurrency();
  const { settings } = useSettings();
  const T = useT(lang);

  const cancelDays =
    typeof settings?.cancellation_free_days === 'number' ? settings.cancellation_free_days : 14;
  const depositPct =
    typeof settings?.payment_deposit_percentage === 'number'
      ? settings.payment_deposit_percentage
      : 50;

  const today = new Date();
  const defaultCheckin = new Date(today);
  defaultCheckin.setDate(today.getDate() + 7);
  const defaultCheckout = new Date(today);
  defaultCheckout.setDate(today.getDate() + 14);
  const fmt = (d: Date): string => d.toISOString().split('T')[0];

  const [checkin, setCheckin] = useState(fmt(defaultCheckin));
  const [checkout, setCheckout] = useState(fmt(defaultCheckout));
  const [guests, setGuests] = useState(2);
  const [searched, setSearched] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Apartment | null>(null);

  const [featuredApts, setFeaturedApts] = useState<
    Array<DbApartment & { coverPhoto: string | null }>
  >([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reviews, setReviews] = useState<
    Array<{ name: string; text: string; stars: number; date: string | null; origin: string | null }>
  >([]);
  const [faqs, setFaqs] = useState<DbFaq[]>([]);
  const [faqOpen, setFaqOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFaqs(true)
      .then(data => setFaqs(data.slice(0, 5)))
      .catch(() => {});

    Promise.all([fetchApartments(), getReservations(), getReviews()]).then(
      async ([aptsData, resData, reviewsData]) => {
        setReservations(resData);
        setReviews(reviewsData.filter(r => r.active !== false).slice(0, 6));

        const apts = aptsData.slice(0, 6);
        // Usar cover_photo_url si ya está en la tabla (evita N queries extra)
        const aptsNeedingPhoto = apts.filter(a => !a.cover_photo_url);
        const aptsWithPhotos = await Promise.all(
          apts.map(async apt => {
            if (apt.cover_photo_url) return { ...apt, coverPhoto: apt.cover_photo_url };
            if (!aptsNeedingPhoto.includes(apt)) return { ...apt, coverPhoto: null };
            try {
              const photos = await fetchApartmentPhotos(apt.slug);
              return { ...apt, coverPhoto: photos?.[0]?.photo_url ?? null };
            } catch {
              return { ...apt, coverPhoto: null };
            }
          })
        );
        setFeaturedApts(aptsWithPhotos);
        setLoading(false);
      }
    );
  }, []);

  const handleSearch = () => {
    if (checkin && checkout) {
      navigate(`/apartamentos?checkin=${checkin}&checkout=${checkout}&guests=${guests}`);
      return;
    }
    setSearched(true);
    document.getElementById('apartments-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const pickQ = (faq: DbFaq) => {
    if (lang === 'EN') return faq.question_en?.trim() || faq.question;
    if (lang === 'FR') return faq.question_fr?.trim() || faq.question_en?.trim() || faq.question;
    if (lang === 'DE') return faq.question_de?.trim() || faq.question_en?.trim() || faq.question;
    if (lang === 'PT') return faq.question_pt?.trim() || faq.question_en?.trim() || faq.question;
    return faq.question;
  };
  const pickA = (faq: DbFaq) => {
    if (lang === 'EN') return faq.answer_en?.trim() || faq.answer;
    if (lang === 'FR') return faq.answer_fr?.trim() || faq.answer_en?.trim() || faq.answer;
    if (lang === 'DE') return faq.answer_de?.trim() || faq.answer_en?.trim() || faq.answer;
    if (lang === 'PT') return faq.answer_pt?.trim() || faq.answer_en?.trim() || faq.answer;
    return faq.answer;
  };

  return (
    <>
      <SEO
        title={T.seo.homeTitle}
        description={T.seo.homeDesc}
        ogType="website"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'LodgingBusiness',
          name: 'Illa Pancha',
          url: siteUrl,
          telephone: '+34 614 52 30 77',
          image: import.meta.env.VITE_OG_IMAGE_URL?.trim() || assets.hero.background,
          description: T.seo.homeDesc,
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Ribadeo',
            addressLocality: 'Ribadeo',
            addressRegion: 'Galicia',
            postalCode: '27700',
            addressCountry: 'ES',
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: 43.5354,
            longitude: -7.0415,
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            reviewCount: '220',
            bestRating: '5',
          },
          priceRange: '€€',
          numberOfRooms: 8,
        }}
      />
      <Navbar onOpenBooking={() => setBookingOpen(true)} />

      {/* HERO */}
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden py-20 px-4">
        {/* Foto de fondo — img para mejor LCP */}
        <img
          src={assets.hero.background}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay oscuro para legibilidad del texto */}
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-4xl">
          <div className="text-sm font-semibold text-white uppercase tracking-widest mb-4">
            {T.home.feature4Title}
          </div>
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 leading-tight"
            dangerouslySetInnerHTML={safeHtml(T.home.heroTitle)}
          />
          <p className="text-lg md:text-xl text-gray-100 mb-12 leading-relaxed">
            {T.home.heroDesc}
          </p>
          <div className="flex gap-4 flex-wrap justify-center mb-16">
            <button
              className="bg-navy text-white px-8 py-4 rounded hover:bg-slate-900 transition-all font-semibold text-lg"
              onClick={handleSearch}
            >
              {T.home.availability}
            </button>
            <button
              className="border-2 border-white text-white px-8 py-4 rounded hover:bg-white hover:text-navy transition-all font-semibold text-lg"
              onClick={() => navigate('/apartamentos')}
            >
              {T.home.meetApts}
            </button>
          </div>
        </div>

        {/* BUSCADOR */}
        <div className="relative z-20 w-full max-w-4xl">
          <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-3">
            <div className="flex flex-col w-full [&_.react-datepicker-wrapper]:w-full">
              <div className="text-xs font-semibold text-navy uppercase tracking-wider mb-2">
                {T.apartments.checkin}
              </div>
              <DatePicker
                selected={strToDate(checkin)}
                onChange={(date: Date | null) =>
                  date &&
                  setCheckin(
                    dateToStr(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
                  )
                }
                minDate={new Date()}
                maxDate={(() => {
                  const co = strToDate(checkout);
                  return co ? new Date(co.getTime() - 86400000) : undefined;
                })()}
                dateFormat={lang === 'ES' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
                placeholderText={lang === 'ES' ? 'dd/mm/aaaa' : 'mm/dd/yyyy'}
                className="w-full h-[42px] px-3 py-2 border border-gray-300 rounded text-sm text-navy focus:outline-none focus:border-[#82c8bd] focus:ring-2 focus:ring-[#82c8bd]/20 transition-all"
              />
            </div>
            <div className="flex flex-col w-full [&_.react-datepicker-wrapper]:w-full">
              <div className="text-xs font-semibold text-navy uppercase tracking-wider mb-2">
                {T.apartments.checkout}
              </div>
              <DatePicker
                selected={strToDate(checkout)}
                onChange={(date: Date | null) =>
                  date &&
                  setCheckout(
                    dateToStr(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
                  )
                }
                minDate={(() => {
                  const ci = strToDate(checkin);
                  return ci ? new Date(ci.getTime() + 86400000) : new Date();
                })()}
                dateFormat={lang === 'ES' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
                placeholderText={lang === 'ES' ? 'dd/mm/aaaa' : 'mm/dd/yyyy'}
                className="w-full h-[42px] px-3 py-2 border border-gray-300 rounded text-sm text-navy focus:outline-none focus:border-[#82c8bd] focus:ring-2 focus:ring-[#82c8bd]/20 transition-all"
              />
            </div>
            <div className="flex flex-col w-full">
              <div className="text-xs font-semibold text-navy uppercase tracking-wider mb-2">
                {T.apartments.guests}
              </div>
              <select
                value={guests}
                onChange={e => setGuests(+e.target.value)}
                aria-label={T.apartments.guests}
                className="w-full h-[42px] px-3 py-2 border border-gray-300 rounded text-sm text-navy cursor-pointer focus:outline-none focus:border-[#82c8bd] focus:ring-2 focus:ring-[#82c8bd]/20 transition-all"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? T.common.person : T.common.persons}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="md:col-span-2 bg-[#82c8bd] text-white px-6 w-full rounded hover:bg-[#6bb5a9] transition-all font-semibold text-sm h-[42px] flex items-center justify-center md:mt-6"
              onClick={handleSearch}
            >
              {T.home.searchApts}
            </button>
          </div>
        </div>
      </div>

      {/* CARACTERÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-20 px-4 max-w-7xl mx-auto">
        {[
          { icon: paths.cash, t: T.home.feature1Title, d: T.home.feature1Desc },
          {
            icon: paths.lock,
            t: T.home.feature2Title,
            d: T.home.feature2Desc.replace('{pct}', String(depositPct)),
          },
          { icon: paths.sync, t: T.home.feature3Title, d: T.home.feature3Desc },
          { icon: paths.map, t: T.home.feature4Title, d: T.home.feature4Desc },
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
        <div className="text-sm font-semibold text-teal uppercase tracking-widest mb-2">
          {T.home.ourAptHeading}
        </div>
        <div className="flex justify-between items-end gap-8 mb-12 flex-col md:flex-row">
          <h2
            className="text-4xl md:text-5xl font-serif font-bold text-navy"
            dangerouslySetInnerHTML={safeHtml(T.home.spacesToRest)}
          />
          <div className="flex gap-4 flex-wrap items-center">
            {searched && (
              <div className="text-sm text-gray-600 font-light">
                {T.home.availFilter} {formatDateShort(checkin)} → {formatDateShort(checkout)}
              </div>
            )}
            <button
              className="border-2 border-navy text-navy hover:bg-navy hover:text-white px-5 py-3 rounded transition-all"
              onClick={() =>
                navigate(
                  searched && checkin && checkout
                    ? `/apartamentos?checkin=${checkin}&checkout=${checkout}&guests=${guests}`
                    : '/apartamentos'
                )
              }
            >
              {T.home.viewAll}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden shadow-sm bg-white min-h-[300px] animate-pulse"
                >
                  <div className="bg-gray-200 h-52" />
                  <div className="p-6 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-4 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))
            : [...featuredApts]
                .map(apt => {
                  if (!searched) return { ...apt, available: true };
                  const capacityOk = guests <= (apt.capacity || 2);
                  const hasOverlap = reservations.some(r => {
                    if (r.status === 'cancelled') return false;
                    if (r.aptSlug !== apt.slug && r.apt !== apt.slug) return false;
                    const rIn = new Date(r.checkin + 'T00:00:00');
                    const rOut = new Date(r.checkout + 'T00:00:00');
                    const sIn = new Date(checkin + 'T00:00:00');
                    const sOut = new Date(checkout + 'T00:00:00');
                    return sIn < rOut && sOut > rIn;
                  });
                  return { ...apt, available: capacityOk && !hasOverlap };
                })
                .sort((a, b) => {
                  if (!searched) return 0;
                  if (a.available && !b.available) return -1;
                  if (!a.available && b.available) return 1;
                  return 0;
                })
                .map((apt, _i) => (
                  <div
                    key={apt.slug}
                    className={`group relative flex flex-col rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all h-full min-h-[300px] ${searched && !apt.available ? 'opacity-70' : ''}`}
                    onClick={() => navigate(`/apartamentos/${apt.slug}`)}
                  >
                    <div className="relative w-full flex-shrink-0" style={{ minHeight: 200 }}>
                      {apt.coverPhoto ? (
                        <img
                          src={apt.coverPhoto}
                          alt={apt.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            background: apt.color
                              ? `linear-gradient(135deg, ${apt.color}cc, ${apt.color}88)`
                              : 'linear-gradient(135deg, #1a5f6e, #2C4A5E)',
                          }}
                        >
                          <Ico d={paths.photo} size={40} color="rgba(255,255,255,0.12)" />
                        </div>
                      )}
                    </div>
                    {searched && !apt.available ? (
                      <div className="absolute top-4 right-4 bg-gray-700 text-white px-3 py-1 rounded text-sm z-10 font-medium">
                        {T.apartments.unavailable}
                      </div>
                    ) : (
                      <div className="absolute top-4 right-4 bg-teal text-white px-3 py-1 rounded text-sm z-10 font-medium">
                        {apt.tagline}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all" />
                    <div className="p-6 bg-white">
                      <h3 className="text-xl font-serif font-bold text-navy mb-2">{apt.name}</h3>
                      <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                        <span>
                          {apt.capacity} pers · {apt.beds} dorm
                        </span>
                        <span className="font-semibold text-teal text-lg">
                          {convertPrice(apt.price)}
                          <span className="text-xs text-gray-500">/{T.common.night}</span>
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
          <div className="text-sm font-semibold text-teal uppercase tracking-widest mb-2">
            {T.home.whatGuestsSay}
          </div>
          <div className="flex justify-between items-start gap-8 mb-12 flex-col md:flex-row">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy">
              {T.home.opinionsTitle}
              <br />
              <em className="text-teal italic font-light">{T.home.opinionsEm}</em>
            </h2>
            <div className="text-xl font-semibold text-navy">{T.home.verifiedReviews}</div>
          </div>
          {reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Aún no hay reseñas publicadas.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((r, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-3"
                >
                  <div className="text-[#D4A843] text-lg">{'★'.repeat(r.stars || 5)}</div>
                  <div className="text-gray-700 italic flex-1">"{r.text}"</div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-semibold text-navy">
                      {r.name}
                      {r.origin ? ` · ${r.origin}` : ''}
                    </div>
                    <div className="text-xs text-gray-400">{r.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAQ */}
      {faqs.length > 0 && (
        <div className="py-20 md:py-28 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-sm font-semibold text-teal uppercase tracking-widest mb-2">
              {T.home.faqHeading}
            </div>
            <div className="flex justify-between items-end gap-6 mb-12 flex-col md:flex-row">
              <h2
                className="text-4xl md:text-5xl font-serif font-bold text-navy"
                dangerouslySetInnerHTML={safeHtml(T.home.faqTitle)}
              />
              <button
                className="border-2 border-navy text-navy hover:bg-navy hover:text-white px-5 py-3 rounded transition-all whitespace-nowrap"
                onClick={() => navigate('/faq')}
              >
                {T.home.faqViewAll}
              </button>
            </div>
            <div className="divide-y divide-gray-200 border-y border-gray-200">
              {faqs.map(faq => (
                <div key={faq.id}>
                  <button
                    className="w-full text-left flex justify-between items-center py-5 gap-4"
                    onClick={() => setFaqOpen(faqOpen === faq.id ? null : faq.id)}
                    aria-expanded={faqOpen === faq.id}
                  >
                    <span className="font-semibold text-navy">{pickQ(faq)}</span>
                    <span
                      className={`text-teal text-xl flex-shrink-0 transition-transform duration-200 ${faqOpen === faq.id ? 'rotate-45' : ''}`}
                    >
                      +
                    </span>
                  </button>
                  {faqOpen === faq.id && (
                    <div className="pb-5 text-gray-600 leading-relaxed text-sm">{pickA(faq)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BANNER RESERVA DIRECTA */}
      <div className="py-20 px-4 bg-gradient-to-r from-navy to-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2
                className="text-4xl font-serif font-bold text-white mb-6"
                dangerouslySetInnerHTML={safeHtml(T.home.bannerTitle)}
              />
              <p className="text-gray-100 mb-6 leading-relaxed text-lg">{T.home.bannerDesc}</p>
            </div>
            <div className="flex flex-col items-center md:items-start gap-4">
              <button
                className="bg-white text-navy px-8 py-4 rounded hover:bg-gray-100 transition-all font-semibold text-lg w-full md:w-auto"
                onClick={() => navigate('/apartamentos')}
              >
                {T.home.bookNowNoComm}
              </button>
              <div className="text-teal text-sm font-medium">
                {T.home.freeCancelDays.replace('{days}', String(cancelDays))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {bookingOpen && (
        <BookingModal
          apartment={selectedApt ?? undefined}
          initialCheckin={checkin}
          initialCheckout={checkout}
          onClose={() => {
            setBookingOpen(false);
            setSelectedApt(null);
          }}
        />
      )}
    </>
  );
}
