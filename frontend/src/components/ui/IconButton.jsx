import { forwardRef } from 'react'
import Spinner from './Spinner'

const VARIANTS = {
  ghost: 'text-ink-soft hover:bg-canvas hover:text-ink',
  outline: 'border border-line bg-surface text-ink hover:border-ink/30 hover:bg-canvas',
  solid: 'bg-ink text-white hover:bg-ink-soft',
}

const SIZES = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-11',
}

/**
 * IconButton — square, icon-only control.
 * `label` is required and becomes the accessible name (there is no visible
 * text to fall back on).
 */
const IconButton = forwardRef(function IconButton(
  { label, children, variant = 'ghost', size = 'md', className = '', isLoading = false, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      disabled={rest.disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={[
        'press inline-flex shrink-0 items-center justify-center rounded-md',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant] || VARIANTS.ghost,
        SIZES[size] || SIZES.md,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {isLoading ? <Spinner className="size-4" /> : children}
    </button>
  )
})

export default IconButton
