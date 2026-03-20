import { useState, useEffect } from 'react';
import { fetchWebsiteContent } from '../services/supabaseService';

/**
 * Fetches website_content from Supabase and returns a helper `wc(baseKey)`
 * that returns the CMS value for the current language, or undefined if not set,
 * so callers can fall back to i18n strings: wc('home_hero_title') || T.home.heroTitle
 */
export function useWebContent(lang) {
  const [map, setMap] = useState({});

  useEffect(() => {
    fetchWebsiteContent().then(rows => {
      const m = {};
      rows.forEach(r => { m[r.section_key] = r; });
      setMap(m);
    });
  }, []);

  function wc(baseKey) {
    const row = map[baseKey];
    if (!row) return undefined;
    const val = lang === 'EN' ? row.content_en : row.content_es;
    return val || undefined;
  }

  return { wc };
}
