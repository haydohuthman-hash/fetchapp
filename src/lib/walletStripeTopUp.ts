import { createPaymentIntent } from './booking/api'

/** Creates a Stripe PaymentIntent for in-app wallet top-up (AUD). Server must set STRIPE_SECRET_KEY. */
export async function createWalletTopUpPaymentIntent(amountAud: number) {
  const rounded = Math.round(amountAud * 100) / 100
  return createPaymentIntent({
    bookingId: null,
    amount: rounded,
    currency: 'AUD',
    metadata: { type: 'wallet_top_up' },
  })
}
