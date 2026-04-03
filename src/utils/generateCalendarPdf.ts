/* eslint-disable */
// @ts-nocheck
import jsPDF from 'jspdf';
import { formatGuestDisplay } from './format';

const MONTH_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const FILL_RGB: Record<string, [number, number, number]> = {
  reserved: [134, 239, 172],
  booking: [147, 197, 253],
  pending: [254, 240, 138],
  external: [216, 180, 254],
  blocked: [254, 202, 202],
};

function findReservationForDay(aptSlug: string, date: Date, reservations: any[]) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dStr = `${y}-${m}-${day}`;

  return reservations.find(r => {
    const rSlug = r.aptSlug || r.apt_slug || r.apt;
    if (rSlug !== aptSlug) return false;
    const checkinStr = (
      typeof r.checkin === 'string' ? r.checkin : new Date(r.checkin).toISOString()
    ).slice(0, 10);
    const checkoutStr = (
      typeof r.checkout === 'string' ? r.checkout : new Date(r.checkout).toISOString()
    ).slice(0, 10);
    return dStr >= checkinStr && dStr < checkoutStr;
  });
}

function getStatusType(res: any) {
  if (!res) return null;
  if (
    res.status === 'blocked' ||
    res.id?.startsWith('BLK-') ||
    res.guest?.includes('Bloqueado') ||
    res.source === 'manual'
  )
    return 'blocked';
  if (res.status === 'pending') return 'pending';
  if (res.source === 'booking') return 'booking';
  if (res.source === 'web') return 'reserved';
  if (
    res.source === 'other' ||
    (res.source && res.source !== 'manual' && res.source !== 'web' && res.source !== 'booking')
  )
    return 'external';
  return 'reserved';
}

/**
 * PDF del calendario de ocupación (vectorial).
 */
export default function generateCalendarPdf(opts: {
  apartments: { slug: string; name: string; internalName?: string | null }[];
  reservations: any[];
  timelineDates: Date[];
}) {
  const { apartments, reservations, timelineDates } = opts;
  if (!timelineDates.length || !apartments.length) {
    alert('No hay datos suficientes para generar el PDF.');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 5;
  const col0W = 38;
  const rowH = 6.5;
  const headerBandH = 9;
  const DAYS_PER_CHUNK = 16;
  const titleBlockH = 16;
  let globalPage = 0;

  for (let chunkStart = 0; chunkStart < timelineDates.length; chunkStart += DAYS_PER_CHUNK) {
    const chunk = timelineDates.slice(chunkStart, chunkStart + DAYS_PER_CHUNK);
    const dayW = Math.min(12, (pageW - margin * 2 - col0W) / chunk.length);

    let aptOffset = 0;
    let firstPageOfChunk = true;

    while (aptOffset < apartments.length) {
      if (globalPage > 0) doc.addPage();
      globalPage++;

      let y = margin;

      if (chunkStart === 0 && firstPageOfChunk) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(15, 23, 42);
        doc.text('Calendario — Illa Pancha', margin, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `${reservations.length} reservas activas · ${apartments.length} alojamientos`,
          margin,
          y + 10,
        );
        y += titleBlockH;
      } else if (firstPageOfChunk) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(
          `Período: ${chunk[0].toLocaleDateString('es-ES')} → ${chunk[chunk.length - 1].toLocaleDateString('es-ES')}`,
          margin,
          y + 5,
        );
        y += 10;
      }

      const availableH = pageH - y - margin - 12;
      const maxRows = Math.max(3, Math.floor((availableH - headerBandH) / rowH));
      const slice = apartments.slice(aptOffset, aptOffset + maxRows);
      aptOffset += slice.length;
      firstPageOfChunk = false;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `${chunk[0].toLocaleDateString('es-ES')} → ${chunk[chunk.length - 1].toLocaleDateString('es-ES')}`,
        pageW - margin,
        Math.max(y, margin) + 2,
        { align: 'right' },
      );

      doc.setDrawColor(200, 200, 200);
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.rect(margin, y, col0W, headerBandH);
      doc.setFont('helvetica', 'bold');
      doc.text('Alojamiento', margin + 1, y + 5);
      doc.setFont('helvetica', 'normal');

      chunk.forEach((d, i) => {
        const x = margin + col0W + i * dayW;
        doc.rect(x, y, dayW, headerBandH);
        doc.text(String(d.getDate()), x + dayW / 2, y + 3.5, { align: 'center' });
        doc.text(MONTH_SHORT[d.getMonth()], x + dayW / 2, y + 7, { align: 'center' });
      });
      y += headerBandH;

      slice.forEach(apt => {
        const label = (apt.internalName || apt.name || apt.slug).slice(0, 26);
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        doc.rect(margin, y, col0W, rowH);
        doc.text(label, margin + 1, y + rowH / 2 + 1);

        chunk.forEach((d, i) => {
          const xi = margin + col0W + i * dayW;
          const res = findReservationForDay(apt.slug, d, reservations);
          doc.setDrawColor(210, 210, 210);
          doc.rect(xi, y, dayW, rowH);
          if (res) {
            const t = getStatusType(res);
            const rgb = FILL_RGB[t] || [230, 230, 230];
            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
            doc.rect(xi + 0.15, y + 0.15, dayW - 0.3, rowH - 0.3, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.rect(xi + 0.15, y + 0.15, dayW - 0.3, rowH - 0.3, 'S');

            const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const cin = (typeof res.checkin === 'string' ? res.checkin : '').slice(0, 10);
            if (cin === ymd) {
              doc.setFontSize(4.5);
              doc.setTextColor(15, 23, 42);
              const g = formatGuestDisplay(res.guest, res.source).slice(0, 12);
              doc.text(g, xi + 0.4, y + rowH / 2 + 0.8);
            }
          }
        });
        y += rowH;
      });

      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Leyenda colores: verde Web · azul Booking · amarillo Pendiente · morado Otros · rojo Bloqueado',
        margin,
        pageH - margin - 2,
      );
    }
  }

  doc.save(`calendario-illa-pancha-${new Date().toISOString().slice(0, 10)}.pdf`);
}
