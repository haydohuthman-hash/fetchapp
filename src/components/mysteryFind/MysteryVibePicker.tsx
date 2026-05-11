import { memo } from 'react'
import type { MysteryVibeId } from '../../lib/mysteryFind/types'
import { MYSTERY_VIBES } from '../../lib/mysteryFind/constants'

export const MysteryVibePicker = memo(function MysteryVibePicker({
  value,
  onChange,
}: {
  value: MysteryVibeId | null
  onChange: (v: MysteryVibeId) => void
}) {
  return (
    <div className="space-y-2">
      {MYSTERY_VIBES.map((v) => {
        const active = value === v.id
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            className={[
              'flex w-full flex-col gap-0.5 rounded-2xl border px-4 py-3 text-left transition-colors',
              active
                ? 'border-2 border-violet-600 bg-violet-50'
                : 'border-zinc-200/90 bg-white active:bg-zinc-50',
            ].join(' ')}
          >
            <span className="text-[14px] font-bold text-zinc-950">{v.label}</span>
            <span className="text-[12px] font-medium leading-snug text-zinc-600">{v.sub}</span>
          </button>
        )
      })}
    </div>
  )
})
