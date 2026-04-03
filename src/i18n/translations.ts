import es from './locales/es.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';

// Traducciones estáticas de la interfaz (textos de botones, labels, etc.)
// Los textos de apartamentos vienen de mockData (name/nameEn, description/descriptionEn...)

export const ui = {
  ES: es,
  EN: en,
  FR: fr,
  DE: de,
  PT: pt,
};

import type { Lang } from '../types';

export const useT = (lang: Lang) => ui[lang] || ui.ES;
