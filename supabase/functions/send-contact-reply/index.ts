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
        const { guestEmail, guestName, subject, replyText } = await req.json();

        const result = await resend.emails.send({
            from: "Administración Illa Pancha <reservas@apartamentosillapancha.com>", // Reemplazar en producción
            to: guestEmail,
            subject: subject || "Respuesta a tu consulta - Illa Pancha Ribadeo",
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #1a5f6e;">Hola ${guestName},</h2>
          <p style="white-space: pre-wrap; line-height: 1.6;">${replyText}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #666; font-size: 13px;">Has recibido este correo electrónico porque nos contactaste a través de la web de Illa Pancha Ribadeo.</p>
        </div>
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
