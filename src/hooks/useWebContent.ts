import { useState, useEffect } from 'react';
import type { Lang } from '../types';
import { fetchWebsiteContent } from '../services/supabaseService';

interface ContentRow {
  section_key: string;
  content_es: string | null;
  content_en: string | null;
}

/**
 * Fetches website_content from Supabase and returns a helper `wc(baseKey)`
 * that returns the CMS value for the current language, or undefined if not set,
 * so callers can fall back to i18n strings: wc('home_hero_title') || T.home.heroTitle
 */
export function useWebContent(lang: Lang): { wc: (baseKey: string) => string | undefined } {
  const [map, setMap] = useState<Record<string, ContentRow>>({});

  useEffect(() => {
    fetchWebsiteContent().then(rows => {
      const m: Record<string, ContentRow> = {};
      rows.forEach((r: ContentRow) => {
        m[r.section_key] = r;
      });
      setMap(m);
    });
  }, []);

  function wc(baseKey: string): string | undefined {
    const row = map[baseKey];
    if (!row) return undefined;
    const val = lang === 'EN' ? row.content_en : row.content_es;
    return val || undefined;
  }

  return { wc };
}
