/** Explore hero “listing hunt” demo flag — persisted so the running mascot + status loop survive refresh. */
const STORAGE_KEY = 'fetch.explore.listingHunt.v1'

export const EXPLORE_LISTING_HUNT_CHANGED = 'fetch-explore-listing-hunt-changed'

type Payload = { active: boolean; updatedAt: number }

export function readExploreListingHuntActive(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const o = JSON.parse(raw) as Partial<Payload>
    return o.active === true
  } catch {
    return false
  }
}

export function setExploreListingHuntActive(active: boolean): void {
  if (typeof window === 'undefined') return
  const payload: Payload = { active, updatedAt: Date.now() }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  window.dispatchEvent(new CustomEvent(EXPLORE_LISTING_HUNT_CHANGED))
}
