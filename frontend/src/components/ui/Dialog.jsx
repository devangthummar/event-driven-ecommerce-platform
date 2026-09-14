import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import IconButton from './IconButton'
import { CloseIcon } from './Icons'

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialog
 * --------------------------------------------------------------------------
 * A bottom sheet on small screens and a centred modal from `sm` up, which is
 * the only form factor that stays usable on a phone with the keyboard open.
 *
 * Accessibility: focus is moved in and restored on close, Tab is trapped,
 * Escape closes, the panel is `role="dialog" aria-modal`, and page scroll is
 * locked while it is open.
 */
function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer = null,
  size = 'md',
  ariaLabel,
  bodyClassName = '',
}) {
  const panelRef = useRef(null)
  const restoreFocusRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return undefined

    restoreFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const target = panel?.querySelector('[data-autofocus]') || panel
    const frame = requestAnimationFrame(() => target?.focus?.())

    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      // Returning focus to the trigger keeps keyboard users oriented.
      if (restoreFocusRef.current instanceof HTMLElement) {
        restoreFocusRef.current.focus()
      }
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return

      const nodes = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null || node === document.activeElement,
      )
      if (nodes.length === 0) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-overlay-in bg-ink/45"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={!title ? ariaLabel : undefined}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={[
          'relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface shadow-pop',
          'rounded-t-2xl sm:rounded-xl animate-panel-in',
          SIZES[size] || SIZES.md,
        ].join(' ')}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="text-base font-semibold text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="mt-0.5 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close dialog" size="sm" onClick={onClose} data-autofocus>
            <CloseIcon className="size-4" />
          </IconButton>
        </header>

        <div className={`flex-1 overflow-y-auto px-5 py-5 ${bodyClassName}`}>{children}</div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line-soft bg-canvas px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default Dialog
