import { useEffect } from 'react'

const BASE_TITLE = 'Aureum'

/**
 * Sets a per-route document title so history entries and tabs are meaningful.
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : `${BASE_TITLE} — Considered goods for everyday life`
  }, [title])
}
