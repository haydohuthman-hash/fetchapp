/**
 * Big purple BID button used in the live auction room and Bid War 1v1.
 * Includes a lightning glyph and supports a busy state.
 */

type Props = {
  amountLabel: string
  onPress: () => void
  busy?: boolean
  disabled?: boolean
  fullWidth?: boolean
  size?: 'lg' | 'xl'
  className?: string
}

export function BidButton({
  amountLabel,
  onPress,
  busy,
  disabled,
  fullWidth = true,
  size = 'lg',
  className = '',
}: Props) {
  const padding = size === 'xl' ? 'py-4' : 'py-3.5'
  const text = size === 'xl' ? 'text-[16px]' : 'text-[15px]'
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={busy || disabled}
      className={[
        'fetch-auth-cta inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] font-black uppercase tracking-[0.06em] text-white shadow-[0_18px_38px_-14px_rgba(76,29,149,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/10 transition-transform active:scale-[0.985] disabled:opacity-55',
        fullWidth ? 'w-full' : '',
        padding,
        text,
        className,
      ].join(' ')}
      style={{ textShadow: '0 1px 0 rgba(15,7,40,0.35)' }}
      aria-label={`Bid ${amountLabel}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M13 2L4.5 14H12l-1 8 8.5-12H12l1-8z" />
      </svg>
      {busy ? 'Placing…' : `Bid ${amountLabel}`}
    </button>
  )
}
