// ─── RESEND — EMAIL TRANSACCIONAL ───────────────────────────────────────────
//
// Resend es un servicio de email SERVER-SIDE.
// La clave API nunca debe estar en el frontend.
// Usa este archivo como referencia para las Supabase Edge Functions.
//
// Documentación: https://resend.com/docs
// Panel: https://resend.com/dashboard
//
// ─── INSTALACIÓN (en Supabase Edge Functions) ────────────────────────────────
// import { Resend } from 'npm:resend';
// const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
//
// ─── TEMPLATES ───────────────────────────────────────────────────────────────

export const emailTemplates = {
  bookingConfirmation: {
    subject: (id: string) => `Confirmacion de reserva ${id} — Illa Pancha Ribadeo`,
    // Variables: guestName, reservationId, aptName, checkin, checkout, nights, total, deposit
    html: (vars: Record<string, unknown>) => `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #0f172a;">
        <div style="background: #1a5f6e; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; font-weight: 300; margin: 0; font-size: 28px;">Illa Pancha Ribadeo</h1>
        </div>
        <div style="padding: 40px 32px;">
          <h2 style="font-weight: 400; color: #1a5f6e;">Reserva confirmada</h2>
          <p>Hola <strong>${vars.guestName}</strong>,</p>
          <p>Tu reserva ha sido confirmada. Aqui tienes todos los detalles:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Referencia</td>
              <td style="padding: 10px 0; font-weight: 600;">${vars.reservationId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Apartamento</td>
              <td style="padding: 10px 0;">${vars.aptName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Entrada</td>
              <td style="padding: 10px 0;">${vars.checkin} a partir de las 15:00</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Salida</td>
              <td style="padding: 10px 0;">${vars.checkout} antes de las 11:00</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Noches</td>
              <td style="padding: 10px 0;">${vars.nights}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Total</td>
              <td style="padding: 10px 0; font-weight: 700;">${vars.total} EUR</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Deposito cobrado</td>
              <td style="padding: 10px 0; color: #1a5f6e; font-weight: 600;">${vars.deposit} EUR ✓</td>
            </tr>
          </table>
          <div style="background: #f8fafc; padding: 20px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #475569;">
              Recuerda traer <strong>${vars.deposit} EUR en efectivo</strong> para el dia de tu llegada.
            </p>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            Si tienes cualquier duda, contactanos en <a href="mailto:info@apartamentosillapancha.com" style="color: #1a5f6e;">info@apartamentosillapancha.com</a>
            o por WhatsApp.
          </p>
        </div>
        <div style="background: #0f172a; padding: 20px 32px; text-align: center;">
          <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0;">
            © 2026 Illa Pancha Ribadeo · Ribadeo, Lugo, Galicia
          </p>
        </div>
      </div>
    `,
  },

  bookingCancellation: {
    subject: (id: string) => `Cancelacion de reserva ${id} — Illa Pancha Ribadeo`,
  },

  contactFormReply: {
    subject: () => 'Hemos recibido tu mensaje — Illa Pancha Ribadeo',
  },

  paymentReminder: {
    subject: (id: string) => `Recordatorio de pago — Reserva ${id}`,
  },
};

// ─── EJEMPLO DE SUPABASE EDGE FUNCTION ───────────────────────────────────────
/*
// supabase/functions/send-email/index.ts
import { Resend } from 'npm:resend';
import { emailTemplates } from '../../../src/lib/resend.js';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  const { template, to, variables } = await req.json();
  const tmpl = emailTemplates[template];
  if (!tmpl) return new Response('Template not found', { status: 400 });

  const { data, error } = await resend.emails.send({
    from: 'Illa Pancha <reservas@illapancha.com>',
    to,
    subject: tmpl.subject(variables.reservationId),
    html: tmpl.html(variables),
  });

  if (error) return new Response(JSON.stringify(error), { status: 500 });
  return new Response(JSON.stringify(data));
});
*/
