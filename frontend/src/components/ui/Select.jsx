import { forwardRef, useId } from 'react'
import { ChevronDownIcon } from './Icons'

/**
 * Select — native control (keyboard and mobile behaviour for free), styled to
 * match Input. Options are passed as `<option>` children.
 */
const Select = forwardRef(function Select(
  {
    label,
    error,
    hint,
    required = false,
    id,
    className = '',
    containerClassName = '',
    children,
    ...rest
  },
  ref,
) {
  const generatedId = useId()
  const selectId = id || `field-${generatedId}`
  const errorId = error ? `${selectId}-error` : undefined
  const hintId = hint ? `${selectId}-hint` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="text-[13px] font-medium text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={[
            'press h-11 w-full appearance-none rounded-md border bg-surface pl-3.5 pr-10 text-sm text-ink',
            'focus:outline-none focus:ring-4',
            'disabled:bg-canvas disabled:text-ink-muted',
            error
              ? 'border-danger/60 focus:border-danger focus:ring-danger/10'
              : 'border-line hover:border-ink/20 focus:border-ink focus:ring-ink/8',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
      </div>

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

export default Select
