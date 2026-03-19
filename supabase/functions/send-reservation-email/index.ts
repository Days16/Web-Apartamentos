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
            nights,
            total,
            deposit,
            reservationId,
            portalUrl
        } = await req.json();

        const depositFormatted = typeof deposit === 'number' ? deposit.toFixed(2) : deposit;
        const totalFormatted = typeof total === 'number' ? total.toFixed(2) : total;
        const remaining = (parseFloat(total) - parseFloat(deposit)).toFixed(2);
        const portalLink = portalUrl ? `${portalUrl}?id=${reservationId}` : `https://illapancha.com/mi-reserva?id=${reservationId}`;

        const result = await resend.emails.send({
            from: "Illa Pancha Ribadeo <reservas@apartamentosillapancha.com>",
            to: guestEmail,
            subject: `✅ Reserva confirmada ${reservationId} — Illa Pancha Ribadeo`,
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
          <td style="background:linear-gradient(135deg,#1a5f6e 0%,#0f3d47 100%);padding:48px 40px;text-align:center;">
            <div style="width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
              <!-- Inline SVG logo (house) to avoid emoji rendering issues in emails -->
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="#ffffff" />
                <path d="M9 22V12h6v10" fill="#e6f6f3" opacity="0.9" />
              </svg>
            </div>
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:300;letter-spacing:1px;">Illa Pancha Ribadeo</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:13px;letter-spacing:2px;text-transform:uppercase;">Apartamentos Turísticos · Ribadeo, Galicia</p>
          </td>
        </tr>

        <!-- CONFIRMACIÓN -->
        <tr>
          <td style="padding:40px 40px 0;text-align:center;">
            <div style="display:inline-block;background:#e8f5e9;border-radius:50px;padding:8px 20px;margin-bottom:20px;">
              <span style="color:#2e7d32;font-size:13px;font-weight:600;">✓ Reserva confirmada</span>
            </div>
            <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:600;">¡Hola, ${guestName}!</h2>
            <p style="margin:0;color:#64748b;font-size:15px;line-height:1.6;">Tu reserva en <strong style="color:#1a5f6e;">${apartmentName}</strong> ha sido confirmada y el pago recibido correctamente.</p>
          </td>
        </tr>

        <!-- DETALLES RESERVA -->
        <tr>
          <td style="padding:32px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
              <tr>
                <td colspan="2" style="padding:16px 20px;background:#1a5f6e;">
                  <span style="color:#ffffff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Detalles de tu reserva</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Referencia</td>
                <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a;font-size:13px;font-family:monospace;">${reservationId}</td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Apartamento</td>
                <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:#0f172a;font-size:13px;">${apartmentName}</td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Check-in</td>
                <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:#0f172a;font-size:13px;">${checkin}</td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Check-out</td>
                <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:#0f172a;font-size:13px;">${checkout}</td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Duración</td>
                <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:#0f172a;font-size:13px;">${nights} noche${nights !== 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style="padding:14px 20px;color:#64748b;font-size:13px;">Total</td>
                <td style="padding:14px 20px;text-align:right;font-weight:700;color:#1a5f6e;font-size:16px;">${totalFormatted} €</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- PAGO -->
        <tr>
          <td style="padding:0 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="48%" style="background:#e8f5e9;border-radius:8px;padding:16px;text-align:center;">
                  <div style="font-size:11px;color:#388e3c;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">💳 Pagado ahora</div>
                  <div style="font-size:22px;font-weight:700;color:#1b5e20;">${depositFormatted} €</div>
                </td>
                <td width="4%"></td>
                <td width="48%" style="background:#fff8e1;border-radius:8px;padding:16px;text-align:center;">
                  <div style="font-size:11px;color:#f57f17;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">💵 Al llegar</div>
                  <div style="font-size:22px;font-weight:700;color:#e65100;">${remaining} €</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA BOTÓN -->
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">Puedes consultar y gestionar tu reserva en cualquier momento desde nuestro portal de clientes.</p>
            <a href="${portalLink}"
               style="display:inline-block;background:linear-gradient(135deg,#1a5f6e 0%,#0f3d47 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:16px 40px;border-radius:8px;letter-spacing:0.5px;">
              Ver mi reserva →
            </a>
            <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">O copia este enlace en tu navegador:<br>
              <span style="color:#1a5f6e;">${portalLink}</span>
            </p>
          </td>
        </tr>

        <!-- SEPARADOR -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#e2e8f0;"></div></td></tr>

        <!-- PIE -->
        <tr>
          <td style="padding:28px 40px;text-align:center;">
            <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;">¿Tienes alguna duda? Responde a este correo o contáctanos en</p>
            <a href="mailto:info@illapancha.com" style="color:#1a5f6e;font-size:13px;font-weight:600;text-decoration:none;">info@illapancha.com</a>
            <p style="margin:20px 0 0;color:#cbd5e1;font-size:11px;">© Illa Pancha Ribadeo · Ribadeo, Lugo, Galicia</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>
            `,
        });

        return new Response(JSON.stringify({ success: true, id: result.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error sending email:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
