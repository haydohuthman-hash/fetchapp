import { memo } from 'react'
import { FetchSplashBrandMark } from './FetchSplashBrandMark'

export type LiveAuctionEyesMood = 'idle' | 'bid'

type Props = {
  mood: LiveAuctionEyesMood
  onPress?: () => void
}

export const LiveAuctionFloatingEyes = memo(function LiveAuctionFloatingEyes({
  mood,
  onPress,
}: Props) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={[
        'fetch-live-auctions-float-eyes pointer-events-auto fixed z-[75] flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border border-white/25 bg-white/95 shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-md dark:border-zinc-600 dark:bg-zinc-900/95',
        mood === 'bid' ? 'fetch-live-auctions-float-eyes--bid' : '',
      ].join(' ')}
      style={{
        top: 'max(0.65rem, env(safe-area-inset-top, 0px))',
        right: 'max(0.85rem, env(safe-area-inset-right, 0px))',
      }}
      aria-label="Fetch assistant"
    >
      <FetchSplashBrandMark variant="eyesOnly" className="h-10 w-[4.25rem] scale-[0.72] dark:opacity-95" />
    </button>
  )
})
