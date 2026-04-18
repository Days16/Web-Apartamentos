import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookingModal from '../components/BookingModal';
import BookingWidget from '../components/BookingWidget';
import MiniCalendar from '../components/MiniCalendar';
import Ico, { paths } from '../components/Ico';
import SEO from '../components/SEO';
import {
  fetchApartmentBySlug,
  fetchApartmentPhotos,
  fetchMinStayRules,
} from '../services/supabaseService';
import { getReservations, getReviews } from '../services/dataService';
import { useSettings } from '../contexts/SettingsContext';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { dateToStr, truncateMetaDescription } from '../utils/format';
import { siteUrl, assets } from '../constants/assets';

import { trackEvent, EVENTS } from '../utils/analytics';
import DOMPurify from 'dompurify';
import type { DbApartment, DbApartmentPhoto, DbMinStayRule, Reservation, DbReview } from '../types';

type AptState = DbApartment & {
  cap: number;
  minStay: number;
  nameEn: string | null;
  taglineEn: string | null;
  descriptionEn: string | null;
  extraNight: number;
  internalName: string | null;
  coverPhotoUrl: string | null;
  reviewCount: number;
  gradient: string;
  occupiedDays: string[];
  occupiedDatesList: string[];
  rawReservations: Reservation[];
  minStayRules: DbMinStayRule[];
};

function renderDesc(text: string): string {
  if (!text) return '';
  const html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />');
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['strong', 'br'] });
}

// amenityIcons y amenityTranslations se mantienen aquí porque son específicos de esta vista
const amenityIcons = {
  WiFi: paths.wifi,
  Parking: paths.parking,
  'Cocina equipada': paths.kitchen,
  'TV Smart': paths.tv,
  'A/C': paths.ac,
  Calefacción: paths.leaf,
  Lavadora: paths.wash,
  Terraza: paths.leaf,
  'Vistas al mar': paths.map,
  'Vistas a la ría': paths.map,
  'Cuna disponible': paths.crib,
  Barbacoa: paths.bbq,
};

const amenityTranslations: Record<string, Partial<Record<string, string>>> = {
  'Cocina equipada': {
    EN: 'Fully equipped kitchen',
    FR: 'Cuisine équipée',
    DE: 'Voll ausgestattete Küche',
    PT: 'Cozinha equipada',
  },
  Cafetera: { EN: 'Coffee maker', FR: 'Cafetière', DE: 'Kaffeemaschine', PT: 'Cafeteira' },
  Tostadora: { EN: 'Toaster', FR: 'Grille-pain', DE: 'Toaster', PT: 'Torradeira' },
  Microondas: { EN: 'Microwave', FR: 'Micro-ondes', DE: 'Mikrowelle', PT: 'Micro-ondas' },
  Lavadora: {
    EN: 'Washing machine',
    FR: 'Machine à laver',
    DE: 'Waschmaschine',
    PT: 'Máquina de lavar',
  },
  'Secador de pelo': {
    EN: 'Hair dryer',
    FR: 'Sèche-cheveux',
    DE: 'Haartrockner',
    PT: 'Secador de cabelo',
  },
  Plancha: { EN: 'Iron', FR: 'Fer à repasser', DE: 'Bügeleisen', PT: 'Ferro de engomar' },
  'Ropa de cama y toallas': {
    EN: 'Bed linen and towels',
    FR: 'Linge de lit et serviettes',
    DE: 'Bettwäsche und Handtücher',
    PT: 'Roupa de cama e toalhas',
  },
  'Cuna (bajo petición)': {
    EN: 'Crib (on request)',
    FR: 'Berceau (sur demande)',
    DE: 'Kinderbett (auf Anfrage)',
    PT: 'Berço (sob pedido)',
  },
  Trona: { EN: 'High chair', FR: 'Chaise haute', DE: 'Hochstuhl', PT: 'Cadeira alta' },
  WiFi: { EN: 'WiFi', FR: 'WiFi', DE: 'WLAN', PT: 'WiFi' },
  Parking: { EN: 'Parking', FR: 'Parking', DE: 'Parkplatz', PT: 'Estacionamento' },
  'TV Smart': { EN: 'Smart TV', FR: 'TV connectée', DE: 'Smart TV', PT: 'TV inteligente' },
  'A/C': { EN: 'Air conditioning', FR: 'Climatisation', DE: 'Klimaanlage', PT: 'Ar condicionado' },
  Calefacción: { EN: 'Heating', FR: 'Chauffage', DE: 'Heizung', PT: 'Aquecimento' },
  Terraza: { EN: 'Terrace', FR: 'Terrasse', DE: 'Terrasse', PT: 'Terraço' },
  'Vistas al mar': {
    EN: 'Sea views',
    FR: 'Vue sur la mer',
    DE: 'Meerblick',
    PT: 'Vista para o mar',
  },
  'Vistas a la ría': {
    EN: 'Estuary views',
    FR: 'Vue sur la ria',
    DE: 'Ría-Blick',
    PT: 'Vista para a ria',
  },
  'Cuna disponible': {
    EN: 'Crib available',
    FR: 'Berceau disponible',
    DE: 'Kinderbett verfügbar',
    PT: 'Berço disponível',
  },
  Barbacoa: { EN: 'Barbecue', FR: 'Barbecue', DE: 'Grill', PT: 'Churrasco' },
};

export default function ApartmentDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const { settings: globalSettings } = useSettings();
  const T = useT(lang);

  const [apt, setApt] = useState<AptState | null>(null);
  const [_loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<DbApartmentPhoto[]>([]);
  const [aptReviews, setAptReviews] = useState<DbReview[]>([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDates, setBookingDates] = useState({ checkin: '', checkout: '' });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const touchStartX = useRef<number>(0);
  const activeThumbRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    async function load() {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        const [data] = await Promise.all([fetchApartmentBySlug(slug)]);

        if (data) {
          const [res, rules] = await Promise.all([getReservations(), fetchMinStayRules()]);
          const aptRes = res.filter(
            r => (r.aptSlug === slug || r.apt === slug) && r.status !== 'cancelled'
          );
          const aptRules = rules.filter(r => r.apartment_slug === slug);

          const occupiedList: string[] = [];
          aptRes.forEach(r => {
            // Generate date array based on range (LOCAL)
            const start = new Date(r.checkin + 'T00:00:00'); // Ensure date is parsed as local midnight
            const end = new Date(r.checkout + 'T00:00:00'); // Ensure date is parsed as local midnight
            for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
              occupiedList.push(dateToStr(d));
            }
          });

          setApt({
            ...data,
            cap: data.capacity || 2,
            beds: data.beds || 1,
            baths: data.baths || 1,
            minStay: data.min_stay || 2,
            nameEn: data.name_en,
            taglineEn: data.tagline_en,
            descriptionEn: data.description_en,
            extraNight: data.extra_night,
            internalName: data.internal_name,
            coverPhotoUrl: data.cover_photo_url,
            reviewCount: data.review_count || 0,
            gradient: 'linear-gradient(135deg, #1a5f6e 0%, #2C4A5E 100%)',
            rules: data.rules || [],
            nearby: data.nearby || [],
            occupiedDays: occupiedList,
            occupiedDatesList: occupiedList,
            rawReservations: aptRes,
            minStayRules: aptRules,
          });
          trackEvent(EVENTS.APARTMENT_VIEW, { apartment: slug });

          try {
            const realPhotos = await fetchApartmentPhotos(slug);
            if (realPhotos && realPhotos.length > 0) {
              setPhotos(realPhotos);
            } else {
              setPhotos([]);
            }
          } catch {
            setPhotos([]);
          }

          try {
            const reviewsData = await getReviews(slug);
            setAptReviews(reviewsData.filter(r => r.active !== false));
          } catch {
            setAptReviews([]);
          }
        }
      } catch (err) {
        console.error('Error loading detail data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') setLightboxIdx(i => Math.min(photos.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setLightboxIdx(i => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, photos.length]);

  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [lightboxIdx]);

  if (!apt) {
    return (
      <>
        <Navbar />
        <div className="py-32 px-4 text-center">
          <div className="text-4xl md:text-5xl font-serif font-bold text-navy mb-8">
            {T.detail.notFound}
          </div>
          <button
            className="bg-teal text-white px-8 py-3 rounded hover:bg-teal-600 transition-all font-semibold"
            onClick={() => navigate('/apartamentos')}
          >
            {T.detail.seeAll}
          </button>
        </div>
        <Footer />
      </>
    );
  }

  const aptName = lang !== 'ES' ? apt.nameEn || apt.name : apt.name;
  const aptDesc = lang !== 'ES' ? apt.descriptionEn || apt.description : apt.description;
  const aptDescPlain = aptDesc ? aptDesc.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\n/g, ' ') : '';
  const aptMetaDesc = truncateMetaDescription(
    aptDescPlain ||
      `${aptName} · apartamento turístico en Ribadeo, Galicia. Reserva directa Illa Pancha.`
  );

  const depositPct =
    apt.deposit_percentage ??
    (typeof globalSettings.payment_deposit_percentage === 'number'
      ? globalSettings.payment_deposit_percentage
      : 50);
  const cancelDays =
    apt.cancellation_days ??
    (typeof globalSettings.cancellation_free_days === 'number'
      ? globalSettings.cancellation_free_days
      : 14);

  return (
    <>
      <SEO
        title={`${aptName} · Ribadeo`}
        description={aptMetaDesc}
        ogImage={photos[0]?.photo_url || undefined}
        ogType="website"
        jsonLd={
          apt.slug
            ? {
                '@context': 'https://schema.org',
                '@graph': [
                  {
                    '@type': 'Apartment',
                    name: aptName,
                    description: truncateMetaDescription(aptDescPlain, 300),
                    url: `${siteUrl}/apartamentos/${apt.slug}`,
                    image: photos[0]?.photo_url || assets.hero.background,
                    numberOfRooms: apt.bedrooms || 1,
                    occupancy: {
                      '@type': 'QuantitativeValue',
                      maxValue: apt.capacity || 4,
                    },
                    address: {
                      '@type': 'PostalAddress',
                      addressLocality: 'Ribadeo',
                      addressRegion: 'Galicia',
                      postalCode: '27700',
                      addressCountry: 'ES',
                    },
                    containedInPlace: {
                      '@type': 'LodgingBusiness',
                      name: 'Illa Pancha',
                      url: siteUrl,
                    },
                    offers: apt.price
                      ? {
                          '@type': 'Offer',
                          price: apt.price,
                          priceCurrency: 'EUR',
                          priceSpecification: {
                            '@type': 'UnitPriceSpecification',
                            price: apt.price,
                            priceCurrency: 'EUR',
                            unitCode: 'DAY',
                          },
                        }
                      : undefined,
                  },
                  {
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                      {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Inicio',
                        item: siteUrl,
                      },
                      {
                        '@type': 'ListItem',
                        position: 2,
                        name: 'Apartamentos',
                        item: `${siteUrl}/apartamentos`,
                      },
                      {
                        '@type': 'ListItem',
                        position: 3,
                        name: aptName,
                        item: `${siteUrl}/apartamentos/${apt.slug}`,
                      },
                    ],
                  },
                ],
              }
            : undefined
        }
      />
      <Navbar
        onOpenBooking={() =>
          globalSettings?.booking_mode === 'redirect' ? navigate('/reservar') : setBookingOpen(true)
        }
      />

      <div className="w-full">
        {/* GALERÍA MÓVIL — solo visible en pantallas pequeñas */}
        {photos.length > 0 && (
          <div className="md:hidden relative w-full aspect-[4/3] bg-gray-100">
            <img
              src={photos[carouselIdx]?.photo_url}
              alt={photos[carouselIdx]?.caption || `${aptName} ${carouselIdx + 1}`}
              className="w-full h-full object-cover"
              onClick={() => {
                setLightboxIdx(carouselIdx);
                setLightboxOpen(true);
              }}
            />
            {carouselIdx > 0 && (
              <button
                aria-label="Foto anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl"
                onClick={() => setCarouselIdx(i => i - 1)}
              >
                ‹
              </button>
            )}
            {carouselIdx < photos.length - 1 && (
              <button
                aria-label="Foto siguiente"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl"
                onClick={() => setCarouselIdx(i => i + 1)}
              >
                ›
              </button>
            )}
            <div className="absolute bottom-2 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              {carouselIdx + 1} / {photos.length}
            </div>
          </div>
        )}

        {/* GALERÍA ESCRITORIO */}
        <div className="relative hidden md:grid grid-cols-4 gap-4 mb-8 max-w-7xl mx-auto px-4 py-8">
          <div className="col-span-2 row-span-2">
            <div
              role="button"
              tabIndex={0}
              aria-label={photos[0]?.caption || `${aptName} — foto 1`}
              className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer"
              onClick={() => {
                setLightboxIdx(0);
                setLightboxOpen(true);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setLightboxIdx(0);
                  setLightboxOpen(true);
                }
              }}
            >
              {photos[0] ? (
                <img
                  src={photos[0].photo_url}
                  alt={photos[0].caption || aptName}
                  loading="eager"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a5f6e] to-[#2C4A5E] flex items-center justify-center">
                  <Ico d={paths.photo} size={48} color="rgba(255,255,255,0.1)" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
            </div>
          </div>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              aria-label={photos[i]?.caption || `${aptName} — foto ${i + 1}`}
              className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer"
              onClick={() => {
                setLightboxIdx(i);
                setLightboxOpen(true);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setLightboxIdx(i);
                  setLightboxOpen(true);
                }
              }}
            >
              {photos[i] ? (
                <img
                  src={photos[i].photo_url}
                  alt={photos[i].caption || `${aptName} ${i + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a5f6e] to-[#2C4A5E] flex items-center justify-center">
                  <Ico d={paths.photo} size={28} color="rgba(255,255,255,0.1)" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
            </div>
          ))}
          {photos.length > 0 && (
            <button
              className="absolute bottom-12 right-8 bg-white text-navy text-sm font-semibold px-4 py-2 rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2"
              onClick={() => {
                setLightboxIdx(0);
                setLightboxOpen(true);
              }}
            >
              <Ico d={paths.photo} size={14} color="#0f172a" />
              {T.detail.seeAllPhotos.replace('{count}', String(photos.length))}
            </button>
          )}
        </div>

        {/* CUERPO */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 py-8 px-4 max-w-7xl mx-auto">
          {/* COLUMNA IZQUIERDA */}
          <div className="lg:col-span-3">
            <div className="flex gap-2 items-center text-sm text-gray-600 mb-4 flex-wrap">
              <Link to="/">{T.seo.homeTitle}</Link>
              <span className="text-gray-400">›</span>
              <Link to="/apartamentos">{T.nav.apartments}</Link>
              <span className="text-gray-400">›</span>
              <span className="text-navy font-semibold">{aptName}</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-4">{aptName}</h1>

            <div className="flex gap-2 items-center text-sm text-gray-600 mb-8 flex-wrap">
              <span>
                ★ {apt.rating}{' '}
                <span className="text-gray-300">
                  ({apt.reviewCount} {T.detail.opinions})
                </span>
              </span>
              <span className="text-gray-300">·</span>
              <span>Ribadeo, Galicia</span>
              <span className="text-gray-300">·</span>
              <span>
                {apt.cap} {T.apartments.persons}
              </span>
              <span className="text-gray-300">·</span>
              <span>
                {apt.beds} {apt.beds > 1 ? T.apartments.beds : T.apartments.bed}
              </span>
              <span className="text-gray-300">·</span>
              <span>
                {apt.baths} {apt.baths > 1 ? T.apartments.baths : T.apartments.bath}
              </span>
              <span className="text-gray-300">·</span>
              <span>
                {T.apartments.minStay} {apt.minStay} {T.apartments.nights}
              </span>
            </div>

            <div className="text-2xl font-serif font-bold text-navy mb-4 mt-0">
              {T.detail.description}
            </div>
            <p
              className="text-gray-700 leading-relaxed mb-8"
              dangerouslySetInnerHTML={{ __html: renderDesc(aptDesc || '') }}
            />

            <div className="text-2xl font-serif font-bold text-navy mb-4 mt-8">
              {T.detail.includes}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {apt.amenities.map(am => (
                <div key={am} className="flex items-center gap-3 text-sm text-gray-700">
                  <Ico
                    d={(amenityIcons as Record<string, string>)[am] || paths.check}
                    size={16}
                    color="#1a5f6e"
                  />
                  {lang !== 'ES'
                    ? amenityTranslations[am]?.[lang] || amenityTranslations[am]?.EN || am
                    : am}
                </div>
              ))}
            </div>
            {globalSettings?.booking_mode !== 'redirect' && (
              <>
                <div className="text-2xl font-serif font-bold text-navy mb-4 mt-8">
                  {T.detail.availability}
                </div>
                <MiniCalendar occupiedDays={apt.occupiedDays || []} T={T} />
              </>
            )}

            <div className="text-2xl font-serif font-bold text-navy mb-4 mt-8">
              {T.detail.rules}
            </div>
            <ul className="space-y-3 mb-8">
              {apt.rules.map((rule, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <Ico d={paths.check} size={14} color="#1a5f6e" />
                  {rule}
                </li>
              ))}
            </ul>

            <div className="text-2xl font-serif font-bold text-navy mb-4 mt-8">
              {T.detail.location}
            </div>
            <div className="space-y-3 mb-6">
              {apt.nearby.map((item, i) => (
                <div key={i} className="flex gap-2 text-xs text-gray-700 items-center">
                  <Ico d={paths.map} size={13} color="#64748b" />
                  {item}
                </div>
              ))}
            </div>
            {(() => {
              const mapsUrl =
                apt.maps_url ||
                'https://www.google.com/maps/place/Av.+de+Rosal%C3%ADa+de+Castro,+25,+27700+Ribadeo,+Lugo/@43.5397524,-7.0411052,199m/data=!3m1!1e3!4m6!3m5!1s0xd317e5724d77fed:0x5b60c517683c15a5!8m2!3d43.5399657!4d-7.0410569!16s%2Fg%2F11c19xgmd5?entry=ttu&g_ep=EgoyMDI2MDMxNS4wIKXMDSoASAFQAw%3D%3D';
              return (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 border border-gray-200 rounded-lg p-4 mb-8 hover:border-teal hover:bg-teal/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
                    <Ico d={paths.map} size={18} color="#1a5f6e" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy">{T.detail.openMaps}</div>
                    <div className="text-xs text-gray-500">
                      Av. Rosalía de Castro 25, 27700 Ribadeo, Lugo
                    </div>
                  </div>
                  <span className="text-teal text-sm group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </a>
              );
            })()}

            {aptReviews.length > 0 && (
              <>
                <div className="text-2xl font-serif font-bold text-navy mb-4 mt-8">
                  {T.detail.reviews}
                </div>
                <div className="space-y-0">
                  {aptReviews.map((r, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-5 bg-white mb-4">
                      <div className="flex gap-0.5 text-teal">{'★'.repeat(r.stars)}</div>
                      <div className="text-sm text-gray-700 leading-relaxed">"{r.text}"</div>
                      <div className="flex justify-between">
                        <div className="font-semibold text-navy">
                          {r.name} · {r.origin}
                        </div>
                        <div className="text-xs text-gray-300">{r.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* COLUMNA DERECHA: WIDGET */}
          <div className="self-start sticky top-8">
            <BookingWidget
              apt={apt}
              onBook={dates => {
                if (globalSettings?.booking_mode === 'redirect') {
                  navigate('/reservar');
                } else {
                  setBookingDates(dates);
                  setBookingOpen(true);
                }
              }}
              T={T}
            />

            <div className="mt-4 p-5 bg-gray-50 text-xs text-gray-700 leading-relaxed rounded-lg">
              <div className="font-semibold mb-1 text-navy">{T.detail.payModel}</div>
              <div>
                💳 {depositPct}% {T.detail.depositNow}
              </div>
              {depositPct < 100 && (
                <div>
                  💵 {100 - depositPct}% {T.detail.cashArrival}
                </div>
              )}
              <div className="mt-2 text-gray-600">
                {T.detail.noCommission} {cancelDays} {T.detail.daysBefore}
              </div>
            </div>

            <button
              className="w-full border border-gray-300 text-navy px-4 py-3 rounded hover:bg-gray-50 transition-all font-semibold mt-3"
              onClick={() => navigate('/contacto')}
            >
              {T.detail.askApt}
            </button>
          </div>
        </div>
      </div>

      <Footer />

      {bookingOpen && (
        <BookingModal
          apartment={apt}
          initialCheckin={bookingDates?.checkin}
          initialCheckout={bookingDates?.checkout}
          onClose={() => setBookingOpen(false)}
        />
      )}

      {/* LIGHTBOX */}
      {lightboxOpen && photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setLightboxOpen(false)}
          onTouchStart={e => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={e => {
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (dx > 50) setLightboxIdx(i => Math.max(0, i - 1));
            else if (dx < -50) setLightboxIdx(i => Math.min(photos.length - 1, i + 1));
          }}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-5 py-3 flex-shrink-0 z-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-white/60 text-sm font-medium tabular-nums">
              {lightboxIdx + 1} / {photos.length}
            </div>
            <button
              aria-label="Cerrar galería"
              className="text-white/70 hover:text-white text-2xl font-light w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              onClick={() => setLightboxOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Main image */}
          <div
            className="flex-1 flex items-center justify-center relative px-14 min-h-0"
            onClick={e => e.stopPropagation()}
          >
            {lightboxIdx > 0 && (
              <button
                aria-label="Foto anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-5xl font-light z-10 w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                onClick={() => setLightboxIdx(i => i - 1)}
              >
                ‹
              </button>
            )}
            <img
              key={lightboxIdx}
              src={photos[lightboxIdx].photo_url}
              alt={photos[lightboxIdx].caption || `${aptName} ${lightboxIdx + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            {lightboxIdx < photos.length - 1 && (
              <button
                aria-label="Foto siguiente"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-5xl font-light z-10 w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                onClick={() => setLightboxIdx(i => i + 1)}
              >
                ›
              </button>
            )}
          </div>

          {/* Caption */}
          {photos[lightboxIdx].caption && (
            <div
              className="text-white/50 text-sm text-center px-4 pt-2 flex-shrink-0"
              onClick={e => e.stopPropagation()}
            >
              {photos[lightboxIdx].caption}
            </div>
          )}

          {/* Thumbnail strip */}
          <div
            className="flex gap-2 px-4 py-3 overflow-x-auto flex-shrink-0"
            style={{ scrollbarWidth: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            {photos.map((p, i) => (
              <button
                key={i}
                ref={i === lightboxIdx ? activeThumbRef : null}
                onClick={() => setLightboxIdx(i)}
                aria-label={p.caption || `Foto ${i + 1} de ${photos.length}`}
                aria-current={i === lightboxIdx ? 'true' : undefined}
                className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-all ${
                  i === lightboxIdx
                    ? 'border-white opacity-100 scale-105'
                    : 'border-transparent opacity-40 hover:opacity-70'
                }`}
              >
                <img
                  src={p.photo_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
