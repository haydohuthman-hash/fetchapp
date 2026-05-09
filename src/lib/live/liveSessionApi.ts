import { getFetchApiBaseUrl } from '../fetchApiBase'
import { marketplaceActorHeaders } from '../booking/marketplaceApiAuth'

export type LiveSessionStatus = 'draft' | 'preview' | 'live' | 'ended'

export type LiveShowListingLine = {
  listingId: string
  slot: 'live_now' | 'on_deck' | 'later'
  sortIndex?: number
  title?: string
  imageUrl?: string
  priceCents?: number
  saleMode?: 'fixed' | 'auction'
  currentBidCents?: number
}

export type LiveChatLine = {
  id: string
  text: string
  senderId: string
  senderName: string
  ts: number
}

export type LiveCommerceSession = {
  id: string
  roomName: string
  sellerId: string
  sellerDisplay: string
  title: string
  category: string
  description: string
  /** Square cover for feeds / tiles. */
  coverSquareUrl: string
  /** Vertical (9:16-style) promo cover. */
  coverVerticalUrl: string
  /** @deprecated Prefer coverSquareUrl */
  coverImageUrl: string
  status: LiveSessionStatus
  listings: LiveShowListingLine[]
  pinnedListingId: string | null
  viewerCount: number
  startedAt?: string
  endedAt?: string
  auctionEndsAt: number | null
  auctionActive: boolean
  soldListingIds: string[]
  chat: LiveChatLine[]
  createdAtMs: number
  updatedAtMs: number
}

async function liveJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getFetchApiBaseUrl()}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.method === 'POST' ||
      init?.method === 'PATCH' ||
      init?.method === 'PUT' ||
      init?.method === 'DELETE'
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...marketplaceActorHeaders('customer'),
      ...(init?.headers ?? {}),
    },
  })
  const payload = (await res.json().catch(() => ({}))) as T & { error?: string; detail?: string }
  if (!res.ok) {
    const error = typeof payload.error === 'string' ? payload.error : `live_api_${res.status}`
    const detail = typeof payload.detail === 'string' ? `: ${payload.detail}` : ''
    throw new Error(`${error}${detail}`)
  }
  return payload
}

export async function fetchLiveSessionsList(opts?: { status?: 'live' }): Promise<LiveCommerceSession[]> {
  const q = opts?.status === 'live' ? '?status=live' : ''
  const payload = await liveJson<{ sessions: LiveCommerceSession[] }>(`/api/live/sessions${q}`)
  return Array.isArray(payload.sessions) ? payload.sessions : []
}

export async function fetchLiveSession(roomName: string): Promise<LiveCommerceSession | null> {
  const enc = encodeURIComponent(roomName)
  try {
    const payload = await liveJson<{ session: LiveCommerceSession }>(`/api/live/sessions/${enc}`)
    return payload.session ?? null
  } catch (e) {
    if (e instanceof Error && e.message.includes('session_not_found')) return null
    throw e
  }
}

export async function createLiveSession(body: {
  roomName?: string
  sellerDisplay?: string
  title: string
  category: string
  description?: string
  coverSquareUrl: string
  coverVerticalUrl: string
  /** @deprecated Omit; server maps from coverSquareUrl */
  coverImageUrl?: string
  listings: LiveShowListingLine[]
  pinnedListingId?: string | null
  status?: LiveSessionStatus
}): Promise<LiveCommerceSession> {
  const payload = await liveJson<{ session: LiveCommerceSession }>(`/api/live/sessions`, {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      status: body.status ?? 'live',
    }),
  })
  if (!payload.session) throw new Error('live_session_create_invalid')
  return payload.session
}

export async function patchLiveSession(
  roomName: string,
  patch: Partial<{
    title: string
    category: string
    pinnedListingId: string | null
    listings: LiveShowListingLine[]
    viewerCount: number
    auctionEndsAt: number | null
    auctionActive: boolean
    markSoldListingId: string
    status: LiveSessionStatus
  }>,
): Promise<LiveCommerceSession> {
  const enc = encodeURIComponent(roomName)
  const payload = await liveJson<{ session: LiveCommerceSession }>(`/api/live/sessions/${enc}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  if (!payload.session) throw new Error('live_session_patch_invalid')
  return payload.session
}

export async function endLiveSession(roomName: string): Promise<LiveCommerceSession> {
  const enc = encodeURIComponent(roomName)
  const payload = await liveJson<{ session: LiveCommerceSession }>(`/api/live/sessions/${enc}/end`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  if (!payload.session) throw new Error('live_session_end_invalid')
  return payload.session
}

export async function postLiveChat(roomName: string, text: string): Promise<LiveCommerceSession> {
  const enc = encodeURIComponent(roomName)
  const payload = await liveJson<{ session: LiveCommerceSession }>(`/api/live/sessions/${enc}/chat`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
  if (!payload.session) throw new Error('live_chat_failed')
  return payload.session
}
