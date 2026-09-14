const SPACING = {
  none: '',
  sm: 'py-8 sm:py-10',
  md: 'py-12 sm:py-16',
  lg: 'py-16 sm:py-20 lg:py-24',
}

const SURFACES = {
  surface: 'bg-surface',
  canvas: 'bg-canvas',
  ink: 'bg-ink text-white',
}

/**
 * Section — vertical rhythm + optional surface tone.
 * Keeping the rhythm in one place is what makes the page feel intentionally
 * spaced rather than assembled.
 */
function Section({
  children,
  className = '',
  spacing = 'lg',
  surface = 'surface',
  as: Tag = 'section',
  bordered = false,
}) {
  return (
    <Tag
      className={[
        SPACING[spacing] ?? SPACING.lg,
        SURFACES[surface] || SURFACES.surface,
        bordered ? 'border-y border-line-soft' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  )
}

export default Section
