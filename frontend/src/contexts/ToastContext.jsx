import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Toaster from '../components/ui/Toaster'
import ToastContext from './ToastContextObject'

/* ==========================================================================
   ToastProvider
   --------------------------------------------------------------------------
   The single feedback channel for asynchronous outcomes. It replaces
   `window.alert`, which the app never uses.
   ========================================================================== */

const DEFAULT_DURATION = 4500
const MAX_VISIBLE = 3

let sequence = 0
function nextId() {
  sequence += 1
  return `toast-${Date.now()}-${sequence}`
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    ({ title, description, tone = 'neutral', duration = DEFAULT_DURATION, actionLabel, onAction }) => {
      const id = nextId()
      setToasts((previous) => {
        const next = [...previous, { id, title, description, tone, actionLabel, onAction }]
        // Oldest toasts fall away so the queue can never bury the page.
        return next.slice(-MAX_VISIBLE)
      })
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        )
      }
      return id
    },
    [dismiss],
  )

  // Clear pending timers when the provider unmounts (tests, HMR).
  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((timer) => clearTimeout(timer))
      pending.clear()
    }
  }, [])

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (title, description) => push({ title, description, tone: 'success' }),
      error: (title, description) => push({ title, description, tone: 'danger', duration: 6500 }),
      info: (title, description) => push({ title, description, tone: 'info' }),
      warning: (title, description) => push({ title, description, tone: 'warning' }),
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}
