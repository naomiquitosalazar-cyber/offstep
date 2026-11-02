
import Stripe from 'stripe';

const secretKey = import.meta.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error('Falta configurar STRIPE_SECRET_KEY en el entorno.');
}

export const stripe = new Stripe(secretKey);

