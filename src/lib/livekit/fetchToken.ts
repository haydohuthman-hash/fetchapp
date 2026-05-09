import { getFetchApiBaseUrl } from '../fetchApiBase'
import { marketplaceActorHeaders } from '../booking/marketplaceApiAuth'

export type LiveKitTokenResponse = {
  token: string
  url: string
  roomName: string
}

/**
 * Backend-only secret: call `POST /api/livekit/token` with authenticated cookies.
 */
export async function fetchLiveKitToken(body: {
  roomName: string
  identity: string
  role: 'host' | 'viewer'
}): Promise<LiveKitTokenResponse> {
  console.log('[LiveKit] token requested', {
    stage: '[LiveKit]',
    roomName: body.roomName,
    role: body.role,
    identitySlice: body.identity.slice(0, 12),
  })
  const res = await fetch(`${getFetchApiBaseUrl()}/api/livekit/token`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...marketplaceActorHeaders('customer'),
    },
    body: JSON.stringify(body),
  })
  const payload = (await res.json().catch(() => ({}))) as LiveKitTokenResponse & {
    error?: string
    detail?: string
  }
  if (!res.ok) {
    const err = typeof payload.error === 'string' ? payload.error : `livekit_token_${res.status}`
    const d = typeof payload.detail === 'string' ? `: ${payload.detail}` : ''
    throw new Error(`${err}${d}`)
  }
  if (!payload.token || typeof payload.token !== 'string') throw new Error('livekit_token_invalid')
  if (!payload.url || typeof payload.url !== 'string') throw new Error('livekit_url_invalid')
  if (!payload.roomName || typeof payload.roomName !== 'string') throw new Error('livekit_room_invalid')
  return {
    token: payload.token,
    url: payload.url,
    roomName: payload.roomName,
  }
}
