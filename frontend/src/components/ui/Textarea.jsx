import { forwardRef, useId } from 'react'

const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    hint,
    required = false,
    id,
    rows = 4,
    className = '',
    containerClassName = '',
    ...rest
  },
  ref,
) {
  const generatedId = useId()
  const areaId = id || `field-${generatedId}`
  const errorId = error ? `${areaId}-error` : undefined
  const hintId = hint ? `${areaId}-hint` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={areaId} className="text-[13px] font-medium text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}

      <textarea
        ref={ref}
        id={areaId}
        rows={rows}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={[
          'press block w-full resize-y rounded-md border bg-surface px-3.5 py-2.5 text-sm text-ink',
          'placeholder:text-ink-faint focus:outline-none focus:ring-4',
          'disabled:bg-canvas disabled:text-ink-muted',
          error
            ? 'border-danger/60 focus:border-danger focus:ring-danger/10'
            : 'border-line hover:border-ink/20 focus:border-ink focus:ring-ink/8',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
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

export default Textarea
