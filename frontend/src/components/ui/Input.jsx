import { forwardRef, useId } from 'react'

/* ==========================================================================
   Input
   --------------------------------------------------------------------------
   The label, hint and error text are part of the control rather than the
   caller's job, which is what keeps `aria-describedby` / `aria-invalid`
   correct everywhere without repeating them at each call site.
   ========================================================================== */

const inputClasses = ({ invalid = false, className = '' } = {}) =>
  [
    'press block h-11 w-full rounded-md border bg-surface px-3.5 text-sm text-ink',
    'placeholder:text-ink-faint',
    'focus:outline-none focus:ring-4',
    'disabled:bg-canvas disabled:text-ink-muted disabled:cursor-not-allowed',
    'read-only:bg-canvas',
    invalid
      ? 'border-danger/60 focus:border-danger focus:ring-danger/10'
      : 'border-line hover:border-ink/20 focus:border-ink focus:ring-ink/8',
    className,
  ]
    .filter(Boolean)
    .join(' ')

const Input = forwardRef(function Input(
  { label, error, hint, required = false, id, className = '', containerClassName = '', ...rest },
  ref,
) {
  const generatedId = useId()
  const inputId = id || `field-${generatedId}`
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={inputClasses({ invalid: Boolean(error), className })}
        {...rest}
      />

      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
})

export default Input
