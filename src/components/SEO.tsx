import { useEffect } from 'react';
import { assets } from '../constants/assets';
import { useLang } from '../contexts/LangContext';

const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://www.apartamentosillapancha.com'
).replace(/\/$/, '');

const LOCALE_MAP: Record<string, string> = {
  ES: 'es_ES',
  EN: 'en_GB',
  FR: 'fr_FR',
  DE: 'de_DE',
  PT: 'pt_PT',
};

const HREFLANG_MAP: Record<string, string> = {
  ES: 'es',
  EN: 'en',
  FR: 'fr',
  DE: 'de',
  PT: 'pt',
};

/** Imagen OG: `VITE_OG_IMAGE_URL` (URL absoluta 1200×630) o foto hero hasta que subas og propia. */
function defaultOgImage(): string {
  const fromEnv = import.meta.env.VITE_OG_IMAGE_URL?.trim();
  if (fromEnv) return fromEnv;
  return assets.hero.background;
}

function setMeta(selector: string, attr: string, value: string) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    const [attrName, attrVal] = selector.replace('meta[', '').replace(']', '').split('=');
    el.setAttribute(attrName.trim(), attrVal.replace(/"/g, '').trim());
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setHreflangLinks(canonicalUrl: string) {
  document.querySelectorAll('link[hreflang]').forEach(el => el.remove());
  const langs = Object.values(HREFLANG_MAP);
  langs.forEach(hreflang => {
    const el = document.createElement('link');
    el.setAttribute('rel', 'alternate');
    el.setAttribute('hreflang', hreflang);
    el.setAttribute('href', canonicalUrl);
    document.head.appendChild(el);
  });
  // x-default always points to ES (main version)
  const xDefault = document.createElement('link');
  xDefault.setAttribute('rel', 'alternate');
  xDefault.setAttribute('hreflang', 'x-default');
  xDefault.setAttribute('href', canonicalUrl);
  document.head.appendChild(xDefault);
}

interface SEOProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  ogLocale?: string;
  jsonLd?: Record<string, unknown>;
  /** Si true: no indexar (login, previews, etc.) */
  noIndex?: boolean;
}

export default function SEO({
  title,
  description,
  ogImage,
  ogType = 'website',
  ogLocale,
  jsonLd,
  noIndex = false,
}: SEOProps) {
  const { lang } = useLang();
  const resolvedLocale = ogLocale ?? LOCALE_MAP[lang] ?? 'es_ES';

  const fullTitle = title
    ? `${title} | Illa Pancha`
    : 'Illa Pancha | Apartamentos Turísticos en Ribadeo';
  const image = ogImage || defaultOgImage();

  useEffect(() => {
    const path = window.location.pathname || '/';
    const canonicalUrl = `${SITE_URL}${path}`;

    document.title = fullTitle;

    if (description) setMeta('meta[name="description"]', 'content', description);

    setMeta('meta[name="robots"]', 'content', noIndex ? 'noindex, nofollow' : 'index, follow');

    setCanonical(canonicalUrl);

    if (!noIndex) setHreflangLinks(canonicalUrl);

    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:type"]', 'content', ogType);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[property="og:locale"]', 'content', resolvedLocale);
    setMeta('meta[property="og:image"]', 'content', image);
    setMeta('meta[property="og:site_name"]', 'content', 'Illa Pancha');
    if (description) setMeta('meta[property="og:description"]', 'content', description);

    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', fullTitle);
    setMeta('meta[name="twitter:image"]', 'content', image);
    if (description) setMeta('meta[name="twitter:description"]', 'content', description);

    const scriptId = 'jsonld-structured-data';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else if (script) {
      script.remove();
    }

    return () => {
      const s = document.getElementById(scriptId);
      if (s) s.remove();
      document.querySelectorAll('link[hreflang]').forEach(el => el.remove());
    };
  }, [fullTitle, description, image, ogType, resolvedLocale, jsonLd, noIndex]);

  return null;
}
