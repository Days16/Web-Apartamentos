import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠ Supabase no configurado — usando datos de demostración. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY al archivo .env');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: { persistSession: true },
    global: { fetch: (...args) => fetch(...args).catch(() => ({ json: () => ({}) })) },
  }
);

// ─── SQL PARA CREAR LAS TABLAS EN SUPABASE ────────────────────────────────────
// Ejecuta este SQL en Supabase Dashboard → SQL Editor:
/*
-- APARTAMENTOS
CREATE TABLE IF NOT EXISTS apartments (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  tagline TEXT,
  tagline_en TEXT,
  cap INT DEFAULT 2,
  beds INT DEFAULT 1,
  baths INT DEFAULT 1,
  price INT NOT NULL,
  rating NUMERIC(3,1) DEFAULT 5.0,
  review_count INT DEFAULT 0,
  min_stay INT DEFAULT 2,
  active BOOLEAN DEFAULT TRUE,
  gradient TEXT,
  amenities TEXT[] DEFAULT '{}',
  description TEXT,
  description_en TEXT,
  rules TEXT[] DEFAULT '{}',
  nearby TEXT[] DEFAULT '{}',
  occupied_days INT[] DEFAULT '{}',
  extra_night INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RESERVAS
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  guest TEXT NOT NULL,
  apt TEXT NOT NULL,
  apt_slug TEXT REFERENCES apartments(slug) ON DELETE SET NULL,
  checkin DATE NOT NULL,
  checkout DATE NOT NULL,
  nights INT NOT NULL,
  total INT NOT NULL,
  deposit INT NOT NULL,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'web',
  cash_paid BOOLEAN DEFAULT FALSE,
  email TEXT,
  phone TEXT,
  extras TEXT[] DEFAULT '{}',
  extras_total INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXTRAS
CREATE TABLE IF NOT EXISTS extras (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FOTOS DE APARTAMENTOS
CREATE TABLE IF NOT EXISTS apartment_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_slug TEXT REFERENCES apartments(slug) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT,          -- ruta en Supabase Storage (bucket: apartment-photos)
  order_index INT DEFAULT 0,
  is_main BOOLEAN DEFAULT FALSE,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE apartment_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fotos públicas" ON apartment_photos FOR SELECT USING (true);
CREATE POLICY "Insertar fotos" ON apartment_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Borrar fotos" ON apartment_photos FOR DELETE USING (true);
CREATE POLICY "Actualizar fotos" ON apartment_photos FOR UPDATE USING (true);

-- STORAGE BUCKET (ejecutar en Supabase SQL Editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('apartment-photos', 'apartment-photos', true) ON CONFLICT (id) DO NOTHING;
-- CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'apartment-photos');
-- CREATE POLICY "Auth insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'apartment-photos');
-- CREATE POLICY "Auth delete" ON storage.objects FOR DELETE USING (bucket_id = 'apartment-photos');

-- MIGRACIÓN: añadir storage_path si la tabla ya existe
-- ALTER TABLE apartment_photos ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- RESEÑAS
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  apt TEXT REFERENCES apartments(slug) ON DELETE CASCADE,
  text TEXT NOT NULL,
  name TEXT NOT NULL,
  origin TEXT,
  stars INT DEFAULT 5,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (lectura pública para la web)
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apartamentos públicos" ON apartments FOR SELECT USING (true);
CREATE POLICY "Extras públicos" ON extras FOR SELECT USING (true);
CREATE POLICY "Reseñas públicas" ON reviews FOR SELECT USING (true);
CREATE POLICY "Insertar reservas" ON reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Leer reservas propias" ON reservations FOR SELECT USING (true);
CREATE POLICY "Actualizar reservas" ON reservations FOR UPDATE USING (true);
*/
