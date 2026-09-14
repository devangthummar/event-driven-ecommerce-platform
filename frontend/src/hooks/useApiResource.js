import { useCallback, useEffect, useRef, useState } from 'react'
import { isCanceled } from '../api/client'

/* ==========================================================================
   useApiResource — one small state machine for read requests
   --------------------------------------------------------------------------
   Gives every screen the same explicit states instead of ad-hoc booleans:

     idle | loading | success | error

   Stale responses can never win: each run gets its own AbortController, the
   previous request is aborted on re-run/unmount, and a late resolution is
   ignored. That matters for the debounced catalog search where several
   requests can be in flight.

   @param {(options: { signal: AbortSignal }) => Promise<any>} fetcher
   @param {unknown[]} deps  values that should trigger a re-fetch
   @param {{ enabled?: boolean, initialData?: any }} [options]
   ========================================================================== */

export function useApiResource(fetcher, deps = [], options = {}) {
  const { enabled = true, initialData = null } = options

  const [data, setData] = useState(initialData)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(enabled ? 'loading' : 'idle')
  const [reloadToken, setReloadToken] = useState(0)

  // Keep the latest fetcher without making it a dependency: callers pass inline
  // arrow functions, and re-running on every render would be a request storm.
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      return undefined
    }

    const controller = new AbortController()
    let isActive = true

    setStatus('loading')
    setError(null)

    Promise.resolve(fetcherRef.current({ signal: controller.signal }))
      .then((result) => {
        if (!isActive) return
        setData(result ?? null)
        setStatus('success')
      })
      .catch((caught) => {
        if (!isActive || isCanceled(caught)) return
        setError(caught)
        setStatus('error')
      })

    return () => {
      isActive = false
      controller.abort()
    }
    // `deps` are the caller's business: the hook intentionally re-runs whenever
    // they change plus on refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, reloadToken])

  const refetch = useCallback(() => setReloadToken((token) => token + 1), [])

  /** Locally patch the data (e.g. after a successful mutation). */
  const setLocalData = useCallback((updater) => {
    setData((previous) => (typeof updater === 'function' ? updater(previous) : updater))
  }, [])

  return {
    data,
    error,
    status,
    isLoading: status === 'loading',
    isError: status === 'error',
    isSuccess: status === 'success',
    refetch,
    setData: setLocalData,
  }
}

/* ==========================================================================
   useAsyncAction — the same discipline for writes
   --------------------------------------------------------------------------
   Exposes `isPending` so buttons can show progress and — critically — so a
   second click cannot start a duplicate submission.
   ========================================================================== */

export function useAsyncAction(action) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const actionRef = useRef(action)
  useEffect(() => {
    actionRef.current = action
  })

  const run = useCallback(async (...args) => {
    setIsPending(true)
    setError(null)
    try {
      return await actionRef.current(...args)
    } catch (caught) {
      setError(caught)
      throw caught
    } finally {
      setIsPending(false)
    }
  }, [])

  const reset = useCallback(() => setError(null), [])

  return { run, isPending, error, reset }
}
