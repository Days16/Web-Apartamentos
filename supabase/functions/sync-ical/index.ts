import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sincronización horaria: Dashboard → Database → Cron (pg_cron + pg_net) o SQL:
//   Schedule: 0 * * * *  (cada hora en punto UTC)
//   Recomendado: secretos project_url y anon_key en Vault, luego:
//   select cron.schedule(
//     'sync-ical-hourly',
//     '0 * * * *',
//     $$ select net.http_post(
//          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1) || '/functions/v1/sync-ical',
//          headers := jsonb_build_object(
//            'Content-Type', 'application/json',
//            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key' limit 1),
//            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key' limit 1)
//          ),
//          body := '{}'::jsonb
//        ); $$
//   );
// Doc: https://supabase.com/docs/guides/functions/schedule-functions

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Parser iCal ──────────────────────────────────────────────────────────────
interface ICalEvent {
  uid: string;
  summary: string;
  description: string;
  dtstart: string; // YYYY-MM-DD
  dtend: string;   // YYYY-MM-DD
}

function parseIcal(text: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  const unfolded: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  let inEvent = false;
  let current: Partial<ICalEvent> = {};

  for (const line of unfolded) {
    if (!line.includes(":")) continue;

    const firstColon = line.indexOf(":");
    const propPart = line.slice(0, firstColon);
    const value = line.slice(firstColon + 1).trim();
    const propName = propPart.split(";")[0].toUpperCase();

    if (propName === "BEGIN" && value === "VEVENT") {
      inEvent = true;
      current = {};
    } else if (propName === "END" && value === "VEVENT") {
      if (current.uid && current.dtstart && current.dtend) {
        events.push(current as ICalEvent);
      }
      inEvent = false;
    } else if (inEvent) {
      if (propName === "UID") {
        current.uid = value;
      } else if (propName === "SUMMARY") {
        current.summary = value;
      } else if (propName === "DESCRIPTION") {
        current.description = value.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";");
      } else if (propName === "DTSTART") {
        current.dtstart = parseDate(value);
      } else if (propName === "DTEND") {
        current.dtend = parseDate(value);
      }
    }
  }
  return events;
}

function parseDate(val: string): string {
  let s = val.trim();
  if (s.includes(":")) {
    const afterColon = s.slice(s.lastIndexOf(":") + 1).trim();
    if (/^\d{8}/.test(afterColon) || /^\d{4}-\d{2}-\d{2}/.test(afterColon)) {
      s = afterColon;
    }
  }
  const clean = s.replace(/T.*/, "").replace(/Z$/i, "").replace(/-/g, "");
  if (clean.length >= 8 && /^\d{8}/.test(clean)) {
    const ymd = clean.slice(0, 8);
    return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`.slice(0, 10);
  return s.slice(0, 10);
}

interface BookingInfo {
  guestName: string;
  phone: string;
  email: string;
  bookingRef: string;
  adults: string;
  children: string;
}

function parseBookingDescription(description: string): BookingInfo {
  const get = (label: string): string => {
    const regex = new RegExp(`${label}[:\\s]+([^\\n]+)`, "i");
    return description.match(regex)?.[1]?.trim() ?? "";
  };

  return {
    guestName:
      get("GUEST NAME") ||
      get("NAME") ||
      get("HUÉSPED") ||
      get("HUESPED") ||
      get("HÓSPEDE"),
    phone:      get("PHONE") || get("TEL"),
    email:      get("EMAIL"),
    bookingRef: get("BOOKING REFERENCE") || get("BOOKING REF") || get("RESERVATION ID"),
    adults:     get("ADULTS"),
    children:   get("CHILDREN"),
  };
}

const BOOKING_GUEST_FALLBACK = "Reserva Booking";

function isBookingPlaceholderGuestName(name: string): boolean {
  const n = name.trim();
  if (!n) return true;
  const lower = n.toLowerCase();
  if (lower.includes("not available")) return true;
  if (lower.includes("no disponible")) return true;
  if (/\bclosed\b/i.test(n) && (/\bhuésped\b/i.test(n) || /\bhuesped\b/i.test(n) || /\bguest\b/i.test(n))) {
    return true;
  }
  if (/^closed\b/i.test(n)) return true;
  if (/^huésped$/i.test(n) || /^huesped$/i.test(n) || /^guest$/i.test(n)) return true;
  return false;
}

function resolveBookingGuestDisplay(rawGuest: string, summary: string): string {
  const candidates = [rawGuest.trim(), (summary || "").trim()].filter(Boolean);
  for (const c of candidates) {
    if (c && !isBookingPlaceholderGuestName(c)) return c;
  }
  return BOOKING_GUEST_FALLBACK;
}

// Genera un ID estilo web IP-XXXXXX (6 dígitos aleatorios)
function generateWebId(): string {
    return "IP-" + (Math.floor(Math.random() * 900000) + 100000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Obtener orígenes y precios de apartamentos
    const { data: sources, error: srcErr } = await supabase
      .from("ical_sources")
      .select("*");

    if (srcErr) {
      console.error("Error fetching ical_sources:", srcErr);
      return new Response(JSON.stringify({ error: `Failed to fetch sources: ${srcErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obtener apartamentos para mapear precios
    const { data: apartments, error: aptErr } = await supabase
      .from("apartments")
      .select("slug, name, internal_name, price");

    if (aptErr) {
      console.error("Error fetching apartments:", aptErr);
      return new Response(JSON.stringify({ error: `Failed to fetch apartments: ${aptErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aptMap = new Map(apartments?.map(a => [a.slug, a]) || []);

    let targetId: string | null = null;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (body.id) targetId = body.id;
      }
    } catch { /* no body */ }

    const activeSources = (sources || []).filter((s: any) => s.active !== false);
    const toSync = targetId
      ? (sources || []).filter((s: any) => s.id === targetId)
      : activeSources;

    const results: any[] = [];

    for (const source of toSync) {
      const aptInfo = aptMap.get(source.apartment_slug);
      if (!aptInfo) {
        console.warn(`Skipping source ${source.id}: apartment ${source.apartment_slug} not found`);
        const msg = `Apartment ${source.apartment_slug} not found`;
        await supabase
          .from("ical_sources")
          .update({
            last_sync: new Date().toISOString(),
            last_status: "error",
            last_message: msg,
          })
          .eq("id", source.id);
        results.push({ id: source.id, status: "error", error: msg });
        continue;
      }

      try {
      const res = await fetch(source.url, {
        headers: { "User-Agent": "IllaPancha/1.0 iCalSync" },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} al obtener ${source.url}`);
      const text = await res.text();
      const events = parseIcal(text);
      const fetchedUids: string[] = [];
      const aptName = aptInfo?.internal_name || aptInfo?.name || source.apartment_slug;
      const aptPrice = aptInfo?.price || 0;

      for (const ev of events) {
        const ical_uid = `booking-${source.apartment_slug}-${ev.uid}`;
        fetchedUids.push(ical_uid);

        const nights = Math.max(1, Math.round(
          (new Date(ev.dtend).getTime() - new Date(ev.dtstart).getTime()) / 86400000
        ));

        // Calcular total estimado
        const estimatedTotal = nights * aptPrice;

        const info = parseBookingDescription(ev.description ?? "");
        const guestName = resolveBookingGuestDisplay(
          info.guestName || "",
          ev.summary || "",
        );

        const reservationData = {
          ical_uid,
          apt_slug:     source.apartment_slug,
          apt:          aptName,
          guest:        guestName,
          checkin:      ev.dtstart,
          checkout:     ev.dtend,
          nights,
          total:        estimatedTotal,
          deposit:      0,
          status:       "confirmed",
          source:       "booking", 
          email:        info.email || "",
          phone:        info.phone || null,
          external_id:  info.bookingRef || null,
          notes:        [
            info.bookingRef ? `Ref. Booking: ${info.bookingRef}` : "",
            info.adults     ? `${info.adults} adultos` : "",
            info.children   ? `${info.children} niños` : "",
            "Precio calculado automáticamente."
          ].filter(Boolean).join(" | ") || null,
        };

        const { data: existing } = await supabase
          .from("reservations")
          .select("id")
          .eq("ical_uid", ical_uid)
          .maybeSingle();

        if (existing?.id) {
          // Si el total es 0, actualizar con el estimado
          await supabase.from("reservations").update(reservationData).eq("id", existing.id);
        } else {
          // Nueva con ID estilo web IP-XXXXXX
          const newId = generateWebId();
          const { error: insErr } = await supabase
            .from("reservations")
            .insert({ ...reservationData, id: newId });

          if (!insErr) {
            await supabase.functions.invoke("send-owner-notification", {
              body: {
                type: "booking",
                reservationId: newId,
                guestName,
                guestEmail: info.email || "No proporcionado",
                apartmentName: aptName,
                checkin: ev.dtstart,
                checkout: ev.dtend,
                nights,
                total: estimatedTotal,
                deposit: 0,
                panelUrl: "https://apartamentosillapancha.com/gestion"
              }
            }).catch(() => {});
          }
        }
      }

      // Eliminar bloqueos iCal que ya no están en el feed (también si el .ics va vacío)
      try {
        const { data: existing } = await supabase
          .from("reservations")
          .select("id, ical_uid")
          .eq("apt_slug", source.apartment_slug)
          .not("ical_uid", "is", null)
          .like("ical_uid", `booking-${source.apartment_slug}-%`);

        if (existing && existing.length > 0) {
          const toRemove = existing.filter((r: any) => !fetchedUids.includes(r.ical_uid));
          for (const item of toRemove) {
            await supabase.from("reservations").delete().eq("id", item.id);
          }
        }
      } catch (cleanupErr: any) {
        console.error(`Cleanup warning for source ${source.id}:`, cleanupErr.message);
      }

      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from("ical_sources")
        .update({ last_sync: now, last_status: "ok", last_message: null })
        .eq("id", source.id);

      if (updateErr) {
        console.error(`Error updating ical_sources for source ${source.id}:`, updateErr);
        results.push({ id: source.id, status: "warning", message: "Sync OK but metadata update failed", error: updateErr.message });
      } else {
        results.push({ id: source.id, status: "ok" });
      }
    } catch (err: any) {
      console.error(`Error syncing source ${source.id}:`, err);
      const errText = err.message || String(err);
      await supabase
        .from("ical_sources")
        .update({
          last_sync: new Date().toISOString(),
          last_status: "error",
          last_message: errText.length > 500 ? errText.slice(0, 500) : errText,
        })
        .eq("id", source.id);
      results.push({ id: source.id, status: "error", error: errText });
    }
  }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (globalErr: any) {
    console.error("Global sync-ical error:", globalErr);
    return new Response(
      JSON.stringify({ error: `Sync failed: ${globalErr.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
