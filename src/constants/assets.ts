/**
 * Centralized assets for the website.
 * All static image URLs, icons, and local assets should be defined here.
 */

/** URL pública del sitio (sin barra final). Igual que en SEO.tsx / sitemap. */
export const siteUrl = (
  import.meta.env.VITE_SITE_URL || 'https://www.apartamentosillapancha.com'
).replace(/\/$/, '');

export const assets = {
  // Global / Branding
  logo: {
    text: 'Illa Pancha',
    url: null, // placeholder if we ever use an image logo
  },

  // Hero / General
  hero: {
    // Reemplaza esta URL con tu propia foto de Ribadeo (sube a Supabase Storage o a /public)
    background:
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80&w=2000',
    noise: 'https://www.transparenttextures.com/patterns/p6.png',
  },

  // Locations
  locations: {
    riaRibadeo:
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80&w=2000',
  },

  // Social / Contact
  social: {
    whatsapp: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
  },

  // Placeholders
  placeholders: {
    apartment:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1000',
    photo:
      'https://images.unsplash.com/photo-1449156001437-af90bb4360e2?auto=format&fit=crop&q=80&w=800',
  },
};

export default assets;
