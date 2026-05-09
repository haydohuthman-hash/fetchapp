import { getFetchApiBaseUrl } from '../fetchApiBase'
import { marketplaceActorHeaders } from '../booking/marketplaceApiAuth'
import type { DropsCommerceTarget } from './types'

/** Public published drop payload (minimal for studio). */
export type PublishedDropApiResponse = {
  drop: {
    id: string
    commerce?: DropsCommerceTarget
    blurb?: string
    title?: string
    priceLabel?: string
    [key: string]: unknown
  }
}

async function dropsJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getFetchApiBaseUrl()}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.method && init.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
      ...marketplaceActorHeaders('customer'),
      ...(init?.headers ?? {}),
    },
  })
  const payload = (await res.json().catch(() => ({}))) as T & { error?: string; detail?: string }
  if (!res.ok) {
    const err = typeof payload.error === 'string' ? payload.error : `request_failed_${res.status}`
    const d = typeof payload.detail === 'string' ? `: ${payload.detail}` : ''
    throw new Error(`${err}${d}`)
  }
  return payload
}

export async function fetchPublishedDrop(dropId: string): Promise<PublishedDropApiResponse> {
  return dropsJson<PublishedDropApiResponse>(`/api/drops/${encodeURIComponent(dropId)}`, { method: 'GET' })
}

export type LiveShowcasePatchItem =
  | { type: 'listing'; id: string; label?: string }
  | { type: 'product'; id: string; label?: string }

/**
 * Update live showcase listings on a published drop (seller-only). Server validates ownership.
 * Pass `covers` from the current drop when you have them; omit to reuse stored covers.
 */
export async function patchDropLiveShowcase(
  dropId: string,
  showcaseItems: LiveShowcasePatchItem[],
  covers?: { coverSquareUrl?: string; coverVerticalUrl?: string },
): Promise<PublishedDropApiResponse> {
  return dropsJson<PublishedDropApiResponse>(`/api/drops/${encodeURIComponent(dropId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      commerce: {
        kind: 'live_showcase',
        showcaseItems,
        ...(covers?.coverSquareUrl ? { coverSquareUrl: covers.coverSquareUrl } : {}),
        ...(covers?.coverVerticalUrl ? { coverVerticalUrl: covers.coverVerticalUrl } : {}),
      },
    }),
  })
}
