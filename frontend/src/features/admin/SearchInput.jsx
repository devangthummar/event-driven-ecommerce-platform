import IconButton from '../../components/ui/IconButton'
import { CloseIcon, SearchIcon } from '../../components/ui/Icons'

/** SearchInput — labelled search box used by the admin tables. */
function SearchInput({ id, value, onChange, placeholder = 'Search', label = 'Search' }) {
  return (
    <div className="relative w-full lg:max-w-sm">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-line bg-surface pl-10 pr-10 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/8"
      />
      {value && (
        <IconButton
          label="Clear search"
          size="sm"
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
          onClick={() => onChange('')}
        >
          <CloseIcon className="size-3.5" />
        </IconButton>
      )}
    </div>
  )
}

export default SearchInput
