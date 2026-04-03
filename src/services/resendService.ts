/* eslint-disable */
// @ts-nocheck
import { supabase } from '../lib/supabase';

const anonHeaders = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
};

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
      headers: anonHeaders,
    });

    if (error) {
      console.error('Error sending confirmation email:', error);
      throw new Error(error.message || 'Error al enviar email');
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Resend service error:', err);
    throw err;
  }
}

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
      headers: anonHeaders,
    });

    if (error) throw error;
    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error('Error sending payment reminder:', err);
    throw err;
  }
}

export async function sendContactReply(data) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-contact-reply', {
      body: {
        guestEmail: data.guestEmail,
        guestName: data.guestName,
        subject: data.subject || 'Re: Tu consulta en Illa Pancha Ribadeo',
        replyText: data.replyText,
      },
      headers: anonHeaders,
    });

    if (error) throw error;
    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error('Error sending contact reply:', err);
    throw err;
  }
}

export async function sendOwnerNotification(data) {
  try {
    const { error } = await supabase.functions.invoke('send-owner-notification', {
      body: {
        type: data.type,
        panelUrl: `${window.location.origin}/gestion`,
        ...data,
      },
      headers: anonHeaders,
    });
    if (error) console.warn('Owner notification failed (non-critical):', error);
    return { success: !error };
  } catch (err) {
    console.warn('Owner notification error (non-critical):', err);
    return { success: false };
  }
}

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
      headers: anonHeaders,
    });

    if (error) throw error;
    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error('Error sending cancellation email:', err);
    throw err;
  }
}

export async function sendReviewRequest(reservation) {
  try {
    const { data, error } = await supabase.functions.invoke('post-stay-review', {
      body: {
        guestEmail: reservation.guestEmail || reservation.email,
        guestName: reservation.guestName || reservation.guest,
        apartmentName: reservation.apartmentName || reservation.apt,
        reservationId: reservation.reservationId || reservation.id,
        reviewToken: reservation.reviewToken || reservation.review_token,
        baseUrl: window.location.origin,
        manual: true,
      },
      headers: anonHeaders,
    });

    if (error) {
      console.error('Error sending review request:', error);
      throw error;
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Review request error:', err);
    throw err;
  }
}
