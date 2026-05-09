import crypto from 'node:crypto'

/** @typedef {'draft' | 'preview' | 'live' | 'ended'} LiveSessionStatus */

/**
 * Ephemeral session store — dev / single-instance. Replace with Postgres for production.
 */
const sessionsByRoom = new Map()

export function sanitizeRoomName(raw) {
  if (typeof raw !== 'string') return ''
  const t = raw.trim().slice(0, 128)
  // Allow common LiveKit-safe room identifiers
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]+$/.test(t) || t.length < 6) return ''
  return t
}

export function sanitizeIdentity(raw, fallback) {
  if (typeof raw === 'string' && raw.trim()) return raw.trim().slice(0, 128)
  return String(fallback || 'anon').slice(0, 128)
}

/** @returns {IterableIterator<string>} */
export function iterRoomNames() {
  return sessionsByRoom.keys()
}

export function listSessions(filters = {}) {
  const rows = [...sessionsByRoom.values()]
    .slice()
    .sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0))
  if (filters.status === 'live') return rows.filter((s) => s.status === 'live')
  return rows
}

export function getSession(roomName) {
  const key = sanitizeRoomName(roomName)
  if (!key) return null
  return sessionsByRoom.get(key) ?? null
}

/** @typedef {{ listingId: string, slot?: string, sortIndex?: number, title?: string, imageUrl?: string, priceCents?: number, saleMode?: string }} IncomingListingLine */

export function createSession(roomNameRaw, incoming) {
  const roomName = sanitizeRoomName(roomNameRaw ?? incoming?.roomName)
  if (!roomName || sessionsByRoom.has(roomName)) return { ok: false, error: 'invalid_or_duplicate_room' }

  const now = Date.now()
  /** @type {LiveSessionStatus} */
  let status =
    incoming?.status === 'draft' || incoming?.status === 'preview' || incoming?.status === 'live'
      ? incoming.status
      : 'draft'

  /** @type {IncomingListingLine[]} */
  const lines = Array.isArray(incoming.listings) ? incoming.listings : []

  const listings = lines
    .map((ln, idx) => {
      const listingId = typeof ln?.listingId === 'string' ? ln.listingId.trim() : ''
      if (!listingId) return null
      const slot =
        ln.slot === 'live_now' || ln.slot === 'on_deck' || ln.slot === 'later' ? ln.slot : 'later'
      return {
        listingId,
        slot,
        sortIndex: typeof ln.sortIndex === 'number' ? ln.sortIndex : idx,
        title: typeof ln.title === 'string' ? ln.title.trim().slice(0, 200) : undefined,
        imageUrl: typeof ln.imageUrl === 'string' ? ln.imageUrl.trim().slice(0, 2048) : undefined,
        priceCents: typeof ln.priceCents === 'number' && Number.isFinite(ln.priceCents) ? Math.round(ln.priceCents) : undefined,
        saleMode:
          ln.saleMode === 'auction' || ln.saleMode === 'fixed' ? ln.saleMode : undefined,
        currentBidCents:
          typeof ln.currentBidCents === 'number' && Number.isFinite(ln.currentBidCents)
            ? Math.round(ln.currentBidCents)
            : undefined,
      }
    })
    .filter(Boolean)

  const pinnedFrom =
    typeof incoming.pinnedListingId === 'string' && incoming.pinnedListingId.trim()
      ? incoming.pinnedListingId.trim()
      : null
  const pinnedListingId = pinnedFrom && listings.some((l) => l.listingId === pinnedFrom) ? pinnedFrom : null

  const coverSquareUrlRaw =
    typeof incoming.coverSquareUrl === 'string' ? incoming.coverSquareUrl.trim().slice(0, 2048) : ''
  const coverVerticalUrlRaw =
    typeof incoming.coverVerticalUrl === 'string' ? incoming.coverVerticalUrl.trim().slice(0, 2048) : ''
  const legacyCover =
    typeof incoming.coverImageUrl === 'string' ? incoming.coverImageUrl.trim().slice(0, 2048) : ''

  const session = {
    id: typeof incoming.id === 'string' && incoming.id.trim() ? incoming.id.trim() : crypto.randomUUID(),
    roomName,
    sellerId: String(incoming.sellerId),
    sellerDisplay: typeof incoming.sellerDisplay === 'string' ? incoming.sellerDisplay.trim().slice(0, 120) : '',
    title: typeof incoming.title === 'string' ? incoming.title.trim().slice(0, 200) : '',
    category: typeof incoming.category === 'string' ? incoming.category.trim().slice(0, 64) : '',
    description:
      typeof incoming.description === 'string' ? incoming.description.trim().slice(0, 2000) : '',
    coverSquareUrl: coverSquareUrlRaw,
    coverVerticalUrl: coverVerticalUrlRaw,
    /** Mirrors square (or legacy cover only) for older feed code. */
    coverImageUrl: coverSquareUrlRaw || legacyCover,
    status,
    listings,
    pinnedListingId,
    viewerCount:
      typeof incoming.viewerCount === 'number' && Number.isFinite(incoming.viewerCount)
        ? Math.max(0, Math.floor(incoming.viewerCount))
        : 0,
    startedAt: status === 'live' ? new Date(now).toISOString() : undefined,
    endedAt: undefined,
    auctionEndsAt:
      incoming.auctionEndsAt == null ? null : Number.isFinite(Number(incoming.auctionEndsAt))
        ? Math.floor(Number(incoming.auctionEndsAt))
        : null,
    auctionActive: incoming.auctionActive === true,
    soldListingIds: Array.isArray(incoming.soldListingIds)
      ? incoming.soldListingIds.map((x) => String(x)).filter(Boolean).slice(0, 120)
      : [],
    chat: [],
    createdAtMs: now,
    updatedAtMs: now,
  }

  sessionsByRoom.set(roomName, session)
  return { ok: true, session }
}

/** @param {IncomingListingLine[]} listings */
export function normalizeListingPatches(listings) {
  const lines = Array.isArray(listings) ? listings : []
  return lines
    .map((ln, idx) => {
      const listingId = typeof ln?.listingId === 'string' ? ln.listingId.trim() : ''
      if (!listingId) return null
      const slot =
        ln.slot === 'live_now' || ln.slot === 'on_deck' || ln.slot === 'later'
          ? ln.slot
          : undefined
      return {
        listingId,
        ...(slot ? { slot } : {}),
        ...(typeof ln.sortIndex === 'number' ? { sortIndex: ln.sortIndex } : { sortIndex: idx }),
        ...(typeof ln.title === 'string' ? { title: ln.title.trim().slice(0, 200) } : {}),
        ...(typeof ln.imageUrl === 'string' ? { imageUrl: ln.imageUrl.trim().slice(0, 2048) } : {}),
        ...(typeof ln.priceCents === 'number' && Number.isFinite(ln.priceCents)
          ? { priceCents: Math.round(ln.priceCents) }
          : {}),
        ...(ln.saleMode === 'auction' || ln.saleMode === 'fixed' ? { saleMode: ln.saleMode } : {}),
        ...(typeof ln.currentBidCents === 'number' && Number.isFinite(ln.currentBidCents)
          ? { currentBidCents: Math.round(ln.currentBidCents) }
          : {}),
      }
    })
    .filter(Boolean)
}

/** @typedef {{ title?: string, category?: string, description?: string, coverImageUrl?: string, coverSquareUrl?: string, coverVerticalUrl?: string, status?: LiveSessionStatus, listings?: IncomingListingLine[], pinnedListingId?: string | null, viewerCount?: number, auctionEndsAt?: number | null, auctionActive?: boolean, sellerDisplay?: string, markSoldListingId?: string, chatAppend?: { text: string } }} PatchBody */

/** @returns {{ ok: true, session } | { ok: false } } */
export function patchSession(roomNameRaw, patch) {
  const roomName = sanitizeRoomName(roomNameRaw)
  if (!roomName) return { ok: false }
  const s = sessionsByRoom.get(roomName)
  if (!s) return { ok: false }

  /** @type {PatchBody} */
  const body = patch && typeof patch === 'object' ? patch : {}

  if (typeof body.title === 'string') s.title = body.title.trim().slice(0, 200)
  if (typeof body.category === 'string') s.category = body.category.trim().slice(0, 64)
  if (typeof body.description === 'string') s.description = body.description.trim().slice(0, 2000)
  if (typeof body.coverImageUrl === 'string') s.coverImageUrl = body.coverImageUrl.trim().slice(0, 2048)
  if (typeof body.coverSquareUrl === 'string') {
    const v = body.coverSquareUrl.trim().slice(0, 2048)
    s.coverSquareUrl = v
    s.coverImageUrl = v || s.coverImageUrl
  }
  if (typeof body.coverVerticalUrl === 'string') {
    s.coverVerticalUrl = body.coverVerticalUrl.trim().slice(0, 2048)
  }
  if (typeof body.sellerDisplay === 'string') s.sellerDisplay = body.sellerDisplay.trim().slice(0, 120)

  if (body.status === 'draft' || body.status === 'preview' || body.status === 'live' || body.status === 'ended') {
    const prev = s.status
    s.status = body.status
    if (body.status === 'live' && prev !== 'live') {
      s.startedAt = new Date().toISOString()
    }
    if (body.status === 'ended') {
      s.endedAt = new Date().toISOString()
    }
  }

  if (Array.isArray(body.listings)) {
    const prevById = new Map(s.listings.map((l) => [l.listingId, { ...l }]))
    const next = normalizeListingPatches(body.listings).map((l) => {
      const prev = prevById.get(l.listingId)
      return { ...prev, ...l }
    })
    s.listings = next
  }

  if (body.pinnedListingId !== undefined) {
    if (body.pinnedListingId === null || body.pinnedListingId === '') {
      s.pinnedListingId = null
    } else {
      const id = String(body.pinnedListingId).trim()
      s.pinnedListingId = id && s.listings.some((l) => l.listingId === id) ? id : null
    }
  }

  if (typeof body.viewerCount === 'number' && Number.isFinite(body.viewerCount)) {
    s.viewerCount = Math.max(0, Math.floor(body.viewerCount))
  }

  if (body.auctionEndsAt !== undefined) {
    s.auctionEndsAt =
      body.auctionEndsAt === null ? null : Number.isFinite(Number(body.auctionEndsAt))
        ? Math.floor(Number(body.auctionEndsAt))
        : s.auctionEndsAt
  }
  if (typeof body.auctionActive === 'boolean') s.auctionActive = body.auctionActive

  if (typeof body.markSoldListingId === 'string' && body.markSoldListingId.trim()) {
    const lid = body.markSoldListingId.trim()
    if (!Array.isArray(s.soldListingIds)) s.soldListingIds = []
    if (!s.soldListingIds.includes(lid)) s.soldListingIds.push(lid)
  }

  if (body.chatAppend && typeof body.chatAppend.text === 'string') {
    const text = body.chatAppend.text.trim().slice(0, 500)
    if (text.length) {
      if (!Array.isArray(s.chat)) s.chat = []
      s.chat.push({
        id: crypto.randomUUID(),
        text,
        senderId: typeof body.chatAppend.senderId === 'string' ? body.chatAppend.senderId.slice(0, 128) : '',
        senderName:
          typeof body.chatAppend.senderName === 'string' ? body.chatAppend.senderName.trim().slice(0, 80) : 'Viewer',
        ts: Date.now(),
      })
      if (s.chat.length > 80) s.chat.splice(0, s.chat.length - 80)
    }
  }

  s.updatedAtMs = Date.now()
  return { ok: true, session: s }
}

export function appendChatMessage(roomNameRaw, senderId, senderName, text) {
  return patchSession(roomNameRaw, {
    chatAppend: { senderId, senderName, text },
  })
}
