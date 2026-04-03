import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { fetchFaqs } from '../services/supabaseService';
import { useLang } from '../contexts/LangContext';
import { useT, ui } from '../i18n/translations';
import type { DbFaq, Lang } from '../types';

function pickFaqQuestion(faq: DbFaq, lang: Lang): string {
  const es = faq.question;
  const en = faq.question_en?.trim();
  const fr = faq.question_fr?.trim();
  const de = faq.question_de?.trim();
  const pt = faq.question_pt?.trim();
  if (lang === 'ES') return es;
  if (lang === 'EN') return en || es;
  if (lang === 'FR') return fr || en || es;
  if (lang === 'DE') return de || en || es;
  if (lang === 'PT') return pt || en || es;
  return es;
}

function pickFaqAnswer(faq: DbFaq, lang: Lang): string {
  const es = faq.answer;
  const en = faq.answer_en?.trim();
  const fr = faq.answer_fr?.trim();
  const de = faq.answer_de?.trim();
  const pt = faq.answer_pt?.trim();
  if (lang === 'ES') return es;
  if (lang === 'EN') return en || es;
  if (lang === 'FR') return fr || en || es;
  if (lang === 'DE') return de || en || es;
  if (lang === 'PT') return pt || en || es;
  return es;
}

export default function Faq() {
  const { lang } = useLang();
  const T = useT(lang);
  const fp = T.faqPage ?? ui.ES.faqPage;
  const [faqs, setFaqs] = useState<DbFaq[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFaqs(true)
      .then(data => setFaqs(data))
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, []);

  const getQ = (faq: DbFaq) => pickFaqQuestion(faq, lang);
  const getA = (faq: DbFaq) => pickFaqAnswer(faq, lang);

  // JSON-LD schema FAQPage para SEO
  const jsonLd =
    faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: getQ(faq),
            acceptedAnswer: { '@type': 'Answer', text: getA(faq) },
          })),
        }
      : undefined;

  return (
    <>
      <SEO title={fp.seoTitle} description={fp.seoDesc} jsonLd={jsonLd} />
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-4">{fp.title}</h1>
        <p className="text-gray-500 mb-12">{fp.subtitle}</p>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <p className="text-gray-400">{fp.empty}</p>
        ) : (
          <div className="divide-y divide-gray-200 border-y border-gray-200">
            {faqs.map(faq => (
              <div key={faq.id}>
                <button
                  className="w-full text-left flex justify-between items-center py-5 gap-4"
                  onClick={() => setOpen(open === faq.id ? null : faq.id)}
                  aria-expanded={open === faq.id}
                >
                  <span className="font-semibold text-navy">{getQ(faq)}</span>
                  <span
                    className={`text-teal text-xl flex-shrink-0 transition-transform duration-200 ${open === faq.id ? 'rotate-45' : ''}`}
                  >
                    +
                  </span>
                </button>
                {open === faq.id && (
                  <div className="pb-5 text-gray-600 leading-relaxed text-sm">{getA(faq)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
