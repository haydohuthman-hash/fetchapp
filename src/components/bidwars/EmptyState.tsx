type Props = {
  icon?: string
  title: string
  body?: string
  ctaLabel?: string
  onPress?: () => void
  className?: string
}

export function EmptyState({ icon = '✨', title, body, ctaLabel, onPress, className = '' }: Props) {
  return (
    <div
      className={[
        'mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-zinc-200',
        className,
      ].join(' ')}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-violet-100 text-2xl">
        {icon}
      </span>
      <p className="text-[15px] font-black tracking-tight text-zinc-900">{title}</p>
      {body ? <p className="text-[12.5px] font-medium text-zinc-500">{body}</p> : null}
      {ctaLabel && onPress ? (
        <button
          type="button"
          onClick={onPress}
          className="mt-1 rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] px-4 py-2 text-[13px] font-black uppercase tracking-[0.06em] text-white shadow-[0_10px_22px_-12px_rgba(76,29,149,0.7)]"
        >
          {ctaLabel}
        </button>
      ) : null}
    </div>
  )
}
