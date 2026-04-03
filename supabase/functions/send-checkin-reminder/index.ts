import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Edge Function que busca reservas con checkin en las próximas 48h y envía el email de info de llegada.
// Se invoca mediante cron cada hora (o manualmente desde el panel admin).
//
// Cron sugerido en Supabase (Dashboard → Database → Cron Jobs):
//   Nombre:    send-checkin-reminders
//   Schedule:  0 * * * *   (cada hora en punto)
//   Command:   select net.http_post(
//                url := 'https://wzjonvdauwaispnjosaw.supabase.co/functions/v1/send-checkin-reminder',
//                headers := '{"Authorization":"Bearer <anon_key>"}'::jsonb
//              );

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase    = createClient(supabaseUrl, serviceKey);

  const siteUrl = Deno.env.get("VITE_SITE_URL") ?? "https://apartamentosillapancha.com";

  // ── 1. Obtener configuración global (código, instrucciones, teléfono) ────────
  const { data: settingsRows } = await supabase
    .from("settings")
    .select("key, value");

  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) {
    settings[row.key] = row.value;
  }

  const lockCode    = settings["checkin_lock_code"]    ?? "";
  const accessInfo  = settings["checkin_access_info"]  ?? "";
  const houseRules  = settings["checkin_house_rules"]  ?? "";
  const contactPhone = settings["contact_phone"]       ?? "";

  // ── 2. Buscar reservas con checkin en las próximas 48h que no hayan recibido el recordatorio ──
  const now     = new Date();
  const in48h   = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const in47h   = new Date(now.getTime() + 47 * 60 * 60 * 1000); // margen de 1h para no perder la ventana

  // Formato YYYY-MM-DD para comparar con las fechas de la BD
  const todayStr = now.toISOString().slice(0, 10);
  const in48hStr = in48h.toISOString().slice(0, 10);

  const { data: reservations, error: resErr } = await supabase
    .from("reservations")
    .select("id, guest, email, checkin, checkout, apt_slug, apt")
    .eq("status", "confirmed")
    .eq("checkin_reminder_sent", false)
    .gte("checkin", todayStr)
    .lte("checkin", in48hStr);

  if (resErr) {
    return new Response(JSON.stringify({ error: resErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── 3. Filtrar solo las que están dentro de la ventana exacta 47-48h ────────
  // (el query por fecha puede incluir reservas de "mañana" aunque falten más de 48h
  // si el checkin es a las 00:00 del día siguiente — filtramos por hora exacta)
  const toRemind = (reservations ?? []).filter(r => {
    const checkinDate = new Date(r.checkin + "T16:00:00"); // entrada a las 16h
    const diffMs = checkinDate.getTime() - now.getTime();
    return diffMs > 0 && diffMs <= 48 * 60 * 60 * 1000;
  });

  console.log(`[send-checkin-reminder] ${toRemind.length} reservas para notificar de ${reservations?.length ?? 0} candidatas`);

  const results: any[] = [];

  for (const res of toRemind) {
    if (!res.email) {
      console.warn(`[send-checkin-reminder] Sin email para reserva ${res.id}, saltando`);
      results.push({ id: res.id, status: "skipped", reason: "no email" });
      continue;
    }

    try {
      // Obtener nombre del apartamento
      const { data: apt } = await supabase
        .from("apartments")
        .select("name")
        .eq("slug", res.apt_slug ?? res.apt)
        .maybeSingle();

      const aptName = apt?.name ?? res.apt_slug ?? res.apt ?? "Tu apartamento";

      // Formatear fechas legibles
      const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("es-ES", {
        day: "numeric", month: "long", year: "numeric"
      });

      // Llamar a la función de envío
      const emailRes = await fetch(
        `${supabaseUrl}/functions/v1/send-checkin-info`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey}`,
          },
          body: JSON.stringify({
            guestEmail:    res.email,
            guestName:     res.guest,
            apartmentName: aptName,
            checkin:       fmt(res.checkin),
            checkout:      fmt(res.checkout),
            reservationId: res.id,
            portalUrl:     `${siteUrl}/mi-reserva`,
            lockCode,
            accessInfo,
            houseRules,
            contactPhone,
          }),
        }
      );

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        throw new Error(`send-checkin-info respondió ${emailRes.status}: ${errText}`);
      }

      // Marcar como enviado para no volver a enviar
      await supabase
        .from("reservations")
        .update({ checkin_reminder_sent: true })
        .eq("id", res.id);

      results.push({ id: res.id, guest: res.guest, email: res.email, status: "sent" });
      console.log(`[send-checkin-reminder] ✅ Enviado a ${res.email} (${res.id})`);

    } catch (err: any) {
      console.error(`[send-checkin-reminder] ❌ Error en ${res.id}:`, err.message);
      results.push({ id: res.id, status: "error", error: err.message });
    }
  }

  return new Response(JSON.stringify({ checked: reservations?.length ?? 0, sent: results.filter(r => r.status === "sent").length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
