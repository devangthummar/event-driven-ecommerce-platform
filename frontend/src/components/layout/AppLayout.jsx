import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

/**
 * Scrolls to the top on navigation so a new page never opens mid-scroll.
 * Query-string changes are excluded on purpose: catalog paging scrolls itself
 * to the results instead of jumping to the very top of the document.
 */
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

export default function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <ScrollToTop />
      <SiteHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
