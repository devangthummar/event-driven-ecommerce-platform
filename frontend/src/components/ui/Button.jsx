import { forwardRef } from 'react'
import Spinner from './Spinner'
import { buttonClasses } from './buttonStyles'

/* ==========================================================================
   Button
   --------------------------------------------------------------------------
   One height scale (36 / 44 / 48px), one radius, one motion curve, so every
   interactive control in the app has identical hit targets, focus rings and
   disabled treatment. The class builder is shared with `<Link>` via
   buttonStyles so a navigational action can look like a button.
   ========================================================================== */

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    loadingLabel,
    disabled = false,
    type = 'button',
    fullWidth = false,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonClasses({
        variant,
        size,
        className: `${fullWidth ? 'w-full' : ''} ${className}`,
      })}
      {...rest}
    >
      {isLoading && <Spinner className="size-3.5" />}
      {isLoading && loadingLabel ? loadingLabel : children}
    </button>
  )
})

export default Button
