import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useLang } from '../contexts/LangContext';
import { useT } from '../i18n/translations';

export default function NotFound() {
  const { lang } = useLang();
  const T = useT(lang);
  const L = T.notFound;

  return (
    <>
      <SEO title={`${L.code} — ${L.title}`} description={L.desc} />
      <Navbar />
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-24 text-center bg-white dark:bg-slate-900">
        <div className="text-[120px] font-serif font-bold leading-none text-gray-100 dark:text-slate-800 select-none">
          {L.code}
        </div>
        <h1 className="text-3xl font-serif font-bold text-navy dark:text-white -mt-6 mb-4">
          {L.title}
        </h1>
        <p className="text-gray-500 dark:text-slate-400 max-w-sm mb-10">
          {L.desc}
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link
            to="/"
            className="bg-[#1a5f6e] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#154f5c] transition-colors text-sm"
          >
            {L.home}
          </Link>
          <Link
            to="/apartamentos"
            className="border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-sm"
          >
            {L.apartments}
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
