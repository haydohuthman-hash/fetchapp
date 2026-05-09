import { useCallback, useState } from 'react'

import { WalletStripeCheckoutPanel } from '../components/WalletStripeCheckoutPanel'
import { depositWallet, formatAud, useWalletBalanceCents, withdrawWallet } from '../lib/data'
import { isStripePublishableConfigured } from '../lib/paymentCheckout'
import type { AddFundsMethod } from '../lib/walletFunding'
import {
  ADD_FUNDS_METHOD_OPTIONS,
  formatBsbInput,
  txnLabelForAddedFunds,
  validateBankPayout,
} from '../lib/walletFunding'
import { createWalletTopUpPaymentIntent } from '../lib/walletStripeTopUp'

export type FetchWalletPlaceholderViewProps = {
  variant: 'cashOut' | 'credits'
  onBack: () => void
}

function parseMoneyInputToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const n = Number.parseFloat(cleaned)
  if (!Number.isFinite(n) || n <= 0) return null
  const cents = Math.round(n * 100)
  return cents > 0 ? cents : null
}

/**
 * Top-up and cash-out surfaces. Credit top-up uses Stripe Payment Element when
 * `VITE_STRIPE_PUBLISHABLE_KEY` + server `STRIPE_SECRET_KEY` are set; otherwise offline demo labels.
 */
export default function FetchWalletPlaceholderView({ variant, onBack }: FetchWalletPlaceholderViewProps) {
  const balanceCents = useWalletBalanceCents()
  const [amountAud, setAmountAud] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<AddFundsMethod>('card')
  const [accountName, setAccountName] = useState('')
  const [bsb, setBsb] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [doneMsg, setDoneMsg] = useState<string | null>(null)
  const [stripeCheckout, setStripeCheckout] = useState<{
    clientSecret: string
    paymentIntentId: string
    amountCents: number
  } | null>(null)

  const title = variant === 'cashOut' ? 'Cash out' : 'Add credits'
  const isCashOut = variant === 'cashOut'
  const stripePublishableKey = String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '').trim()
  const stripeClientReady = isStripePublishableConfigured()

  const handleBack = useCallback(() => {
    onBack()
  }, [onBack])

  const prepareStripeTopUp = useCallback(async () => {
    const cents = parseMoneyInputToCents(amountAud)
    if (!cents) {
      setError('Enter a valid amount in AUD')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const pi = await createWalletTopUpPaymentIntent(cents / 100)
      if (pi.provider !== 'stripe' || !pi.clientSecret?.trim()) {
        setError(
          'Could not start Stripe checkout. Ensure STRIPE_SECRET_KEY is set on your Fetch API, or use offline demo below.',
        )
        return
      }
      setStripeCheckout({
        clientSecret: pi.clientSecret.trim(),
        paymentIntentId: pi.id,
        amountCents: cents,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Stripe checkout')
    } finally {
      setBusy(false)
    }
  }, [amountAud])

  const submit = () => {
    setError(null)
    setDoneMsg(null)
    const cents = parseMoneyInputToCents(amountAud)
    if (!cents) {
      setError('Enter a valid amount in AUD')
      return
    }
    if (isCashOut) {
      if (cents > balanceCents) {
        setError('Amount exceeds available balance')
        return
      }
      const payout = validateBankPayout({ accountName, bsb, accountNumber })
      if (!payout.ok) {
        setError(payout.error)
        return
      }
      setBusy(true)
      try {
        const ok = withdrawWallet(cents, payout.label)
        if (!ok) setError('Insufficient balance')
        else {
          setDoneMsg(`Withdrawal of ${formatAud(cents)} submitted.`)
          setAmountAud('')
          setAccountName('')
          setBsb('')
          setAccountNumber('')
        }
      } finally {
        setBusy(false)
      }
      return
    }

    if (stripeClientReady) {
      void prepareStripeTopUp()
      return
    }

    setBusy(true)
    try {
      depositWallet(cents, txnLabelForAddedFunds(paymentMethod))
      setDoneMsg(
        `Added ${formatAud(cents)} via ${ADD_FUNDS_METHOD_OPTIONS.find((o) => o.id === paymentMethod)?.title ?? 'payment'}.`,
      )
      setAmountAud('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#f8f6fd] px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] text-[#1c1528]">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-200/60 bg-violet-50 text-[#291050] active:scale-[0.97]"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </header>

      <div className="rounded-2xl border border-violet-200/50 bg-white p-5 shadow-sm">
        <p className="text-[13px] leading-relaxed text-zinc-600">
          {isCashOut
            ? 'Withdraw to an Australian bank account. Details are used for this demo payout label only — connect a real processor for production.'
            : stripeClientReady
              ? 'Top up with Stripe: the form lists the payment methods your Stripe account allows (card, Apple Pay, Google Pay, Link, and more).'
              : 'Offline demo: pick a label and add a balance on this device only.'}
        </p>

        {doneMsg ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-900">
            {doneMsg}
          </p>
        ) : null}

        <div className="mt-5 space-y-4">
          {!isCashOut && stripeCheckout && stripePublishableKey ? (
            <WalletStripeCheckoutPanel
              publishableKey={stripePublishableKey}
              clientSecret={stripeCheckout.clientSecret}
              paymentIntentId={stripeCheckout.paymentIntentId}
              submitAmountLabel={formatAud(stripeCheckout.amountCents)}
              appearance="checkout"
              onBack={() => setStripeCheckout(null)}
              onComplete={() => {
                depositWallet(stripeCheckout.amountCents, 'Added funds · Stripe')
                setStripeCheckout(null)
                setDoneMsg(`Added ${formatAud(stripeCheckout.amountCents)} via Stripe.`)
                setAmountAud('')
              }}
            />
          ) : null}

          {!isCashOut && stripeClientReady && !stripeCheckout ? (
            <p className="text-[12px] leading-snug text-zinc-600">
              Choose an amount and tap{' '}
              <span className="font-semibold text-zinc-800">Open Stripe checkout</span>. Selecting{' '}
              <span className="font-semibold">Card</span> in Stripe opens the card fields; wallets appear automatically when supported.
            </p>
          ) : null}

          {!isCashOut && !stripeClientReady ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-600/90">Pay with (demo)</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {ADD_FUNDS_METHOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(opt.id)
                      setError(null)
                    }}
                    className={[
                      'rounded-xl border px-3 py-2.5 text-left transition-colors',
                      paymentMethod === opt.id
                        ? 'border-violet-600 bg-violet-50 ring-2 ring-violet-500/20'
                        : 'border-zinc-200 bg-zinc-50/80 active:bg-zinc-100',
                    ].join(' ')}
                  >
                    <p className="text-[13px] font-bold text-zinc-900">{opt.title}</p>
                    <p className="text-[11px] text-zinc-500">{opt.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {isCashOut ? (
            <div className="space-y-3 rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-600/90">
                Australian bank account
              </p>
              <label className="block">
                <span className="text-[11px] font-semibold text-zinc-500">Account name</span>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value)
                    setError(null)
                  }}
                  placeholder="Account holder"
                  autoComplete="name"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-[14px] text-zinc-900 outline-none focus:ring-2 focus:ring-violet-500/25"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-zinc-500">BSB</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={bsb}
                  onChange={(e) => {
                    setBsb(formatBsbInput(e.target.value))
                    setError(null)
                  }}
                  placeholder="062-002"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-mono text-[14px] text-zinc-900 outline-none focus:ring-2 focus:ring-violet-500/25"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-zinc-500">Account number</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 12))
                    setError(null)
                  }}
                  placeholder="5–12 digits"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-mono text-[14px] text-zinc-900 outline-none focus:ring-2 focus:ring-violet-500/25"
                />
              </label>
            </div>
          ) : null}

          <label className="block">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-600/90">
                Amount (AUD)
              </span>
              {isCashOut ? (
                <span className="text-[12px] font-semibold tabular-nums text-zinc-500">
                  Available {formatAud(balanceCents)}
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex overflow-hidden rounded-xl border border-zinc-200 bg-white focus-within:ring-2 focus-within:ring-violet-500/25">
              <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-3 text-[15px] font-semibold text-zinc-600">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amountAud}
                onChange={(e) => {
                  setAmountAud(e.target.value)
                  setError(null)
                  setStripeCheckout(null)
                }}
                placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[16px] font-semibold tabular-nums text-zinc-900 outline-none"
              />
            </div>
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-800">{error}</p>
          ) : null}

          {isCashOut || !stripeCheckout ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="w-full rounded-xl bg-violet-700 py-3.5 text-[15px] font-bold text-white shadow-md transition-colors active:bg-violet-800 disabled:opacity-50"
            >
              {busy
                ? '…'
                : isCashOut
                  ? 'Withdraw funds'
                  : stripeClientReady
                    ? 'Open Stripe checkout'
                    : 'Add funds'}
            </button>
          ) : null}
        </div>

        <div className="mt-5 rounded-xl border border-violet-200/40 bg-violet-50/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-600">Production</p>
          <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">
            {isCashOut
              ? 'Stripe Connect or similar can collect verified bank tokens and replace this form.'
              : 'Webhook to /api/payments/webhook must mark the PaymentIntent succeeded before the client balance step completes in production-grade apps.'}
          </p>
        </div>
      </div>
    </div>
  )
}
