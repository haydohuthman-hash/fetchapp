import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FetchSplashBrandMark } from './FetchSplashBrandMark'

type Props = {
  onDone: () => void
}

export function LiveAuctionsSplash({ onDone }: Props) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const total = 1200 + Math.random() * 600
    const exitAt = total - 380
    const t1 = window.setTimeout(() => setExiting(true), Math.max(200, exitAt))
    const t2 = window.setTimeout(onDone, total)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [onDone])

  return createPortal(
    <div
      className={[
        'fetch-live-auctions-splash pointer-events-none fixed inset-0 z-[80] flex flex-col items-center justify-center',
        exiting ? 'fetch-live-auctions-splash--exit' : '',
      ].join(' ')}
      style={{
        background: 'linear-gradient(165deg, #FF2D2D 0%, #C41E1E 38%, #7A0C0C 100%)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-hidden
    >
      <div
        className="fetch-live-auctions-splash-glow pointer-events-none absolute h-[min(52vw,220px)] w-[min(52vw,220px)] rounded-full bg-white/35 blur-3xl"
        style={{ top: '28%' }}
        aria-hidden
      />
      <div className="relative z-[1] flex w-full max-w-sm flex-col items-center px-6">
        <div className="relative w-[min(88vw,320px)] opacity-95 drop-shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <FetchSplashBrandMark variant="eyesOnly" className="h-auto w-full max-w-[320px]" />
        </div>
        <h1
          className="fetch-live-auctions-splash-title mt-8 text-center text-[1.35rem] font-black uppercase tracking-[0.22em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]"
        >
          Live Auctions
        </h1>
        <p className="fetch-live-auctions-splash-sub mt-3 text-center text-[0.95rem] font-semibold text-white/85">
          Jump in. Bid fast.
        </p>
      </div>
    </div>,
    document.body,
  )
}
