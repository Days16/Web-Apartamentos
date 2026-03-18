import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';
import { useSettings } from '../contexts/SettingsContext';

export default function Terminos() {
  const { lang } = useLang();
  const { settings } = useSettings();
  const T = useT(lang);
  const L = T.legal;

  const cancelDays = settings?.cancellation_free_days || 14;
  const depositPct = settings?.payment_deposit_percentage || 50;

  return (
    <>
      <SEO title={L.termsTitle} description={L.termsDesc} />
      <Navbar />
      <div className="w-full min-h-screen bg-white">
        <div className="grid place-items-center py-12 px-4 bg-gray-50 border-b border-gray-200">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">{L.docs}</div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-navy mb-6">{L.termsTitle}</h1>
          <p className="text-xs text-gray-500 mt-2">{L.lastUpdate}</p>
        </div>
        <div className="policy-content max-w-3xl mx-auto px-4 py-12">
          <p>Estos Términos y Condiciones regulan la contratación de servicios de alojamiento turístico ofrecidos por <strong>Illa Pancha Ribadeo</strong> (en adelante, «el Propietario» o «nosotros») a través del sitio web <strong>illapancha.com</strong>. Al realizar una reserva, el cliente (en adelante, «el Huésped») acepta expresamente los presentes términos.</p>

          <h2>1. Identificación del prestador</h2>
          <p><strong>Denominación:</strong> Illa Pancha Ribadeo S.L. (en constitución)<br />
            <strong>Domicilio:</strong> Ribadeo, Lugo, Galicia, España<br />
            <strong>Email:</strong> info@illapancha.com<br />
            <strong>Teléfono:</strong> +34 982 XXX XXX</p>

          <h2>2. Objeto</h2>
          <p>El Propietario ofrece el alquiler temporal de apartamentos turísticos ubicados en Ribadeo (Lugo, Galicia) para estancias de corta duración. Cada apartamento se describe detalladamente en la ficha correspondiente de la web, incluyendo capacidad máxima, equipamiento y normas específicas.</p>

          <h2>3. Proceso de reserva</h2>
          <p>La reserva queda formalizada cuando el Huésped:</p>
          <ul>
            <li>Cumplimenta el formulario de reserva con sus datos personales.</li>
            <li>Selecciona las fechas y el apartamento deseado.</li>
            <li>Abona el depósito del {depositPct}% del importe total mediante tarjeta de crédito o débito a través de la pasarela de pago segura (Stripe).</li>
            <li>Recibe la confirmación de reserva por correo electrónico.</li>
          </ul>
          <p>La reserva no se considerará confirmada hasta la recepción del email de confirmación. El Propietario se reserva el derecho a rechazar cualquier reserva en caso de indisponibilidad u otras circunstancias justificadas, en cuyo caso se devolverá íntegramente el depósito abonado.</p>

          <h2>4. Precios y forma de pago</h2>
          <p>Los precios indicados en la web incluyen el IVA aplicable y la limpieza final del apartamento. Se aplica el siguiente modelo de pago:</p>
          <ul>
            <li><strong>{depositPct}% del total:</strong> cobrado mediante tarjeta en el momento de la reserva.</li>
            <li><strong>{100 - depositPct}% restante:</strong> abonado en efectivo a la llegada al apartamento.</li>
          </ul>
          <p>Los precios de los extras o servicios adicionales se detallan en el proceso de reserva y se abonan junto con el depósito inicial.</p>

          <h2>5. Política de cancelación</h2>
          <p>Las condiciones de cancelación son las siguientes:</p>
          <ul>
            <li><strong>Más de {cancelDays} días antes del check-in:</strong> cancelación gratuita con devolución completa del depósito.</li>
            <li><strong>Entre {Math.round(cancelDays / 2)} y {cancelDays} días antes del check-in:</strong> se retiene el 50% del depósito abonado.</li>
            <li><strong>Menos de {Math.round(cancelDays / 2)} días antes del check-in:</strong> se retiene el 100% del depósito abonado.</li>
          </ul>
          <p>En caso de fuerza mayor debidamente acreditada (hospitalización, fallecimiento de familiar directo, etc.), el Propietario estudiará cada caso individualmente.</p>

          <h2>6. Check-in y check-out</h2>
          <ul>
            <li><strong>Check-in:</strong> a partir de las 15:00 horas del día de llegada. Fuera de este horario deberá coordinarse con el Propietario.</li>
            <li><strong>Check-out:</strong> antes de las 11:00 horas del día de salida. El late check-out (hasta las 14:00 h) está disponible como servicio adicional sujeto a disponibilidad.</li>
            <li>En el momento del check-in se verificará la identidad de todos los huéspedes conforme a la normativa de registro de viajeros.</li>
          </ul>

          <h2>7. Obligaciones del huésped</h2>
          <p>El Huésped se compromete a:</p>
          <ul>
            <li>No superar la capacidad máxima indicada para cada apartamento.</li>
            <li>Respetar las normas de convivencia y no molestar a los vecinos (silencio a partir de las 23:00 h).</li>
            <li>No fumar en el interior de los apartamentos.</li>
            <li>No organizar fiestas o eventos sin autorización previa y por escrito del Propietario.</li>
            <li>Entregar el apartamento en condiciones razonables de orden y limpieza.</li>
            <li>Comunicar cualquier daño o avería al Propietario a la mayor brevedad posible.</li>
            <li>Abonar los desperfectos causados por un uso inadecuado del apartamento o sus instalaciones.</li>
          </ul>

          <h2>8. Mascotas</h2>
          <p>Las mascotas solo se admiten en los apartamentos expresamente indicados como «pet-friendly». En los demás, no está permitida su presencia. El incumplimiento de esta norma podrá implicar la pérdida del depósito y el abandono inmediato del apartamento.</p>

          <h2>9. Responsabilidad</h2>
          <p>El Propietario no se responsabiliza de los objetos personales del Huésped ni de los daños derivados de causas de fuerza mayor, actos vandálicos de terceros o mal uso de las instalaciones. El Huésped es responsable de los daños causados durante su estancia.</p>

          <h2>10. Propiedad intelectual</h2>
          <p>Todos los contenidos del sitio web illapancha.com (textos, imágenes, logotipos, diseño) son propiedad del Propietario o de sus licenciantes y están protegidos por la normativa de propiedad intelectual. Queda prohibida su reproducción sin autorización expresa.</p>

          <h2>11. Modificaciones</h2>
          <p>El Propietario se reserva el derecho a modificar estos términos en cualquier momento. Las modificaciones se publicarán en el sitio web con la fecha de actualización. Las reservas ya confirmadas se rigen por los términos vigentes en el momento de su formalización.</p>

          <h2>12. Legislación aplicable y jurisdicción</h2>
          <p>Estos términos se rigen por la legislación española. Para la resolución de cualquier controversia, las partes se someten, con renuncia expresa a cualquier otro fuero, a los Juzgados y Tribunales de Lugo (Galicia, España). Para conflictos de consumo, el Huésped también puede recurrir a la plataforma europea de resolución en línea de litigios: <strong>ec.europa.eu/consumers/odr</strong>.</p>
        </div>
      </div>
      <Footer />
    </>
  );
}
