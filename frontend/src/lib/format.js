/* ==========================================================================
   Formatting helpers
   --------------------------------------------------------------------------
   The backend serializes BigDecimal as a JSON number, but Spring is free to
   send it as a string, so every numeric read goes through `toNumber` first.
   ========================================================================== */

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
})

const decimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const relativeFormatter = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })

/** Coerce a number|string|null into a finite number (0 when unusable). */
export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

/** `₹1,240.00` — returns an em dash for missing values so totals never look like 0. */
export function formatCurrency(value, { placeholder = '—' } = {}) {
  if (value === null || value === undefined || value === '') return placeholder
  return currencyFormatter.format(toNumber(value))
}

/** `1,240.00` without the symbol, for dense tables. */
export function formatDecimal(value) {
  return decimalFormatter.format(toNumber(value))
}

export function formatPercent(value) {
  return `${Math.round(toNumber(value) * 100)}%`
}

/** Parse a backend LocalDateTime (`2026-03-04T09:15:00`, no offset → local). */
function parseDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value, fallback = '—') {
  const date = parseDate(value)
  return date ? dateFormatter.format(date) : fallback
}

export function formatDateTime(value, fallback = '—') {
  const date = parseDate(value)
  return date ? dateTimeFormatter.format(date) : fallback
}

/** `2 hours ago` — used for order recency, falls back to an absolute date. */
export function formatRelativeTime(value) {
  const date = parseDate(value)
  if (!date) return '—'

  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / 60000)
  if (Math.abs(minutes) < 1) return 'just now'
  if (Math.abs(minutes) < 60) return relativeFormatter.format(-minutes, 'minute')

  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relativeFormatter.format(-hours, 'hour')

  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return relativeFormatter.format(-days, 'day')

  return formatDate(date)
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function initials(firstName, lastName) {
  const parts = [firstName, lastName].filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.map((part) => part.trim().charAt(0).toUpperCase()).join('')
}

export function fullName(user) {
  if (!user) return ''
  return [user.firstName, user.lastName].filter(Boolean).join(' ')
}

/** Short, stable, human-scannable product code derived from the product id. */
export function productCode(id) {
  if (id === null || id === undefined) return '—'
  return `AUR-${String(id).padStart(4, '0')}`
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
