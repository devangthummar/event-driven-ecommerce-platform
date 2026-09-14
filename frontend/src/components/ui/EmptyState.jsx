import { InboxIcon } from './Icons'

/**
 * EmptyState — the deliberate answer to "there is nothing here yet".
 * Never left as a blank region, and never used to disguise a failure
 * (that is ErrorState's job).
 */
function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  actions = null,
  className = '',
}) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas px-6 py-16 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-surface text-ink-muted shadow-xs">
        <Icon className="size-5" />
      </span>

      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-ink-muted">{description}</p>
      )}
      {actions && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  )
}

export default EmptyState
