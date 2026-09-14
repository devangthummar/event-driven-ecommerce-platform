import { render, screen, act, waitFor } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { AuthProvider } from '../contexts/AuthContext'
import { useAuth } from '../contexts/useAuth'
import { getCurrentUser } from '../api/auth'

vi.mock('../api/auth', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}))

function TestComponent() {
  const { user, isAuthenticated, isAdmin, isBootstrapping, login, logout } = useAuth()

  return (
    <div>
      <span data-testid="status">{isAuthenticated ? 'Authenticated' : 'Unauthenticated'}</span>
      <span data-testid="bootstrap">{isBootstrapping ? 'Bootstrapping' : 'Ready'}</span>
      <span data-testid="email">{user ? user.email : 'No User'}</span>
      <span data-testid="admin">{isAdmin ? 'Admin' : 'Not admin'}</span>
      <button
        type="button"
        onClick={() =>
          login('mock-jwt-token', {
            id: 1,
            email: 'admin@example.com',
            role: 'ADMIN',
          })
        }
      >
        Login
      </button>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  )
}

function renderProvider() {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>,
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(getCurrentUser).mockReset()
  })

  test('starts unauthenticated when no token is stored', async () => {
    renderProvider()

    await waitFor(() => expect(screen.getByTestId('bootstrap')).toHaveTextContent('Ready'))
    expect(screen.getByTestId('status')).toHaveTextContent('Unauthenticated')
    expect(screen.getByTestId('email')).toHaveTextContent('No User')
    expect(getCurrentUser).not.toHaveBeenCalled()
  })

  test('signs in and clears the session on sign out', async () => {
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('bootstrap')).toHaveTextContent('Ready'))

    act(() => {
      screen.getByText('Login').click()
    })

    expect(screen.getByTestId('status')).toHaveTextContent('Authenticated')
    expect(screen.getByTestId('email')).toHaveTextContent('admin@example.com')
    // The Role enum arrives as ADMIN and is normalized for UI checks.
    expect(screen.getByTestId('admin')).toHaveTextContent('Admin')
    expect(localStorage.getItem('aureum.token')).toBe('mock-jwt-token')

    act(() => {
      screen.getByText('Logout').click()
    })

    expect(screen.getByTestId('status')).toHaveTextContent('Unauthenticated')
    expect(localStorage.getItem('aureum.token')).toBeNull()
  })

  test('restores a stored session by verifying the token against /me', async () => {
    localStorage.setItem('aureum.token', 'stored-token')
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 4,
      email: 'shopper@example.com',
      role: 'USER',
    })

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('Authenticated'))
    expect(screen.getByTestId('email')).toHaveTextContent('shopper@example.com')
  })

  test('drops a stored session the server rejects', async () => {
    localStorage.setItem('aureum.token', 'expired-token')
    const unauthorized = Object.assign(new Error('expired'), { isUnauthorized: true, status: 401 })
    vi.mocked(getCurrentUser).mockRejectedValue(unauthorized)

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('Unauthenticated'))
    expect(localStorage.getItem('aureum.token')).toBeNull()
  })
})
