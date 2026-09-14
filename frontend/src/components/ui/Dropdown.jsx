import { cloneElement, useCallback, useEffect, useId, useRef, useState } from 'react'

/**
 * Dropdown
 * --------------------------------------------------------------------------
 * `trigger` is the toggle element (it receives aria-expanded, aria-controls,
 * aria-haspopup and the click handler); `children` is the menu content.
 * The menu closes on outside click, on Escape (returning focus to the
 * trigger) and on any click inside it, since menu contents navigate.
 */
function Dropdown({ trigger, children, align = 'right', className = '', menuClassName = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const menuId = useId()

  const close = useCallback(() => {
    setIsOpen(false)
    // Return focus to the toggle without holding a ref to it, so the trigger
    // can be any element (button or link) the caller renders.
    containerRef.current?.querySelector('[data-dropdown-trigger]')?.focus?.()
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, close])

  // The trigger is cloned with its ARIA state and click handler rather than
  // being invoked as an arbitrary function during render.
  const renderedTrigger = cloneElement(trigger, {
    'data-dropdown-trigger': '',
    'aria-expanded': isOpen,
    'aria-haspopup': 'menu',
    'aria-controls': isOpen ? menuId : undefined,
    onClick: () => setIsOpen((previous) => !previous),
  })

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {renderedTrigger}

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          onClick={() => setIsOpen(false)}
          className={[
            'absolute z-50 mt-2 min-w-52 overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-lg animate-panel-in',
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/** Consistent menu row styling for dropdown contents. */
export const dropdownItemClasses =
  'press flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-ink-soft hover:bg-canvas hover:text-ink'

export default Dropdown
