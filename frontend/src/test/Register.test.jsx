import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import Register from '../pages/Register'
import { register } from '../api/auth'

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}))

vi.mock('../api/auth', () => ({
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
}))

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Aarav' } })
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Sharma' } })
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'aarav@example.com' } })
  // `^password` avoids the "Show password" toggle, whose accessible name also
  // contains the word password.
  fireEvent.change(screen.getByLabelText(/^password/i, { selector: 'input' }), {
    target: { value: 'Passw0rd!23' },
  })
  fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '9876543210' } })
}

const conflict = (message) =>
  Object.assign(new Error(message), { status: 409, isConflict: true })

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('submits the exact RegisterRequest shape the user service expects', async () => {
    register.mockResolvedValue({ id: 1 })

    renderRegister()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1))
    expect(register).toHaveBeenCalledWith({
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: 'aarav@example.com',
      password: 'Passw0rd!23',
      phoneNumber: '9876543210',
    })
  })

  test('routes a duplicate phone number conflict to the phone field', async () => {
    register.mockRejectedValue(conflict('Phone number already exists'))

    renderRegister()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      await screen.findByText('That phone number is already registered.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/mobile number/i)).toHaveAttribute('aria-invalid', 'true')
  })

  test('routes a duplicate email conflict to the email field', async () => {
    register.mockRejectedValue(conflict('Email already exists'))

    renderRegister()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      await screen.findByText('An account with this email already exists.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true')
  })

  test('surfaces field-level validation from the server on the matching input', async () => {
    register.mockRejectedValue(
      Object.assign(new Error('Validation failed'), {
        status: 400,
        fieldErrors: { phoneNumber: 'Enter a valid 10-digit Indian mobile number' },
      }),
    )

    renderRegister()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      await screen.findByText('Enter a valid 10-digit Indian mobile number'),
    ).toBeInTheDocument()
  })

  test('shows an inline alert (never alert()) for an unexpected server failure', async () => {
    register.mockRejectedValue(
      Object.assign(new Error('An unexpected error occurred.'), {
        status: 500,
        isServerError: true,
      }),
    )

    renderRegister()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('An unexpected error occurred.')).toBeInTheDocument()
    expect(
      screen.getByText('We could not create your account'),
    ).toBeInTheDocument()
  })

  test('blocks submission locally when the form is invalid', async () => {
    renderRegister()
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })
})
