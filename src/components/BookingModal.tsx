import { useState, useEffect, useRef } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import Turnstile from './Turnstile';
import Ico, { paths } from './Ico';
import { supabase } from '../lib/supabase';
import { createPaymentIntent, confirmPayment } from '../lib/stripe';
import { sendBookingConfirmation, sendOwnerNotification } from '../services/resendService';
import { fetchExtras, fetchSettings } from '../services/supabaseService';
import { useDiscount } from '../contexts/DiscountContext';
import { useLang } from '../contexts/LangContext';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../i18n/translations';
import { useNavigate } from 'react-router-dom';
import { formatPrice, strToDate, dateToStr } from '../utils/format';
import { getReservations } from '../services/dataService';
import { trackEvent, EVENTS } from '../utils/analytics';
import type { Apartment, Extra } from '../types';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function BookingModal({
  onClose,
  apartment,
  initialCheckin,
  initialCheckout,
}: {
  onClose: () => void;
  apartment?: Apartment;
  initialCheckin?: string;
  initialCheckout?: string;
}) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const T = useT(lang);
  const { dark } = useTheme();
  if (!apartment) return null;
  const apt = apartment;
  const stripe = useStripe();
  const elements = useElements();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', phone: '', phonePrefix: '+34' });
  const [checkinDate, setCheckinDate] = useState(
    initialCheckin ? strToDate(initialCheckin) : new Date(Date.now() + 86400000)
  );
  const [checkoutDate, setCheckoutDate] = useState(
    initialCheckout ? strToDate(initialCheckout) : new Date(Date.now() + 86400000 * 3)
  );
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const [confirmedId, setConfirmedId] = useState('');
  const [allExtras, setAllExtras] = useState<Extra[]>([]);
  const [occupiedDates, setOccupiedDates] = useState<string[]>([]);
  const [globalSettings, setGlobalSettings] = useState<Record<string, unknown>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const DRAFT_KEY = `booking_draft_${apt.slug}`;

  // Restore saved draft from sessionStorage after payment error
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as {
          form?: typeof form;
          checkin?: string;
          checkout?: string;
          extras?: string[];
        };
        if (draft.form) setForm(draft.form);
        if (draft.checkin && !isNaN(new Date(draft.checkin).getTime())) {
          setCheckinDate(new Date(draft.checkin));
        }
        if (draft.checkout && !isNaN(new Date(draft.checkout).getTime())) {
          setCheckoutDate(new Date(draft.checkout));
        }
        if (draft.extras) setSelectedExtras(draft.extras);
      }
    } catch {
      /* silent */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== 2) setCaptchaToken('');
  }, [step]);

  // Load extras from Supabase
  useEffect(() => {
    Promise.all([fetchExtras(), fetchSettings(), getReservations()])
      .then(([extras, settings, resData]) => {
        setAllExtras(extras);
        setGlobalSettings(settings);

        // Calculate occupied dates for this apartment
        const relevantRes = resData.filter(
          r => r.aptSlug === apt.slug && r.status !== 'cancelled'
        );
        const list: string[] = [];
        relevantRes.forEach(r => {
          const start = new Date(r.checkin + 'T00:00:00');
          const end = new Date(r.checkout + 'T00:00:00');
          for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
            list.push(dateToStr(d));
          }
        });
        setOccupiedDates(list);
      })
      .catch(err => {
        console.error('Error loading booking data:', err);
      });
  }, [apt.slug]);

  const steps = T.booking.steps;

  // Calculate nights dynamically
  const calculateNights = () => {
    if (!checkinDate || !checkoutDate) return 0;
    const diffTime = Math.abs(checkoutDate.getTime() - checkinDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const { activeDiscount } = useDiscount();
  const nights = calculateNights();

  // Minimum stay: date-based rule > apartment minimum > 1
  const effectiveMinStay = (() => {
    if (!checkinDate) return apt.minStay || 1;
    const checkinStr = dateToStr(checkinDate);
    const rule = (apt.minStayRules || []).find(
      r => checkinStr >= r.start_date && checkinStr <= r.end_date
    );
    return rule ? rule.min_nights : apt.minStay || 1;
  })();
  const belowMinStay = nights > 0 && nights < effectiveMinStay;

  const taxPct =
    typeof globalSettings.tax_percentage === 'number' ? globalSettings.tax_percentage : 10;
  const subtotal = apt.price * nights;

  let discountAmount = 0;
  if (activeDiscount) {
    discountAmount = Math.round(subtotal * (activeDiscount.discount_percentage / 100));
  }
  const subtotalWithDiscount = subtotal - discountAmount;

  const activeExtras = allExtras.filter(e => e.active);

  const extrasTotal = selectedExtras.reduce((sum, id) => {
    const extra = activeExtras.find(e => e.id === id);
    return sum + (extra ? extra.price : 0);
  }, 0);

  const subtotalWithDiscountAndExtras = subtotalWithDiscount + extrasTotal;
  const taxes = Math.round(subtotalWithDiscountAndExtras * (taxPct / 100));
  const total = subtotalWithDiscountAndExtras + taxes;

  // Global preferences > Apt > Default
  // Apt > Global > Default
  const cancelDays =
    apt.cancellation_days ??
    (typeof globalSettings.cancellation_days === 'number' ? globalSettings.cancellation_days : 14);
  const depositPct =
    apt.deposit_percentage ??
    (typeof globalSettings.payment_deposit_percentage === 'number'
      ? globalSettings.payment_deposit_percentage
      : 50);

  const deposit = Math.round(total * (depositPct / 100));

  // Format dates for display
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return new Intl.DateTimeFormat(lang === 'ES' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const checkin = formatDate(checkinDate);
  const checkout = formatDate(checkoutDate);

  // Overlap validation
  const checkHasOverlap = () => {
    if (!checkinDate || !checkoutDate || !occupiedDates.length) return false;
    const dIn = new Date(checkinDate);
    const dOut = new Date(checkoutDate);
    for (let d = new Date(dIn); d < dOut; d.setDate(d.getDate() + 1)) {
      if (occupiedDates.includes(dateToStr(d))) return true;
    }
    return false;
  };
  const hasOverlap = checkHasOverlap();

  const toggleExtra = (id: string) => {
    setSelectedExtras(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handlePayment = async () => {
    if (!checkinDate || !checkoutDate) {
      setStripeError(T.booking.errorDates);
      return;
    }

    if (!form.name || !form.email || !form.phone) {
      setStripeError(T.booking.errorData);
      return;
    }

    if (!stripe || !elements) {
      setStripeError(T.booking.errorStripe);
      return;
    }

    if (!captchaToken?.trim()) {
      setStripeError(T.booking.errorCaptcha);
      return;
    }

    setLoading(true);
    setStripeError('');

    try {
      // Real-time availability check before payment
      const checkinStr = dateToStr(checkinDate!);
      const checkoutStr = dateToStr(checkoutDate!);
      const { data: overlap } = await supabase
        .from('reservations')
        .select('id')
        .eq('apt_slug', apt.slug)
        .neq('status', 'cancelled')
        .lt('checkin', checkoutStr)
        .gt('checkout', checkinStr)
        .limit(1);

      if (overlap && overlap.length > 0) {
        setStripeError(
          lang === 'ES'
            ? 'Lo sentimos, esas fechas acaban de ser reservadas. Por favor elige otras.'
            : 'Sorry, those dates were just booked. Please select different dates.'
        );
        setLoading(false);
        return;
      }

      // Create reservation ID (cryptographically secure)
      const reservationId =
        'IP-' + ((crypto.getRandomValues(new Uint32Array(1))[0] % 900000) + 100000);

      // 1. Create PaymentIntent in Edge Function
      const paymentData = await createPaymentIntent({
        amount: deposit,
        currency: 'eur',
        customerEmail: form.email,
        customerName: form.name,
        reservationId: reservationId,
        description: `${apartment?.name || 'Apt. Cantábrico'} - ${nights} noches`,
        turnstileToken: captchaToken,
      });

      // 2. Confirm payment with Stripe Elements
      const paymentResult = await confirmPayment(stripe, elements, paymentData.clientSecret);

      if (!paymentResult.success) {
        throw new Error('Error en confirmación de pago');
      }

      // 3. Create reservation record in Supabase
      const { error: insertError } = await supabase.from('reservations').insert([
        {
          id: reservationId,
          guest: form.name,
          email: form.email,
          phone: form.phone ? `${form.phonePrefix} ${form.phone}` : '',
          apt: apartment?.name || '',
          apt_slug: apartment?.slug || '',
          checkin: dateToStr(checkinDate),
          checkout: dateToStr(checkoutDate),
          nights: nights,
          total: total,
          deposit: deposit,
          extras: selectedExtras,
          status: 'confirmed',
          source: 'web',
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) throw insertError;

      // 4. Send confirmation email with Resend
      try {
        await sendBookingConfirmation({
          guestEmail: form.email,
          guestName: form.name,
          apartmentName: apartment?.name || 'Apt. Cantábrico',
          checkin: dateToStr(checkinDate),
          checkout: dateToStr(checkoutDate),
          nights: nights,
          total: total,
          deposit: deposit,
          id: reservationId,
        });
      } catch (emailError) {
        console.warn('Email envío fallido pero reserva creada:', emailError);
      }

      // 4b. Notify owner (silent, non-blocking)
      sendOwnerNotification({
        type: 'booking',
        reservationId,
        guestName: form.name,
        guestEmail: form.email,
        apartmentName: apartment?.name || 'Apt. Cantábrico',
        checkin: dateToStr(checkinDate),
        checkout: dateToStr(checkoutDate),
        nights,
        total,
        deposit,
      });

      // 5. Generate invoice PDF
      try {
        const { default: generateInvoice } = await import('../utils/generateInvoice');
        generateInvoice({
          id: reservationId,
          guest_name: form.name,
          guest_email: form.email,
          apartment_name: apartment?.name || 'Apt. Cantábrico',
          apt_slug: apartment?.slug || '',
          checkin: checkin,
          checkout: checkout,
          nights: nights,
          total: total,
          deposit: deposit,
        });
      } catch (pdfError) {
        console.warn('PDF generación fallida:', pdfError);
      }

      setConfirmedId(reservationId);
      sessionStorage.removeItem(DRAFT_KEY);
      trackEvent(EVENTS.BOOKING_COMPLETE, { apartment: apt.slug, nights: calculateNights() });
      setTimeout(() => {
        onClose();
        navigate(`/reserva-confirmada/${reservationId}`);
      }, 1500);
    } catch (err: unknown) {
      // Save draft so user does not lose their data
      try {
        sessionStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            form,
            checkin: checkinDate?.toISOString(),
            checkout: checkoutDate?.toISOString(),
            extras: selectedExtras,
          })
        );
      } catch {
        /* silent */
      }
      setStripeError((err as Error).message || T.booking.errorPayment);
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    panel.addEventListener('keydown', handleTab);
    return () => panel.removeEventListener('keydown', handleTab);
  }, [step]);

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        className="bg-white dark:bg-slate-900 dark:border dark:border-slate-700 rounded-lg overflow-hidden flex max-w-5xl w-full max-h-[90vh]"
      >
        {/* LEFT PANEL */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-900 text-white flex-1 p-8 flex flex-col justify-between">
          <div className="flex flex-col gap-3 mb-12 pb-8 border-b border-white/20">
            {steps.map((s, i) => (
              <span
                key={i}
                className={`text-xs opacity-50 hover:opacity-75 transition-opacity ${step >= i ? 'opacity-100 font-semibold text-cyan-300' : ''}`}
              >
                {String(i + 1).padStart(2, '0')} {s}
              </span>
            ))}
          </div>

          <div className="text-4xl font-serif font-bold text-white mb-4">
            {[T.booking.title1, T.booking.title2, T.booking.title3, T.booking.title4][step]}
          </div>
          <div className="text-sm text-gray-300 mb-8">
            {step < 3
              ? `${apt.name} · ${checkin} – ${checkout} · 2 ${T.booking.guests}`
              : T.booking.emailSent}
          </div>

          {step < 3 && (
            <>
              <div className="flex justify-between items-center text-sm py-2 border-b border-white/10 px-0">
                <span className="text-white/55">
                  {nights} {nights === 1 ? T.common.night : T.common.nights} ×{' '}
                  {formatPrice(apt.price)}
                </span>
                <span className={discountAmount > 0 ? 'line-through opacity-60' : ''}>
                  {formatPrice(subtotal)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-sm py-2 border-b border-white/10 px-0 text-green-500 -mt-2 mb-2">
                  <span className="text-xs">
                    {T.common.offerApplied}: {activeDiscount?.code || 'Promo'} (-
                    {activeDiscount?.discount_percentage}%)
                  </span>
                  <span className="font-semibold">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              {extrasTotal > 0 && (
                <div className="flex justify-between items-center text-sm py-2 border-b border-white/10 px-0">
                  <span className="text-white/55">
                    {T.booking.extrasLabel} ({selectedExtras.length})
                  </span>
                  <span>{formatPrice(extrasTotal)}</span>
                </div>
              )}
              {taxes > 0 && (
                <div className="flex justify-between items-center text-sm py-2 border-b border-white/10 px-0">
                  <span className="text-white/55">
                    {T.booking.taxesLabel} ({taxPct}%)
                  </span>
                  <span>{formatPrice(taxes)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm py-3 border-b-2 border-cyan-400 px-0">
                <span className="font-serif text-lg">Total</span>
                <strong className="font-serif text-xl">{formatPrice(total)}</strong>
              </div>
              <div className="bg-white/10 rounded-lg p-4 mt-6 border border-white/20">
                <div className="text-xs font-bold tracking-widest uppercase text-cyan-300 mb-3">
                  {T.booking.payModel}
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">
                    💳 {T.booking.cardNow} ({depositPct}%)
                  </span>
                  <span className="font-semibold">{formatPrice(deposit)}</span>
                </div>
                {depositPct < 100 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">
                      💵 {T.booking.cashArrival} ({100 - depositPct}%)
                    </span>
                    <span className="font-semibold">{formatPrice(total - deposit)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <div className="mt-6">
              {[
                [T.booking.ref, confirmedId],
                [T.booking.apartment, apt.name],
                [T.booking.checkin, checkin],
                [T.booking.checkout, checkout],
                [T.booking.deposited, `${deposit} € ✓`],
                ...(depositPct < 100 ? [[T.booking.cashRest, `${total - deposit} €`]] : []),
                ...(selectedExtras.length > 0
                  ? [
                      [
                        T.booking.extrasLabel,
                        `${selectedExtras.length} ${selectedExtras.length > 1 ? T.booking.extrasSelected : T.booking.extraSelected}`,
                      ],
                    ]
                  : []),
              ].map(([k, v], i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-sm py-2 border-b border-white/10 px-0"
                >
                  <span className="text-white/55 text-xs">{k}</span>
                  <span className="text-sm">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 p-8 overflow-y-auto bg-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-6 bg-transparent border-0 cursor-pointer text-slate-500"
          >
            <Ico d={paths.close} size={20} />
          </button>

          {/* STEP 0: DATA (formerly step 1) */}
          {step === 0 && (
            <>
              <div className="font-serif text-2xl font-light text-slate-900 mb-8">
                {T.booking.title1}
              </div>
              <label
                htmlFor="booking-name"
                className="block text-xs font-semibold text-slate-900 mb-2"
              >
                {T.booking.fullName}
              </label>
              <input
                id="booking-name"
                className={`w-full px-3 py-2 border rounded text-sm text-slate-900 focus:outline-none focus:border-[#82c8bd] focus:ring-2 focus:ring-[#82c8bd]/20 ${showErrors && !form.name.trim() ? 'border-[#f44]' : 'border-gray-300'}`}
                placeholder={T.booking.placeholderName}
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
              <label
                htmlFor="booking-email"
                className="block text-xs font-semibold text-slate-900 mb-2 mt-4"
              >
                {T.booking.email}
              </label>
              <input
                id="booking-email"
                className={`w-full px-3 py-2 border rounded text-sm text-slate-900 focus:outline-none focus:border-[#82c8bd] focus:ring-2 focus:ring-[#82c8bd]/20 ${showErrors && !isValidEmail(form.email) ? 'border-[#f44]' : 'border-gray-300'}`}
                placeholder={T.booking.placeholderEmail}
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
              <label
                htmlFor="booking-phone"
                className="block text-xs font-semibold text-slate-900 mb-2 mt-4"
              >
                {T.booking.phone}
              </label>
              <div
                className={`flex border rounded overflow-hidden focus-within:border-[#82c8bd] focus-within:ring-2 focus-within:ring-[#82c8bd]/20 ${showErrors && !form.phone.trim() ? 'border-[#f44]' : 'border-gray-300'}`}
              >
                <select
                  id="booking-phone-prefix"
                  className="bg-gray-50 border-r border-gray-300 text-sm text-slate-700 px-2 py-2 focus:outline-none cursor-pointer"
                  value={form.phonePrefix}
                  onChange={e => setForm(p => ({ ...p, phonePrefix: e.target.value }))}
                >
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+351">🇵🇹 +351</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+39">🇮🇹 +39</option>
                  <option value="+31">🇳🇱 +31</option>
                  <option value="+32">🇧🇪 +32</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+55">🇧🇷 +55</option>
                </select>
                <input
                  id="booking-phone"
                  className="flex-1 px-3 py-2 text-sm text-slate-900 focus:outline-none bg-white"
                  placeholder={T.booking.placeholderPhone}
                  value={form.phone}
                  type="tel"
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="text-xs text-slate-600 leading-relaxed mb-4">
                {T.booking.cancelFree.replace('{days}', String(cancelDays))}
              </div>

              <label className="flex items-start gap-2 text-sm text-slate-800 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 text-[#82c8bd] rounded border-gray-300 focus:ring-teal-500"
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                />
                <span>
                  {T.booking.termsText}{' '}
                  <a
                    href="/terminos"
                    target="_blank"
                    className="text-[#82c8bd] underline font-semibold"
                  >
                    {T.booking.terms}
                  </a>{' '}
                  {T.booking.termsAnd}{' '}
                  <a
                    href="/privacidad"
                    target="_blank"
                    className="text-[#82c8bd] underline font-semibold"
                  >
                    {T.booking.privacy}
                  </a>
                  .
                </span>
              </label>

              <div className="flex gap-2">
                {hasOverlap && (
                  <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded text-xs mb-4">
                    {lang === 'ES'
                      ? 'Las fechas seleccionadas tienen días ya ocupados en medio.'
                      : 'The selected dates have occupied days in between.'}
                  </div>
                )}
                {belowMinStay && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded text-xs mb-4">
                    {lang === 'ES'
                      ? `Estancia mínima: ${effectiveMinStay} noches.`
                      : `Minimum stay: ${effectiveMinStay} nights.`}
                  </div>
                )}

                <button
                  className={`bg-[#82c8bd] text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#6bb5a9] transition-all flex-[2] disabled:opacity-50 disabled:cursor-not-allowed ${!form.name.trim() || !isValidEmail(form.email) || !form.phone.trim() || !acceptedTerms || hasOverlap || belowMinStay ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer'}`}
                  onClick={() => {
                    setShowErrors(true);
                    trackEvent(EVENTS.BOOKING_START, { apartment: apt.slug });
                    setStep(1);
                  }}
                  disabled={
                    !form.name.trim() ||
                    !isValidEmail(form.email) ||
                    !form.phone.trim() ||
                    !acceptedTerms ||
                    hasOverlap ||
                    belowMinStay
                  }
                >
                  {T.booking.continueExtras}
                </button>
              </div>
            </>
          )}

          {/* STEP 1: EXTRAS */}
          {step === 1 && (
            <>
              <div className="font-serif text-2xl font-light text-slate-900 mb-2">
                {T.booking.optionalExtras}
              </div>
              <div className="text-sm text-slate-600 mb-6">{T.booking.extrasDesc}</div>

              {activeExtras.length === 0 ? (
                <div className="text-sm text-slate-600 py-5">{T.booking.noExtras}</div>
              ) : (
                <div className="space-y-3 mb-6">
                  {activeExtras.map(extra => {
                    const isSelected = selectedExtras.includes(extra.id);
                    return (
                      <div
                        key={extra.id}
                        className={`border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-[#82c8bd] hover:bg-[#82c8bd]/5 transition-all flex justify-between items-start ${isSelected ? 'border-[#82c8bd] bg-[#82c8bd]/5' : ''}`}
                        onClick={() => toggleExtra(extra.id)}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">
                            {extra[`name_${lang}`] || extra.name}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {extra[`description_${lang}`] || extra.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm font-semibold ${extra.price === 0 ? 'text-green-600 font-bold' : 'text-[#82c8bd]'}`}
                          >
                            {extra.price === 0 ? T.booking.free : `${extra.price} €`}
                          </span>
                          <div
                            className={`w-5 h-5 border-2 border-[#82c8bd] rounded-full flex items-center justify-center ${isSelected ? 'bg-[#82c8bd]' : ''}`}
                          >
                            {isSelected && (
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  className="border border-gray-300 text-slate-900 px-4 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all flex-1"
                  onClick={() => setStep(0)}
                >
                  {T.booking.back}
                </button>
                <button
                  className="bg-[#82c8bd] text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#6bb5a9] transition-all flex-[2]"
                  onClick={() => setStep(2)}
                >
                  {T.booking.continuePayment} ({deposit} €)
                </button>
              </div>
            </>
          )}

          {/* STEP 2: PAYMENT */}
          {step === 2 && (
            <>
              <div className="font-serif text-2xl font-light text-slate-900 mb-2">
                {T.booking.title3}
              </div>
              <div className="text-xs text-gray-600 mb-8 flex items-center gap-1.5">
                <Ico d={paths.lock} size={13} color="#8a8a8a" />
                {T.booking.secureProcessed}
              </div>

              {/* Payment information */}
              <div className="bg-gray-100 p-4 rounded-lg mb-6 border border-gray-300">
                <div className="text-xs font-semibold text-slate-900 mb-3">
                  💳 {T.booking.cardNow} del {depositPct}%
                </div>
                <div className="text-2xl font-bold text-[#82c8bd]">{deposit} €</div>
                <div className="text-xs text-slate-600 mt-2">
                  {depositPct < 100
                    ? `${100 - depositPct}% ${T.booking.cashRest}`
                    : T.booking.paidFull}
                </div>
              </div>

              {/* CardElement de Stripe */}
              <div className="mb-6">
                <label className="text-xs font-bold tracking-widest uppercase text-gray-600 mb-2 block">
                  {T.booking.cardData}
                </label>
                <div className="border border-gray-300 dark:border-slate-600 p-3.5 rounded bg-gray-50 dark:bg-slate-800">
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          fontFamily: 'Jost, sans-serif',
                          color: dark ? '#f1f5f9' : '#0f172a',
                          '::placeholder': { color: '#b0b0b0' },
                        },
                        invalid: { color: '#dc3545' },
                      },
                    }}
                  />
                </div>
                {import.meta.env.DEV && (
                  <div className="text-xs text-gray-600 mt-2 leading-relaxed">
                    {T.booking.testCard}
                  </div>
                )}
              </div>

              <Turnstile
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken('')}
                theme={dark ? 'dark' : 'light'}
              />

              {stripeError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
                  {stripeError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  className="border border-gray-300 text-slate-900 px-4 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all flex-1"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  {T.booking.back}
                </button>
                <button
                  className="bg-[#82c8bd] text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#6bb5a9] transition-all flex-[2] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlePayment}
                  disabled={loading || !stripe || !elements || hasOverlap || !captchaToken?.trim()}
                >
                  {loading ? T.booking.processing : `${T.booking.payConfirm} ${deposit} €`}
                </button>
              </div>
              <div className="text-xs text-gray-400 text-center mt-4">{T.booking.cardNote}</div>
            </>
          )}

          {/* STEP 3: CONFIRMED */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Ico d={paths.check} size={32} color="#ffffff" />
              </div>
              <div className="font-serif text-4xl font-light text-slate-900 mb-3">
                {T.booking.bookingConfirmed}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-8">
                {T.booking.confirmText} <strong>{total - deposit} €</strong> {T.booking.confirmCash}
              </p>
              <button
                className="border border-gray-300 text-slate-900 px-4 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all w-full"
                onClick={onClose}
              >
                {T.booking.backHome}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
