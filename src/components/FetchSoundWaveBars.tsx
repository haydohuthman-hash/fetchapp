/**
 * Voice-activity motif — seven tapered capsules (colour from `.fetch-sound-wave-bars__bar`).
 */
const BAR_HEIGHTS = [0.32, 0.48, 0.68, 0.95, 0.68, 0.48, 0.32] as const
const BAR_WIDTHS = [2, 2, 3, 3, 3, 2, 2] as const

const H_BAR_LENGTH_FRAC = [0.32, 0.48, 0.68, 0.95, 0.68, 0.48, 0.32] as const
const H_BAR_THICKNESS = [2, 2, 3, 3, 3, 2, 2] as const

export function FetchSoundWaveBars({
  active,
  className = '',
  orientation = 'vertical',
  /** `center` — bars peak in the middle (tallest center), aligned to vertical middle of the box. */
  verticalAlign = 'end',
  maxBarHeightPx = 17,
}: {
  active: boolean
  className?: string
  orientation?: 'vertical' | 'horizontal'
  verticalAlign?: 'end' | 'center'
  /** Cap for tallest bar (middle); default 17, Explore chip can pass ~22. */
  maxBarHeightPx?: number
}) {
  const maxH = maxBarHeightPx
  const maxW = 17

  if (orientation === 'horizontal') {
    return (
      <div
        className={[
          'fetch-sound-wave-bars fetch-sound-wave-bars--horizontal inline-flex h-[20px] items-center justify-center gap-[2px]',
          active ? 'fetch-sound-wave-bars--active' : 'fetch-sound-wave-bars--idle',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden
      >
        {H_BAR_LENGTH_FRAC.map((wFrac, i) => (
          <span
            key={i}
            className="fetch-sound-wave-bars__bar fetch-sound-wave-bars__bar--horizontal rounded-full"
            style={{
              width: `${Math.round(maxW * wFrac)}px`,
              height: `${H_BAR_THICKNESS[i]}px`,
              animationDelay: `${i * 0.06}s`,
            }}
          />
        ))}
      </div>
    )
  }

  const rowH = Math.min(26, Math.max(20, Math.round(maxH * 1.08)))

  return (
    <div
      className={[
        'fetch-sound-wave-bars inline-flex justify-center gap-[2px]',
        verticalAlign === 'center'
          ? 'fetch-sound-wave-bars--vertical-center items-center'
          : 'items-end',
        active ? 'fetch-sound-wave-bars--active' : 'fetch-sound-wave-bars--idle',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ height: `${rowH}px` }}
      aria-hidden
    >
      {BAR_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={[
            'fetch-sound-wave-bars__bar rounded-full',
            verticalAlign === 'center' ? 'fetch-sound-wave-bars__bar--vertical-center' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            width: `${BAR_WIDTHS[i]}px`,
            height: `${Math.round(maxH * h)}px`,
            animationDelay: `${i * 0.06}s`,
          }}
        />
      ))}
    </div>
  )
}
