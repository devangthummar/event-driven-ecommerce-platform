const TONES = {
  neutral: 'bg-canvas-deep text-ink-soft border-transparent',
  outline: 'bg-surface text-ink-soft border-line',
  accent: 'bg-accent-soft text-accent-deep border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  info: 'bg-info-soft text-info border-transparent',
}

const SIZES = {
  sm: 'h-5 px-2 text-[11px] gap-1',
  md: 'h-6 px-2.5 text-xs gap-1.5',
}

/**
 * Badge — compact status/metadata label.
 * Tones are semantic; a dot makes status readable without relying on colour.
 */
function Badge({ children, tone = 'neutral', size = 'sm', dot = false, className = '', ...rest }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border font-medium whitespace-nowrap',
        TONES[tone] || TONES.neutral,
        SIZES[size] || SIZES.sm,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />}
      {children}
    </span>
  )
}

export default Badge
