import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Rate limiting en memoria ────────────────────────────────────────────────
// Nota: se resetea en cada cold start. Usa la tabla rate_limits en Supabase
// si necesitas persistencia entre instancias.
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const RATE_LIMIT = 5; // max 5 mensajes por IP por hora
const ipLog = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipLog.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    ipLog.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

// ─── Verificación Turnstile ──────────────────────────────────────────────────
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true; // sin secret configurado, pasar en dev
  const form = new FormData();
  form.append("secret", TURNSTILE_SECRET);
  form.append("response", token);
  form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  return data.success === true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limit
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: "Demasiadas solicitudes. Inténtalo más tarde." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { name, email, phone, apt, msg, turnstileToken } = await req.json();

    // Validación mínima
    if (!name?.trim() || !email?.includes("@") || !msg?.trim()) {
      return new Response(
        JSON.stringify({ error: "Datos del formulario incompletos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar CAPTCHA
    if (turnstileToken) {
      const valid = await verifyTurnstile(turnstileToken, ip);
      if (!valid) {
        return new Response(
          JSON.stringify({ error: "Verificación CAPTCHA fallida. Inténtalo de nuevo." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Insertar mensaje en Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error: insertError } = await supabase
      .from("messages")
      .insert([{ name, email, phone: phone || null, apartment_slug: apt || null, message: msg }]);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
