import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Exporta el calendario .ics de un apartamento con sus reservas confirmadas.
// URL: /functions/v1/export-ical?slug=cantabrico
// Booking.com u otros OTAs pueden suscribirse a esta URL.

function pad(n: number) { return String(n).padStart(2, "0"); }

function toIcalDate(dateStr: string): string {
  // "2024-06-15" → "20240615"
  return dateStr.replace(/-/g, "");
}

function toIcalDateTime(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
         `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeIcal(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let result = line.substring(0, 75);
  let remaining = line.substring(75);
  while (remaining.length > 0) {
    result += "\r\n " + remaining.substring(0, 74);
    remaining = remaining.substring(74);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response("Falta el parámetro ?slug=", { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Reservas confirmadas del apartamento
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("id, guest, checkin, checkout, created_at")
    .eq("apt_slug", slug)
    .eq("status", "confirmed");

  if (error) {
    return new Response("Error obteniendo reservas", { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }

  const siteUrl = Deno.env.get("VITE_SITE_URL") || "https://www.apartamentosillapancha.com";
  const now = toIcalDateTime(new Date());

  const events = (reservations || []).map((r: any) => {
    const uid = `${r.id}@illapancha`;
    const dtstart = toIcalDate(r.checkin);
    const dtend   = toIcalDate(r.checkout);
    const created = r.created_at ? toIcalDateTime(new Date(r.created_at)) : now;
    const summary = escapeIcal(`Reservado - Illa Pancha`);

    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `CREATED:${created}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:Reserva confirmada en Illa Pancha - ${slug}`,
      `URL:${siteUrl}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ].map(foldLine).join("\r\n");
  });

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Illa Pancha//${slug}//ES`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Illa Pancha - ${slug}`,
    "X-WR-TIMEZONE:Europe/Madrid",
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    ...events,
    "END:VCALENDAR",
  ].map(foldLine).join("\r\n");

  return new Response(ical, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
});
