/* eslint-disable */
// @ts-nocheck
/**
 * Hoja de Registro de Entrada.
 * Usa el mismo PDF base (reserva-template.pdf) y superpone el contenido encima.
 */

interface CheckInProps {
  reservation: {
    id: string;
    guest: string;
    email: string;
    phone?: string | null;
    checkin: string;
    checkout: string;
    apt?: string;
    apt_slug?: string;
    source?: string;
  };
  settings?: {
    registro_titulo?: string;
    registro_identificador?: string;
    registro_notas?: string;
  };
  apartmentName?: string;
}

function formatLongDate(iso: string): string {
  if (!iso) return '';
  const datePart = iso.split('T')[0];
  const parts = datePart.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return iso;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
  const month = date.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
  return `${weekday} ${d} DE ${month} DE ${y}`;
}

function splitName(fullName: string) {
  const parts = (fullName || '').trim().split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export async function printCheckIn(props: CheckInProps) {
  const { reservation, settings = {}, apartmentName } = props;
  const identifier = settings.registro_identificador || '';
  const notes = settings.registro_notas || '';
  const isBooking = reservation.source === 'booking';
  const { firstName, lastName } = splitName(reservation.guest);
  const aptLabel = apartmentName || reservation.apt || reservation.apt_slug || '';
  const reservationRef = reservation.id || '';

  const today = new Date().toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Registro de Entrada</title>
  <link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #888; }
    #wrapper {
      position: relative;
      width: 794px;
      height: 1123px;
      margin: 0 auto;
      background: #fff;
      overflow: hidden;
    }
    #bg-canvas {
      position: absolute;
      top: 0; left: 0;
      width: 794px;
      height: 1123px;
    }
    .ov {
      position: absolute;
      font-family: 'Josefin Sans', Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.3;
    }
    .ov-value { font-size: 10.5px; font-weight: 600; }
    .ov-bold  { font-size: 10.5px; font-weight: 700; }
    .ov-apt   { font-size: 11.5px; font-weight: 700; }

    /* Tabla que reemplaza la caja gris */
    #reg-table {
      position: absolute;
      top: 560px;
      left: 22px;
      right: 22px;
      width: 750px;
    }
    #reg-table table {
      width: 100%;
      border-collapse: collapse;
      background: #e4ecee;
    }
    #reg-table td {
      border: 1px solid #8ab4bc;
      padding: 6px 9px;
      vertical-align: top;
    }
    #reg-table .lbl {
      display: block;
      font-family: 'Josefin Sans', Arial, sans-serif;
      font-size: 7.5px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #1a5f6e;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    #reg-table .val {
      display: block;
      font-family: 'Josefin Sans', Arial, sans-serif;
      font-size: 10.5px;
      color: #1a1a1a;
      min-height: 18px;
    }
    #reg-table tr.tall td { height: 44px; }
    #reg-table tr.sign td { height: 60px; }

    /* Cubre la zona de instrucciones originales con texto del registro */
    #notes-cover {
      position: absolute;
      top: 800px;
      left: 22px;
      right: 22px;
      font-family: 'Josefin Sans', Arial, sans-serif;
      font-size: 10px;
      color: #333;
      line-height: 1.7;
    }

    @media print {
      html, body { background: #fff; }
      @page { size: A4; margin: 0; }
      #wrapper { margin: 0; }
    }
  </style>
</head>
<body>
  <div id="wrapper">
    <canvas id="bg-canvas"></canvas>

    <!-- Nº RESERVA value -->
    <span class="ov ov-value" style="top:350px; left:454px;">${reservationRef}</span>

    <!-- FECHA value -->
    <span class="ov ov-value" style="top:374px; left:395px;">${today}</span>

    ${identifier ? `<span class="ov ov-value" style="top:396px; left:395px;">${identifier}</span>` : ''}

    <!-- Apartamento nombre -->
    ${aptLabel ? `<span class="ov ov-apt" style="top:483px; left:113px; max-width:580px;">${aptLabel}</span>` : ''}

    <!-- TABLA REGISTRO — cubre la caja gris -->
    <div id="reg-table">
      <table>
        ${!isBooking ? `
        <tr class="tall">
          <td width="50%">
            <span class="lbl">Nombre / Name</span>
            <span class="val">${firstName}</span>
          </td>
          <td width="50%">
            <span class="lbl">Apellidos / Surname</span>
            <span class="val">${lastName}</span>
          </td>
        </tr>` : `
        <tr class="tall">
          <td colspan="2">
            <span class="lbl">Nombre completo / Full name</span>
            <span class="val">&nbsp;</span>
          </td>
        </tr>`}
        <tr class="tall">
          <td>
            <span class="lbl">DNI / Pasaporte — Número / Number</span>
            <span class="val">&nbsp;</span>
          </td>
          <td>
            <span class="lbl">Número de soporte / Support number</span>
            <span class="val">&nbsp;</span>
          </td>
        </tr>
        <tr class="tall">
          <td>
            <span class="lbl">Fecha de nacimiento / Date of birth</span>
            <span class="val">&nbsp;</span>
          </td>
          <td>
            <span class="lbl">Teléfono móvil / Telephone number</span>
            <span class="val">${reservation.phone || ''}</span>
          </td>
        </tr>
        <tr class="tall">
          <td>
            <span class="lbl">Población / City</span>
            <span class="val">&nbsp;</span>
          </td>
          <td>
            <span class="lbl">País / Country</span>
            <span class="val">&nbsp;</span>
          </td>
        </tr>
        <tr class="tall">
          <td>
            <span class="lbl">Correo electrónico / Email</span>
            <span class="val">${reservation.email || ''}</span>
          </td>
          <td>
            <span class="lbl">Fecha de entrada / Check-in</span>
            <span class="val">${formatLongDate(reservation.checkin)}</span>
          </td>
        </tr>
        <tr class="tall">
          <td>
            <span class="lbl">Número de reserva / Reservation number</span>
            <span class="val">${reservationRef}</span>
          </td>
          <td>
            <span class="lbl">Fecha de salida / Check-out</span>
            <span class="val">${formatLongDate(reservation.checkout)}</span>
          </td>
        </tr>
        <tr class="sign">
          <td colspan="2">
            <span class="lbl">Firma / Signature</span>
            <span class="val">&nbsp;</span>
          </td>
        </tr>
      </table>
    </div>

    ${notes ? `
    <div id="notes-cover" style="top:800px; font-size:9px; color:#555; border-top:1px solid #aac5cb; padding-top:6px;">
      ${notes}
    </div>` : ''}
  </div>

  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const SCALE = 794 / 595;

    pdfjsLib.getDocument(window.location.origin + '/reserva-template.pdf')
      .promise
      .then(function(pdf) { return pdf.getPage(1); })
      .then(function(page) {
        var viewport = page.getViewport({ scale: SCALE });
        var canvas = document.getElementById('bg-canvas');
        var ctx = canvas.getContext('2d');
        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        return page.render({ canvasContext: ctx, viewport: viewport }).promise;
      })
      .then(function() { window.print(); })
      .catch(function(err) {
        console.error('Error cargando plantilla PDF:', err);
        window.print();
      });
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=860,height=1000');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
