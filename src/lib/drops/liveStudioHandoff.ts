/**
 * Persist live stream session so sellers can open the “live studio” after starting Mux.
 */

import type { StartDropLiveShowcaseResult } from './liveStartApi'

const KEY = 'fetch.liveStudio.handoff.v1'
const MAX_AGE_MS = 72 * 60 * 60 * 1000

export type LiveStudioHandoff = StartDropLiveShowcaseResult

type Stored = LiveStudioHandoff & { savedAt: number }

export function persistLiveStudioHandoff(h: LiveStudioHandoff): void {
  try {
    const payload: Stored = { ...h, savedAt: Date.now() }
    sessionStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function readLiveStudioHandoff(): LiveStudioHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Stored
    if (!p?.dropId || typeof p.dropId !== 'string') return null
    if (typeof p.savedAt === 'number' && Date.now() - p.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(KEY)
      return null
    }
    return {
      dropId: String(p.dropId),
      rtmpUrl: typeof p.rtmpUrl === 'string' ? p.rtmpUrl : '',
      streamKey: typeof p.streamKey === 'string' ? p.streamKey : null,
      playbackUrl: typeof p.playbackUrl === 'string' ? p.playbackUrl : '',
    }
  } catch {
    return null
  }
}

export function clearLiveStudioHandoff(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
