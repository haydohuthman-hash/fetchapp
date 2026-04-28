/**
 * SellOptionsSheet — bottom sheet shown when the user taps the center "Sell"
 * FAB. Two clear options: list an item for the marketplace, or go live to
 * stream and auction.
 */

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  onClose: () => void
  onSellItem: () => void
  onGoLive: () => void
}

export function SellOptionsSheet({ open, onClose, onSellItem, onGoLive }: Props) {
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
      className="fixed inset-0 z-[9988] flex flex-col justify-end bg-[#1c1528]/45 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fetch-sell-sheet-title"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default border-0 bg-transparent p-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-[1] mx-auto w-full max-w-[min(100%,430px)] rounded-t-[1.5rem] bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-22px_60px_-30px_rgba(15,7,40,0.5)] ring-1 ring-zinc-200 animate-[fetch-galactic-sheet-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]"
      >
        <span aria-hidden className="mx-auto mb-2 block h-1 w-10 rounded-full bg-zinc-200" />
        <header className="flex flex-col items-center gap-1 px-2 pb-2 pt-1 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4c1d95]">Sell on Fetchit</p>
          <h2 id="fetch-sell-sheet-title" className="text-[20px] font-black tracking-tight text-zinc-950">
            What do you want to do?
          </h2>
          <p className="text-[12.5px] font-medium text-zinc-500">
            List an item or go live and run your own bid war.
          </p>
        </header>

        <div className="grid gap-2 py-2">
          <SellOption
            icon="🏷️"
            title="Sell an item"
            body="List a single item with photos, price, and shipping."
            onPress={() => {
              onClose()
              onSellItem()
            }}
          />
          <SellOption
            icon="🎥"
            title="Go live"
            body="Stream now and auction multiple items in real time."
            onPress={() => {
              onClose()
              onGoLive()
            }}
            tone="purple"
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-1 w-full rounded-full bg-white py-2.5 text-[12.5px] font-bold text-zinc-500 hover:text-zinc-900"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  )
}

function SellOption({
  icon,
  title,
  body,
  onPress,
  tone = 'light',
}: {
  icon: string
  title: string
  body: string
  onPress: () => void
  tone?: 'light' | 'purple'
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={[
        'flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition-transform active:scale-[0.99]',
        tone === 'purple'
          ? 'bg-gradient-to-br from-[#7c3aed] via-[#5b21b6] to-[#4c1d95] text-white ring-[#4c1d95]/20 shadow-[0_18px_40px_-20px_rgba(76,29,149,0.6)]'
          : 'bg-white text-zinc-900 ring-zinc-200 shadow-sm',
      ].join(' ')}
    >
      <span
        className={[
          'grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl',
          tone === 'purple' ? 'bg-white/15 ring-1 ring-white/20' : 'bg-violet-100 text-[#4c1d95]',
        ].join(' ')}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={['block text-[14px] font-black tracking-tight', tone === 'purple' ? 'text-white' : 'text-zinc-950'].join(' ')}>
          {title}
        </span>
        <span
          className={['mt-0.5 block text-[11.5px] font-semibold', tone === 'purple' ? 'text-white/80' : 'text-zinc-500'].join(' ')}
        >
          {body}
        </span>
      </span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={tone === 'purple' ? 'text-white/80' : 'text-zinc-300'}
      >
        <path d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
