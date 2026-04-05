import { useState } from 'react';
import DatePicker from 'react-datepicker';
import { useSettings } from '../contexts/SettingsContext';
import { useLang } from '../contexts/LangContext';
import { useDiscount } from '../contexts/DiscountContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { strToDate, dateToStr } from '../utils/format';
import type { Apartment } from '../types';
import type { useT } from '../i18n/translations';

export default function BookingWidget({
  apt,
  onBook,
  T,
}: {
  apt: Apartment;
  onBook: (dates: { checkin: string; checkout: string }) => void;
  T: ReturnType<typeof useT>;
}) {
  const { settings: globalSettings } = useSettings();
  const { lang } = useLang();
  const { activeDiscount } = useDiscount();
  const { convertPrice } = useCurrency();
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [guests, setGuests] = useState(2);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  const occupiedDatesList = apt.occupiedDatesList || [];

  // Primer día ocupado DESPUÉS del checkin seleccionado → techo máximo para el checkout
  const firstBlockedNightAfterCheckin = checkin
    ? occupiedDatesList.filter(d => d > checkin).sort()[0] || null
    : null;

  // Apt > Global > Default
  const cancelDays = apt.cancellation_days ?? (typeof globalSettings.cancellation_free_days === 'number' ? globalSettings.cancellation_free_days : 14);
  const depositPct = apt.deposit_percentage ?? (typeof globalSettings.payment_deposit_percentage === 'number' ? globalSettings.payment_deposit_percentage : 50);

  // Regla dinámica de noches mínimas
  const getDynamicMinStay = () => {
    if (!checkin) return apt.minStay || 1;
    const rule = apt.minStayRules?.find(r => checkin >= r.start_date && checkin <= r.end_date);
    return rule ? rule.min_nights : apt.minStay || 1;
  };

  const currentMinStay = getDynamicMinStay();

  const calcNights = () => {
    if (!checkin || !checkout) return 0;
    const diff =
      (new Date(checkout).getTime() - new Date(checkin).getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : 0;
  };

  const nights = calcNights();

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

  const taxPct = typeof globalSettings.tax_percentage === 'number' ? globalSettings.tax_percentage : 10;

  const extra = apt.extraNight ? apt.extraNight * nights : 0;
  const subtotalWithDiscountAndExtras = subtotalWithDiscount + extra;
  const taxes = Math.round(subtotalWithDiscountAndExtras * (taxPct / 100));
  const total = subtotalWithDiscountAndExtras + taxes;
  const deposit = Math.round(total * (depositPct / 100));

  const handleDateClick = (date: Date, type: 'checkin' | 'checkout') => {
    const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dStr = dateToStr(normalized);
    const block = apt.rawReservations?.find(
      r =>
        dStr >= r.checkin && dStr < r.checkout && (r.id.startsWith('BLK-') || r.source === 'manual')
    );

    if (block) {
      setBlockReason(block.guest || 'Mantenimiento');
    } else {
      setBlockReason(null);
    }

    if (type === 'checkin') {
      setCheckin(dStr);
      setCheckout('');
    } else {
      setCheckout(dStr);
    }
  };

  const pricePerNightWithDiscount = activeDiscount
    ? Math.round(apt.price * (1 - activeDiscount.discount_percentage / 100))
    : null;

  if (globalSettings?.booking_mode === 'redirect') {
    return (
      <div className="flex flex-col gap-5 p-6 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800">
        <div>
          {pricePerNightWithDiscount ? (
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-serif font-bold text-teal">{convertPrice(pricePerNightWithDiscount)}</div>
              <div className="text-lg font-serif text-gray-400 line-through">{convertPrice(apt.price)}</div>
            </div>
          ) : (
            <div className="text-3xl font-serif font-bold text-teal">{convertPrice(apt.price)}</div>
          )}
          <div className="text-xs text-gray-500 mt-1">{T.detail.pricePerNight}</div>
          {pricePerNightWithDiscount && (
            <div className="text-xs text-green-600 font-semibold mt-0.5">
              -{activeDiscount!.discount_percentage}% {T.common.offerApplied}
            </div>
          )}
        </div>
        <div className="h-px bg-gray-100" />
        <button
          className="w-full bg-[#82c8bd] hover:bg-[#6bb5a9] text-white px-4 py-3.5 rounded font-semibold transition-all text-base"
          onClick={() => onBook({ checkin: '', checkout: '' })}
        >
          {T.nav.book}
        </button>
        <div className="text-xs text-gray-500 text-center">
          {T.detail.noCommission}{' '}
          {apt.cancellation_days ?? (typeof globalSettings.cancellation_free_days === 'number' ? globalSettings.cancellation_free_days : 14)}{' '}
          {T.detail.daysBefore}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800">
      {pricePerNightWithDiscount ? (
        <div className="flex items-baseline gap-2 mb-0">
          <div className="text-3xl font-serif font-bold text-teal">{convertPrice(pricePerNightWithDiscount)}</div>
          <div className="text-lg font-serif text-gray-400 line-through">{convertPrice(apt.price)}</div>
        </div>
      ) : (
        <div className="text-3xl font-serif font-bold text-teal mb-0">{convertPrice(apt.price)}</div>
      )}
      <div className="text-xs text-gray-600 -mt-1 mb-4">
        {T.detail.pricePerNight}
        {pricePerNightWithDiscount && (
          <span className="ml-2 text-green-600 font-semibold">· -{activeDiscount!.discount_percentage}% {T.common.offerApplied}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-0 mb-0.5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col mb-4 border-r border-gray-200 dark:border-gray-700 pr-2 min-w-0 w-full [&_.react-datepicker-wrapper]:w-full">
          <div className="text-xs font-semibold text-navy mb-2 truncate">{T.detail.checkin}</div>
          <DatePicker
            selected={strToDate(checkin)}
            onChange={(date: Date | null) => date && handleDateClick(date, 'checkin')}
            minDate={new Date()}
            excludeDates={occupiedDatesList.map(d => strToDate(d)).filter((d): d is Date => d !== null)}
            maxDate={(() => { const co = strToDate(checkout); return co ? new Date(co.getTime() - 86400000) : undefined; })()}
            dateFormat={lang === 'EN' ? 'MM/dd/yyyy' : 'dd/MM/yyyy'}
            placeholderText={lang === 'EN' ? 'mm/dd/yyyy' : 'dd/mm/yyyy'}
            className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-[#82c8bd] focus:ring-2 focus:ring-[#82c8bd]/20"
          />
        </div>
        <div className="flex flex-col mb-4 pl-2 min-w-0 w-full [&_.react-datepicker-wrapper]:w-full">
          <div className="text-xs font-semibold text-navy mb-2 truncate">{T.detail.checkout}</div>
          <DatePicker
            selected={strToDate(checkout)}
            onChange={(date: Date | null) => date && handleDateClick(date, 'checkout')}
            minDate={(() => { const ci = strToDate(checkin); return ci ? new Date(ci.getTime() + 86400000) : new Date(); })()}
            maxDate={firstBlockedNightAfterCheckin ? strToDate(firstBlockedNightAfterCheckin) ?? undefined : undefined}
            dateFormat={lang === 'EN' ? 'MM/dd/yyyy' : 'dd/MM/yyyy'}
            placeholderText={lang === 'EN' ? 'mm/dd/yyyy' : 'dd/mm/yyyy'}
            className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-[#82c8bd] focus:ring-2 focus:ring-[#82c8bd]/20"
          />
        </div>
      </div>

      {blockReason && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-3 mb-4 animate-in fade-in slide-in-from-top-1">
          <span className="text-xl">⚠️</span>
          <div className="text-xs text-amber-800 flex-1">
            <p className="font-bold">{T.detail.unavailableDates}</p>
            <p>{blockReason}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col mb-5">
        <div className="text-xs font-semibold text-navy mb-2">{T.detail.guestsLabel}</div>
        <select
          value={guests}
          onChange={e => setGuests(+e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        >
          {Array.from({ length: apt.cap }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>
              {n} {n === 1 ? T.common.person : T.common.persons}
            </option>
          ))}
        </select>
      </div>

      {nights > 0 ? (
        <>
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-4" />
          <div className="flex justify-between items-center text-sm text-gray-700">
            <span>
              {convertPrice(apt.price)} × {nights} {nights === 1 ? T.common.night : T.common.nights}
            </span>
            <strong
              className={`${discountAmount > 0 ? 'line-through opacity-60' : 'no-underline opacity-100'}`}
            >
              {convertPrice(subtotal)}
            </strong>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between items-center text-sm text-green-500 -mt-1.5">
              <span className="text-xs">
                {T.common.offerApplied} {activeDiscount?.discount_percentage}%
              </span>
              <strong>-{convertPrice(discountAmount)}</strong>
            </div>
          )}
          {extra > 0 && (
            <div className="flex justify-between items-center text-sm text-gray-700">
              <span>{T.detail.season}</span>
              <strong>{convertPrice(extra)}</strong>
            </div>
          )}
          {taxes > 0 && (
            <div className="flex justify-between items-center text-sm text-gray-700">
              <span>{T.booking.taxesLabel} ({taxPct}%)</span>
              <strong>{convertPrice(taxes)}</strong>
            </div>
          )}
          <div className="flex justify-between items-center font-bold text-navy text-base border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
            <span>{T.detail.total}</span>
            <span>{convertPrice(total)}</span>
          </div>
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-4" />
          <div className="flex justify-between text-xs text-gray-700 mb-1">
            <span>
              💳 {depositPct}% {T.detail.depositPct}
            </span>
            <strong className="text-navy">{convertPrice(deposit)}</strong>
          </div>
          <div className="flex justify-between text-xs text-gray-700 mb-4">
            <span>💵 {T.detail.cashArrival}</span>
            <strong className="text-navy">{convertPrice(total - deposit)}</strong>
          </div>
        </>
      ) : (
        <div className="h-2" />
      )}

      <button
        className="w-full bg-[#82c8bd] text-white px-4 py-3 rounded hover:bg-[#6bb5a9] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => onBook({ checkin, checkout })}
        disabled={!checkin || !checkout || (nights > 0 && nights < currentMinStay) || hasOverlap}
      >
        {hasOverlap
          ? 'Fechas no disponibles'
          : nights > 0
            ? `${T.detail.bookBtn} · ${deposit > 0 ? `${convertPrice(deposit)}` : ''}`
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
