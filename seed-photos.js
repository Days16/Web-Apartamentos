import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// Get these from your .env.local file
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
    console.error('❌ Por favor, proporciona VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en las variables de entorno o edita este archivo.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Unsplash premium architecture/interior placeholder photos
const PLACEHOLDER_PHOTOS = [
    'https://images.unsplash.com/photo-1502672260266-1c1e52408437?q=80&w=1200', // Habitación moderna
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200', // Apartamento luminoso
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=1200', // Cocina
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200', // Salón elegante
    'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?q=80&w=1200', // Dormitorio cálido
    'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200', // Espacio abierto
];

async function seedPhotos() {
    console.log('🛌 Comenzando la inserción de fotos de prueba...');

    try {
        // 1. Obtener todos los apartamentos
        const { data: apartments, error: aptsError } = await supabase
            .from('apartments')
            .select('slug, name');

        if (aptsError) throw aptsError;

        if (!apartments || apartments.length === 0) {
            console.log('⚠️ No se encontraron apartamentos en la base de datos.');
            return;
        }

        console.log(`✅ Se encontraron ${apartments.length} apartamentos.`);

        // 2. Insertar 3 o 4 fotos para cada apartamento
        for (const apt of apartments) {
            console.log(`📸 Añadiendo fotos para: ${apt.name} (${apt.slug})`);

            // Eliminar fotos anteriores (opcional, para empezar desde cero)
            // await supabase.from('apartment_photos').delete().eq('apartment_slug', apt.slug);

            // Usar 3 o 4 fotos aleatorias de la lista para cada apartamento
            const shuffled = [...PLACEHOLDER_PHOTOS].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, Math.floor(Math.random() * 2) + 3); // 3 a 4 fotos

            const newPhotos = selected.map((url, idx) => ({
                apartment_slug: apt.slug,
                url: url,
                caption: `Foto ${idx + 1} de ${apt.name}`,
                display_order: idx
            }));

            const { data, error } = await supabase
                .from('apartment_photos')
                .insert(newPhotos)
                .select();

            if (error) {
                // En caso de fallar, posiblemente la tabla 'apartment_photos' no está lista o haya un problema de constraints
                console.error(`❌ Error insertando fotos para ${apt.slug}:`, error.message);
            } else {
                console.log(`  - ${data?.length || 0} fotos insertadas.`);
            }
        }

        console.log('\n🎉 ¡Proceso completado! Las fotos de prueba han sido añadidas a la base de datos.');
        console.log('Refresca la web para ver los cambios en la página de propiedades.');

    } catch (err) {
        console.error('❌ Error fatal durante la ejecución:', err);
    }
}

seedPhotos();
