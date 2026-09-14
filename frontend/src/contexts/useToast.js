import { useContext } from 'react'
import ToastContext from './ToastContextObject'

/**
 * useToast — imperative feedback channel.
 *
 * @returns {{ push, dismiss, success, error, info, warning }}
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
