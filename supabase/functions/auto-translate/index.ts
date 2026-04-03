/**
 * Edge Function: auto-translate
 *
 * Traducción sin clave obligatoria:
 * - Por defecto: MyMemory (gratis, límites diarios; ver https://mymemory.translated.net/)
 * - Opcional: DeepL si existe DEEPL_API_KEY (mejor calidad)
 *
 * Modos:
 * - Sin `targets` (legacy): texto en inglés → FR, DE, PT.
 * - Con `targets` + `sourceLang`: p. ej. ES → EN, FR, DE, PT.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const DEEPL_API_KEY = Deno.env.get("DEEPL_API_KEY") || "";
const DEEPL_BASE = DEEPL_API_KEY.endsWith(":fx")
  ? "https://api-free.deepl.com"
  : "https://api.deepl.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MYMEMORY_CHUNK = 420;
const MYMEMORY_GAP_MS = 120;

function deeplTargetCode(lang: string): string {
  const u = lang.toUpperCase();
  if (u === "EN") return "EN-GB";
  if (u === "PT") return "PT-PT";
  return u;
}

function myMemoryIso(lang: string): string {
  const u = lang.toUpperCase();
  const m: Record<string, string> = { ES: "es", EN: "en", FR: "fr", DE: "de", PT: "pt" };
  return m[u] || u.toLowerCase().slice(0, 2);
}

/** Gratis, sin API key; límites de uso según MyMemory */
async function translateWithMyMemory(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const src = myMemoryIso(sourceLang);
  const tgt = myMemoryIso(targetLang);
  if (src === tgt || !text.trim()) return text;

  const parts: string[] = [];
  for (let i = 0; i < text.length; i += MYMEMORY_CHUNK) {
    const chunk = text.slice(i, i + MYMEMORY_CHUNK);
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", chunk);
    url.searchParams.set("langpair", `${src}|${tgt}`);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
    const json = await res.json();

    if (json.quotaFinished === true) {
      throw new Error(
        "Cuota gratuita de MyMemory agotada hoy. Prueba mañana o configura DEEPL_API_KEY en Supabase."
      );
    }

    const status = json.responseStatus;
    if (status !== 200) {
      const errMsg = json.responseData?.error || json.responseDetails || `código ${status}`;
      throw new Error(`MyMemory: ${errMsg}`);
    }

    const translated = json.responseData?.translatedText;
    if (typeof translated !== "string") throw new Error("MyMemory: respuesta inválida");
    parts.push(translated);

    if (i + MYMEMORY_CHUNK < text.length) await new Promise((r) => setTimeout(r, MYMEMORY_GAP_MS));
  }
  return parts.join("");
}

async function translateWithDeepL(text: string, targetUiLang: string, sourceLang: string): Promise<string> {
  const src = sourceLang.toUpperCase();
  const tgtUi = targetUiLang.toUpperCase();
  const tgt = deeplTargetCode(tgtUi);

  const res = await fetch(`${DEEPL_BASE}/v2/translate`, {
    method: "POST",
    headers: {
      "Authorization": `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [text],
      source_lang: src,
      target_lang: tgt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepL error ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.translations?.[0]?.text || "";
}

async function translateText(text: string, targetUiLang: string, sourceLang: string): Promise<string> {
  const src = sourceLang.toUpperCase();
  const tgtUi = targetUiLang.toUpperCase();
  if (src === tgtUi || !text.trim()) return text;

  if (DEEPL_API_KEY) {
    return await translateWithDeepL(text, targetUiLang, sourceLang);
  }
  return await translateWithMyMemory(text, sourceLang, targetUiLang);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { text, sourceLang: rawSource = "EN", targets } = body;

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "El campo 'text' es obligatorio." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const sourceLang = String(rawSource).toUpperCase();

    if (!Array.isArray(targets)) {
      const [fr, de, pt] = await Promise.all([
        translateText(text, "FR", "EN"),
        translateText(text, "DE", "EN"),
        translateText(text, "PT", "EN"),
      ]);
      return new Response(
        JSON.stringify({ FR: fr, DE: de, PT: pt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targets.length === 0) {
      return new Response(JSON.stringify({}), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const entries = await Promise.all(
      targets.map(async (t: string) => {
        const key = String(t).toUpperCase();
        const translated = await translateText(text, key, sourceLang);
        return [key, translated] as const;
      })
    );

    const out: Record<string, string> = {};
    for (const [k, v] of entries) out[k] = v;

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
