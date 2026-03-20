import * as XLSX from 'xlsx';
import { fetchExtras } from '../services/supabaseService';

export default async function exportReservationsExcel(reservations, filename = 'reservas-illa-pancha.xlsx') {
  const extras = await fetchExtras();
  const statusLabel = { confirmed: 'Confirmada', pending: 'Pendiente', cancelled: 'Cancelada' };
  const sourceLabel = { web: 'Directa', booking: 'Booking.com' };

  const data = reservations.map(r => {
    const extrasNames = (r.extras || [])
      .map(id => extras.find(e => e.id === id)?.name || id)
      .join(', ');

    return {
      'Referencia': r.id,
      'Huesped': r.guest,
      'Email': r.email,
      'Telefono': r.phone,
      'Apartamento': r.apt,
      'Check-in': r.checkin,
      'Check-out': r.checkout,
      'Noches': r.nights,
      'Total (EUR)': r.total,
      'Deposito (EUR)': r.deposit,
      'Estado': statusLabel[r.status] || r.status,
      'Origen': sourceLabel[r.source] || r.source,
      'Efectivo recibido': r.cashPaid ? 'Si' : 'No',
      'Extras': extrasNames || '—',
      'Total extras (EUR)': r.extrasTotal || 0,
    };
  });

  // Fila de totales
  const confirmed = reservations.filter(r => r.status !== 'cancelled');
  data.push({
    'Referencia': '',
    'Huesped': 'TOTALES',
    'Email': '',
    'Telefono': '',
    'Apartamento': '',
    'Check-in': '',
    'Check-out': '',
    'Noches': confirmed.reduce((s, r) => s + r.nights, 0),
    'Total (EUR)': reservations.reduce((s, r) => s + r.total, 0),
    'Deposito (EUR)': confirmed.reduce((s, r) => s + r.deposit, 0),
    'Estado': '',
    'Origen': '',
    'Efectivo recibido': '',
    'Extras': '',
    'Total extras (EUR)': reservations.reduce((s, r) => s + (r.extrasTotal || 0), 0),
  });

  const ws = XLSX.utils.json_to_sheet(data);

  // Anchos de columna
  ws['!cols'] = [
    { wch: 10 }, { wch: 22 }, { wch: 25 }, { wch: 18 },
    { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
    { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    { wch: 16 }, { wch: 30 }, { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reservas');
  XLSX.writeFile(wb, filename);
}
