import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import Ico, { paths } from '../components/Ico';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';

const ADDRESS = 'Av. Rosalía de Castro 25, 27700 Ribadeo, Lugo';
const MAPS_URL =
  'https://www.google.com/maps/place/Av.+de+Rosal%C3%ADa+de+Castro,+25,+27700+Ribadeo,+Lugo/@43.5397524,-7.0411052,199m/data=!3m1!1e3!4m6!3m5!1s0xd317e5724d77fed:0x5b60c517683c15a5!8m2!3d43.5399657!4d-7.0410569!16s%2Fg%2F11c19xgmd5?entry=ttu';
const MAPS_EMBED =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d388.6!2d-7.041105!3d43.539752!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd317e5724d77fed%3A0x5b60c517683c15a5!2sAv.%20de%20Rosal%C3%ADa%20de%20Castro%2C%2025%2C%2027700%20Ribadeo%2C%20Lugo!5e0!3m2!1ses!2ses!4v1700000000000';

const INFO_ES = [
  {
    icon: paths.parking,
    title: 'En coche',
    text: 'Desde la A-8 (Autovía del Cantábrico), toma la salida Ribadeo. Sigue por la N-634 hasta el centro. Aparcamiento disponible en la zona.',
  },
  {
    icon: paths.map,
    title: 'Transporte público',
    text: 'Bus ALSA desde Lugo, Oviedo y A Coruña con parada en Ribadeo. Estación de autobús a 10 minutos a pie de los apartamentos.',
  },
  {
    icon: paths.map,
    title: 'Aeropuerto más cercano',
    text: 'Aeropuerto de Santiago de Compostela (SCQ) a 170 km. Aeropuerto de Asturias (OVD) a 100 km. Alquiler de coche recomendado.',
  },
];

const INFO_EN = [
  {
    icon: paths.parking,
    title: 'By car',
    text: 'From the A-8 motorway (Autovía del Cantábrico), take the Ribadeo exit. Follow the N-634 to the town centre. Parking available nearby.',
  },
  {
    icon: paths.map,
    title: 'Public transport',
    text: 'ALSA buses from Lugo, Oviedo and A Coruña stop in Ribadeo. Bus station is a 10-minute walk from the apartments.',
  },
  {
    icon: paths.map,
    title: 'Nearest airport',
    text: 'Santiago de Compostela Airport (SCQ) 170 km away. Asturias Airport (OVD) 100 km away. Car hire recommended.',
  },
];

export default function ComoLlegar() {
  const { lang } = useLang();
  const T = useT(lang);
  const isEN = lang === 'EN';
  const info = isEN ? INFO_EN : INFO_ES;

  return (
    <>
      <SEO title={T.seo.comoLlegarTitle} description={T.seo.comoLlegarDesc} />
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-4">
          {isEN ? 'How to get here' : 'Cómo llegar'}
        </h1>
        <p className="text-gray-500 mb-10">
          {isEN
            ? 'Illa Pancha Apartments are located right in the centre of Ribadeo, on the coast of Galicia.'
            : 'Los Apartamentos Illa Pancha están en el centro de Ribadeo, en la costa de Galicia.'}
        </p>

        {/* Dirección + enlace Google Maps */}
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 border border-gray-200 rounded-xl p-5 mb-10 hover:border-teal hover:bg-teal/5 transition-all group"
        >
          <div className="w-11 h-11 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
            <Ico d={paths.map} size={20} color="#1a5f6e" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-navy">{ADDRESS}</div>
            <div className="text-sm text-teal mt-0.5">
              {isEN ? 'Open in Google Maps →' : 'Abrir en Google Maps →'}
            </div>
          </div>
        </a>

        {/* Mapa embebido */}
        <div
          className="rounded-xl overflow-hidden border border-gray-200 mb-12"
          style={{ height: 340 }}
        >
          <iframe
            title={isEN ? 'Location map' : 'Mapa de ubicación'}
            src={MAPS_EMBED}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Opciones de transporte */}
        <div className="space-y-5">
          {info.map((item, i) => (
            <div key={i} className="flex gap-4 p-5 border border-gray-200 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Ico d={item.icon} size={18} color="#1a5f6e" />
              </div>
              <div>
                <div className="font-semibold text-navy mb-1">{item.title}</div>
                <div className="text-sm text-gray-600 leading-relaxed">{item.text}</div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
