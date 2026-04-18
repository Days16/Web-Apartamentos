/* eslint-disable */
// @ts-nocheck
import jsPDF from 'jspdf';

interface AptStat {
  name: string;
  reservations: number;
  nights: number;
  revenue: number;
  occupancy: number;
}

interface MonthData {
  label: string;
  reservations: number;
  revenue: number;
  occupancy: number;
}

interface Params {
  year: number | string;
  totalRevenue: number;
  yearRevenue: number;
  totalNights: number;
  avgStay: number;
  avgTicket: number;
  aptStats: AptStat[];
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
  byMonth: MonthData[];
}

const TEAL = [26, 95, 110] as [number, number, number];
const GOLD = [212, 168, 67] as [number, number, number];
const DARK = [15, 23, 42] as [number, number, number];
const MUTED = [100, 116, 139] as [number, number, number];
const LIGHT = [241, 245, 249] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];

function formatEuro(v: number): string {
  return `€ ${v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function tableHeader(
  doc: any,
  headers: string[],
  x: number,
  y: number,
  colWidths: number[]
): number {
  doc.setFillColor(...TEAL);
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  doc.rect(x, y, totalW, 8, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let cx = x + 3;
  headers.forEach((h, i) => {
    doc.text(h, cx, y + 5.5);
    cx += colWidths[i];
  });
  return y + 8;
}

function tableRow(
  doc: any,
  cells: string[],
  x: number,
  y: number,
  colWidths: number[],
  even: boolean
): number {
  if (even) {
    doc.setFillColor(...LIGHT);
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    doc.rect(x, y, totalW, 7, 'F');
  }
  doc.setTextColor(...DARK);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let cx = x + 3;
  cells.forEach((cell, i) => {
    doc.text(String(cell), cx, y + 5);
    cx += colWidths[i];
  });
  return y + 7;
}

export default function generateAnalyticsReport(params: Params) {
  const {
    year,
    totalRevenue,
    yearRevenue,
    totalNights,
    avgStay,
    avgTicket,
    aptStats,
    bySource,
    byStatus,
    byMonth,
  } = params;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210,
    margin = 15;
  let y = margin;

  /* ── Cabecera ── */
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, W, 28, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Illa Pancha · Ribadeo', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Informe de Analíticas — Año ${year}`, margin, 19);

  const today = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.setFontSize(8);
  doc.setTextColor(200, 220, 225);
  doc.text(`Generado: ${today}`, W - margin, 24, { align: 'right' });

  y = 38;

  /* ── KPIs globales ── */
  doc.setTextColor(...TEAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Resumen de métricas', margin, y);
  y += 6;

  const kpis = [
    { label: 'Ingresos históricos', value: formatEuro(totalRevenue) },
    { label: `Ingresos ${year}`, value: formatEuro(yearRevenue) },
    { label: 'Total noches', value: `${totalNights} noches` },
    { label: 'Estancia media', value: `${avgStay} noches` },
    { label: 'Ticket medio', value: formatEuro(avgTicket) },
  ];

  const kpiColW = (W - margin * 2) / 5;
  doc.setFillColor(...LIGHT);
  doc.rect(margin, y, W - margin * 2, 22, 'F');
  doc.setFillColor(...TEAL);
  doc.rect(margin, y, W - margin * 2, 1, 'F');

  kpis.forEach((k, i) => {
    const kx = margin + i * kpiColW + kpiColW / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(k.value, kx, y + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(k.label, kx, y + 16, { align: 'center' });
  });

  y += 30;

  /* ── Tabla ranking apartamentos ── */
  doc.setTextColor(...TEAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Ranking por apartamento', margin, y);
  y += 5;

  if (aptStats.length > 0) {
    const headers = ['Apartamento', 'Reservas', 'Noches', 'Ingresos', 'Ocupación'];
    const colW = [60, 25, 25, 40, 30];
    y = tableHeader(doc, headers, margin, y, colW);
    aptStats.forEach((apt, i) => {
      y = tableRow(
        doc,
        [
          apt.name || '—',
          String(apt.reservations),
          String(apt.nights),
          formatEuro(apt.revenue),
          `${apt.occupancy}%`,
        ],
        margin,
        y,
        colW,
        i % 2 === 1
      );
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('Sin datos de apartamentos.', margin, y + 6);
    y += 10;
  }

  y += 8;

  /* ── Tabla por origen ── */
  doc.setTextColor(...TEAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Reservas por origen', margin, y);
  y += 5;

  const srcLabels: Record<string, string> = {
    web: 'Web directa',
    booking: 'Booking.com',
    manual: 'Manual',
    airbnb: 'Airbnb',
  };
  const srcEntries = Object.entries(bySource);
  if (srcEntries.length > 0) {
    const colW = [60, 30, 50];
    y = tableHeader(doc, ['Origen', 'Reservas', '% del total'], margin, y, colW);
    const srcTotal = srcEntries.reduce((s, [, v]) => s + v, 0);
    srcEntries.forEach(([src, count], i) => {
      const pct = srcTotal > 0 ? ((count / srcTotal) * 100).toFixed(1) : '0';
      y = tableRow(
        doc,
        [srcLabels[src] || src, String(count), `${pct}%`],
        margin,
        y,
        colW,
        i % 2 === 1
      );
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('Sin datos de origen.', margin, y + 6);
    y += 10;
  }

  y += 8;

  /* ── Tabla mensual ── */
  if (y > 220) {
    doc.addPage();
    y = margin;
  }

  doc.setTextColor(...TEAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Desglose mensual ${year}`, margin, y);
  y += 5;

  const monthFiltered = byMonth.filter(
    m => m.label.includes(String(year)) || !String(m.label).includes('20')
  );
  if (monthFiltered.length > 0) {
    const colW = [35, 35, 35, 40, 35];
    y = tableHeader(doc, ['Mes', 'Reservas', 'Ingresos', 'Ocupación', ''], margin, y, colW);
    monthFiltered.slice(0, 12).forEach((m, i) => {
      y = tableRow(
        doc,
        [
          m.label,
          String(m.reservations || 0),
          formatEuro(m.revenue || 0),
          `${m.occupancy || 0}%`,
          '',
        ],
        margin,
        y,
        colW,
        i % 2 === 1
      );
    });
  }

  /* ── Footer ── */
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...TEAL);
    doc.rect(0, 290, W, 8, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(7);
    doc.text('Apartamentos Illa Pancha · Ribadeo, Galicia', margin, 295);
    doc.text(`Pág. ${i}/${pageCount}`, W - margin, 295, { align: 'right' });
  }

  doc.save(`analiticas_${year}.pdf`);
}
