import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno&no-check";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET_KEY") || "";

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
    if (!TURNSTILE_SECRET) return true;
    if (!token?.trim()) return false;
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

// Rate limiting persistente en Supabase: 3 intentos por IP cada 10 minutos
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

async function isRateLimited(ip: string): Promise<boolean> {
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const now = Date.now();
    const resetAt = new Date(now + RATE_WINDOW_MS).toISOString();
    const { data } = await supabase
        .from("rate_limits")
        .select("count, reset_at")
        .eq("ip", ip)
        .single();
    if (!data || now > new Date(data.reset_at).getTime()) {
        await supabase.from("rate_limits").upsert({ ip, count: 1, reset_at: resetAt });
        return false;
    }
    if (data.count >= RATE_LIMIT) return true;
    await supabase.from("rate_limits").update({ count: data.count + 1 }).eq("ip", ip);
    return false;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    if (await isRateLimited(ip)) {
        return new Response(
            JSON.stringify({ error: "Demasiados intentos. Espera unos minutos." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
    }

    try {
        const {
            amount,
            currency,
            customerEmail,
            customerName,
            reservationId,
            description,
            turnstileToken,
        } = await req.json();

        const turnstileOk = await verifyTurnstile(turnstileToken || "", ip);
        if (!turnstileOk) {
            return new Response(
                JSON.stringify({
                    error: "Verificación de seguridad no válida. Completa el captcha e inténtalo de nuevo.",
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
            );
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: currency || 'eur',
            description: description || `Reserva ${reservationId}`,
            receipt_email: customerEmail,
            metadata: {
                reservationId,
                customerName,
            }
        });

        return new Response(
            JSON.stringify({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Payment error detail:", error);
        return new Response(
            JSON.stringify({ 
                error: error.message,
                detail: error.stack
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
