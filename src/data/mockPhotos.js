const PLACEHOLDER_PHOTOS = [
    'https://images.unsplash.com/photo-1502672260266-1c1e52408437?q=80&w=1200',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=1200',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200',
    'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?q=80&w=1200',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200',
];

export const mockPhotosDB = {
    // Base array for properties that don't have explicit photos
    default: PLACEHOLDER_PHOTOS.map((url, i) => ({
        id: `photo-default-${i}`,
        photo_url: url,
        caption: `Vista del apartamento ${i + 1}`,
        display_order: i
    })),

    // Specific photos for each apartment based on slug
    'rosa-ila': PLACEHOLDER_PHOTOS.slice(0, 4).map((url, i) => ({
        id: `photo-rosaila-${i}`,
        photo_url: url,
        caption: `Rosa Ila - Espacio ${i + 1}`,
        display_order: i
    })),

    'mar-de-rinlo': PLACEHOLDER_PHOTOS.slice(2, 6).map((url, i) => ({
        id: `photo-rinlo-${i}`,
        photo_url: url,
        caption: `Mar de Rinlo - Vista ${i + 1}`,
        display_order: i
    }))
};

export function getMockPhotosForApartment(slug) {
    return mockPhotosDB[slug] || mockPhotosDB.default;
}
