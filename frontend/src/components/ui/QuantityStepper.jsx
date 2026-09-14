import { useEffect, useState } from 'react'
import { clamp } from '../../lib/format'
import { MinusIcon, PlusIcon } from './Icons'

const SIZES = {
  sm: { control: 'h-9', button: 'size-9', input: 'w-10 text-[13px]', icon: 'size-3.5' },
  md: { control: 'h-11', button: 'size-11', input: 'w-11 text-sm', icon: 'size-4' },
}

/**
 * QuantityStepper — bounded numeric input with tactile controls.
 *
 * A local draft lets someone clear the field and retype without the value
 * snapping back mid-edit; the draft is committed on blur/Enter and always
 * clamped into [min, max].
 */
function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  disabled = false,
  label = 'Quantity',
  size = 'md',
  className = '',
}) {
  const [draft, setDraft] = useState(String(value))
  const dimensions = SIZES[size] || SIZES.md

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = (raw) => {
    const parsed = Number.parseInt(raw, 10)
    const next = Number.isNaN(parsed) ? min : clamp(parsed, min, Math.max(min, max))
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  const step = (delta) => {
    const next = clamp(value + delta, min, Math.max(min, max))
    if (next !== value) onChange(next)
  }

  const atMin = value <= min
  const atMax = max !== undefined && value >= max

  return (
    <div
      role="group"
      aria-label={label}
      className={[
        'inline-flex items-center rounded-md border border-line bg-surface',
        dimensions.control,
        disabled ? 'opacity-50' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={disabled || atMin}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className={`press flex items-center justify-center rounded-l-md text-ink-soft hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-40 ${dimensions.button}`}
      >
        <MinusIcon className={dimensions.icon} />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        disabled={disabled}
        aria-label={`${label} value`}
        onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ''))}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit(event.currentTarget.value)
            event.currentTarget.blur()
          }
        }}
        className={`h-full border-0 bg-transparent text-center font-medium text-ink tabular-nums focus:outline-none ${dimensions.input}`}
      />

      <button
        type="button"
        onClick={() => step(1)}
        disabled={disabled || atMax}
        aria-label={`Increase ${label.toLowerCase()}`}
        className={`press flex items-center justify-center rounded-r-md text-ink-soft hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-40 ${dimensions.button}`}
      >
        <PlusIcon className={dimensions.icon} />
      </button>
    </div>
  )
}

export default QuantityStepper
