import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Configura OWNER_EMAIL en Supabase Dashboard → Edge Functions → Secrets
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") || "info@apartamentosillapancha.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data = await req.json();
    const { type, panelUrl } = data;

    // Formatear fecha con día de la semana en español: "lunes, 5 de mayo de 2025"
    const formatDateWithDay = (dateStr: string): string => {
      try {
        const [y, m, d] = (dateStr || '').slice(0, 10).split('-').map(Number);
        if (!y) return dateStr;
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('es-ES', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
      } catch { return dateStr; }
    };

    let subject = "";
    let html = "";

    if (type === "booking") {
      const { reservationId, guestName, guestEmail, apartmentName, checkin, checkout, nights, total, deposit } = data;
      subject = `Nueva reserva ${reservationId} — ${apartmentName}`;
      const checkinFmt  = formatDateWithDay(checkin);
      const checkoutFmt = formatDateWithDay(checkout);
      html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
          <div style="background:#1a5f6e;padding:32px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">🏠 Nueva reserva recibida</h1>
          </div>
          <div style="background:#f9f9f9;padding:32px;">
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;">Referencia</td><td style="text-align:right;border-bottom:1px solid #eee;font-weight:bold;">${reservationId}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;">Apartamento</td><td style="text-align:right;border-bottom:1px solid #eee;">${apartmentName}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;">Huésped</td><td style="text-align:right;border-bottom:1px solid #eee;">${guestName}<br><span style="font-size:12px;color:#888;">${guestEmail}</span></td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;">Fechas</td><td style="text-align:right;border-bottom:1px solid #eee;">${checkinFmt} → ${checkoutFmt}<br><span style="font-size:12px;color:#888;">${nights} noches</span></td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;">Total</td><td style="text-align:right;border-bottom:1px solid #eee;font-weight:bold;color:#1a5f6e;font-size:18px;">${total}€</td></tr>
              <tr><td style="padding:8px 0;color:#666;">Depósito cobrado</td><td style="text-align:right;color:#16a34a;font-weight:bold;">${deposit}€ ✓</td></tr>
            </table>
            <a href="${panelUrl}" style="display:inline-block;background:#1a5f6e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">
              Ver en el panel de gestión →
            </a>
          </div>
        </div>
      `;
    } else if (type === "contact") {
      const { guestName, guestEmail, guestPhone, subject: msgSubject, message } = data;
      subject = `Nuevo mensaje: ${msgSubject || "Consulta general"}`;
      html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
          <div style="background:#1a5f6e;padding:32px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">✉️ Nuevo mensaje de contacto</h1>
          </div>
          <div style="background:#f9f9f9;padding:32px;">
            <p style="margin:0 0 8px;"><strong>De:</strong> ${guestName} &lt;${guestEmail}&gt;</p>
            ${guestPhone ? `<p style="margin:0 0 8px;"><strong>Teléfono:</strong> ${guestPhone}</p>` : ""}
            <p style="margin:0 0 16px;"><strong>Asunto:</strong> ${msgSubject || "Consulta general"}</p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:24px;">
              <p style="margin:0;white-space:pre-wrap;line-height:1.6;">${message}</p>
            </div>
            <a href="${panelUrl}" style="display:inline-block;background:#1a5f6e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">
              Ver mensajes en el panel →
            </a>
          </div>
        </div>
      `;
    } else if (type === "cancellation") {
      const { reservationId, guestName, guestEmail, apartmentName, checkin, checkout, nights, total } = data;
      subject = `❌ Reserva cancelada ${reservationId} — ${apartmentName}`;
      const checkinFmt2  = formatDateWithDay(checkin);
      const checkoutFmt2 = formatDateWithDay(checkout);
      html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
          <div style="background:#b91c1c;padding:32px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">❌ Reserva cancelada</h1>
          </div>
          <div style="background:#f9f9f9;padding:32px;">
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;">Referencia</td><td style="text-align:right;border-bottom:1px solid #eee;font-weight:bold;">${reservationId}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;">Apartamento</td><td style="text-align:right;border-bottom:1px solid #eee;">${apartmentName}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;">Huésped</td><td style="text-align:right;border-bottom:1px solid #eee;">${guestName}<br><span style="font-size:12px;color:#888;">${guestEmail}</span></td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;">Fechas</td><td style="text-align:right;border-bottom:1px solid #eee;">${checkinFmt2} → ${checkoutFmt2}<br><span style="font-size:12px;color:#888;">${nights} noches</span></td></tr>
              <tr><td style="padding:8px 0;color:#666;">Total</td><td style="text-align:right;color:#b91c1c;font-weight:bold;font-size:18px;">${total}€</td></tr>
            </table>
            <a href="${panelUrl}" style="display:inline-block;background:#1a5f6e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">
              Ver en el panel de gestión →
            </a>
          </div>
        </div>
      `;
    } else if (type === "review") {
      const { guestName, stars, comment, apartmentName } = data;
      subject = `⭐ Nueva reseña recibida — ${guestName}`;
      html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
          <div style="background:#D4A843;padding:32px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">⭐ Novedad: Nueva reseña recibida</h1>
          </div>
          <div style="background:#f9f9f9;padding:32px;">
            <p style="margin:0 0 16px;"><strong>Huésped:</strong> ${guestName} (${apartmentName})</p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:24px;">
              <p style="font-size:20px;color:#D4A843;margin-bottom:8px;">${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</p>
              <p style="margin:0;font-style:italic;line-height:1.6;">"${comment || 'Sin comentario'}"</p>
            </div>
            <a href="${panelUrl}" style="display:inline-block;background:#1a5f6e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">
              Ver y aprobar en el panel →
            </a>
          </div>
        </div>
      `;
    } else {
      subject = `Notificación — Illa Pancha`;
      html = `<p>Nuevo evento: <strong>${type}</strong></p><p><a href="${panelUrl}">Ver panel de gestión</a></p>`;
    }

    await resend.emails.send({
      from: "Illa Pancha Ribadeo <info@apartamentosillapancha.com>",
      to: OWNER_EMAIL,
      subject,
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending owner notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
