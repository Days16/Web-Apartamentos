import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';

export default function Privacy() {
  const { lang } = useLang();
  const T = useT(lang);
  const L = T.legal;

  return (
    <>
      <SEO title={L.privacyTitle} description={L.privacyDesc} />
      <Navbar />
      <div className="w-full min-h-screen bg-white">
        <div className="grid place-items-center py-12 px-4 bg-gray-50 border-b border-gray-200">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">{L.docs}</div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-navy mb-6">{L.privacyTitle}</h1>
          <p className="text-xs text-gray-500 mt-2">{L.lastUpdate}</p>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <p>En <strong>Illa Pancha Ribadeo</strong> (en adelante, «nosotros») nos comprometemos a proteger tu privacidad. Esta política explica qué datos personales recopilamos, para qué los usamos y cuáles son tus derechos al respecto, de conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).</p>

          <h2>1. Responsable del tratamiento</h2>
          <p><strong>Titular:</strong> Illa Pancha Ribadeo S.L. (en constitución)<br />
            <strong>Dirección:</strong> Ribadeo, Lugo, Galicia, España<br />
            <strong>Email:</strong> info@illapancha.com</p>

          <h2>2. Datos que recopilamos</h2>
          <ul>
            <li><strong>Datos de reserva:</strong> nombre completo, email, teléfono, fechas de estancia y número de personas. Son necesarios para gestionar tu reserva.</li>
            <li><strong>Datos de pago:</strong> el pago con tarjeta lo procesa Stripe directamente. Nosotros nunca almacenamos datos de tu tarjeta.</li>
            <li><strong>Datos de contacto:</strong> nombre, email y el contenido del mensaje cuando usas el formulario de contacto.</li>
            <li><strong>Datos de navegación:</strong> dirección IP, tipo de navegador y páginas visitadas, de forma anónima y agregada, para análisis de tráfico.</li>
          </ul>

          <h2>3. Finalidad y base jurídica</h2>
          <ul>
            <li><strong>Gestión de reservas:</strong> ejecución del contrato de alojamiento (Art. 6.1.b RGPD).</li>
            <li><strong>Comunicaciones de servicio:</strong> interés legítimo y ejecución contractual (Art. 6.1.b y 6.1.f RGPD).</li>
            <li><strong>Obligaciones legales:</strong> cumplimiento de la normativa de registro de viajeros y fiscal (Art. 6.1.c RGPD).</li>
            <li><strong>Análisis de tráfico web:</strong> interés legítimo y, en su caso, consentimiento para cookies no esenciales (Art. 6.1.a y 6.1.f RGPD).</li>
          </ul>

          <h2>4. Conservación de los datos</h2>
          <p>Los datos de reserva se conservan durante 5 años por obligaciones fiscales y contables. Los datos de contacto se eliminan pasados 2 años desde el último contacto. Los datos de navegación anónimos se conservan 13 meses.</p>

          <h2>5. Destinatarios</h2>
          <p>Tus datos no se venden ni ceden a terceros con fines comerciales. Pueden ser comunicados a:</p>
          <ul>
            <li><strong>Stripe Inc.</strong> (procesador de pagos) bajo su propia política de privacidad.</li>
            <li><strong>Resend Inc.</strong> (plataforma de email transaccional) para el envío de confirmaciones.</li>
            <li><strong>Autoridades competentes</strong> cuando sea legalmente exigible (p. ej., Guardia Civil, Agencia Tributaria).</li>
          </ul>

          <h2>6. Tus derechos</h2>
          <p>Puedes ejercer en cualquier momento los derechos de:</p>
          <ul>
            <li><strong>Acceso:</strong> conocer qué datos tuyos tenemos.</li>
            <li><strong>Rectificación:</strong> corregir datos inexactos.</li>
            <li><strong>Supresión:</strong> solicitar el borrado cuando ya no sean necesarios.</li>
            <li><strong>Limitación:</strong> restringir el tratamiento en ciertos supuestos.</li>
            <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado.</li>
            <li><strong>Oposición:</strong> oponerte al tratamiento basado en interés legítimo.</li>
          </ul>
          <p>Para ejercerlos, escríbenos a <strong>info@illapancha.com</strong> con asunto «Ejercicio de derechos RGPD». También puedes reclamar ante la <strong>Agencia Española de Protección de Datos</strong> (www.aepd.es).</p>

          <h2>7. Seguridad</h2>
          <p>Aplicamos medidas técnicas y organizativas adecuadas: comunicaciones cifradas mediante HTTPS/TLS, control de acceso a los sistemas y copias de seguridad periódicas.</p>

          <h2>8. Cambios en esta política</h2>
          <p>Podemos actualizar esta política para adaptarla a cambios legales o en nuestros servicios. Publicaremos la versión vigente siempre en esta página con la fecha de última actualización.</p>
          <style>{`
            .policy-content p {
              @apply text-gray-700 leading-relaxed mb-4;
            }
            .policy-content h2 {
              @apply font-serif text-2xl font-bold text-navy mb-4 mt-8;
            }
            .policy-content h2:first-of-type {
              @apply mt-0;
            }
            .policy-content ul {
              @apply list-disc list-inside text-gray-700 leading-relaxed ml-4 mb-4;
            }
            .policy-content li {
              @apply text-gray-700 leading-relaxed mb-2;
            }
            .policy-content strong {
              @apply font-bold text-slate-900;
            }
            .policy-content a {
              @apply text-teal hover:underline;
            }
          `}</style>
        </div>
      </div>
      <Footer />
    </>
  );
}
