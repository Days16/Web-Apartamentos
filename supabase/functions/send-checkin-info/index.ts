import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      guestEmail,
      guestName,
      apartmentName,
      checkin,
      checkout,
      reservationId,
      portalUrl,
      lockCode,
      accessInfo,
      houseRules,
      contactPhone,
      address,
      whatsapp,
    } = await req.json();

    const portalLink = `${portalUrl ?? "https://apartamentosillapancha.com/mi-reserva"}?id=${reservationId}`;

    // Formatear fecha con día de la semana en español
    const parseDate = (input: string | undefined | null): Date | null => {
      if (!input) return null;
      const raw = input.toString().trim();

      // ISO / yyyy-mm-dd / yyyy-mm-ddTHH:mm:ss / UTC variants
      let date = new Date(raw);
      if (!isNaN(date.getTime())) return date;

      // dd/mm/yyyy or d/m/yyyy
      const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (slashMatch) {
        const [, dd, mm, yyyy] = slashMatch;
        date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (!isNaN(date.getTime())) return date;
      }

      // yyyy-mm-dd with optional time and timezone
      const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) {
        const [, yyyy, mm, dd] = isoMatch;
        date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (!isNaN(date.getTime())) return date;
      }

      return null;
    };

    const formatDateWithDay = (dateStr: string): string => {
      const date = parseDate(dateStr);
      if (!date) return dateStr || '';
      return date.toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
    };

    const checkinFormatted  = formatDateWithDay(checkin);
    const checkoutFormatted = formatDateWithDay(checkout);

    const checkinDisplay = checkinFormatted || (checkin || 'No disponible');
    const checkoutDisplay = checkoutFormatted || (checkout || 'No disponible');
    const lockCodeDisplay = lockCode ? `🔔${lockCode}🔔` : 'Código no disponible';
    const addressDisplay = address || 'Dirección no disponible';
    const contactPhoneDisplay = contactPhone || 'Teléfono no disponible';
    const whatsappDisplay = whatsapp || 'WhatsApp no disponible';
    const accessInfoDisplay = accessInfo || 'No hay instrucciones de acceso especificadas.';
    const houseRulesDisplay = houseRules || 'No se han proporcionado normas de la finca.';

    const result = await resend.emails.send({
      from: "Illa Pancha Ribadeo <info@apartamentosillapancha.com>",
      to: guestEmail,
      subject: `🔑 Información de llegada — ${apartmentName} · Illa Pancha`,
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

      <!-- CABECERA -->
      <tr>
        <td style="background:linear-gradient(135deg,#1a5f6e 0%,#0f3d47 100%);padding:36px 40px;text-align:center;">
          <div style="font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">Illa Pancha · Ribadeo</div>
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">🔑 Información de llegada</h1>
          <div style="margin-top:10px;color:rgba(255,255,255,0.85);font-size:15px;">Tu check-in es mañana — aquí tienes todo lo que necesitas</div>
        </td>
      </tr>

      <!-- SALUDO -->
      <tr>
        <td style="padding:32px 40px 0;">
          <p style="margin:0;font-size:16px;color:#1e293b;">Hola <strong>${guestName}</strong>,</p>
          <p style="margin:12px 0 0;font-size:15px;color:#475569;line-height:1.6;">
            Tu estancia en <strong>${apartmentName}</strong> comienza mañana. Te enviamos toda la información para que tu llegada sea perfecta.
          </p>
        </td>
      </tr>

      <!-- FECHAS -->
      <tr>
        <td style="padding:24px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:16px 20px;text-align:center;border-right:1px solid #e2e8f0;">
                <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Check-in</div>
                <div style="font-size:18px;font-weight:700;color:#1a5f6e;">${checkinDisplay}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">A partir de las 16:00h</div>
              </td>
              <td style="padding:16px 20px;text-align:center;">
                <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Check-out</div>
                <div style="font-size:18px;font-weight:700;color:#0f3d47;">${checkoutDisplay}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">Antes de las 12:00h</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CÓDIGO DE ACCESO -->
      <tr>
        <td style="padding:24px 40px 0;">
          <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:20px 24px;text-align:center;">
            <div style="font-size:12px;color:#059669;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:8px;">🔒 Código de la caja de llaves</div>
            <div style="font-size:28px;font-weight:800;color:#065f46;letter-spacing:3px;font-family:monospace;">${lockCodeDisplay}</div>
          </div>
        </td>
      </tr>

      <!-- DIRECCIÓN + CONTACTO -->
      <tr>
        <td style="padding:20px 40px 0;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;">
            <div style="font-size:12px;color:#1a5f6e;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px;">📍 Dirección del alojamiento</div>
            <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;white-space:pre-line;">${addressDisplay}</p>
            <div style="margin-top:12px;font-size:12px;color:#1a5f6e;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px;">📞 Teléfono de contacto</div>
            <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">${contactPhoneDisplay}</p>
            <div style="margin-top:12px;font-size:12px;color:#1a5f6e;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px;">💬 WhatsApp (solo dígitos)</div>
            <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">${whatsappDisplay}</p>
          </div>
        </td>
      </tr>

      <!-- INSTRUCCIONES DE ACCESO -->
      <tr>
        <td style="padding:20px 40px 0;">
          <div style="border-left:3px solid #1a5f6e;padding:12px 16px;background:#f0f9ff;">
            <div style="font-size:12px;color:#1a5f6e;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px;">📍 Instrucciones de acceso</div>
            <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;white-space:pre-line;">${accessInfoDisplay}</p>
          </div>
        </td>
      </tr>

      <!-- NORMAS -->
      <tr>
        <td style="padding:20px 40px 0;">
          <div style="border-left:3px solid #D4A843;padding:12px 16px;background:#fffbeb;">
            <div style="font-size:12px;color:#92400e;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px;">📋 Normas de la finca</div>
            <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;white-space:pre-line;">${houseRulesDisplay}</p>
          </div>
        </td>
      </tr>

      <!-- CONTACTO Y PORTAL -->
      <tr>
        <td style="padding:24px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${contactPhone ? `
              <td width="48%" style="background:#f8fafc;border-radius:10px;padding:16px;text-align:center;vertical-align:top;">
                <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">¿Necesitas ayuda?</div>
                <a href="tel:${contactPhone}" style="font-size:18px;font-weight:700;color:#1a5f6e;text-decoration:none;">${contactPhone}</a>
                <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Llámanos o escríbenos</div>
              </td>
              <td width="4%"></td>` : ''}
              <td style="background:#f8fafc;border-radius:10px;padding:16px;text-align:center;vertical-align:top;">
                <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Tu portal de reserva</div>
                <a href="${portalLink}" style="display:inline-block;background:#1a5f6e;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">Ver mi reserva →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- PIE -->
      <tr>
        <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            Illa Pancha · Apartamentos turísticos en Ribadeo, Galicia<br>
            <a href="https://apartamentosillapancha.com" style="color:#1a5f6e;text-decoration:none;">apartamentosillapancha.com</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>

</body>
</html>`,
    });

    return new Response(JSON.stringify({ ok: true, id: result.data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[send-checkin-info]", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
