/* eslint-disable */
// @ts-nocheck
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import Ico, { paths } from '../components/Ico';
import Turnstile from '../components/Turnstile';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { submitContactMessage } from '../services/supabaseService';

export default function Reservar() {
  const { lang } = useLang();
  const C = useT(lang).reservar;
  const whatsapp = import.meta.env.VITE_WHATSAPP_PHONE || '34982000000';

  const [form, setForm] = useState({ name: '', email: '', phone: '', msg: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [captchaToken, setCaptchaToken] = useState('');

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.msg || !captchaToken) return;
    try {
      setSending(true);
      setError(null);
      await submitContactMessage(form);
      setSent(true);
    } catch (err) {
      setError(C.errorSend);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <SEO title={C.title} description={C.metaDesc || C.sub} />
      <Navbar onOpenBooking={() => {}} />

      {/* HERO */}
      <div className="py-20 md:py-28 px-4 bg-gradient-to-br from-navy to-slate-900">
        <div className="max-w-4xl mx-auto text-center text-white">
          <div className="text-sm font-semibold text-teal uppercase tracking-widest mb-4">
            Illa Pancha
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{C.hero}</h1>
          <p className="text-lg text-gray-200">{C.sub}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-16 md:py-24">
        {/* ─── CONTACTO ─────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                <Ico d={paths.mail} size={20} color="#1a5f6e" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-navy">{C.contactTitle}</h2>
            </div>
            <p className="text-sm text-gray-500 mt-2">{C.contactDesc}</p>
          </div>

          <div className="p-8">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Ico d={paths.check} size={26} color="#16a34a" />
                </div>
                <div className="text-2xl font-serif font-bold text-navy mb-2">{C.sentTitle}</div>
                <p className="text-gray-500 text-sm">{C.sentDesc}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      {C.nameLbl} *
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                      placeholder="María García"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      {C.emailLbl} *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                      placeholder="maria@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {C.phoneLbl}
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                    placeholder="600 000 000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {C.msgLbl} *
                  </label>
                  <textarea
                    name="msg"
                    value={form.msg}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal resize-none"
                    placeholder={C.msgPlaceholder}
                  />
                </div>

                <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={sending || !captchaToken}
                  className="w-full bg-teal text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition-all disabled:opacity-50"
                >
                  {sending ? C.sending : C.send}
                </button>
              </form>
            )}

            {/* WhatsApp directo */}
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-4 border border-[#25D366] text-[#25D366] rounded-xl py-3 font-semibold text-sm hover:bg-[#25D366] hover:text-white transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {C.whatsappLabel}
            </a>

            <div className="mt-4 text-center">
              <Link to="/contacto" className="text-xs text-teal hover:underline">
                {C.backContact}
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
