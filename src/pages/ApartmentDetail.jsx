import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookingModal from '../components/BookingModal';
import Ico, { paths } from '../components/Ico';
import SEO from '../components/SEO';
import { fetchApartmentBySlug, fetchApartmentPhotos, fetchMinStayRules } from '../services/supabaseService';
import { getReservations } from '../services/dataService';
import { useSettings } from '../contexts/SettingsContext';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { formatDateShort, MESES, formatPrice, strToDate, dateToStr } from '../utils/format';
import { useDiscount } from '../contexts/DiscountContext';
import { getMockPhotosForApartment } from '../data/mockPhotos';

const amenityIcons = {
  'WiFi': paths.wifi, 'Parking': paths.parking, 'Cocina equipada': paths.kitchen,
  'TV Smart': paths.tv, 'A/C': paths.ac, 'Calefacción': paths.leaf,
  'Lavadora': paths.wash, 'Terraza': paths.leaf, 'Vistas al mar': paths.map,
  'Vistas a la ría': paths.map, 'Cuna disponible': paths.crib, 'Barbacoa': paths.bbq,
};

const amenityTranslations = {
  'Cocina equipada': 'Fully equipped kitchen',
  'Cafetera': 'Coffee maker',
  'Tostadora': 'Toaster',
  'Microondas': 'Microwave',
  'Lavadora': 'Washing machine',
  'Secador de pelo': 'Hair dryer',
  'Plancha': 'Iron',
  'Ropa de cama y toallas': 'Bed linen and towels',
  'Cuna (bajo petición)': 'Crib (on request)',
  'Trona': 'High chair'
};

const DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function MiniCalendar({ occupiedDays, T }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const today = new Date();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isPast = (day) => {
    if (!day) return false;
    return new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMonthOffset(o => o - 1)}
          className="bg-white border border-gray-300 px-2.5 py-1 cursor-pointer text-xs text-gray-700 hover:bg-gray-50 rounded"
        >‹</button>
        <div className="font-serif text-lg text-navy font-bold">
          {MESES[month].charAt(0).toUpperCase() + MESES[month].slice(1)} {year}
        </div>
        <button
          onClick={() => setMonthOffset(o => o + 1)}
          className="bg-white border border-gray-300 px-2.5 py-1 cursor-pointer text-xs text-gray-700 hover:bg-gray-50 rounded"
        >›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_NAMES.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-600">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const dStr = day ? dateToStr(new Date(year, month, day)) : null;
          const occ = dStr && occupiedDays?.includes(dStr);
          const past = isPast(day);
          return (
            <div
              key={i}
              className={`flex items-center justify-center p-1 text-xs rounded ${!day ? 'bg-transparent' : past ? 'bg-gray-100 text-gray-400' : occ ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}
              title={day && !past ? (occ ? T.common.occupied : T.common.available) : ''}
            >
              {day}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <div className="w-2.5 h-2.5 bg-blue-100 border border-blue-400 rounded" />
          {T.detail.available}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <div className="w-2.5 h-2.5 bg-red-100 border border-red-600 rounded" />
          {T.detail.occupied}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <div className="w-2.5 h-2.5 bg-gray-100 border border-gray-300 rounded" />
          {T.common.past}
        </div>
      </div>
    </div>
  );
}

function BookingWidget({ apt, onBook, T }) {
  const { settings: globalSettings } = useSettings();
  const { lang } = useLang();
  const { activeDiscount } = useDiscount();
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [guests, setGuests] = useState(2);
  const [blockReason, setBlockReason] = useState(null);

  const occupiedDatesList = apt.occupiedDatesList || [];

  // Apt > Global > Default
  const cancelDays = apt.cancellation_days ?? globalSettings.cancellation_free_days ?? 14;
  const depositPct = apt.deposit_percentage ?? globalSettings.payment_deposit_percentage ?? 50;

  // Regla dinámica de noches mínimas
  const getDynamicMinStay = () => {
    if (!checkin) return apt.minStay || 1;
    const rule = apt.minStayRules?.find(r => checkin >= r.start_date && checkin <= r.end_date);
    return rule ? rule.min_nights : (apt.minStay || 1);
  };

  const currentMinStay = getDynamicMinStay();

  const calcNights = () => {
    if (!checkin || !checkout) return 0;
    const diff = (new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : 0;
  };

  const nights = calcNights();

  // Nuevo: Comprobar si hay días ocupados en medio del rango
  const checkHasOverlap = () => {
    if (!checkin || !checkout || !occupiedDatesList.length) return false;
    const dIn = new Date(checkin + 'T00:00:00');
    const dOut = new Date(checkout + 'T00:00:00');
    for (let d = new Date(dIn); d < dOut; d.setDate(d.getDate() + 1)) {
      if (occupiedDatesList.includes(dateToStr(d))) return true;
    }
    return false;
  };

  const hasOverlap = checkHasOverlap();
  const subtotal = apt.price * nights;

  let discountAmount = 0;
  if (activeDiscount) {
    discountAmount = Math.round(subtotal * (activeDiscount.discount_percentage / 100));
  }
  const subtotalWithDiscount = subtotal - discountAmount;

  const taxPct = globalSettings.tax_percentage !== undefined ? globalSettings.tax_percentage : 10;

  const extra = apt.extraNight ? apt.extraNight * nights : 0;
  const subtotalWithDiscountAndExtras = subtotalWithDiscount + extra;
  const taxes = Math.round(subtotalWithDiscountAndExtras * (taxPct / 100));
  const total = subtotalWithDiscountAndExtras + taxes;
  const deposit = Math.round(total * (depositPct / 100));

  const checkinLabel = checkin ? formatDateShort(checkin) : '';
  const checkoutLabel = checkout ? formatDateShort(checkout) : '';

  const handleDateClick = (date, type) => {
    const dStr = dateToStr(date);
    const block = apt.rawReservations?.find(r => dStr >= r.checkin && dStr < r.checkout && (r.id.startsWith('BLK-') || r.source === 'manual'));

    if (block) {
      setBlockReason(block.guest || 'Mantenimiento');
    } else {
      setBlockReason(null);
    }

    if (type === 'checkin') {
      setCheckin(dStr);
    } else {
      setCheckout(dStr);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 border border-gray-200 rounded-lg sticky top-8">
      <div className="text-3xl font-serif font-bold text-teal mb-1">{formatPrice(apt.price)}</div>
      <div className="text-xs text-gray-600 mb-6">{T.detail.pricePerNight}</div>

      <div className="grid grid-cols-2 gap-0 mb-0.5 border-b border-gray-200">
        <div className="flex flex-col mb-4 border-r border-gray-200 pr-2 min-w-0 w-full [&_.react-datepicker-wrapper]:w-full">
          <div className="text-xs font-semibold text-navy mb-2 truncate">{T.detail.checkin}</div>
          <DatePicker
            selected={strToDate(checkin)}
            onChange={date => handleDateClick(date, 'checkin')}
            minDate={new Date()}
            excludeDates={occupiedDatesList.map(d => strToDate(d))}
            maxDate={strToDate(checkout) ? new Date(strToDate(checkout).getTime() - 86400000) : null}
            dateFormat={lang === 'ES' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
            placeholderText={lang === 'ES' ? 'dd/mm/aaaa' : 'mm/dd/yyyy'}
            className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-[#82c8bd] focus:ring-2 focus:ring-[#82c8bd]/20"
          />
        </div>
        <div className="flex flex-col mb-4 pl-2 min-w-0 w-full [&_.react-datepicker-wrapper]:w-full">
          <div className="text-xs font-semibold text-navy mb-2 truncate">{T.detail.checkout}</div>
          <DatePicker
            selected={strToDate(checkout)}
            onChange={date => handleDateClick(date, 'checkout')}
            excludeDates={occupiedDatesList.map(d => strToDate(d))}
            minDate={strToDate(checkin) ? new Date(strToDate(checkin).getTime() + 86400000) : new Date()}
            dateFormat={lang === 'ES' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
            placeholderText={lang === 'ES' ? 'dd/mm/aaaa' : 'mm/dd/yyyy'}
            className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-[#82c8bd] focus:ring-2 focus:ring-[#82c8bd]/20"
          />
        </div>
      </div>

      {blockReason && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-3 mb-4 animate-in fade-in slide-in-from-top-1">
          <span className="text-xl">⚠️</span>
          <div className="text-xs text-amber-800 flex-1">
            <p className="font-bold">Fecha no disponible</p>
            <p>{blockReason}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col mb-5">
        <div className="text-xs font-semibold text-navy mb-2">{T.detail.guestsLabel}</div>
        <select value={guests} onChange={e => setGuests(+e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
          {Array.from({ length: apt.cap }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{n} {n === 1 ? T.common.person : T.common.persons}</option>
          ))}
        </select>
      </div>

      {nights > 0 ? (
        <>
          <div className="h-px bg-gray-200 my-4" />
          <div className="flex justify-between items-center text-sm text-gray-700">
            <span>{formatPrice(apt.price)} × {nights} {nights === 1 ? T.common.night : T.common.nights}</span>
            <strong style={{ textDecoration: discountAmount > 0 ? 'line-through' : 'none', opacity: discountAmount > 0 ? 0.6 : 1 }}>{formatPrice(subtotal)}</strong>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between items-center text-sm text-green-500" style={{ marginTop: -6 }}>
              <span className="text-xs">{T.common.offerApplied} {activeDiscount.discount_percentage}%</span>
              <strong>-{formatPrice(discountAmount)}</strong>
            </div>
          )}
          {extra > 0 && (
            <div className="flex justify-between items-center text-sm text-gray-700">
              <span>{T.detail.season}</span>
              <strong>{formatPrice(extra)}</strong>
            </div>
          )}
          {taxes > 0 && (
            <div className="flex justify-between items-center text-sm text-gray-700">
              <span>Impuestos y tasas ({taxPct}%)</span>
              <strong>{formatPrice(taxes)}</strong>
            </div>
          )}
          <div className="flex justify-between items-center font-bold text-navy text-base border-t border-gray-200 pt-4 mb-4">
            <span>{T.detail.total}</span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="h-px bg-gray-200 my-4" />
          <div className="flex justify-between text-xs text-gray-700 mb-1">
            <span>💳 {depositPct}% {T.detail.depositPct}</span>
            <strong className="text-navy">{formatPrice(deposit)}</strong>
          </div>
          <div className="flex justify-between text-xs text-gray-700 mb-4">
            <span>💵 {T.detail.cashArrival}</span>
            <strong className="text-navy">{formatPrice(total - deposit)}</strong>
          </div>
        </>
      ) : (
        <div style={{ height: 8 }} />
      )}

      <button
        className="w-full bg-[#82c8bd] text-white px-4 py-3 rounded hover:bg-[#6bb5a9] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => onBook({ checkin, checkout })}
        disabled={!checkin || !checkout || (nights > 0 && nights < currentMinStay) || hasOverlap}
      >
        {hasOverlap
          ? 'Fechas no disponibles'
          : nights > 0
            ? `${T.detail.bookBtn} · ${deposit > 0 ? `${formatPrice(deposit)}` : ''}`
            : T.detail.seeAvailability}
      </button>

      {nights > 0 && nights < currentMinStay && (
        <div className="bg-red-50 border border-red-200 p-3 rounded text-red-700 text-xs">
          {T.detail.minStayWarn} {currentMinStay} {T.common.nights}
        </div>
      )}

      <div className="text-xs text-gray-500 text-center mt-4">
        {T.detail.noCommission} {cancelDays} {T.detail.daysBefore}
      </div>
    </div>
  );
}

export default function ApartmentDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const { settings: globalSettings, loading: settingsLoading } = useSettings();
  const T = useT(lang);

  const [apt, setApt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDates, setBookingDates] = useState({ checkin: '', checkout: '' });
  const [nightsRule, setNightsRule] = useState(1);

  useEffect(() => {
    async function load() {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        const [data] = await Promise.all([
          fetchApartmentBySlug(slug),
        ]);

        if (data) {
          const [res, rules] = await Promise.all([getReservations(), fetchMinStayRules()]);
          const aptRes = res.filter(r => (r.aptSlug === slug || r.apt === slug) && r.status !== 'cancelled');
          const aptRules = rules.filter(r => r.apartment_slug === slug);

          const occupiedList = [];
          aptRes.forEach(r => {
            // Generar array de fechas segun el rango (LOCAL)
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
            descriptionEn: data.description_en,
            reviewCount: data.review_count || 0,
            gradient: 'linear-gradient(135deg, #1a5f6e 0%, #2C4A5E 100%)',
            rules: data.rules || [],
            nearby: data.nearby || [],
            occupiedDays: occupiedList,
            occupiedDatesList: occupiedList,
            rawReservations: aptRes,
            minStayRules: aptRules
          });

          try {
            const realPhotos = await fetchApartmentPhotos(slug);
            if (realPhotos && realPhotos.length > 0) {
              setPhotos(realPhotos);
            } else {
              setPhotos(getMockPhotosForApartment(slug));
            }
          } catch {
            setPhotos(getMockPhotosForApartment(slug));
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

  if (!apt) {
    return (
      <>
        <Navbar />
        <div className="py-32 px-4 text-center">
          <div className="text-4xl md:text-5xl font-serif font-bold text-navy mb-8">{T.detail.notFound}</div>
          <button className="bg-teal text-white px-8 py-3 rounded hover:bg-teal-600 transition-all font-semibold" onClick={() => navigate('/apartamentos')}>
            {T.detail.seeAll}
          </button>
        </div>
        <Footer />
      </>
    );
  }

  const aptReviews = [];
  const galleryColors = [
    apt.gradient,
    apt.gradient.replace('135deg', '160deg'),
    apt.gradient.replace('135deg', '110deg'),
    apt.gradient.replace('0%', '20%').replace('100%', '80%'),
  ];

  const aptName = lang === 'EN' ? (apt.nameEn || apt.name) : apt.name;
  const aptDesc = lang === 'EN' ? (apt.descriptionEn || apt.description) : apt.description;

  const depositPct = globalSettings.payment_deposit_percentage ?? (apt.deposit_percentage || 50);
  const cancelDays = apt.cancellation_days ?? globalSettings.cancellation_free_days ?? 14;

  return (
    <>
      <SEO
        title={aptName}
        description={aptDesc.substring(0, 160)}
      />
      <Navbar onOpenBooking={() => setBookingOpen(true)} />

      <div className="w-full">
        {/* GALERÍA */}
        <div className="grid grid-cols-4 gap-4 mb-8 max-w-7xl mx-auto px-4 py-8">
          <div className="col-span-2 row-span-2">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
              {photos[0] ? (
                <img src={photos[0].photo_url} alt={photos[0].caption || aptName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a5f6e] to-[#2C4A5E] flex items-center justify-center">
                  <Ico d={paths.photo} size={48} color="rgba(255,255,255,0.1)" />
                </div>
              )}
            </div>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
              {photos[i] ? (
                <img src={photos[i].photo_url} alt={photos[i].caption || `${aptName} ${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a5f6e] to-[#2C4A5E] flex items-center justify-center">
                  <Ico d={paths.photo} size={28} color="rgba(255,255,255,0.1)" />
                </div>
              )}
            </div>
          ))}
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
              <span>★ {apt.rating} <span className="text-gray-300">({apt.reviewCount} {T.detail.opinions})</span></span>
              <span className="text-gray-300">·</span>
              <span>Ribadeo, Galicia</span>
              <span className="text-gray-300">·</span>
              <span>{apt.cap} {T.apartments.persons}</span>
              <span className="text-gray-300">·</span>
              <span>{apt.beds} {apt.beds > 1 ? T.apartments.beds : T.apartments.bed}</span>
              <span className="text-gray-300">·</span>
              <span>{apt.baths} {apt.baths > 1 ? T.apartments.baths : T.apartments.bath}</span>
              <span className="text-gray-300">·</span>
              <span>{T.apartments.minStay} {apt.minStay} {T.apartments.nights}</span>
            </div>

            <div className="text-2xl font-serif font-bold text-navy mb-4 mt-0">{T.detail.description}</div>
            <p className="text-gray-700 leading-relaxed mb-8">{aptDesc}</p>

            <div className="text-2xl font-serif font-bold text-navy mb-4 mt-8">{T.detail.includes}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {apt.amenities.map(am => (
                <div key={am} className="flex items-center gap-3 text-sm text-gray-700">
                  <Ico d={amenityIcons[am] || paths.check} size={16} color="#1a5f6e" />
                  {lang === 'EN' ? (amenityTranslations[am] || am) : am}
                </div>
              ))}
            </div>
            <div className="text-2xl font-serif font-bold text-navy mb-4 mt-8">{T.detail.availability}</div>
            <MiniCalendar occupiedDays={apt.occupiedDays || []} T={T} />

            <div className="text-2xl font-serif font-bold text-navy mb-4 mt-8">{T.detail.rules}</div>
            <ul className="space-y-3 mb-8">
              {apt.rules.map((rule, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <Ico d={paths.check} size={14} color="#1a5f6e" />
                  {rule}
                </li>
              ))}
            </ul>

            <div className="text-2xl font-serif font-bold text-navy mb-4 mt-8">{T.detail.location}</div>
            <div className="space-y-3 mb-6">
              {apt.nearby.map((item, i) => (
                <div key={i} className="flex gap-2 text-xs text-gray-700 items-center">
                  <Ico d={paths.map} size={13} color="#64748b" />
                  {item}
                </div>
              ))}
            </div>
            <div className="border border-gray-300 rounded-lg bg-gray-50 p-12 text-center mb-8">
              <div className="text-gray-600 text-center">
                <Ico d={paths.map} size={32} color="#cbd5e1" />
                <div className="mt-2 text-xs">Ribadeo, Lugo · Galicia, España</div>
              </div>
            </div>

            {aptReviews.length > 0 && (
              <>
                <div className="text-2xl font-serif font-bold text-navy mb-4 mt-8">{T.detail.reviews}</div>
                <div className="space-y-0">
                  {aptReviews.map((r, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-5 bg-white mb-4">
                      <div className="flex gap-0.5 text-teal">{'★'.repeat(r.stars)}</div>
                      <div className="text-sm text-gray-700 leading-relaxed">"{r.text}"</div>
                      <div className="flex justify-between">
                        <div className="font-semibold text-navy">{r.name} · {r.origin}</div>
                        <div className="text-xs text-gray-300">{r.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* COLUMNA DERECHA: WIDGET */}
          <div>
            <BookingWidget apt={apt} onBook={(dates) => { setBookingDates(dates); setBookingOpen(true); }} T={T} />

            <div className="mt-4 p-5 bg-gray-50 text-xs text-gray-700 leading-relaxed rounded-lg">
              <div className="font-semibold mb-1 text-navy">{T.detail.payModel}</div>
              <div>💳 {depositPct}% {T.detail.depositNow}</div>
              {depositPct < 100 && <div>💵 {100 - depositPct}% {T.detail.cashArrival}</div>}
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
        <BookingModal apartment={apt} initialCheckin={bookingDates?.checkin} initialCheckout={bookingDates?.checkout} onClose={() => setBookingOpen(false)} />
      )}
    </>
  );
}
