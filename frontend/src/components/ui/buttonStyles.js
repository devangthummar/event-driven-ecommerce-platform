/* ==========================================================================
   Button style tokens
   --------------------------------------------------------------------------
   Lives outside Button.jsx so the component module exports only a component
   (Fast Refresh) while `<Link>` elements can still be styled identically to a
   real button.
   ========================================================================== */

const VARIANTS = {
  primary: 'bg-ink text-white hover:bg-ink-soft active:bg-ink',
  secondary: 'bg-surface text-ink border border-line hover:border-ink/30 hover:bg-canvas',
  ghost: 'bg-transparent text-ink-soft hover:bg-canvas hover:text-ink',
  accent: 'bg-accent text-white hover:bg-accent-deep',
  success: 'bg-success text-white hover:bg-success/90',
  danger: 'bg-danger text-white hover:bg-danger/90',
  link: 'bg-transparent text-ink underline-offset-4 hover:underline px-0',
}

const SIZES = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
}

/** Shared class builder: identical geometry for buttons and link-buttons. */
export function buttonClasses({ variant = 'primary', size = 'md', className = '' } = {}) {
  return [
    'press inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap',
    'disabled:pointer-events-none disabled:opacity-45',
    'aria-disabled:pointer-events-none aria-disabled:opacity-45',
    variant === 'link' ? 'h-auto' : '',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

export default buttonClasses
