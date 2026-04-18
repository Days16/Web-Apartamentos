import { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import type { DbApartment } from '../types';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookingModal from '../components/BookingModal';
import Ico, { paths } from '../components/Ico';
import SEO from '../components/SEO';
import Turnstile from '../components/Turnstile';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { useSettings } from '../contexts/SettingsContext';
import { fetchApartments } from '../services/supabaseService';
import { sendOwnerNotification } from '../services/resendService';
import { safeHtml } from '../utils/sanitize';
import { supabase } from '../lib/supabase';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', apt: '', msg: '' });
  const [sent, setSent] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [apartmentsList, setApartmentsList] = useState<DbApartment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');

  useEffect(() => {
    fetchApartments().then(setApartmentsList);
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!captchaToken) {
      alert('Por favor completa la verificación de seguridad.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('submit-contact', {
        body: { ...form, turnstileToken: captchaToken },
      });
      if (error) throw error;
      setSent(true);
      // Notify owner (silent, non-blocking)
      sendOwnerNotification({
        type: 'contact',
        guestName: form.name,
        guestEmail: form.email,
        guestPhone: form.phone,
        subject: form.apt ? `Consulta sobre ${form.apt}` : 'Consulta general',
        message: form.msg,
      });
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      alert('Hubo un error al enviar tu mensaje. Inténtalo de nuevo.');
      setCaptchaToken(''); // resetear para que el widget se renueve
    } finally {
      setSubmitting(false);
    }
  };

  const up = (field: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [field]: e.target.value }));

  const { lang } = useLang();
  const T = useT(lang);
  const C = T.contact;
  const { settings } = useSettings();
  const sitePhone = (settings?.site_phone as string) || '';
  const waPhone = sitePhone.replace(/\D/g, '');
  const siteUrl = (
    import.meta.env.VITE_SITE_URL || 'https://www.apartamentosillapancha.com'
  ).replace(/\/$/, '');

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: 'Illa Pancha',
    url: siteUrl,
    telephone: settings?.contact_phone || '+34 614 52 30 77',
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings?.property_address || 'Av. Rosalía de Castro 25',
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
    openingHours: 'Mo-Su 09:00-21:00',
    priceRange: '€€',
  };

  return (
    <>
      <SEO title={C.title} description={C.desc} jsonLd={localBusinessJsonLd} />
      <Navbar onOpenBooking={() => setBookingOpen(true)} />

      {/* HERO */}
      <div className="py-20 md:py-28 px-4 bg-gradient-to-br from-navy to-navy-dark">
        <div className="max-w-4xl mx-auto text-center text-white">
          <div className="text-sm font-semibold text-teal uppercase tracking-widest mb-4">
            {C.heroEyebrow}
          </div>
          <h1
            className="text-4xl md:text-5xl font-serif font-bold mb-6"
            dangerouslySetInnerHTML={safeHtml(C.heroTitle)}
          />
          <p className="text-lg text-gray-100">{C.heroDesc}</p>
        </div>
      </div>

      {/* FORM + INFO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 py-20 px-4 max-w-6xl mx-auto">
        {/* FORM */}
        <div>
          {sent ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Ico d={paths.check} size={28} color="#1a5f6e" />
              </div>
              <div className="text-4xl font-serif font-light text-navy mb-3">{C.sentTitle}</div>
              <p
                className="text-sm text-gray-600 leading-relaxed mb-7"
                dangerouslySetInnerHTML={safeHtml(
                  C.sentDesc.replace('{email}', `<strong>${form.email}</strong>`)
                )}
              />
              <button
                className="border-2 border-navy text-navy hover:bg-navy hover:text-white px-6 py-3 rounded transition-all"
                onClick={() => {
                  setSent(false);
                  setForm({ name: '', email: '', phone: '', apt: '', msg: '' });
                }}
              >
                {C.sendAnother}
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-serif font-bold text-navy mb-2">{C.formTitle}</h2>
              <p className="text-gray-600 mb-8">{C.formSub}</p>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="text-sm font-semibold text-navy block mb-2"
                    >
                      {C.labelName}
                    </label>
                    <input
                      id="contact-name"
                      className="w-full px-4 py-3 border border-gray-300 rounded bg-white text-navy text-base focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all"
                      placeholder={C.placeholderName}
                      value={form.name}
                      onChange={up('name')}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="text-sm font-semibold text-navy block mb-2"
                    >
                      {C.labelEmail}
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      className="w-full px-4 py-3 border border-gray-300 rounded bg-white text-navy text-base focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all"
                      placeholder={C.placeholderEmail}
                      value={form.email}
                      onChange={up('email')}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label
                      htmlFor="contact-phone"
                      className="text-sm font-semibold text-navy block mb-2"
                    >
                      {C.labelPhone}
                    </label>
                    <input
                      id="contact-phone"
                      className="w-full px-4 py-3 border border-gray-300 rounded bg-white text-navy text-base focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all"
                      placeholder={C.placeholderPhone}
                      value={form.phone}
                      onChange={up('phone')}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-apt"
                      className="text-sm font-semibold text-navy block mb-2"
                    >
                      {C.labelApt}
                    </label>
                    <select
                      id="contact-apt"
                      className="w-full px-4 py-3 border border-gray-300 rounded bg-white text-navy text-base cursor-pointer focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all"
                      value={form.apt}
                      onChange={up('apt')}
                    >
                      <option value="">{C.noPref}</option>
                      {apartmentsList.map(a => (
                        <option key={a.slug} value={a.slug}>
                          {lang === 'EN' ? a.name_en || a.name : a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-5">
                  <label
                    htmlFor="contact-msg"
                    className="text-sm font-semibold text-navy block mb-2"
                  >
                    {C.labelMsg}
                  </label>
                  <textarea
                    id="contact-msg"
                    className="w-full px-4 py-3 border border-gray-300 rounded bg-white text-navy text-base focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all"
                    placeholder={C.placeholderMsg}
                    rows={5}
                    value={form.msg}
                    onChange={up('msg')}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="text-xs text-gray-500 leading-relaxed mb-2">{C.privacy}</div>

                <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />

                <button
                  type="submit"
                  className="w-full bg-teal text-white px-6 py-3 rounded hover:bg-teal-600 transition-all font-semibold text-sm disabled:opacity-70"
                  disabled={submitting || !captchaToken}
                >
                  {submitting ? C.submitting : C.sendMsg}
                </button>
              </form>
            </>
          )}
        </div>

        {/* INFO */}
        <div>
          <h3 className="text-3xl font-serif font-bold text-navy mb-8">{C.infoTitle}</h3>

          <div className="flex gap-4 mb-8 pb-8 border-b border-gray-200">
            <Ico d={paths.phone} size={18} color="#7dd3fc" />
            <div>
              <div className="text-sm font-semibold text-navy">{T.booking.phone}</div>
              <div className="text-lg font-semibold text-teal">
                {sitePhone || '+34 982 XXX XXX'}
              </div>
              <div className="text-xs text-gray-500 mt-1">{C.hours}</div>
            </div>
          </div>

          <div className="flex gap-4 mb-8 pb-8 border-b border-gray-200">
            <Ico d={paths.mail} size={18} color="#7dd3fc" />
            <div>
              <div className="text-sm font-semibold text-navy">{T.booking.email}</div>
              <div className="text-lg font-semibold text-teal">info@apartamentosillapancha.com</div>
              <div className="text-xs text-gray-500 mt-1">{C.response}</div>
            </div>
          </div>

          <div className="flex gap-4">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="#25D366"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0 mt-1"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-navy">{C.waLabel}</div>
              <a
                href={
                  waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(C.waMsg)}` : '#'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-teal hover:text-teal-700 transition-colors block"
              >
                {sitePhone || '+34 982 XXX XXX'}
              </a>
              <div className="text-xs text-gray-500 mt-1">{C.immediateResponse}</div>
            </div>
          </div>

          <div className="flex gap-4 mb-8 pb-8 border-b border-gray-200">
            <Ico d={paths.map} size={18} color="#7dd3fc" />
            <div>
              <div className="text-sm font-semibold text-navy">{T.detail.location}</div>
              <div className="text-lg font-semibold text-gray-700">{C.address}</div>
            </div>
          </div>

          <div className="mt-10 p-6 bg-teal/10 dark:bg-teal/5 rounded-xl border border-teal/20 dark:border-teal/10">
            <div className="font-serif text-xl text-navy mb-4 font-bold">
              {C.checkinCheckoutTitle}
            </div>
            <div className="flex justify-between py-3 border-b border-teal/10 text-sm">
              <span className="text-gray-600 font-medium">{T.booking.checkin}</span>
              <span className="text-navy font-semibold">{C.checkinTime}</span>
            </div>
            <div className="flex justify-between py-3 text-sm">
              <span className="text-gray-600 font-medium">{T.booking.checkout}</span>
              <span className="text-navy font-semibold">{C.checkoutTime}</span>
            </div>
          </div>

          <div className="mt-8 rounded-xl h-48 overflow-hidden relative border border-slate-200">
            <iframe
              src="https://maps.google.com/maps?q=43.5399657,-7.0410569&z=16&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0, display: 'block' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación Illa Pancha Ribadeo"
            />
            <a
              href="https://www.google.com/maps/place/Av.+de+Rosal%C3%ADa+de+Castro,+25,+27700+Ribadeo,+Lugo/@43.5397524,-7.0411052,199m/data=!3m1!1e3!4m6!3m5!1s0xd317e5724d77fed:0x5b60c517683c15a5!8m2!3d43.5399657!4d-7.0410569!16s%2Fg%2F11c19xgmd5?entry=ttu&g_ep=EgoyMDI2MDMxNS4wIKXMDSoASAFQAw%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-navy text-xs font-semibold px-3 py-1.5 rounded-full shadow hover:bg-teal hover:text-white transition-colors"
            >
              {T.common.openMaps}
            </a>
          </div>
        </div>
      </div>

      <Footer />
      {bookingOpen && <BookingModal onClose={() => setBookingOpen(false)} />}
    </>
  );
}
