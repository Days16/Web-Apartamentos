import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Ico, { paths } from '../components/Ico';
import { getReservationById, getApartmentBySlug } from '../services/dataService';
import { formatPrice, formatReservationReference } from '../utils/format';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import type { Reservation, Apartment } from '../types';

const MAX_RETRIES = 5;
const RETRY_DELAY = 1500;

export default function ReservaConfirmada() {
  const { id } = useParams();
  const { lang } = useLang();
  const T = useT(lang);
  const navigate = useNavigate();
  const [res, setRes] = useState<Reservation | null>(null);
  const [apt, setApt] = useState<Apartment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let retries = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function tryLoad() {
      try {
        const r = await getReservationById(id!);
        if (r) {
          setRes(r);
          const a = await getApartmentBySlug(r.aptSlug);
          setApt(a);
          setLoading(false);
          return;
        }
      } catch {
        /* silent */
      }

      retries++;
      if (retries < MAX_RETRIES) {
        timer = setTimeout(tryLoad, RETRY_DELAY);
      } else {
        setLoading(false);
      }
    }

    tryLoad();
    return () => clearTimeout(timer);
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!res || !apt) return;
    try {
      const { default: generateInvoice } = await import('../utils/generateInvoice');
      generateInvoice({
        id: res.id,
        source: res.source,
        guest_name: res.guest,
        guest_email: res.email,
        apartment_name: apt.name,
        apt_slug: res.aptSlug || (apt as any).slug || '',
        checkin: res.checkin,
        checkout: res.checkout,
        nights: res.nights,
        total: res.total,
        deposit: res.deposit,
      });
    } catch (_err) {
      // console.error silent
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );

  if (!res)
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-center items-center justify-center p-8 text-center">
          <div>
            <h1 className="text-3xl font-serif font-bold text-navy mb-4">{T.booking.notFound}</h1>
            <button onClick={() => navigate('/')} className="bg-teal text-white px-6 py-2 rounded">
              {T.booking.backHome}
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12 md:py-20">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-teal-600 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30">
              <Ico d={paths.check} size={40} color="#ffffff" />
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
              {T.booking.bookingConfirmed}
            </h1>
            <p className="text-teal-50 opacity-90">
              {lang === 'EN' ? 'Hello' : 'Hola'} {res.guest}, {T.booking.stayReady}
            </p>
          </div>

          <div className="p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                  {T.booking.stayDetails}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Ico d={paths.home} size={18} color="#0f172a" />
                    <div>
                      <div className="text-sm font-bold text-navy">{apt?.name}</div>
                      <div className="text-xs text-gray-500">Ribadeo, Galicia</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Ico d={paths.calendar} size={18} color="#0f172a" />
                    <div>
                      <div className="text-sm font-bold text-navy">
                        {res.checkin} — {res.checkout}
                      </div>
                      <div className="text-xs text-gray-500">
                        {res.nights} {res.nights === 1 ? T.common.night : T.common.nights}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                  {T.booking.paymentInfo}
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-500">{T.booking.totalAmount}</span>
                    <span className="font-bold text-navy">{formatPrice(res.total)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-100">
                    <span className="text-xs text-green-700">{T.booking.depositPaid}</span>
                    <span className="font-bold text-green-700">{formatPrice(res.deposit)} ✓</span>
                  </div>
                  {res.total > res.deposit && (
                    <div className="flex justify-between items-center p-3">
                      <span className="text-xs text-gray-500">{T.booking.pendingArrival}</span>
                      <span className="font-bold text-navy">
                        {formatPrice(res.total - res.deposit)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-8 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <button
                  onClick={handleDownloadPDF}
                  className="flex-1 bg-navy text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg hover:shadow-navy/20"
                >
                  <Ico d={paths.download} size={20} color="#fff" />
                  {T.booking.downloadPDF}
                </button>
                <Link
                  to="/"
                  className="flex-1 bg-white border-2 border-slate-200 text-navy px-6 py-4 rounded-xl font-bold flex items-center justify-center hover:bg-gray-50 transition-all hover:border-slate-300 text-center"
                >
                  {T.booking.backToWeb}
                </Link>
              </div>
              <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
                {T.booking.confirmationEmail}{' '}
                <strong>{formatReservationReference(res.id, res.source)}</strong>.
              </p>

              <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-2">
                <p className="text-xs text-gray-400">
                  {lang === 'EN'
                    ? 'Save this QR for quick check-in access'
                    : 'Guarda este QR para acceso rápido al portal de tu reserva'}
                </p>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(res.id)}&bgcolor=ffffff&color=0f172a&margin=10`}
                  alt={`QR ${res.id}`}
                  width={120}
                  height={120}
                  className="rounded-lg"
                />
                <p className="text-xs font-mono text-gray-300">
                  {formatReservationReference(res.id, res.source)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
