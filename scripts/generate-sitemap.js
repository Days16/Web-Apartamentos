#!/usr/bin/env node
/**
 * Genera public/sitemap.xml con todas las rutas públicas + slugs de apartamentos.
 * Uso: node scripts/generate-sitemap.js
 * Se puede encadenar en el build: "build": "node scripts/generate-sitemap.js && vite build"
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// dotenv is optional — on Netlify env vars are already set by the platform
try { await import('dotenv/config'); } catch { /* not installed, that's OK */ }

const __dirname = dirname(fileURLToPath(import.meta.url));

const SITE_URL = process.env.VITE_SITE_URL || 'https://www.apartamentosillapancha.com';
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/apartamentos', priority: '0.9', changefreq: 'weekly' },
  { path: '/nosotros', priority: '0.7', changefreq: 'monthly' },
  { path: '/contacto', priority: '0.7', changefreq: 'monthly' },
  { path: '/privacidad', priority: '0.3', changefreq: 'yearly' },
  { path: '/cookies', priority: '0.3', changefreq: 'yearly' },
  { path: '/terminos', priority: '0.3', changefreq: 'yearly' },
];

const today = new Date().toISOString().split('T')[0];

function urlEntry({ loc, priority, changefreq }) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function generateSitemap() {
  const entries = STATIC_ROUTES.map(r =>
    urlEntry({ loc: `${SITE_URL}${r.path}`, priority: r.priority, changefreq: r.changefreq })
  );

  // Apartamentos dinámicos desde Supabase
  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: apts } = await supabase.from('apartments').select('slug').eq('active', true);
      if (apts) {
        apts.forEach(apt => {
          entries.push(urlEntry({
            loc: `${SITE_URL}/apartamentos/${apt.slug}`,
            priority: '0.8',
            changefreq: 'weekly',
          }));
        });
      }
    } catch (e) {
      console.warn('No se pudieron obtener slugs de Supabase:', e.message);
    }
  } else {
    console.warn('Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no definidas — solo rutas estáticas.');
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  const outPath = resolve(__dirname, '../public/sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`✓ sitemap.xml generado (${entries.length} URLs) → ${outPath}`);
}

generateSitemap().catch(err => {
  console.warn('⚠ sitemap generation failed (non-blocking):', err.message);
  process.exit(0);
});
