import { supabase } from '../lib/supabase';

/**
 * Enviar email de confirmación de reserva
 * @param {Object} reservation - Información de la reserva
 * @returns {Promise<Object>}
 */
export async function sendBookingConfirmation(reservation) {
  try {
    const { data, error } = await supabase.functions.invoke('send-reservation-email', {
      body: {
        guestEmail: reservation.guestEmail || reservation.guest_email,
        guestName: reservation.guestName || reservation.guest_name,
        apartmentName: reservation.apartmentName || reservation.apartment_name,
        checkin: reservation.checkin || reservation.check_in,
        checkout: reservation.checkout || reservation.check_out,
        nights: reservation.nights,
        total: reservation.total || reservation.total_price,
        deposit: reservation.deposit || reservation.deposit_paid,
        reservationId: reservation.id || reservation.reservationId,
        portalUrl: `${window.location.origin}/mi-reserva`,
      },
    });

    if (error) {
      console.error('Error sending confirmation email:', error);
      throw new Error(error.message || 'Error al enviar email');
    }

    //console.log('Email sent successfully:', data);
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err) {
    console.error('Resend service error:', err);
    throw err;
  }
}

/**
 * Enviar email de recordatorio de pago
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function sendPaymentReminder(data) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-payment-reminder', {
      body: {
        guestEmail: data.guestEmail,
        guestName: data.guestName,
        reservationId: data.reservationId,
        daysRemaining: data.daysRemaining,
        amountDue: data.amountDue,
      },
    });

    if (error) throw error;

    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error('Error sending payment reminder:', err);
    throw err;
  }
}

/**
 * Enviar respuesta a formulario de contacto
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function sendContactReply(data) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-contact-reply', {
      body: {
        guestEmail: data.guestEmail,
        guestName: data.guestName,
        subject: data.subject || 'Re: Tu consulta en Illa Pancha Ribadeo',
        replyText: data.replyText
      },
    });

    if (error) throw error;

    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error('Error sending contact reply:', err);
    throw err;
  }
}

/**
 * Enviar email de cancelación
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function sendCancellationEmail(data) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-cancellation-email', {
      body: {
        guestEmail: data.guestEmail,
        guestName: data.guestName,
        reservationId: data.reservationId,
        apartmentName: data.apartmentName,
        refundAmount: data.refundAmount,
      },
    });

    if (error) throw error;

    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error('Error sending cancellation email:', err);
    throw err;
  }
}