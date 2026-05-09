import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import type { Appearance, StripePaymentElementOptions } from '@stripe/stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { type FormEvent, useMemo } from 'react'

export type FetchStripePaymentElementProps = {
  publishableKey: string
  clientSecret: string
  /** Default `night` (marketplace). Use `checkout` for light surfaces (wallet). */
  appearance?: 'night' | 'checkout'
  /**
   * When set, accordion layout lists Apple Pay / Google Pay / card rows; wallets stay Stripe-branded inside the iframe.
   * Card details stay collapsed inside the accordion until the shopper expands “Card”.
   */
  paymentElementOptions?: StripePaymentElementOptions
  submitLabel: string
  disabled?: boolean
  errorText?: string | null
  onError: (message: string) => void
  onSuccess: () => void
}

function InnerForm({
  submitLabel,
  disabled,
  errorText,
  onError,
  onSuccess,
  paymentElementOptions,
}: Omit<FetchStripePaymentElementProps, 'publishableKey' | 'clientSecret' | 'appearance'>) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    })
    if (error) {
      onError(error.message ?? 'Payment failed')
      return
    }
    onSuccess()
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-2 space-y-3">
      <PaymentElement options={paymentElementOptions} />
      {errorText ? (
        <p className="text-[11px] font-medium leading-snug text-red-700">{errorText}</p>
      ) : null}
      <button
        type="submit"
        disabled={disabled || !stripe}
        className="fetch-stage-primary-btn w-full rounded-2xl px-3 py-2.5 text-center text-[13px] font-semibold transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  )
}

function appearanceFromVariant(variant: 'night' | 'checkout'): Appearance {
  if (variant === 'checkout') {
    return {
      theme: 'stripe',
      variables: {
        colorPrimary: '#4f1d93',
        borderRadius: '12px',
      },
      rules: {
        '.AccordionItem': {
          borderColor: '#e5e7eb',
          borderRadius: '10px',
        },
      },
    }
  }
  return {
    theme: 'night',
    variables: { colorPrimary: '#a78bfa' },
  }
}

/** Accordion checkout: wallets first; card collapses until expanded — uses Stripe-supported layout. */
export const WALLET_STRIPE_PAYMENT_ELEMENT_OPTIONS: StripePaymentElementOptions = {
  layout: {
    type: 'accordion',
    defaultCollapsed: true,
    spacedAccordionItems: true,
    radios: 'if_multiple',
    paymentMethodLogoPosition: 'start',
  },
  paymentMethodOrder: ['apple_pay', 'google_pay', 'card'],
}

export function FetchStripePaymentElement({
  publishableKey,
  clientSecret,
  appearance = 'night',
  paymentElementOptions,
  ...rest
}: FetchStripePaymentElementProps) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey])
  const appearanceConfig = useMemo(() => appearanceFromVariant(appearance), [appearance])

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: appearanceConfig,
      }}
    >
      <InnerForm paymentElementOptions={paymentElementOptions} {...rest} />
    </Elements>
  )
}
