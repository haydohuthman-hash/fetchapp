import { createPortal } from 'react-dom'
import { useEffect } from 'react'

function aud(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function InstantRelistModal({
  open,
  userSpendCents,
  estimatedValueCents,
  instantRelistCreditCents,
  sellerPayoutEstimateCents,
  onAccept,
  onKeepInstead,
  onClose,
  acceptLabel,
}: {
  open: boolean
  userSpendCents: number
  estimatedValueCents: number
  instantRelistCreditCents: number
  sellerPayoutEstimateCents: number
  onAccept: () => void
  onKeepInstead: () => void
  onClose: () => void
  acceptLabel: string
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="instant-relist-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Dismiss" onClick={onClose} />

      <div className="relative z-[1] w-full max-w-md rounded-[1.35rem] border border-violet-100 bg-white p-5 text-zinc-900 shadow-2xl ring-1 ring-violet-950/5">
        <h2 id="instant-relist-title" className="text-[1.25rem] font-black tracking-tight text-zinc-950">
          Relist this find?
        </h2>
        <p className="mt-2 text-[13px] font-medium leading-snug text-zinc-600">
          We&apos;ll return this item to marketplace inventory and add Marketplace Credit to your wallet right away.
        </p>

        <ul className="mt-4 space-y-2.5 rounded-2xl border border-violet-100 bg-violet-50/50 px-3.5 py-3 text-[13px]">
          <li className="flex justify-between gap-3">
            <span className="text-zinc-500">Your spend</span>
            <span className="font-bold text-zinc-900">{aud(userSpendCents)}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span className="text-zinc-500">Estimated item value</span>
            <span className="font-bold text-zinc-900">{aud(estimatedValueCents)}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span className="text-zinc-500">Seller payout (model)</span>
            <span className="font-semibold text-zinc-700">{aud(sellerPayoutEstimateCents)}</span>
          </li>
          <li className="flex justify-between gap-3 border-t border-violet-100/90 pt-2.5">
            <span className="text-violet-800">Instant relist credit</span>
            <span className="text-[1.05rem] font-black text-violet-700">{aud(instantRelistCreditCents)}</span>
          </li>
        </ul>

        <p className="mt-3 text-[12px] font-medium leading-snug text-zinc-600">
          Credit available immediately. The item goes back into marketplace inventory. Use Fetchit Credit on Fetchit
          reveals, live auctions, or marketplace purchases.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-2.5">
          <button
            type="button"
            onClick={onAccept}
            className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-[15px] font-extrabold text-white active:scale-[0.99]"
          >
            {acceptLabel}
          </button>
          <button
            type="button"
            onClick={onKeepInstead}
            className="rounded-2xl border border-zinc-200 bg-white py-3.5 text-[14px] font-bold text-zinc-900 active:scale-[0.99]"
          >
            Keep item instead
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
