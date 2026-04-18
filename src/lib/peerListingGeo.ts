import { BRISBANE_CENTER } from '../components/FetchHomeStepOne/brisbaneMap'
import type { PeerListing } from './listingsApi'

/** Matches `HomeShellBuySellPage` / `LocationRadiusPickerSheet` persistence. */
const BUYSHELL_MAP_AREA_KEY = 'fetch.buysell.map-area-v1'

export type LatLng = { lat: number; lng: number }

export function loadBuysellMapAreaCenter(): LatLng | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(BUYSHELL_MAP_AREA_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as { lat?: number; lng?: number }
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null
    return { lat: p.lat as number, lng: p.lng as number }
  } catch {
    return null
  }
}

/** Full saved marketplace map pin when present (includes optional place label). */
export function loadBuysellMapAreaRecord(): { lat: number; lng: number; label: string } | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(BUYSHELL_MAP_AREA_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as { lat?: number; lng?: number; label?: string }
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null
    return {
      lat: p.lat as number,
      lng: p.lng as number,
      label: typeof p.label === 'string' ? p.label.trim() : '',
    }
  } catch {
    return null
  }
}

/** Saved Buy & sell map pin, or Brisbane demo anchor when unset. */
export function viewerCenterForPeerListings(): LatLng {
  return loadBuysellMapAreaCenter() ?? BRISBANE_CENTER
}

function hashString32(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}

/** Haversine distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)))
  return R * c
}

/**
 * Stable seller coordinates for distance: uses API fields when present, otherwise a
 * deterministic point a few km from the Brisbane demo anchor (matches mock listings).
 */
export function inferPeerListingSellerLatLng(l: PeerListing): LatLng {
  const lat = l.sellerLatitude
  const lng = l.sellerLongitude
  if (typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)) {
    return { lat, lng }
  }
  const h = hashString32(l.id)
  const distKm = 0.7 + (Math.abs(h) % 1150) / 100 // ~0.7–12.2 km
  const bearingDeg = Math.abs(h) % 360
  const br = (bearingDeg * Math.PI) / 180
  const dyKm = distKm * Math.cos(br)
  const dxKm = distKm * Math.sin(br)
  const dLat = dyKm / 111_000
  const cosLat = Math.cos((BRISBANE_CENTER.lat * Math.PI) / 180)
  const dLng = dxKm / (111_320 * Math.max(0.25, Math.abs(cosLat)))
  return { lat: BRISBANE_CENTER.lat + dLat, lng: BRISBANE_CENTER.lng + dLng }
}

/** Rough local drive ETA from straight-line km (urban average). */
export function estimateDriveEtaMinutes(km: number): number {
  const avgKmh = 28
  const raw = (km / avgKmh) * 60
  return Math.min(120, Math.max(4, Math.round(raw)))
}

export function formatPeerListingDistanceEta(viewer: LatLng, listing: PeerListing): string {
  const seller = inferPeerListingSellerLatLng(listing)
  const km = haversineKm(viewer, seller)
  const min = estimateDriveEtaMinutes(km)
  return `${km.toFixed(1)} km · ~${min} min`
}

export function peerListingDistanceEtaAriaSuffix(viewer: LatLng, listing: PeerListing): string {
  const seller = inferPeerListingSellerLatLng(listing)
  const km = haversineKm(viewer, seller)
  const min = estimateDriveEtaMinutes(km)
  return ` ${km.toFixed(1)} kilometres from you, about ${min} minutes by car`
}
