import { render, screen, act } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { AuthProvider } from '../contexts/AuthContext'
import { useAuth } from '../contexts/useAuth'

// Mock authService
vi.mock('../services/authService', () => ({
  getCurrentUser: vi.fn(() => Promise.reject(new Error('No active token'))),
}))

function TestComponent() {
  const { user, isAuthenticated, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Unauthenticated'}
      </span>
      <span data-testid="user-email">{user ? user.email : 'No User'}</span>
      <button
        onClick={() =>
          login('mock-jwt-token', {
            id: 1,
            email: 'admin@example.com',
            role: 'ROLE_ADMIN',
          })
        }
      >
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext Component', () => {
  test('provides default unauthenticated state when no token is stored', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated')
    expect(screen.getByTestId('user-email')).toHaveTextContent('No User')
  })

  test('updates state on login and clears state on logout', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    const loginBtn = screen.getByText('Login')
    act(() => {
      loginBtn.click()
    })

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@example.com')

    const logoutBtn = screen.getByText('Logout')
    act(() => {
      logoutBtn.click()
    })

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated')
    expect(screen.getByTestId('user-email')).toHaveTextContent('No User')
  })
})
