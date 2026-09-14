import { createPortal } from 'react-dom'
import IconButton from './IconButton'
import { AlertIcon, CheckCircleIcon, CloseIcon, InfoIcon } from './Icons'

const TONES = {
  neutral: { accent: 'text-ink-muted', Icon: InfoIcon },
  info: { accent: 'text-info', Icon: InfoIcon },
  success: { accent: 'text-success', Icon: CheckCircleIcon },
  warning: { accent: 'text-warning', Icon: AlertIcon },
  danger: { accent: 'text-danger', Icon: AlertIcon },
}

function ToastCard({ toast, onDismiss }) {
  const { accent, Icon } = TONES[toast.tone] || TONES.neutral
  const isUrgent = toast.tone === 'danger'

  return (
    <div
      role={isUrgent ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-lg animate-toast-in sm:max-w-sm"
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${accent}`} />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{toast.description}</p>
        )}
        {toast.actionLabel && toast.onAction && (
          <button
            type="button"
            onClick={() => {
              toast.onAction()
              onDismiss(toast.id)
            }}
            className="mt-2 text-xs font-medium text-ink underline underline-offset-4 hover:text-ink-soft"
          >
            {toast.actionLabel}
          </button>
        )}
      </div>

      <IconButton label="Dismiss notification" size="sm" onClick={() => onDismiss(toast.id)}>
        <CloseIcon className="size-3.5" />
      </IconButton>
    </div>
  )
}

/**
 * Toaster — the app's single toast viewport.
 *
 * Bottom-anchored on phones (so it never covers the header), top-right from
 * `sm` up. Polite live region for routine confirmations, assertive for errors.
 */
function Toaster({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null

  return createPortal(
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-3 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-5 sm:items-end sm:p-0"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  )
}

export default Toaster
