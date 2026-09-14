import { useEffect, useState } from 'react'

/**
 * Returns `value` after it has stayed unchanged for `delay` ms.
 *
 * Used to keep the catalog search from firing a request per keystroke.
 */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
