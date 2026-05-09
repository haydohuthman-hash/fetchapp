import { useState } from 'react'

import { waitForPaymentIntentServerConfirmed } from '../lib/booking/api'
import { FetchStripePaymentElement, WALLET_STRIPE_PAYMENT_ELEMENT_OPTIONS } from './FetchStripePaymentElement'
import { WalletPayBrandMarks } from './WalletPayBrandMarks'

export type WalletStripeCheckoutPanelProps = {
  publishableKey: string
  clientSecret: string
  paymentIntentId: string
  /** Shown on the Pay button, e.g. "$50.00" */
  submitAmountLabel: string
  appearance?: 'night' | 'checkout'
  onComplete: () => void
  /** User backs out before paying (shown above the form). */
  onBack?: () => void
}

/**
 * Embed Stripe Payment Element for wallet credits. Stripe shows card, wallets (Apple/Google Pay),
 * Link, etc. depending on Dashboard settings and shopper eligibility.
 */
export function WalletStripeCheckoutPanel({
  publishableKey,
  clientSecret,
  paymentIntentId,
  submitAmountLabel,
  appearance = 'checkout',
  onComplete,
  onBack,
}: WalletStripeCheckoutPanelProps) {
  const [errorText, setErrorText] = useState<string | null>(null)

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Pay with</p>
      <WalletPayBrandMarks />
      <p className="mt-1 text-[12px] leading-snug text-slate-600">
        Use the wallet rows or open <span className="font-semibold text-slate-800">Card</span> below — card fields stay in
        a collapsible section until you expand it.
      </p>
      {onBack ? (
        <button
          type="button"
          className="mt-2 text-[12px] font-semibold text-violet-900 underline underline-offset-2 decoration-violet-300"
          onClick={onBack}
        >
          Change amount
        </button>
      ) : null}
      <FetchStripePaymentElement
        publishableKey={publishableKey}
        clientSecret={clientSecret}
        appearance={appearance}
        paymentElementOptions={WALLET_STRIPE_PAYMENT_ELEMENT_OPTIONS}
        submitLabel={`Pay ${submitAmountLabel}`}
        errorText={errorText}
        onError={(m) => setErrorText(m)}
        onSuccess={() =>
          void (async () => {
            try {
              await waitForPaymentIntentServerConfirmed(paymentIntentId)
              setErrorText(null)
              onComplete()
            } catch (e) {
              setErrorText(e instanceof Error ? e.message : 'Could not verify payment.')
            }
          })()
        }
      />
    </div>
  )
}
