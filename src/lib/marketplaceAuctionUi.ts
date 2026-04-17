/** Demo-stable “time left” for auction tiles (no server clock yet). */
export function auctionLotEndsLabel(listingId: string): string {
  let h = 0
  for (let i = 0; i < listingId.length; i += 1) h = (h * 31 + listingId.charCodeAt(i)) >>> 0
  const mins = 2 + (h % 57)
  return `${mins}m left`
}

export function liveStreamViewerCountSeed(reelId: string): number {
  let h = 0
  for (let i = 0; i < reelId.length; i += 1) h = (h * 31 + reelId.charCodeAt(i)) >>> 0
  return 220 + (h % 9800)
}

export function formatLiveViewerShort(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

/** Sum demo viewer counts for a set of reel ids (used on the auctions hub). */
export function sumDemoLiveViewersForReelIds(ids: readonly string[]): number {
  return ids.reduce((sum, id) => sum + liveStreamViewerCountSeed(id), 0)
}
