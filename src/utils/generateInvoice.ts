/* eslint-disable */
// @ts-nocheck
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { fetchSettings, fetchApartmentBySlug } from '../services/supabaseService';
import { formatReservationReference } from './format';
import { DEFAULT_PDF_ELEMENTS } from '../pages/admin/PdfEditorAdmin';
import type { PdfElement } from '../pages/admin/PdfEditorAdmin';

const PDF_W = 595;

function formatLongDate(iso: string): string {
  if (!iso) return '';
  const datePart = iso.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  const wd = date.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
  const mo = date.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
  return `${wd} ${d} DE ${mo} DE ${y}`;
}

function wrapText(text: string, font: any, size: number, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    let w = maxW + 1;
    try { w = font.widthOfTextAtSize(test, size); } catch {}
    if (w > maxW && cur) { lines.push(cur); cur = word; }
    else { cur = test; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return rgb(
    isNaN(r) ? 0 : r,
    isNaN(g) ? 0 : g,
    isNaN(b) ? 0 : b,
  );
}

function resolveVars(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{([\w_]+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export default async function generateInvoice(reservation: any) {
  const refDisplay = formatReservationReference(reservation.id, reservation.source);
  const slugKey = reservation.apt_slug || reservation.aptSlug || '';

  const [settings, aptData] = await Promise.all([
    fetchSettings().catch(() => null),
    slugKey ? fetchApartmentBySlug(slugKey).catch(() => null) : Promise.resolve(null),
  ]);

  // Layout: from settings or default
  let elements: PdfElement[] = DEFAULT_PDF_ELEMENTS;
  const rawLayout = (settings as any)?.pdf_layout;
  if (rawLayout) {
    try {
      const stored = JSON.parse(rawLayout);
      // Formato v2: { _v: 2, elements: [...] } — respeta lo guardado sin migrar
      // Formato v1 (legacy): array directo — migrar si faltan campos
      if (stored && typeof stored === 'object' && !Array.isArray(stored) && stored._v >= 2) {
        if (Array.isArray(stored.elements) && stored.elements.length > 0) elements = stored.elements;
      } else if (Array.isArray(stored) && stored.length > 0) {
        elements = stored;
        // Migración v1: añadir desc/amen si faltan
        const hasDesc = elements.some(el => el.content.includes('{{apt_descripcion}}'));
        const hasAmen = elements.some(el => el.content.includes('{{apt_amenidades}}'));
        if (!hasDesc || !hasAmen) {
          const aptIdx = elements.findIndex(el => el.id === 'apt');
          const toAdd: PdfElement[] = [];
          if (!hasDesc) toAdd.push({ id: 'desc', label: 'Descripción apt.', type: 'dynamic', content: '{{apt_descripcion}}', x: 135, y: 358, fontSize: 8, bold: false, color: '#444444' });
          if (!hasAmen) toAdd.push({ id: 'amen', label: 'Amenidades',       type: 'dynamic', content: '{{apt_amenidades}}',  x: 155, y: 410, fontSize: 8, bold: false, color: '#1a5f6e' });
          elements = aptIdx >= 0
            ? [...elements.slice(0, aptIdx + 1), ...toAdd, ...elements.slice(aptIdx + 1)]
            : [...elements, ...toAdd];
        }
      }
    } catch {}
  }
  // Deduplicar por ID
  { const seen = new Set<string>(); elements = elements.filter(el => seen.has(el.id) ? false : (seen.add(el.id), true)); }

  const depositPct = settings?.payment_deposit_percentage || 50;
  const total      = reservation.total || 0;
  const deposit    = reservation.deposit ?? Math.round(total * (depositPct / 100));
  const pending    = total - deposit;
  const nights     = reservation.nights || 1;

  const capacity = aptData?.capacity || null;
  const aptName = (() => {
    const name = reservation.apartment_name || aptData?.name || reservation.apt || 'Apartamento';
    return capacity ? `${name} (hasta ${capacity} personas)` : name;
  })();

  const sourceLabel = (() => {
    switch (reservation.source) {
      case 'booking': return 'Booking.com';
      case 'airbnb':  return 'Airbnb';
      default:        return 'Reserva directa';
    }
  })();

  const today = new Date().toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const varMap: Record<string, string> = {
    ref:             refDisplay,
    fecha:           today,
    apt_nombre:      aptName,
    checkin_fecha:   formatLongDate(reservation.checkin),
    checkout_fecha:  formatLongDate(reservation.checkout),
    noches_num:      String(nights),
    fuente_canal:    sourceLabel,
    deposit_eur:     deposit > 0 ? `${deposit}\u20AC` : '\u2014',
    pending_eur:     pending > 0 ? `${pending}\u20AC` : `0\u20AC \u2713`,
    total_eur:       `${total}\u20AC`,
    nombre_huesped:  reservation.guest || reservation.guest_name || '',
    ...(() => {
      const raw = aptData?.description || '';
      const clean = (l: string) => l.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^[\u2728\u{1F3E1}\u{1F31F}\u{1F4AB}✨🏡🌟💫]\s*/u, '').trim();
      const allLines = raw.split(/\r?\n/).map(clean).filter(Boolean);
      // Línea 0 es el título (ya en apt_nombre) → saltar
      const lines = allLines.slice(1);
      // ✔️ (U+2714 + variante) → amenidades
      const listItems = lines.filter(l => /^✔/.test(l)).map(l => l.replace(/^✔️?\s*/, '').trim());
      // Resto → párrafos (descripción y cierre)
      const paragraphs = lines.filter(l => !/^✔/.test(l)).map(l => l.replace(/^[🏡✨🌟💫]\s*/u, '').trim()).filter(Boolean);
      return {
        apt_descripcion: paragraphs[0] || '',
        apt_amenidades:  listItems.length > 0 ? listItems.join('\n') : (aptData?.amenities || []).join('\n'),
        apt_tagline:     paragraphs.slice(1).join(' ') || (aptData?.tagline || ''),
      };
    })(),
  };

  // Load template + fonts
  const [templateBytes, josefinBoldBytes, josefinBytes] = await Promise.all([
    fetch('/reserva-template.pdf').then(r => r.arrayBuffer()),
    fetch('/josefin-sans-bold.ttf').then(r => r.arrayBuffer()).catch(() => null),
    fetch('/josefin-sans.ttf').then(r => r.arrayBuffer()).catch(() => null),
  ]);

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page   = pdfDoc.getPages()[0];
  const { height } = page.getSize();

  let fontBold: any, fontNormal: any;
  try {
    fontBold   = josefinBoldBytes ? await pdfDoc.embedFont(josefinBoldBytes) : await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    fontNormal = josefinBytes     ? await pdfDoc.embedFont(josefinBytes)     : await pdfDoc.embedFont(StandardFonts.Helvetica);
  } catch {
    fontBold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  function draw(text: string, x: number, yFromTop: number, font: any, size: number, color: any) {
    if (!text) return;
    try {
      page.drawText(String(text), { x, y: height - yFromTop, size, font, color });
    } catch {}
  }

  // Draw each element
  for (const el of elements) {
    const resolved = resolveVars(el.content, varMap);
    if (!resolved) continue;

    const font  = el.bold ? fontBold : fontNormal;
    const color = hexToRgb(el.color || '#0e0e0e');
    const size  = el.fontSize || 9;

    // Descripción y tagline: multi-línea con wrap
    if (el.content.includes('{{apt_descripcion}}') || el.content.includes('{{apt_tagline}}')) {
      const maxW = PDF_W - el.x - 30;
      const lineH = size + 4;
      const lines = wrapText(resolved, fontNormal, size, maxW > 100 ? maxW : 400);
      lines.slice(0, 3).forEach((line, i) => {
        draw(line, el.x, el.y + i * lineH, fontNormal, size, color);
      });
    // Amenidades: una línea por amenidad con bullet •
    } else if (el.content.includes('{{apt_amenidades}}') && resolved) {
      const BULLET = '\u2022';
      const lineH = size + 5;
      resolved.split('\n').forEach((amenity, i) => {
        if (!amenity.trim()) return;
        draw(BULLET, el.x - 10, el.y + i * lineH, fontNormal, size, hexToRgb(el.color || '#1a5f6e'));
        draw(amenity.trim(), el.x, el.y + i * lineH, fontNormal, size, color);
      });
    } else {
      draw(resolved, el.x, el.y, font, size, color);
    }
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob), '_blank');
}
