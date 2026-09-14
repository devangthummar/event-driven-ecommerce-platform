import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, test, expect, vi } from 'vitest'
import ProtectedRoute from '../components/ProtectedRoute'
import * as useAuthModule from '../contexts/useAuth'

function renderRoute(element, { path = '/protected' } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={element} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/products" element={<div>Products Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  test('waits for the session to be verified before rendering', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isBootstrapping: true,
      isAuthenticated: false,
      user: null,
    })

    renderRoute(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText(/Verifying your session/i)).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  test('redirects to /login when there is no session', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isBootstrapping: false,
      isAuthenticated: false,
      user: null,
    })

    renderRoute(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  test('renders children for an authenticated user', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isBootstrapping: false,
      isAuthenticated: true,
      user: { id: 1, email: 'shopper@example.com', role: 'USER' },
    })

    renderRoute(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  test('accepts both the Role enum and the ROLE_ authority form for admin routes', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isBootstrapping: false,
      isAuthenticated: true,
      // The service serializes Role.ADMIN; the token claim would be ROLE_ADMIN.
      user: { id: 1, email: 'admin@example.com', role: 'ROLE_ADMIN' },
    })

    renderRoute(
      <ProtectedRoute roles={['ADMIN']}>
        <div>Admin Console</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Admin Console')).toBeInTheDocument()
  })

  test('blocks a non-admin from admin routes with an explicit message', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isBootstrapping: false,
      isAuthenticated: true,
      user: { id: 2, email: 'shopper@example.com', role: 'USER' },
    })

    renderRoute(
      <ProtectedRoute roles={['ADMIN']}>
        <div>Admin Console</div>
      </ProtectedRoute>,
    )

    expect(screen.queryByText('Admin Console')).not.toBeInTheDocument()
    expect(screen.getByText(/do not have access/i)).toBeInTheDocument()
  })
})
