/**
 * Edge Function: weekly-report
 *
 * Envía cada lunes un resumen de la semana anterior al propietario con:
 * - Reservas confirmadas + importe total
 * - Nuevos mensajes recibidos
 * - Check-ins y check-outs realizados
 * - Ocupación media de la semana
 *
 * Activar el cron en Supabase Dashboard → Edge Functions → Schedules:
 *   Cron expression: 0 8 * * 1   (lunes a las 8:00 UTC)
 *   Function: weekly-report
 *
 * O vía SQL con pg_cron:
 *   select cron.schedule('weekly-report', '0 8 * * 1',
 *     $$select net.http_post(url := 'https://<project>.supabase.co/functions/v1/weekly-report',
 *       headers := '{"Authorization":"Bearer <service_role_key>"}') as request_id$$);
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") || "";

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Rango: lunes pasado → domingo pasado (semana anterior completa)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=dom, 1=lun, ..., 6=sáb
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - daysToLastMonday - 7);
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 7);

  const fromISO = lastMonday.toISOString().split("T")[0];
  const toISO = lastSunday.toISOString().split("T")[0];

  const weekLabel = `${lastMonday.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${new Date(lastSunday.getTime() - 1).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`;

  // Reservas confirmadas creadas esta semana
  const { data: newReservations } = await supabase
    .from("reservations")
    .select("*")
    .eq("status", "confirmed")
    .gte("created_at", lastMonday.toISOString())
    .lt("created_at", lastSunday.toISOString());

  // Check-ins de la semana
  const { data: checkins } = await supabase
    .from("reservations")
    .select("id, guest_name, apt_slug")
    .neq("status", "cancelled")
    .gte("checkin", fromISO)
    .lt("checkin", toISO);

  // Check-outs de la semana
  const { data: checkouts } = await supabase
    .from("reservations")
    .select("id, guest_name, apt_slug")
    .neq("status", "cancelled")
    .gte("checkout", fromISO)
    .lt("checkout", toISO);

  // Mensajes recibidos esta semana
  const { data: messages } = await supabase
    .from("messages")
    .select("id")
    .gte("created_at", lastMonday.toISOString())
    .lt("created_at", lastSunday.toISOString());

  // Ocupación: reservas activas durante la semana
  const { data: activeReservations } = await supabase
    .from("reservations")
    .select("checkin, checkout, apt_slug")
    .neq("status", "cancelled")
    .lt("checkin", toISO)
    .gt("checkout", fromISO);

  // Apartamentos totales para calcular ocupación
  const { data: apartments } = await supabase
    .from("apartments")
    .select("slug")
    .eq("active", true);

  const totalApts = apartments?.length ?? 1;
  const totalNights = 7 * totalApts;
  let occupiedNights = 0;
  activeReservations?.forEach(r => {
    const cin = new Date(Math.max(new Date(r.checkin).getTime(), lastMonday.getTime()));
    const cout = new Date(Math.min(new Date(r.checkout).getTime(), lastSunday.getTime()));
    const nights = Math.max(0, (cout.getTime() - cin.getTime()) / 86400000);
    occupiedNights += nights;
  });
  const occupancyPct = totalNights > 0 ? Math.round((occupiedNights / totalNights) * 100) : 0;

  const totalIncome = newReservations?.reduce((sum, r) => sum + (r.total_price ?? r.total ?? 0), 0) ?? 0;
  const confirmedCount = newReservations?.length ?? 0;
  const messagesCount = messages?.length ?? 0;
  const checkinsCount = checkins?.length ?? 0;
  const checkoutsCount = checkouts?.length ?? 0;

  const checkinRows = checkins?.map(r =>
    `<tr><td style="padding:4px 12px">${r.guest_name ?? "—"}</td><td style="padding:4px 12px">${r.apt_slug}</td></tr>`
  ).join("") || `<tr><td colspan="2" style="padding:8px 12px;color:#94a3b8">Ninguno</td></tr>`;

  const html = `
    <div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#0f172a">
      <h2 style="color:#1a5f6e">📅 Resumen semanal — ${weekLabel}</h2>
      <p>Actividad de la semana pasada en <strong>Illa Pancha Apartamentos</strong>.</p>

      <table style="border-collapse:collapse;width:100%;margin:20px 0;background:#f8fafc;border-radius:8px">
        <tr>
          <td style="padding:10px 14px;font-weight:600">Nuevas reservas confirmadas</td>
          <td style="padding:10px 14px;text-align:right;font-size:1.2em;font-weight:700;color:#1a5f6e">${confirmedCount}</td>
        </tr>
        <tr style="background:#fff">
          <td style="padding:10px 14px;font-weight:600">Ingresos nuevas reservas</td>
          <td style="padding:10px 14px;text-align:right;font-size:1.2em;font-weight:700;color:#1a5f6e">${totalIncome.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:600">Check-ins realizados</td>
          <td style="padding:10px 14px;text-align:right">${checkinsCount}</td>
        </tr>
        <tr style="background:#fff">
          <td style="padding:10px 14px;font-weight:600">Check-outs realizados</td>
          <td style="padding:10px 14px;text-align:right">${checkoutsCount}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:600">Mensajes recibidos</td>
          <td style="padding:10px 14px;text-align:right">${messagesCount}</td>
        </tr>
        <tr style="background:#fff">
          <td style="padding:10px 14px;font-weight:600">Ocupación media</td>
          <td style="padding:10px 14px;text-align:right;font-weight:700;color:${occupancyPct >= 70 ? '#16a34a' : '#64748b'}">${occupancyPct}%</td>
        </tr>
      </table>

      ${checkinsCount > 0 ? `
      <h3 style="color:#1a5f6e;margin-top:28px">Check-ins de la semana</h3>
      <table style="border-collapse:collapse;width:100%;background:#f8fafc;border-radius:8px">
        <tr style="border-bottom:1px solid #e2e8f0">
          <th style="padding:6px 12px;text-align:left;color:#64748b">Huésped</th>
          <th style="padding:6px 12px;text-align:left;color:#64748b">Apartamento</th>
        </tr>
        ${checkinRows}
      </table>` : ""}

      <p style="margin-top:36px;font-size:12px;color:#94a3b8">
        Enviado automáticamente cada lunes. Para desactivar este email ve a
        <a href="${SUPABASE_URL.replace(".supabase.co", "")}/admin/emails" style="color:#1a5f6e">Panel Admin → Emails</a>.
      </p>
    </div>`;

  if (!RESEND_API_KEY || !OWNER_EMAIL) {
    return new Response(
      JSON.stringify({ ok: true, preview: html, warning: "RESEND_API_KEY o OWNER_EMAIL no configurados" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verificar si el resumen semanal está activado en site_settings
  const { data: setting } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "email_weekly_report_enabled")
    .maybeSingle();

  if (setting?.value === "false" || setting?.value === false) {
    return new Response(JSON.stringify({ ok: true, skipped: "weekly report disabled in settings" }), { status: 200 });
  }

  // Email destinatario configurable
  const { data: recipientSetting } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "email_weekly_report_recipient")
    .maybeSingle();

  const recipient = recipientSetting?.value || OWNER_EMAIL;

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Illa Pancha <noreply@apartamentosillapancha.com>",
      to: recipient,
      subject: `📅 Resumen semanal — ${weekLabel}`,
      html,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ ok: true, week: weekLabel, confirmed: confirmedCount, income: totalIncome, occupancy: occupancyPct }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
