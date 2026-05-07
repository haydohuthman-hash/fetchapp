import { useEffect, useRef, useState } from 'react'
import type {
  FetchOrbExpression,
  JarvisOrbState,
  MapAttentionCue,
} from './JarvisNeuralOrb'
import type { MarketplacePeerBrowseFilter } from './ExploreBrowseBanner'
import { ExploreAskFetchSheet } from './ExploreAskFetchSheet'
import { HomeFeedV2 } from './HomeFeedV2'
import type { DropReel } from '../lib/drops/types'

type OrbChatTurn = { id: string; role: 'user' | 'assistant'; text: string }

export type ServicesExploreHomePanelProps = {
  scanning: boolean
  onOpenDrops: () => void
  /** User tapped a “live now” tile — open the Live floor + player for that stream. */
  onOpenLiveStream?: (reel: DropReel) => void
  onOpenMarketplace: () => void
  /** Match For You quick tiles: Live vs Shop entry points. */
  onOpenMarketplaceAuctions?: () => void
  onOpenMarketplaceShop?: () => void
  onOpenSearch?: () => void
  onOpenMarketplaceBrowse?: (filter: MarketplacePeerBrowseFilter) => void
  onOpenPeerListing: (listingId: string) => void
  onQuickBuyPeerListing: (listingId: string) => void
  /** Hero floating card: opens backpack / cart (defaults to marketplace). */
  onViewBackpack?: () => void
  /** Wallet card: full transaction history (bank-style account). */
  onViewTransactions?: () => void
  onOpenGifts?: () => void
  onOpenNotifications?: () => void
  /** Opens the Bid Wars hub from the adventure promo. */
  onJoinBidWar?: () => void
  intentOrbHintBubble: boolean
  intentOrbHintCopy: string
  fetchDogEarsActive: boolean
  orbExpression: FetchOrbExpression
  orbState: JarvisOrbState
  isSpeechPlaying: boolean
  orbAwakened: boolean
  homeOrbVoiceLevel: number
  confirmationNonce: number
  orbMapAttention: MapAttentionCue
  bookingSheetFocusMode: boolean
  orbChatTurns: OrbChatTurn[]
  voiceHoldCaption: string | null
  orbEphemeralBubble: string | null
  orbGlowColor: { r: number; g: number; b: number }
  orbDockAutonomous: boolean
  orbBurstExpression: FetchOrbExpression | null
  /** Ask Fetch sheet: open brain; non-empty message is sent as first user turn. */
  onExploreAskFetchSubmit: (trimmedMessage: string) => void
  onIntentSheetPullExpand?: () => void
  brainImmersive: boolean
  showIntent: boolean
  cardVisible: boolean
  /**
   * `page` — bleed through `main` horizontal padding (Explore full screen).
   * `tight` — bleed through `fetch-home-landing` px-0.5 when embedded there.
   */
  furniturePromoBleed?: 'page' | 'tight'
  /** Full-page Explore: report vertical scroll for collapsing the app header. */
  onExploreFeedScrollTop?: (scrollTop: number) => void
}

export function ServicesExploreHomePanel({
  scanning: _scanning,
  onOpenDrops,
  onOpenLiveStream,
  onOpenMarketplace,
  onOpenMarketplaceAuctions,
  onOpenMarketplaceShop,
  onOpenSearch,
  onOpenMarketplaceBrowse,
  onOpenPeerListing,
  onQuickBuyPeerListing: _onQuickBuyPeerListing,
  onViewBackpack,
  onViewTransactions,
  onOpenGifts,
  onOpenNotifications,
  onJoinBidWar,
  intentOrbHintBubble: _intentOrbHintBubble,
  intentOrbHintCopy: _intentOrbHintCopy,
  fetchDogEarsActive: _fetchDogEarsActive,
  orbExpression: _orbExpression,
  orbState: _orbState,
  isSpeechPlaying: _isSpeechPlaying,
  orbAwakened: _orbAwakened,
  homeOrbVoiceLevel: _homeOrbVoiceLevel,
  confirmationNonce: _confirmationNonce,
  orbMapAttention: _orbMapAttention,
  bookingSheetFocusMode: _bookingSheetFocusMode,
  orbChatTurns: _orbChatTurns,
  voiceHoldCaption: _voiceHoldCaption,
  orbEphemeralBubble: _orbEphemeralBubble,
  orbGlowColor: _orbGlowColor,
  orbDockAutonomous: _orbDockAutonomous,
  orbBurstExpression: _orbBurstExpression,
  onExploreAskFetchSubmit,
  onIntentSheetPullExpand: _onIntentSheetPullExpand,
  brainImmersive: _brainImmersive,
  showIntent: _showIntent,
  cardVisible: _cardVisible,
  furniturePromoBleed: _furniturePromoBleed = 'page',
  onExploreFeedScrollTop,
}: ServicesExploreHomePanelProps) {
  const [askFetchOpen, setAskFetchOpen] = useState(false)
  const scrollTopPendingRef = useRef<number | null>(null)
  const scrollRafRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }
    }
  }, [])

  const flushExploreScroll = useRef(onExploreFeedScrollTop)
  flushExploreScroll.current = onExploreFeedScrollTop

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-[#f3f0fa]">
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-[#f3f0fa] pb-[calc(env(safe-area-inset-bottom,0px)+3.5rem)] [-webkit-overflow-scrolling:touch] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={
          onExploreFeedScrollTop
            ? (e) => {
                const st = e.currentTarget.scrollTop
                setAskFetchOpen((open) => (open && st > 18 ? false : open))
                scrollTopPendingRef.current = st
                if (scrollRafRef.current != null) return
                scrollRafRef.current = requestAnimationFrame(() => {
                  scrollRafRef.current = null
                  const top = scrollTopPendingRef.current
                  if (top == null || !flushExploreScroll.current) return
                  flushExploreScroll.current(top)
                })
              }
            : undefined
        }
      >
        <div className="flex w-full min-w-0 flex-col">
          <HomeFeedV2
            onOpenLiveStream={onOpenLiveStream}
            onOpenMarketplaceAuctions={onOpenMarketplaceAuctions ?? onOpenMarketplace}
            onOpenMarketplaceShop={onOpenMarketplaceShop ?? onOpenMarketplace}
            onViewAllForYou={
              onOpenMarketplaceBrowse ? () => onOpenMarketplaceBrowse({}) : undefined
            }
            onOpenSearch={onOpenSearch}
            onOpenPeerListing={onOpenPeerListing}
            onJoinBidWar={onJoinBidWar}
            onGoLive={onOpenMarketplaceAuctions ?? onOpenMarketplace}
            onCreateListing={onOpenDrops}
            onAddHunt={onOpenDrops}
            onViewWallet={onViewTransactions ?? onViewBackpack}
            onOpenGifts={onOpenGifts}
            onOpenNotifications={onOpenNotifications}
          />
        </div>
      </div>

      <ExploreAskFetchSheet
        open={askFetchOpen}
        onClose={() => setAskFetchOpen(false)}
        onSubmit={(text) => {
          setAskFetchOpen(false)
          onExploreAskFetchSubmit(text)
        }}
        onOpenMarketplaceBrowse={onOpenMarketplaceBrowse}
      />
    </div>
  )
}

