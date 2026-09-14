import { NavLink, Outlet } from 'react-router-dom'
import Container from '../../components/layout/Container'
import PageHeader from '../../components/layout/PageHeader'
import { useAuth } from '../../contexts/useAuth'
import { fullName } from '../../lib/format'
import { GridIcon, InboxIcon, PackageIcon, StoreIcon } from '../../components/ui/Icons'

const SECTIONS = [
  { to: '/admin/products', label: 'Products', icon: StoreIcon },
  { to: '/admin/inventory', label: 'Inventory', icon: PackageIcon },
  { to: '/admin/orders', label: 'Orders', icon: GridIcon },
  { to: '/admin/operations', label: 'Operations', icon: InboxIcon },
]

/**
 * AdminLayout
 * --------------------------------------------------------------------------
 * Only the sections whose APIs actually exist are listed here: product CRUD
 * (ADMIN-gated in the product service), inventory reads/writes, order status
 * transitions, and outbox recovery. Everything on these screens is also
 * rejected server-side for non-admin callers, so hiding the nav is convenience
 * rather than the protection.
 */
function AdminLayout() {
  const { user } = useAuth()

  return (
    <Container className="py-8 sm:py-10 lg:py-12">
      <PageHeader
        eyebrow="Administration"
        title="Admin console"
        description={`Signed in as ${fullName(user) || user?.email}. Every action here is authorized again by the backend for the ADMIN role.`}
      />

      <nav aria-label="Admin sections" className="mt-6">
        <ul className="flex gap-1.5 overflow-x-auto border-b border-line-soft pb-px no-scrollbar">
          {SECTIONS.map((section) => (
            <li key={section.to} className="shrink-0">
              <NavLink
                to={section.to}
                className={({ isActive }) =>
                  [
                    'press -mb-px flex items-center gap-2 border-b-2 px-3.5 py-3 text-sm font-medium',
                    isActive
                      ? 'border-ink text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink',
                  ].join(' ')
                }
              >
                <section.icon className="size-4" />
                {section.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8">
        <Outlet />
      </div>
    </Container>
  )
}

export default AdminLayout
