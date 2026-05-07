import { ChevronRight, ExternalLink, type LucideIcon } from 'lucide-react'

export type SettingsRowProps = {
  icon: LucideIcon
  title: string
  subtitle?: string
  /** Use external-link icon on the right instead of chevron */
  external?: boolean
  onClick?: () => void
  href?: string
}

const ICON_WRAP = 'flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-[#F2F2F2]'

/**
 * Single tappable settings row — tall, airy, Whatnot-style.
 */
export function SettingsRow({ icon: Icon, title, subtitle, external, onClick, href }: SettingsRowProps) {
  const inner = (
    <>
      <span className={ICON_WRAP} aria-hidden>
        <Icon className="h-[22px] w-[22px] text-zinc-600" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 py-1">
        <span className="block text-[15px] font-bold leading-snug text-[#111111]">{title}</span>
        {subtitle ? <span className="mt-0.5 block text-[12px] font-medium leading-snug text-[#777777]">{subtitle}</span> : null}
      </span>
      {external ? (
        <ExternalLink className="h-[18px] w-[18px] shrink-0 text-zinc-400" strokeWidth={2} aria-hidden />
      ) : (
        <ChevronRight className="h-[20px] w-[20px] shrink-0 text-zinc-400" strokeWidth={2} aria-hidden />
      )}
    </>
  )

  const className =
    'flex w-full min-h-[76px] items-center gap-4 px-1 text-left transition-opacity active:opacity-70 sm:min-h-[84px]'

  if (href) {
    return (
      <a href={href} className={className} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
        {inner}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  )
}
