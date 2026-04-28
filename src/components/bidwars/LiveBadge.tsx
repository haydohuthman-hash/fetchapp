/**
 * Standardised LIVE badge: rose pill on the left, purple viewer count + eye on
 * the right. Used across home cards, auction tiles, and the live overlay.
 */

type Props = {
  viewers?: number | string
  className?: string
  size?: 'sm' | 'md'
}

function formatViewers(v: number | string): string {
  if (typeof v === 'string') return v
  if (v >= 10_000) return `${(v / 1000).toFixed(0)}k`
  if (v >= 1_000) return `${(v / 1000).toFixed(1)}k`
  return v.toString()
}

export function LiveBadge({ viewers, className = '', size = 'md' }: Props) {
  const px = size === 'sm' ? 'px-1.5 py-[2px]' : 'px-2 py-[3px]'
  const labelText = size === 'sm' ? 'text-[9.5px]' : 'text-[10px]'
  const countText = size === 'sm' ? 'text-[10.5px]' : 'text-[11px]'
  return (
    <span
      className={[
        'inline-flex max-w-full items-stretch overflow-hidden whitespace-nowrap rounded-md shadow-sm ring-1 ring-black/15',
        className,
      ].join(' ')}
    >
      <span
        className={`flex items-center bg-rose-600 ${px} ${labelText} font-extrabold uppercase leading-none tracking-wide text-white`}
      >
        Live
      </span>
      {viewers != null ? (
        <span
          className={`flex items-center gap-1 bg-[#4c1d95] ${px} ${countText} font-extrabold tabular-nums leading-none text-white`}
        >
          <svg
            className="h-3 w-3 shrink-0 text-white/90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {formatViewers(viewers)}
        </span>
      ) : null}
    </span>
  )
}
