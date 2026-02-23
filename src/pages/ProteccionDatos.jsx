import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';

export default function ProteccionDatos() {
  const { lang } = useLang();
  const T = useT(lang);
  const L = T.legal;

  return (
    <>
      <SEO title={L.dataTitle} description={L.dataDesc} />
      <Navbar />
      <div className="w-full min-h-screen bg-white">
        <div className="grid place-items-center py-12 px-4 bg-gray-50 border-b border-gray-200">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">{L.docs}</div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-navy mb-6">{L.dataTitle}</h1>
          <p className="text-xs text-gray-500 mt-2">{L.lastUpdate}</p>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <p>Este documento complementa la Política de Privacidad general y detalla de forma específica el cumplimiento del <strong>Reglamento General de Protección de Datos (RGPD)</strong> y la <strong>Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD)</strong> por parte de <strong>Illa Pancha Ribadeo</strong>.</p>

          <h2>1. Responsable del tratamiento</h2>
          <p><strong>Titular:</strong> Illa Pancha Ribadeo S.L. (en constitución)<br />
            <strong>Domicilio:</strong> Ribadeo, Lugo, Galicia, España<br />
            <strong>Email de contacto:</strong> info@illapancha.com<br />
            <strong>Delegado de Protección de Datos (DPD):</strong> Al ser una microempresa, no existe obligación legal de designar DPD. Las consultas en materia de protección de datos pueden dirigirse al email indicado con el asunto «DPD – Consulta».</p>

          <h2>2. Actividades de tratamiento</h2>
          <p>Mantenemos un registro interno de las siguientes actividades de tratamiento:</p>
          <ul>
            <li><strong>Gestión de reservas:</strong> Datos de identificación (nombre, email, teléfono) y datos de la reserva (fechas, apartamento, número de personas). Base jurídica: ejecución de contrato (Art. 6.1.b RGPD). Plazo de conservación: 5 años por obligaciones fiscales.</li>
            <li><strong>Comunicaciones comerciales:</strong> Solo si el Huésped otorga consentimiento explícito. Base jurídica: consentimiento (Art. 6.1.a RGPD). Puede retirarse en cualquier momento.</li>
            <li><strong>Registro de viajeros:</strong> Datos de identificación exigidos por el Real Decreto 933/2021 y normativa autonómica gallega. Comunicados a las Fuerzas y Cuerpos de Seguridad del Estado. Plazo: según normativa (generalmente 3 años).</li>
            <li><strong>Formulario de contacto:</strong> Nombre, email y contenido del mensaje. Base jurídica: interés legítimo (Art. 6.1.f RGPD). Plazo: 2 años desde el último contacto.</li>
            <li><strong>Análisis de navegación:</strong> Datos estadísticos anónimos y agregados (Google Analytics). No permiten identificar a personas físicas. Plazo: 13 meses.</li>
          </ul>

          <h2>3. Encargados del tratamiento</h2>
          <p>Contamos con los siguientes encargados del tratamiento que acceden a datos personales bajo contrato y garantías adecuadas:</p>
          <ul>
            <li><strong>Stripe Inc.</strong> – Procesamiento de pagos con tarjeta. Certificado PCI DSS Level 1. Transferencia a EE.UU. amparada en Cláusulas Contractuales Tipo.</li>
            <li><strong>Resend Inc.</strong> – Envío de emails transaccionales (confirmaciones, notificaciones). Transferencia a EE.UU. amparada en Cláusulas Contractuales Tipo.</li>
            <li><strong>Supabase Inc.</strong> – Almacenamiento de datos de reservas en base de datos en la nube. Infraestructura en la Unión Europea (cuando está disponible).</li>
            <li><strong>Google LLC (Google Analytics)</strong> – Análisis de tráfico web mediante datos anónimos y agregados. Transferencia a EE.UU. amparada en el Marco de Privacidad de Datos UE-EE.UU.</li>
          </ul>

          <h2>4. Transferencias internacionales</h2>
          <p>Las transferencias de datos a países fuera del Espacio Económico Europeo (EEE) —especialmente a EE.UU. mediante los encargados mencionados— se realizan bajo alguna de las siguientes garantías adecuadas:</p>
          <ul>
            <li>Decisión de adecuación de la Comisión Europea (Marco de Privacidad de Datos UE-EE.UU.).</li>
            <li>Cláusulas Contractuales Tipo adoptadas por la Comisión Europea (Art. 46 RGPD).</li>
          </ul>

          <h2>5. Derechos de los interesados</h2>
          <p>En virtud del RGPD, puedes ejercer los siguientes derechos dirigiendo un escrito a <strong>info@illapancha.com</strong> con asunto «Ejercicio de derechos RGPD» adjuntando copia de tu documento de identidad:</p>
          <ul>
            <li><strong>Acceso (Art. 15):</strong> Conocer si tratamos tus datos y obtener una copia de los mismos.</li>
            <li><strong>Rectificación (Art. 16):</strong> Corregir datos inexactos o incompletos.</li>
            <li><strong>Supresión / «derecho al olvido» (Art. 17):</strong> Solicitar el borrado cuando los datos ya no sean necesarios, hayas retirado el consentimiento o se hayan tratado ilícitamente.</li>
            <li><strong>Limitación del tratamiento (Art. 18):</strong> Restringir el tratamiento en determinadas circunstancias.</li>
            <li><strong>Portabilidad (Art. 20):</strong> Recibir tus datos en formato estructurado, de uso común y legible por máquina.</li>
            <li><strong>Oposición (Art. 21):</strong> Oponerte al tratamiento basado en interés legítimo o con fines de marketing directo.</li>
            <li><strong>No ser objeto de decisiones automatizadas (Art. 22):</strong> No tomamos decisiones basadas exclusivamente en tratamiento automatizado que produzcan efectos jurídicos significativos.</li>
          </ul>
          <p>Responderemos en un plazo máximo de <strong>1 mes</strong> desde la recepción de la solicitud, prorrogable 2 meses adicionales en casos complejos (te notificaremos la prórroga). Si consideras que el tratamiento vulnera tus derechos, puedes presentar reclamación ante la <strong>Agencia Española de Protección de Datos</strong> (www.aepd.es).</p>

          <h2>6. Procedimiento ante brechas de seguridad</h2>
          <p>En caso de brecha de seguridad que afecte a datos personales, seguimos el siguiente procedimiento:</p>
          <ul>
            <li>Detección e investigación inmediata del incidente.</li>
            <li>Notificación a la AEPD en un plazo máximo de <strong>72 horas</strong> desde el conocimiento de la brecha (Art. 33 RGPD), cuando sea probable que suponga un riesgo para los derechos y libertades de las personas.</li>
            <li>Comunicación a los afectados sin dilación indebida cuando exista alto riesgo para sus derechos y libertades (Art. 34 RGPD).</li>
            <li>Documentación del incidente en el registro interno de brechas.</li>
          </ul>

          <h2>7. Medidas de seguridad</h2>
          <p>Aplicamos las siguientes medidas técnicas y organizativas conforme al Art. 32 RGPD:</p>
          <ul>
            <li>Cifrado de comunicaciones mediante <strong>HTTPS/TLS 1.3</strong>.</li>
            <li>Acceso a sistemas restringido por roles y autenticación segura.</li>
            <li>Copias de seguridad periódicas con verificación de integridad.</li>
            <li>Formación del personal en materia de protección de datos.</li>
            <li>Evaluación periódica de los encargados del tratamiento.</li>
          </ul>

          <h2>8. Menores de edad</h2>
          <p>Nuestros servicios están dirigidos a adultos. No recopilamos conscientemente datos de menores de 14 años. Si detectamos que se han proporcionado datos de un menor sin consentimiento parental, procederemos a su eliminación inmediata.</p>

          <h2>9. Actualizaciones</h2>
          <p>Este documento puede actualizarse para adaptarse a cambios normativos o en nuestros sistemas de tratamiento. La versión vigente estará siempre disponible en esta página con la fecha de última actualización.</p>
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
