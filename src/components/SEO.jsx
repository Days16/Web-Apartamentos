import { useEffect } from 'react';

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.apartamentosillapancha.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

function setMeta(selector, attr, value) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    const [attrName, attrVal] = selector.replace('meta[', '').replace(']', '').split('=');
    el.setAttribute(attrName.trim(), attrVal.replace(/"/g, '').trim());
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export default function SEO({
  title,
  description,
  ogImage,
  ogType = 'website',
  ogLocale = 'es_ES',
  jsonLd,
}) {
  const fullTitle = title
    ? `${title} | Illa Pancha`
    : 'Illa Pancha | Apartamentos Turísticos en Ribadeo';
  const image = ogImage || DEFAULT_OG_IMAGE;

  useEffect(() => {
    // Title
    document.title = fullTitle;

    // Description
    if (description) setMeta('meta[name="description"]', 'content', description);

    // Open Graph
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:type"]', 'content', ogType);
    setMeta('meta[property="og:url"]', 'content', window.location.href);
    setMeta('meta[property="og:locale"]', 'content', ogLocale);
    setMeta('meta[property="og:image"]', 'content', image);
    setMeta('meta[property="og:site_name"]', 'content', 'Illa Pancha');
    if (description) setMeta('meta[property="og:description"]', 'content', description);

    // Twitter Card
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', fullTitle);
    setMeta('meta[name="twitter:image"]', 'content', image);
    if (description) setMeta('meta[name="twitter:description"]', 'content', description);

    // JSON-LD
    const scriptId = 'jsonld-structured-data';
    let script = document.getElementById(scriptId);
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
      // Limpia el JSON-LD al desmontar (SPA navigation)
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, [fullTitle, description, image, ogType, ogLocale, jsonLd]);

  return null;
}
