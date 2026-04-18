import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// Configura esta variable en tu archivo .env
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder';

// Singleton de Stripe (se reutiliza en toda la app)
export const stripePromise = loadStripe(stripePublicKey);

/**
 * Procesar pago con Stripe
 * @param {Object} paymentData - Datos del pago
 * @param {number} paymentData.amount - Monto en euros (se convierte a céntimos)
 * @param {string} paymentData.currency - Moneda (default: 'eur')
 * @param {string} paymentData.customerEmail - Email del cliente
 * @param {string} paymentData.customerName - Nombre del cliente
 * @param {string} paymentData.reservationId - ID de la reserva
 * @param {string} paymentData.description - Descripción del pago
 * @returns {Promise<Object>} {clientSecret, paymentIntentId}
 */
interface PaymentData {
  amount: number;
  currency?: string;
  customerEmail: string;
  customerName: string;
  reservationId: string;
  description?: string;
  turnstileToken?: string;
}

export async function createPaymentIntent(paymentData: PaymentData) {
  try {
    // Validate Supabase and function exists
    if (!supabase) {
      throw new Error(
        'Supabase no está inicializado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env'
      );
    }
    if (typeof supabase.functions?.invoke !== 'function') {
      throw new Error(
        'supabase.functions.invoke no es una función. Revisa tu configuración de Supabase'
      );
    }

    const { data, error } = await supabase.functions.invoke('process-payment', {
      body: {
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency || 'eur',
        customerEmail: paymentData.customerEmail,
        customerName: paymentData.customerName,
        reservationId: paymentData.reservationId,
        description: paymentData.description,
        turnstileToken: paymentData.turnstileToken,
      },
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });

    if (error) {
      console.error('Supabase error response:', error);
      const bodyErr =
        data && typeof data === 'object' && 'error' in data
          ? String((data as { error: string }).error)
          : '';
      throw new Error(bodyErr || error.message || 'Error creando PaymentIntent en Supabase');
    }

    if (!data || !data.clientSecret) {
      throw new Error('Respuesta inválida de PaymentIntent: falta clientSecret');
    }

    return {
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
    };
  } catch (err) {
    console.error('createPaymentIntent error:', (err as Error).message || err);
    throw err;
  }
}

/**
 * Confirmar pago con Stripe Elements
 * @param {Object} stripe - Instancia de Stripe
 * @param {Object} elements - Instancia de Elements
 * @param {string} clientSecret - Client secret del PaymentIntent
 * @returns {Promise<Object>} Resultado de confirmación
 */
export async function confirmPayment(
  stripe: {
    confirmCardPayment: (
      secret: string,
      opts: unknown
    ) => Promise<{ error?: { message?: string }; paymentIntent?: unknown }>;
  },
  elements: { getElement: (type: string) => unknown },
  clientSecret: string
) {
  try {
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement('card'),
      },
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return {
      success: true,
      paymentIntent: result.paymentIntent,
    };
  } catch (err) {
    console.error('Payment confirmation error:', err);
    throw err;
  }
}
