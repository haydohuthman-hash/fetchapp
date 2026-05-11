import { memo, useMemo } from 'react'
import type { MysteryCategorySelectId } from '../../lib/mysteryFind/types'
import { getListingMatchPreview } from '../../lib/mysteryFind/matchTierPreview'

export const MysteryMatchPreviewPanel = memo(function MysteryMatchPreviewPanel({
  lane,
  maxCents,
}: {
  lane: MysteryCategorySelectId
  maxCents: number
}) {
  const tiers = useMemo(() => getListingMatchPreview(lane, maxCents), [lane, maxCents])

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        {tiers.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/90 to-white px-2 py-1.5"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="min-w-0 truncate text-[11px] font-extrabold text-zinc-900">{row.title}</span>
              <span className="shrink-0 text-[11px] font-black tabular-nums text-violet-800">{row.pct}%</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"
                style={{ width: `${Math.min(100, row.pct)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-medium leading-snug text-zinc-500">
        Inventory changes in real time. Every reveal stays inside your max price.
      </p>
    </div>
  )
})
