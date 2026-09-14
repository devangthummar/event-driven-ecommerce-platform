/**
 * PageHeader — eyebrow, title, supporting copy and actions.
 * Used by every non-home page so the top of each screen reads the same way.
 */
function PageHeader({ eyebrow, title, description, actions = null, className = '' }) {
  return (
    <div
      className={`flex flex-col gap-5 border-b border-line-soft pb-6 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        {eyebrow && <p className="text-eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export default PageHeader
