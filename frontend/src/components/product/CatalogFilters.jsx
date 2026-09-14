import { useId } from 'react'
import { formatCurrency } from '../../lib/format'
import Button from '../ui/Button'
import { CloseIcon } from '../ui/Icons'

/* ==========================================================================
   Catalog filters
   --------------------------------------------------------------------------
   Category and keyword are real server-side queries. Price, rating and sort
   are refinements applied to the returned collection because the Product
   Service has no such parameters — the panel says "within these results" to
   stay accurate about what is being filtered.
   ========================================================================== */

const PRICE_PRESETS = [
  { label: 'Under ₹1,000', min: '', max: '1000' },
  { label: '₹1,000 – ₹5,000', min: '1000', max: '5000' },
  { label: '₹5,000 – ₹20,000', min: '5000', max: '20000' },
  { label: '₹20,000+', min: '20000', max: '' },
]

const RATING_OPTIONS = [
  { value: '4', label: '4.0 and up' },
  { value: '3', label: '3.0 and up' },
  { value: '2', label: '2.0 and up' },
]

function FilterGroup({ title, children, hint }) {
  return (
    <fieldset className="border-t border-line-soft py-5 first:border-t-0 first:pt-0 last:pb-0">
      <legend className="mb-3 text-[13px] font-semibold text-ink">{title}</legend>
      {hint && <p className="mb-3 text-xs text-ink-muted">{hint}</p>}
      {children}
    </fieldset>
  )
}

function RadioRow({ name, checked, onChange, label, count }) {
  return (
    <label className="press flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-canvas">
      <span className="flex items-center gap-2.5">
        <input
          type="radio"
          name={name}
          checked={checked}
          onChange={onChange}
          className="size-4 accent-ink"
        />
        <span className={checked ? 'font-medium text-ink' : 'text-ink-soft'}>{label}</span>
      </span>
      {count !== undefined && <span className="text-xs text-ink-faint tabular-nums">{count}</span>}
    </label>
  )
}

export function CatalogFilters({ facets, value, onChange, onReset, className = '' }) {
  const groupName = useId()
  const { category, min, max, rating } = value

  const isFiltered = Boolean(category || min || max || rating)

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Filters</h2>
        {isFiltered && (
          <Button variant="link" size="sm" onClick={onReset} className="text-xs">
            Clear all
          </Button>
        )}
      </div>

      <div className="mt-4">
        <FilterGroup title="Category">
          <RadioRow
            name={`${groupName}-category`}
            checked={!category}
            onChange={() => onChange({ category: '' })}
            label="All categories"
            count={facets.total}
          />
          {facets.categories.map((item) => (
            <RadioRow
              key={item.value}
              name={`${groupName}-category`}
              checked={category.toLowerCase() === item.value.toLowerCase()}
              onChange={() => onChange({ category: item.value })}
              label={item.value}
              count={item.count}
            />
          ))}
          {facets.categories.length === 0 && (
            <p className="px-2 text-xs text-ink-muted">No categories in these results.</p>
          )}
        </FilterGroup>

        <FilterGroup
          title="Price"
          hint={
            facets.priceRange.max > 0
              ? `Available ${formatCurrency(facets.priceRange.min)} – ${formatCurrency(facets.priceRange.max)}`
              : undefined
          }
        >
          <div className="flex flex-wrap gap-1.5 px-1">
            {PRICE_PRESETS.map((preset) => {
              const active = min === preset.min && max === preset.max
              return (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ min: preset.min, max: preset.max })}
                  className={`press rounded-full border px-3 py-1.5 text-xs font-medium ${
                    active
                      ? 'border-ink bg-ink text-white'
                      : 'border-line bg-surface text-ink-soft hover:border-ink/30 hover:text-ink'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center gap-2 px-1">
            <label className="sr-only" htmlFor={`${groupName}-min`}>
              Minimum price
            </label>
            <input
              id={`${groupName}-min`}
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="Min"
              value={min}
              onChange={(event) => onChange({ min: event.target.value })}
              className="h-9 w-full rounded-md border border-line bg-surface px-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/8"
            />
            <span className="text-ink-faint" aria-hidden="true">
              –
            </span>
            <label className="sr-only" htmlFor={`${groupName}-max`}>
              Maximum price
            </label>
            <input
              id={`${groupName}-max`}
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="Max"
              value={max}
              onChange={(event) => onChange({ max: event.target.value })}
              className="h-9 w-full rounded-md border border-line bg-surface px-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/8"
            />
          </div>
        </FilterGroup>

        {facets.hasRatings && (
          <FilterGroup title="Rating">
            {RATING_OPTIONS.map((option) => (
              <RadioRow
                key={option.value}
                name={`${groupName}-rating`}
                checked={rating === option.value}
                onChange={() =>
                  onChange({ rating: rating === option.value ? '' : option.value })
                }
                label={option.label}
              />
            ))}
          </FilterGroup>
        )}

        <p className="mt-5 border-t border-line-soft pt-4 text-xs leading-relaxed text-ink-faint">
          Keyword and category are queried from the product service. Price, rating and sorting are
          applied to the returned results.
        </p>
      </div>
    </div>
  )
}

/** Compact removable summary of the refinements currently applied. */
export function ActiveFilterChips({ value, onChange, onReset, resultLabel }) {
  const chips = []

  if (value.min || value.max) {
    const minLabel = value.min ? formatCurrency(value.min) : 'Any'
    const maxLabel = value.max ? formatCurrency(value.max) : 'Any'
    chips.push({
      key: 'price',
      label: `${minLabel} – ${maxLabel}`,
      clear: () => onChange({ min: '', max: '' }),
    })
  }

  if (value.rating) {
    const option = RATING_OPTIONS.find((item) => item.value === value.rating)
    chips.push({
      key: 'rating',
      label: option?.label || `${value.rating}+`,
      clear: () => onChange({ rating: '' }),
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-sm text-ink-muted" aria-live="polite">
        {resultLabel}
      </p>

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={chip.clear}
                className="press inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft hover:border-ink/30 hover:text-ink"
              >
                {chip.label}
                <CloseIcon className="size-3" />
                <span className="sr-only">Remove filter</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {(chips.length > 0 || value.category) && (
        <button
          type="button"
          onClick={onReset}
          className="press text-xs font-medium text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
