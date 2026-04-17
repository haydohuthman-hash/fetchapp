import { useEffect, useRef, useState } from 'react'
import type {
  FetchOrbExpression,
  JarvisOrbState,
  MapAttentionCue,
} from './JarvisNeuralOrb'
import type { MarketplacePeerBrowseFilter } from './ExploreBrowseBanner'
import { ExploreAskFetchSheet } from './ExploreAskFetchSheet'
import { HomeShellForYouFeed } from './HomeShellForYouFeed'

type OrbChatTurn = { id: string; role: 'user' | 'assistant'; text: string }

export type ServicesExploreHomePanelProps = {
  scanning: boolean
  onOpenDrops: () => void
  onOpenMarketplace: () => void
  onOpenSearch?: () => void
  onOpenMarketplaceBrowse?: (filter: MarketplacePeerBrowseFilter) => void
  onOpenPeerListing: (listingId: string) => void
  onQuickBuyPeerListing: (listingId: string) => void
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
  onOpenMarketplace,
  onOpenSearch,
  onOpenMarketplaceBrowse,
  onOpenPeerListing,
  onQuickBuyPeerListing,
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
  furniturePromoBleed = 'page',
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
    <div className="flex min-h-0 flex-1 flex-col bg-[#000000]">
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#000000] [-webkit-overflow-scrolling:touch] pr-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        <HomeShellForYouFeed
          embedded
          explorePromoBleed={furniturePromoBleed}
          onOpenDrops={onOpenDrops}
          onOpenMarketplace={onOpenMarketplace}
          onOpenSearch={onOpenSearch}
          onOpenMarketplaceBrowse={onOpenMarketplaceBrowse}
          onOpenPeerListing={onOpenPeerListing}
          onQuickBuyPeerListing={onQuickBuyPeerListing}
        />
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

