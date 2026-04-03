import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { useToast } from '../contexts/ToastContext';
import { sendOwnerNotification } from '../services/resendService';

export default function LeaveReview() {
  const { lang } = useLang();
  const T = useT(lang);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { success, error: errorMsg } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reservation, setReservation] = useState<any>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token de reseña no válido o inexistente.');
      setLoading(false);
      return;
    }

    // Buscar la reserva por token
    supabase
      .from('reservations')
      .select('id, guest, apt, apt_slug, checkout')
      .eq('review_token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError('No hemos podido encontrar tu reserva. El enlace puede haber caducado.');
        } else {
          setReservation(data);
        }
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservation) return;

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from('reviews').insert([
        {
          reservation_id: reservation.id,
          name: reservation.guest,
          stars,
          text: comment,
          apt: reservation.apt_slug,
          active: false, // Moderación manual
        },
      ]);

      if (insertError) throw insertError;

      // Notificar al propietario por email
      try {
        await sendOwnerNotification({
          type: 'review',
          guestName: reservation.guest,
          stars,
          comment,
          apartmentName: reservation.apt,
          panelUrl: `${window.location.origin}/admin/resenas`,
        });
      } catch (notifyErr) {
        console.warn('Error al notificar al propietario:', notifyErr);
      }

      success('¡Gracias! Tu reseña ha sido enviada y será revisada pronto.');
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      console.error('Error saving review:', err);
      errorMsg('Hubo un error al enviar la reseña.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEO title={T.seo.leaveReviewTitle} description={T.seo.leaveReviewDesc} noIndex />
      <Navbar />

      <main className="flex-grow py-20 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-navy p-8 text-white text-center">
            <h1 className="text-3xl font-serif font-bold mb-2">Tu opinión nos importa</h1>
            <p className="text-gray-300">
              Gracias por elegir Illa Pancha, {reservation?.guest || 'huésped'}
            </p>
          </div>

          <div className="p-8">
            {error ? (
              <div className="text-center py-10">
                <div className="text-red-500 text-5xl mb-4">⚠️</div>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-teal text-white px-6 py-2 rounded-lg font-semibold hover:bg-teal-600 transition-colors"
                >
                  Volver al inicio
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">
                    Estancia en
                  </p>
                  <p className="text-xl font-semibold text-navy">{reservation.apt}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    ¿Cómo fue tu experiencia? (1-5 estrellas)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setStars(num)}
                        className={`text-3xl transition-transform hover:scale-120 ${
                          stars >= num ? 'text-yellow-400' : 'text-gray-200'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Comentario (opcional)
                  </label>
                  <textarea
                    id="comment"
                    rows={4}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Cuéntanos qué fue lo que más te gustó..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-teal text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-teal-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    'Enviar mi reseña'
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Tu reseña será revisada por nuestro equipo antes de ser publicada.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
