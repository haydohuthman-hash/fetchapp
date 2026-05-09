/* eslint-disable @typescript-eslint/no-misused-promises -- UX handlers async */
import { memo, useCallback, useMemo, useState } from 'react'
import type { PeerListing } from '../../lib/listingsApi'
import { listingImageAbsoluteUrl } from '../../lib/listingsApi'
import {
  patchLiveSession,
  postLiveChat,
  type LiveCommerceSession,
  type LiveShowListingLine,
} from '../../lib/live/liveSessionApi'

type Props = {
  roomName: string
  session: LiveCommerceSession
  elapsedSec: number
  viewerCount: number
  /** Host local preview — parent attaches tracks */
  previewVideoRef?: React.RefObject<HTMLVideoElement | null>
  onFlipCamera: () => void
  onMuteToggle: () => void
  onCamToggle: () => void
  micOn: boolean
  camOn: boolean
  onShare: () => void
  onRefresh: () => Promise<void>
  onEnded: () => void
}

function formatClock(total: number): string {
  const s = Math.max(0, Math.floor(total))
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (hh <= 0) return `${mm}:${String(ss).padStart(2, '0')}`
  return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function augmentListings(sess: LiveCommerceSession): LiveShowListingLine[] {
  return [...sess.listings].sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
}

function hydrateListingsFromPeer(sess: LiveCommerceSession, peers: PeerListing[]): LiveShowListingLine[] {
  const pid = peers.reduce<Record<string, PeerListing>>((m, l) => {
    m[l.id] = l
    return m
  }, {})

  const base = augmentListings(sess)
  return base.map((ln) => {
    const x = pid[ln.listingId]
    if (!x) return ln
    return {
      ...ln,
      title: ln.title ?? x.title,
      imageUrl: ln.imageUrl ?? listingImageAbsoluteUrl(x.images?.[0]?.url),
      priceCents: ln.priceCents ?? x.priceCents,
      saleMode: ln.saleMode ?? (x.saleMode === 'auction' ? 'auction' : 'fixed'),
      currentBidCents:
        ln.currentBidCents ?? (x.auctionHighBidCents && x.auctionHighBidCents > 0 ? x.auctionHighBidCents : x.priceCents),
    }
  })
}

function reorderNextLive(sess: LiveCommerceSession): {
  listings: LiveShowListingLine[]
  pinnedListingId: string
} | null {
  const lines = augmentListings(sess)
  if (!lines.length) return null

  const avail = lines.filter((l) => !soldIdsHas(sess.soldListingIds, l.listingId))
  if (!avail.length) return null

  const curPin = sess.pinnedListingId
  let idx = avail.findIndex((l) => l.listingId === curPin)
  if (idx < 0) {
    idx = avail.findIndex((l) => l.listingId === lines.find((x) => x.slot === 'live_now')?.listingId)
  }

  let startIx = idx >= 0 ? idx : 0
  startIx %= avail.length || 1
  const nid = avail[(startIx + 1) % avail.length]?.listingId
  if (!nid) return null

  const updated = lines.map((l): LiveShowListingLine => ({
    ...l,
    slot:
      l.listingId === nid ? 'live_now'
      : avail.some((a) => a.listingId === l.listingId) ? 'on_deck'
      : 'later',
  }))

  return { listings: updated, pinnedListingId: nid }
}

function soldIdsHas(soldListingIds: string[] | undefined, id?: string): boolean {
  if (!id || !soldListingIds?.length) return false
  return soldListingIds.includes(id)
}

export const LiveStudio = memo(function LiveStudioHost({
  roomName,
  session,
  elapsedSec,
  viewerCount,
  previewVideoRef,
  onFlipCamera,
  onMuteToggle,
  onCamToggle,
  micOn,
  camOn,
  onShare,
  onRefresh,
  onEnded,
}: Props) {
  const [chatDraft, setChatDraft] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [pinSheet, setPinSheet] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)

  const ordered = useMemo(() => augmentListings(session), [session])

  const sendChatHost = useCallback(async () => {
    const text = chatDraft.trim()
    if (!text) return
    setChatDraft('')
    console.log('[LiveKit] chat host send', text.slice(0, 44))
    setBusy('chat')
    try {
      await postLiveChat(roomName, text)
      await onRefresh()
    } catch (e) {
      console.warn(e)
    } finally {
      setBusy(null)
    }
  }, [chatDraft, onRefresh, roomName])

  const onNext = useCallback(async () => {
    setBusy('next')
    try {
      const next = reorderNextLive(session)
      if (!next) return
      await patchLiveSession(roomName, next)
      await onRefresh()
    } catch (e) {
      console.warn(e)
    } finally {
      setBusy(null)
    }
  }, [onRefresh, roomName, session])

  const onPin = useCallback(
    async (listingId: string) => {
      setBusy('pin')
      try {
        const lines = augmentListings(session).map((l): LiveShowListingLine => ({
          ...l,
          slot: l.listingId === listingId ? 'live_now' : l.slot,
        }))
        await patchLiveSession(roomName, { pinnedListingId: listingId, listings: lines })
        setPinSheet(false)
        await onRefresh()
      } catch (e) {
        console.warn(e)
      } finally {
        setBusy(null)
      }
    },
    [onRefresh, roomName, session],
  )

  const onSold = useCallback(async () => {
    if (!session.pinnedListingId) return
    setBusy('sold')
    try {
      await patchLiveSession(roomName, { markSoldListingId: session.pinnedListingId })
      await onRefresh()
    } catch (e) {
      console.warn(e)
    } finally {
      setBusy(null)
    }
  }, [onRefresh, roomName, session.pinnedListingId])

  const onAuctionStart60 = useCallback(async () => {
    setBusy('auction')
    try {
      const ends = Date.now() + 60_000
      await patchLiveSession(roomName, { auctionActive: true, auctionEndsAt: ends })
      await onRefresh()
    } catch (e) {
      console.warn(e)
    } finally {
      setBusy(null)
    }
  }, [onRefresh, roomName])

  const onAuctionEndNow = useCallback(async () => {
    setBusy('auction')
    try {
      await patchLiveSession(roomName, { auctionActive: false, auctionEndsAt: null })
      await onRefresh()
    } catch (e) {
      console.warn(e)
    } finally {
      setBusy(null)
    }
  }, [onRefresh, roomName])

  const auctionLeft =
    session.auctionActive && session.auctionEndsAt
      ? Math.max(0, Math.ceil((session.auctionEndsAt - Date.now()) / 1000))
      : null

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col bg-gradient-to-b from-black/15 via-transparent to-black/65">
      <header className="pointer-events-auto flex shrink-0 items-start justify-between gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
            Live
          </span>
          <span className="rounded-full bg-white/95 px-2 py-1 text-[12px] font-semibold tabular-nums text-zinc-900 shadow-sm">
            {formatClock(elapsedSec)}
          </span>
          {auctionLeft != null ? (
            <span className="rounded-full bg-orange-400/95 px-2 py-0.5 text-[11px] font-bold text-orange-950 tabular-nums shadow-sm">
              Auc {auctionLeft}s
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/90 px-2 py-1 text-[12px] font-semibold tabular-nums text-zinc-800 shadow-sm">
            {viewerCount} watching
          </span>
          <button
            type="button"
            onClick={() => setConfirmEnd(true)}
            className="fetch-live-pressable rounded-xl bg-white/95 px-3 py-1.5 text-[12px] font-bold text-red-700 shadow-sm active:bg-red-50"
          >
            End
          </button>
        </div>
      </header>

      {/* Right dock */}
      <div className="pointer-events-none absolute bottom-36 right-3 top-28 flex flex-col justify-center gap-2">
        <div className="pointer-events-auto flex flex-col gap-2 rounded-3xl bg-white/90 p-1.5 shadow-lg shadow-black/25">
          <StudioCircleBtn label="Flip" onPress={onFlipCamera} emoji="📷" />
          <StudioCircleBtn label={micOn ? 'Mute' : 'Unmute'} onPress={onMuteToggle} emoji={micOn ? '🎙️' : '🔇'} />
          <StudioCircleBtn label={camOn ? 'Cam off' : 'Cam'} onPress={onCamToggle} emoji={camOn ? '🎥' : '🚫'} />
          <StudioCircleBtn label="Share" onPress={onShare} emoji="↗️" />
        </div>
      </div>

      {/* Local preview thumbnail (single attach lives on main stage when omitted). */}
      {previewVideoRef ? (
        <div className="pointer-events-auto absolute left-3 top-16 h-24 w-20 overflow-hidden rounded-2xl border border-white/80 bg-black shadow-lg">
          <video ref={previewVideoRef} className="h-full w-full object-cover" playsInline muted />
        </div>
      ) : null}

      {/* Bottom */}
      <div className="pointer-events-auto mt-auto flex min-h-0 flex-col gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-h-24 overflow-y-auto rounded-2xl bg-white/90 p-2 shadow-inner shadow-black/10">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Chat</p>
          <ul className="flex flex-col gap-0.5">
            {(session.chat ?? []).slice(-8).map((m) => (
              <li key={m.id} className="text-[11px] leading-snug text-zinc-800">
                <span className="font-bold text-violet-700">{m.senderName}:</span> {m.text}
              </li>
            ))}
          </ul>
          <div className="mt-1 flex gap-1">
            <input
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder="Say hi…"
              className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[12px] text-zinc-900 outline-none focus:border-violet-400"
            />
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void sendChatHost()}
              className="fetch-live-pressable rounded-lg bg-violet-600 px-3 py-1 text-[12px] font-bold text-white active:brightness-95"
            >
              Send
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void onNext()}
            className="fetch-live-pressable flex-1 rounded-2xl bg-white py-3 text-[13px] font-bold text-zinc-900 shadow-md active:bg-zinc-50"
          >
            Next item
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => setPinSheet(true)}
            className="fetch-live-pressable flex-1 rounded-2xl bg-violet-600 py-3 text-[13px] font-bold text-white shadow-md shadow-violet-600/25 active:brightness-95"
          >
            Pin listing
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void onSold()}
            className="fetch-live-pressable flex-1 rounded-2xl border border-emerald-200 bg-emerald-50 py-2.5 text-[12px] font-bold text-emerald-900"
          >
            Mark sold
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void onAuctionStart60()}
            className="fetch-live-pressable flex-1 rounded-2xl border border-orange-200 bg-orange-50 py-2.5 text-[12px] font-bold text-orange-950"
          >
            60s auction
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void onAuctionEndNow()}
            className="fetch-live-pressable flex-1 rounded-2xl border border-zinc-200 bg-white py-2.5 text-[12px] font-bold text-zinc-800"
          >
            End auction
          </button>
        </div>
      </div>

      {pinSheet ? (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3">
          <div className="max-h-[70vh] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <p className="text-[15px] font-bold text-zinc-900">Pin a listing</p>
              <button
                type="button"
                onClick={() => setPinSheet(false)}
                className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <ul className="max-h-[55vh] overflow-y-auto p-2">
              {ordered.map((l) => (
                <li key={l.listingId} className="border-b border-zinc-50 last:border-0">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left active:bg-violet-50"
                    onClick={() => void onPin(l.listingId)}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                      {l.imageUrl ? (
                        <img src={l.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-zinc-900">{l.title || l.listingId}</p>
                      <p className="text-[11px] text-zinc-500">{l.slot}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {confirmEnd ? (
        <div className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <p className="text-[16px] font-bold text-zinc-900">End live stream?</p>
            <p className="mt-1 text-[13px] leading-snug text-zinc-600">Buyers will leave the room and the show ends.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                className="fetch-live-pressable flex-1 rounded-xl border border-zinc-200 py-3 text-[14px] font-semibold text-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmEnd(false)
                  onEnded()
                }}
                className="fetch-live-pressable flex-1 rounded-xl bg-red-600 py-3 text-[14px] font-bold text-white shadow-md"
              >
                End live
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
})

function StudioCircleBtn({
  label,
  emoji,
  onPress,
}: {
  label: string
  emoji: string
  onPress: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      title={label}
      className="fetch-live-pressable flex h-12 w-12 flex-col items-center justify-center rounded-full bg-zinc-50 text-[16px] leading-none active:scale-95 active:bg-violet-100"
    >
      <span aria-hidden>{emoji}</span>
      <span className="mt-0.5 max-w-[3rem] truncate text-[8px] font-bold uppercase text-zinc-600">{label}</span>
    </button>
  )
}

export { augmentListings, hydrateListingsFromPeer }
