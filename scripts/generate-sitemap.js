#!/usr/bin/env node
/**
 * Genera public/sitemap.xml y public/robots.txt (Sitemap: según VITE_SITE_URL).
 * Uso: node scripts/generate-sitemap.js
 * Build: npm run build (ya encadenado antes de vite build)
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
  { path: '/reservar', priority: '0.85', changefreq: 'weekly' },
  { path: '/nosotros', priority: '0.7', changefreq: 'monthly' },
  { path: '/contacto', priority: '0.7', changefreq: 'monthly' },
  { path: '/como-llegar', priority: '0.65', changefreq: 'monthly' },
  { path: '/faq', priority: '0.65', changefreq: 'monthly' },
  { path: '/privacidad', priority: '0.3', changefreq: 'yearly' },
  { path: '/proteccion-datos', priority: '0.3', changefreq: 'yearly' },
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

  const base = SITE_URL.replace(/\/$/, '');
  const robotsBody = `User-agent: *
Disallow: /admin/
Disallow: /gestion/
Disallow: /login
Disallow: /reset-password
Disallow: /forgot-password
Disallow: /reserva-confirmada/
Disallow: /mi-reserva

Sitemap: ${base}/sitemap.xml
`;
  const robotsPath = resolve(__dirname, '../public/robots.txt');
  writeFileSync(robotsPath, robotsBody, 'utf-8');
  console.log(`✓ robots.txt (Sitemap: ${base}/sitemap.xml) → ${robotsPath}`);
}

generateSitemap().catch(err => {
  console.warn('⚠ sitemap generation failed (non-blocking):', err.message);
  process.exit(0);
});
