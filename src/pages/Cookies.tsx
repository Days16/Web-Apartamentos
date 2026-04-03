import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';

export default function Cookies() {
  const { lang } = useLang();
  const T = useT(lang);
  const L = T.legal;

  return (
    <>
      <SEO title={L.cookiesTitle} description={L.cookiesDesc} />
      <Navbar />
      <div className="w-full min-h-screen bg-white">
        <div className="grid place-items-center py-12 px-4 bg-gray-50 border-b border-gray-200">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">
            {L.docs}
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-navy mb-6">
            {L.cookiesTitle}
          </h1>
          <p className="text-xs text-gray-500 mt-2">{L.lastUpdate}</p>
        </div>
        <div className="policy-content max-w-3xl mx-auto px-4 py-12">
          <p>
            Esta política explica qué son las cookies, qué tipos utilizamos en{' '}
            <strong>illapancha.com</strong> y cómo puedes gestionarlas, de conformidad con el
            artículo 22.2 de la Ley 34/2002 (LSSI) y la Guía sobre el uso de las cookies de la AEPD.
          </p>

          <h2>1. ¿Qué es una cookie?</h2>
          <p>
            Una cookie es un pequeño fichero de texto que un sitio web almacena en tu navegador
            cuando lo visitas. Las cookies permiten al sitio recordar tus preferencias, mantener tu
            sesión activa o recopilar información estadística anónima sobre el uso del sitio.
          </p>

          <h2>2. Tipos de cookies que utilizamos</h2>

          <h2>2.1 Cookies estrictamente necesarias</h2>
          <p>
            Son imprescindibles para el funcionamiento del sitio. No requieren tu consentimiento.
          </p>
          <ul>
            <li>
              <strong>session_id:</strong> mantiene tu sesión activa durante la visita. Duración:
              sesión.
            </li>
            <li>
              <strong>csrf_token:</strong> protección contra ataques de tipo Cross-Site Request
              Forgery. Duración: sesión.
            </li>
            <li>
              <strong>cookie_consent:</strong> almacena tu elección sobre cookies. Duración: 1 año.
            </li>
          </ul>

          <h2>2.2 Cookies analíticas (requieren consentimiento)</h2>
          <p>
            Nos ayudan a entender cómo interactúan los visitantes con el sitio, de forma anónima y
            agregada.
          </p>
          <ul>
            <li>
              <strong>_ga, _ga_*:</strong> Google Analytics. Miden el número de visitas, páginas
              vistas y duración de las sesiones. Duración: 2 años.
            </li>
          </ul>

          <h2>2.3 Cookies de terceros (servicios embebidos)</h2>
          <ul>
            <li>
              <strong>Stripe:</strong> el procesador de pagos puede establecer cookies para la
              prevención del fraude. Consulta la política de Stripe en stripe.com/privacy.
            </li>
          </ul>

          <h2>3. Cómo gestionar las cookies</h2>
          <p>
            Puedes aceptar o rechazar las cookies no esenciales en el banner que aparece la primera
            vez que visitas el sitio. También puedes configurar tu navegador para bloquear o
            eliminar cookies:
          </p>
          <ul>
            <li>
              <strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies
            </li>
            <li>
              <strong>Firefox:</strong> Opciones → Privacidad y seguridad → Cookies y datos del
              sitio
            </li>
            <li>
              <strong>Safari:</strong> Preferencias → Privacidad → Gestionar datos de sitios web
            </li>
            <li>
              <strong>Edge:</strong> Configuración → Privacidad, búsqueda y servicios → Cookies
            </li>
          </ul>
          <p>
            Ten en cuenta que bloquear todas las cookies puede afectar al funcionamiento del sitio,
            incluyendo el proceso de reserva.
          </p>

          <h2>4. Revocación del consentimiento</h2>
          <p>
            Puedes retirar tu consentimiento en cualquier momento haciendo clic en el enlace
            «Gestionar cookies» que encontrarás en el pie de página, o borrando las cookies de tu
            navegador.
          </p>

          <h2>5. Más información</h2>
          <p>
            Para cualquier consulta sobre nuestra política de cookies, escríbenos a{' '}
            <strong>info@apartamentosillapancha.com</strong>.
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
