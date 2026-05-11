import { memo } from 'react'
import type { MysteryCategorySelectId } from '../../lib/mysteryFind/types'
import { MYSTERY_LANE_CARDS } from '../../lib/mysteryFind/constants'

export const MysteryLanePicker = memo(function MysteryLanePicker({
  value,
  onChange,
  visual = 'default',
}: {
  value: MysteryCategorySelectId
  onChange: (id: MysteryCategorySelectId) => void
  visual?: 'default' | 'pack'
}) {
  const pack = visual === 'pack'
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {MYSTERY_LANE_CARDS.map((lane) => {
        const on = value === lane.id
        return (
          <button
            key={lane.id}
            type="button"
            onClick={() => onChange(lane.id)}
            className={[
              'flex min-h-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-center transition-colors active:scale-[0.98] sm:min-h-[3rem]',
              pack
                ? on
                  ? 'border-2 border-cyan-400 bg-cyan-500/15 shadow-[0_0_18px_rgba(34,211,238,0.25)]'
                  : 'border border-zinc-600/90 bg-zinc-900/60 hover:border-cyan-500/50'
                : on
                  ? 'border-2 border-violet-600 bg-violet-50'
                  : 'border border-zinc-200/90 bg-white hover:border-violet-200',
            ].join(' ')}
          >
            <span className="text-[1.1rem] leading-none" aria-hidden>
              {lane.emoji}
            </span>
            <span
              className={[
                'text-[10px] font-extrabold leading-tight',
                pack ? (on ? 'text-cyan-100' : 'text-zinc-400') : on ? 'text-violet-950' : 'text-zinc-800',
              ].join(' ')}
            >
              {lane.label}
            </span>
          </button>
        )
      })}
    </div>
  )
})
