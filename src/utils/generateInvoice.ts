/* eslint-disable */
// @ts-nocheck
import jsPDF from 'jspdf';
import { fetchAllApartments, fetchAllExtras, fetchSettings } from '../services/supabaseService';
import { formatGuestDisplay, formatReservationReference } from './format';

export default async function generateInvoice(reservation) {
  const refDisplay = formatReservationReference(reservation.id, reservation.source);

  const [apartments, extras, settings] = await Promise.all([
    fetchAllApartments(),
    fetchAllExtras(),
    fetchSettings(),
  ]);

  const siteSettings = {
    cleaningFee: settings?.cleaning_fee ?? 0,
    site_address: 'Ribadeo, Lugo, Galicia',
    site_email: settings?.site_email || 'info@apartamentosillapancha.com',
    site_phone: settings?.site_phone || '+34 982 XX XX XX',
    cancelDays: settings?.cancellation_free_days || 14,
    depositPct: settings?.payment_deposit_percentage || 50,
    taxPct: settings?.tax_percentage || 10,
  };

  const doc = new jsPDF();
  const margin = 20;
  let y = margin;

  // Colores (gris, azul, amarillo)
  const darkGray = [58, 58, 58];
  const blue = [26, 95, 110];
  const lightBlue = [194, 217, 232];
  const yellow = [212, 168, 67];
  const lightGray = [232, 232, 232];

  // ── CABECERA ──────────────────────────────────────────────────
  doc.setFillColor(...blue);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(245, 245, 245);
  doc.text('Illa Pancha Ribadeo', margin, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(194, 217, 232);
  doc.text(
    siteSettings?.site_address ||
      'Ribadeo, Lugo, Galicia' +
        '  ·  ' +
        (siteSettings?.site_email || 'info@apartamentosillapancha.com') +
        '  ·  ' +
        (siteSettings?.site_phone || '+34 982 XX XX XX'),
    margin,
    24
  );

  doc.setFontSize(11);
  doc.setTextColor(245, 245, 245);
  doc.text('RESGUARDO DE RESERVA', margin, 34);

  y = 50;

  // ── NÚMERO Y FECHA ─────────────────────────────────────────────
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, 170, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...darkGray);
  doc.text('Ref. ' + refDisplay, margin + 6, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(138, 138, 138);
  doc.text(
    'Emitida: ' +
      new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
    margin + 6,
    y + 15
  );

  y += 28;

  // ── DOS COLUMNAS: DATOS CLIENTE / DATOS RESERVA ────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(138, 138, 138);
  doc.text('CLIENTE', margin, y);
  doc.text('RESERVA', 120, y);
  y += 5;

  doc.setDrawColor(...lightGray);
  doc.line(margin, y, 100, y);
  doc.line(120, y, 190, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...darkGray);

  const rawGuest = reservation.guest || reservation.guest_name || '';
  const guestLine =
    reservation.source === 'booking'
      ? formatGuestDisplay(rawGuest, 'booking')
      : rawGuest || 'Huésped';
  const clientLines = [
    guestLine,
    reservation.email || reservation.guest_email || '',
    reservation.phone || reservation.guest_phone || '',
  ].filter(Boolean);

  const reservaLines = [
    reservation.apt || reservation.apartment_name || 'Apartamento',
    'Entrada: ' + (reservation.checkin || '—'),
    'Salida: ' + (reservation.checkout || '—'),
    (reservation.nights || '—') + ' noches',
  ];

  const maxLines = Math.max(clientLines.length, reservaLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (clientLines[i]) doc.text(clientLines[i], margin, y);
    if (reservaLines[i]) doc.text(reservaLines[i], 120, y);
    y += 7;
  }

  y += 8;

  // ── TABLA DE CONCEPTOS ─────────────────────────────────────────
  doc.setFillColor(...darkGray);
  doc.rect(margin, y, 170, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(245, 245, 245);
  doc.text('CONCEPTO', margin + 4, y + 5.5);
  doc.text('IMPORTE', 175, y + 5.5, { align: 'right' });
  y += 11;

  const apt = apartments?.find(a => a.slug === reservation.aptSlug) || apartments?.[0];
  const nightPrice = reservation.nightPrice || (apt ? apt.price : 120);

  const lineItems = [
    [
      `${reservation.nights || 7} noches × ${nightPrice}€/noche`,
      nightPrice * (reservation.nights || 7),
    ],
  ];
  if (siteSettings.cleaningFee > 0) {
    lineItems.push(['Limpieza final', siteSettings.cleaningFee]);
  }

  if (reservation.extras && reservation.extras.length > 0) {
    reservation.extras.forEach(extraId => {
      const extra = extras?.find(e => e.id === extraId);
      if (extra) {
        lineItems.push([extra.name + (extra.price === 0 ? ' (incluido)' : ''), extra.price]);
      }
    });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...darkGray);

  lineItems.forEach((item, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y - 4, 170, 9, 'F');
    }
    doc.text(item[0], margin + 4, y + 2);
    doc.text(item[1] === 0 ? 'Gratis' : item[1] + ' EUR', 175, y + 2, { align: 'right' });
    y += 9;
  });

  y += 4;

  // ── TOTAL ──────────────────────────────────────────────────────
  doc.setFillColor(...blue);
  doc.rect(margin, y, 170, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(245, 245, 245);
  doc.text('TOTAL', margin + 4, y + 8.5);
  doc.text((reservation.total || 840) + ' EUR', 175, y + 8.5, { align: 'right' });
  y += 18;

  // ── DESGLOSE PAGO ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(138, 138, 138);
  doc.text('DESGLOSE DE PAGO', margin, y);
  y += 5;
  doc.setDrawColor(...lightGray);
  doc.line(margin, y, 190, y);
  y += 6;

  const depositPct = siteSettings.depositPct;
  const deposit =
    reservation.deposit || Math.round((reservation.total || 840) * (depositPct / 100));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  doc.text(`Deposito con tarjeta (${depositPct}%) — Cobrado al reservar:`, margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...blue);
  doc.text(deposit + ' EUR  ✓ Pagado', 175, y, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  doc.text(`Resto en efectivo (${100 - depositPct}%) — A pagar al llegar:`, margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(138, 138, 138);
  doc.text(reservation.total - deposit + ' EUR  ⏳ Pendiente', 175, y, { align: 'right' });
  y += 16;

  // ── NOTA CANCELACIÓN ──────────────────────────────────────────
  doc.setFillColor(212, 168, 67, 0.15);
  doc.rect(margin, y, 170, 16, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(139, 94, 10);
  doc.text(
    `Cancelación gratuita hasta ${siteSettings.cancelDays} días antes del check-in.`,
    margin + 4,
    y + 6
  );
  doc.text(
    'Pasado ese plazo se aplicará la política de cancelación indicada en los Términos y Condiciones.',
    margin + 4,
    y + 12
  );
  y += 24;

  // ── PIE ────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(138, 138, 138);
  doc.text(
    'Illa Pancha Ribadeo S.L.  ·  Ribadeo, Lugo, Galicia, España  ·  info@apartamentosillapancha.com',
    105,
    285,
    { align: 'center' }
  );
  doc.text(
    'Este documento sirve como resguardo de reserva. No tiene validez como factura fiscal hasta la emisión definitiva.',
    105,
    290,
    { align: 'center' }
  );

  doc.save(
    'resguardo-reserva-' + refDisplay.replace(/[^a-zA-Z0-9-]/g, '_') + '.pdf',
  );
}
