import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { fetchExtras } from '../services/supabaseService';
import { formatGuestDisplay, formatReservationReference } from './format';

// Estilo de cabeceras genérico (Fondo verde corporativo y texto blanco)
const headerStyle = {
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A5F6E' } } as ExcelJS.FillPattern,
  alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
};

const fmt = (n: number) => (typeof n === 'number' ? n.toFixed(2) : n);

// ─── EXPORTAR ANALÍTICAS ───────────────────────────────────────────────────
export async function exportAnalytics({
  byMonth,
  aptStats,
  bySource,
  byStatus,
  year,
  totalRevenue,
  yearRevenue,
  totalNights,
  avgStay,
  avgTicket,
}: any) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Illa Pancha';
  wb.created = new Date();

  // Función de ayuda para añadir hojas y darles formato a las cabeceras
  const addSheet = (data: any[], name: string, columnWidths: number[] = []) => {
    if (!data || !data.length) return;
    const ws = wb.addWorksheet(name);

    // Obtener las claves (cabeceras) de la primera fila
    const headers = Object.keys(data[0]);

    // Insertar las cabeceras
    ws.addRow(headers);
    const headerRow = ws.getRow(1);

    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;

      // Anchos por defecto o personalizados
      ws.getColumn(i + 1).width = columnWidths[i] || 22;
    });

    headerRow.commit();

    // Insertar datos
    data.forEach(rowItem => {
      const rowData = headers.map(h => rowItem[h]);
      const row = ws.addRow(rowData);
      row.alignment = { vertical: 'middle' };
    });
  };

  // Hoja 1: Resumen
  const summaryData = [
    { Métrica: 'Año analizado', Valor: year },
    { Métrica: 'Ingresos totales histórico (€)', Valor: fmt(totalRevenue) },
    { Métrica: `Ingresos ${year} (€)`, Valor: fmt(yearRevenue) },
    { Métrica: 'Total noches vendidas (histórico)', Valor: totalNights },
    { Métrica: 'Estancia media (noches)', Valor: avgStay },
    { Métrica: 'Ticket medio (€)', Valor: fmt(avgTicket) },
  ];

  // Hoja 2: Ingresos por mes
  const monthData = byMonth.map((m: any) => ({
    Mes: m.label,
    Reservas: m.count,
    'Ingresos (€)': fmt(m.revenue),
    'Noches vendidas': m.nights,
    'Ocupación (%)': m.rate ?? '',
  }));

  // Hoja 3: Por apartamento
  const aptData = (aptStats || []).map((a: any) => ({
    Apartamento: a.name,
    Reservas: a.count,
    'Ingresos (€)': fmt(a.revenue),
    Noches: a.nights,
  }));

  // Hoja 4: Por canal
  const sourceData = (bySource || []).map((s: any) => ({
    Canal: s.label,
    Reservas: s.count,
    'Ingresos (€)': fmt(s.revenue || 0),
    '% del total': s.pct ?? '',
  }));

  // Hoja 5: Por estado (histórico)
  const statusData = (byStatus || []).map((s: any) => ({
    Estado: s.label,
    Reservas: s.count,
  }));

  addSheet(summaryData, 'Resumen', [30, 20]);
  addSheet(monthData, `Meses ${year}`, [15, 12, 15, 18, 15]);
  addSheet(aptData, 'Por apartamento', [30, 15, 15, 15]);
  addSheet(sourceData, 'Por canal', [25, 15, 15, 15]);
  addSheet(statusData, 'Por estado', [20, 15]);

  // Generar y descargar el archivo final en el navegador
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `analiticas-illa-pancha-${year}.xlsx`);
}

// ─── EXPORTAR RESERVAS INDIVIDUALES ──────────────────────────────────────────
export default async function exportReservationsExcel(
  reservations: any[],
  filename = 'reservas-illa-pancha.xlsx'
) {
  const extras = await fetchExtras();
  const statusLabel: Record<string, string> = {
    confirmed: 'Confirmada',
    pending: 'Pendiente',
    cancelled: 'Cancelada',
  };
  const sourceLabel: Record<string, string> = { web: 'Directa', booking: 'Booking.com' };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Illa Pancha';
  wb.created = new Date();

  const ws = wb.addWorksheet('Reservas');

  const headers = [
    'Referencia',
    'Huésped',
    'Email',
    'Teléfono',
    'Apartamento',
    'Check-in',
    'Check-out',
    'Noches',
    'Total (€)',
    'Depósito (€)',
    'Estado',
    'Origen',
    'Efectivo',
    'Extras',
    'Total Extras (€)',
  ];

  // Configurar columnas y anchos correctos
  ws.columns = [
    { header: headers[0], width: 12 },
    { header: headers[1], width: 25 },
    { header: headers[2], width: 30 },
    { header: headers[3], width: 16 },
    { header: headers[4], width: 20 },
    { header: headers[5], width: 14 },
    { header: headers[6], width: 14 },
    { header: headers[7], width: 10 },
    { header: headers[8], width: 14 },
    { header: headers[9], width: 14 },
    { header: headers[10], width: 14 },
    { header: headers[11], width: 16 },
    { header: headers[12], width: 12 },
    { header: headers[13], width: 35 },
    { header: headers[14], width: 16 },
  ];

  // Formato cabeceras
  const headerRow = ws.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = headerStyle.font;
    cell.fill = headerStyle.fill;
    cell.alignment = headerStyle.alignment;
  });

  // Datos
  reservations.forEach(r => {
    const extrasNames = (Array.isArray(r.extras) ? r.extras : [])
      .map((id: string) => extras.find((e: any) => e.id === id)?.name || id)
      .join(', ');

    ws.addRow([
      formatReservationReference(r.id, r.source),
      formatGuestDisplay(r.guest_name || r.guest, r.source),
      r.email || '',
      r.phone || '',
      r.apartment_slug || r.apt || '',
      r.checkin || r.check_in || '',
      r.checkout || r.check_out || '',
      r.nights || 0,
      r.total_price || r.total || 0,
      r.deposit || 0,
      statusLabel[r.status] || r.status || '',
      sourceLabel[r.source] || r.source || '',
      r.cashPaid || r.cash_paid ? 'Sí' : 'No',
      extrasNames || '—',
      r.extrasTotal || r.extras_total || 0,
    ]);
  });

  // Fila final de Sumatorios Totales
  const confirmed = reservations.filter(r => r.status !== 'cancelled');
  const totalsRow = ws.addRow([
    '',
    'TOTALES',
    '',
    '',
    '',
    '',
    '',
    confirmed.reduce((s, r) => s + (r.nights || 0), 0),
    reservations.reduce((s, r) => s + (r.total_price || r.total || 0), 0),
    confirmed.reduce((s, r) => s + (r.deposit || 0), 0),
    '',
    '',
    '',
    '',
    reservations.reduce((s, r) => s + (r.extrasTotal || r.extras_total || 0), 0),
  ]);

  // Estilo fila totales
  totalsRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  });

  // Generar Archivo
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename);
}
