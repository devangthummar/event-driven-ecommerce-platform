import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { useCart } from '../contexts/useCart'

const navLinks = [
  { to: '/products', label: 'Shop' },
  { to: '/products?new=true', label: 'New' },
]

function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isAuthenticated, logout } = useAuth()
  const { itemCount } = useCart()

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const handleLogout = () => {
    logout()
    closeMobileMenu()
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border-light">
      <nav className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link
            to="/"
            className="text-xl lg:text-2xl font-semibold tracking-tight text-primary hover:opacity-80 transition-opacity duration-200"
            onClick={closeMobileMenu}
          >
            AUREUM
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'text-primary'
                      : 'text-secondary hover:text-primary'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {/* Account / Auth */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-4">
                <Link
                  to="/orders"
                  className="text-sm font-medium text-secondary hover:text-primary transition-colors duration-200"
                >
                  Orders
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm font-medium text-secondary hover:text-primary transition-colors duration-200 cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:block text-sm font-medium text-secondary hover:text-primary transition-colors duration-200"
              >
                Account
              </Link>
            )}

            {/* Cart */}
            <Link
              to="/cart"
              className="relative text-sm font-medium text-secondary hover:text-primary transition-colors duration-200"
              aria-label={`Shopping bag${itemCount > 0 ? `, ${itemCount} items` : ''}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-primary text-white text-[10px] font-medium flex items-center justify-center rounded-full">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 text-secondary hover:text-primary transition-colors duration-200"
              onClick={toggleMobileMenu}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border-light">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `text-base font-medium transition-colors duration-200 ${
                      isActive
                        ? 'text-primary'
                        : 'text-secondary hover:text-primary'
                    }`
                  }
                  onClick={closeMobileMenu}
                >
                  {link.label}
                </NavLink>
              ))}
              {isAuthenticated ? (
                <>
                  <NavLink
                    to="/orders"
                    className="text-base font-medium text-secondary hover:text-primary transition-colors duration-200"
                    onClick={closeMobileMenu}
                  >
                    Orders
                  </NavLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-base font-medium text-secondary hover:text-primary transition-colors duration-200 text-left"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <NavLink
                  to="/login"
                  className="text-base font-medium text-secondary hover:text-primary transition-colors duration-200"
                  onClick={closeMobileMenu}
                >
                  Account
                </NavLink>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

export default Navbar
