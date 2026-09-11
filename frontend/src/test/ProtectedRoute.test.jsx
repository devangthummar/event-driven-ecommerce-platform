import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, test, expect, vi } from 'vitest'
import ProtectedRoute from '../components/ProtectedRoute'
import * as useAuthModule from '../contexts/useAuth'

describe('ProtectedRoute Component', () => {
  test('shows loading state while auth is loading', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      loading: true,
      isAuthenticated: false,
      user: null,
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Verifying access/i)).toBeInTheDocument()
  })

  test('redirects to /login when unauthenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      loading: false,
      isAuthenticated: false,
      user: null,
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  test('renders children when authenticated and role matches', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { id: 1, email: 'admin@example.com', role: 'ROLE_ADMIN' },
    })

    render(
      <MemoryRouter initialEntries={['/admin/products']}>
        <ProtectedRoute roles={['ROLE_ADMIN']}>
          <div>Admin Dashboard</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
  })
})
