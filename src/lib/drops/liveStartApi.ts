/**
 * Start a Mux-backed live showcase drop (server creates drop + live stream, publishes to feed).
 */

import { getFetchApiBaseUrl } from '../fetchApiBase'

export type LiveShowcaseItem =
  | { type: 'listing'; id: string; label?: string }
  | { type: 'product'; id: string; label?: string }

export type StartDropLiveShowcaseBody = {
  title?: string
  sellerDisplay?: string
  blurb?: string
  showcaseItems: LiveShowcaseItem[]
  /** Required — `/listing-uploads/...` from `uploadListingImagesForCreate` (1:1 feed row cover). */
  coverSquareUrl: string
  /** Required — `/listing-uploads/...` portrait carousel art. */
  coverVerticalUrl: string
  categories?: string[]
  region?: string
  priceLabel?: string
}

export type StartDropLiveShowcaseResult = {
  dropId: string
  rtmpUrl: string
  streamKey: string | null
  playbackUrl: string
}

export async function startDropLiveShowcase(
  body: StartDropLiveShowcaseBody,
): Promise<StartDropLiveShowcaseResult> {
  const res = await fetch(`${getFetchApiBaseUrl()}/api/drops/live/start`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => ({}))) as Partial<StartDropLiveShowcaseResult> & {
    error?: string
    detail?: string
    dropId?: string
  }
  if (!res.ok) {
    const msg =
      typeof json.detail === 'string' && json.detail.trim()
        ? `${json.error || 'live_start_failed'}: ${json.detail}`
        : json.error || `live_start_failed (${res.status})`
    throw new Error(msg)
  }
  const playbackUrl = typeof json.playbackUrl === 'string' ? json.playbackUrl : ''
  if (!json.dropId || !playbackUrl) {
    throw new Error('live_start_invalid_response')
  }
  return {
    dropId: String(json.dropId),
    rtmpUrl: typeof json.rtmpUrl === 'string' ? json.rtmpUrl : '',
    streamKey: typeof json.streamKey === 'string' ? json.streamKey : null,
    playbackUrl,
  }
}
