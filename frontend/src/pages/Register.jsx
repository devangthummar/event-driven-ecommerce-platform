import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { register as registerRequest } from '../api/auth'
import Container from '../components/layout/Container'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import Input from '../components/ui/Input'
import { EyeIcon } from '../components/ui/Icons'
import { useAuth } from '../contexts/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

/* Mirrors RegisterRequest in the user service exactly, so the first error a
   person sees comes from the same rules the server enforces. */
const RULES = {
  firstName: (value) =>
    value.trim().length < 2 || value.trim().length > 50
      ? 'First name must be between 2 and 50 characters.'
      : null,
  lastName: (value) =>
    value.trim().length < 2 || value.trim().length > 50
      ? 'Last name must be between 2 and 50 characters.'
      : null,
  email: (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : 'Enter a valid email address.',
  password: (value) =>
    value.length >= 8 ? null : 'Password must contain at least 8 characters.',
  phoneNumber: (value) =>
    /^[6-9]\d{9}$/.test(value.trim())
      ? null
      : 'Enter a valid 10-digit mobile number (starting with 6, 7, 8 or 9).',
}

const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', phoneNumber: '' }

function Register() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  useDocumentTitle('Create an account')

  const from = location.state?.from || '/'

  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (isAuthenticated) return <Navigate to={from} replace />

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setFieldErrors((previous) => ({ ...previous, [name]: undefined }))
    setFormError(null)
  }

  const handleBlur = (event) => {
    const { name, value } = event.target
    const rule = RULES[name]
    if (!rule) return
    const message = rule(value)
    setFieldErrors((previous) => ({ ...previous, [name]: message || undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    const errors = {}
    for (const [name, rule] of Object.entries(RULES)) {
      const message = rule(form[name] ?? '')
      if (message) errors[name] = message
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    setFormError(null)

    try {
      await registerRequest({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        phoneNumber: form.phoneNumber.trim(),
      })

      navigate('/login', {
        replace: true,
        state: { email: form.email.trim(), justRegistered: true, from },
      })
    } catch (error) {
      if (error?.fieldErrors) setFieldErrors(error.fieldErrors)
      else if (error?.isConflict) {
        // Both email and phone number are unique server-side; route the 409 to the
        // field the backend actually complained about so the user can fix it in place.
        const conflictMessage = String(error.message || '')
        if (/phone/i.test(conflictMessage)) {
          setFieldErrors({ phoneNumber: 'That phone number is already registered.' })
        } else {
          setFieldErrors({ email: 'An account with this email already exists.' })
        }
      } else setFormError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container className="py-10 sm:py-14 lg:py-20">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="text-eyebrow mb-3">Join Aureum</p>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Create your account</h1>
          <p className="mt-2 text-sm text-ink-muted">
            One account covers the catalog, your bag, your wallet and every order you place.
          </p>

          {formError && (
            <Alert tone="danger" className="mt-6" title="We could not create your account">
              {formError.message}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="First name"
                name="firstName"
                autoComplete="given-name"
                required
                value={form.firstName}
                error={fieldErrors.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Aarav"
              />
              <Input
                label="Last name"
                name="lastName"
                autoComplete="family-name"
                required
                value={form.lastName}
                error={fieldErrors.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Sharma"
              />
            </div>

            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              error={fieldErrors.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="you@example.com"
            />

            <div className="relative">
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={form.password}
                error={fieldErrors.password}
                hint={fieldErrors.password ? undefined : 'At least 8 characters.'}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="••••••••"
              />
              <IconButton
                label={showPassword ? 'Hide password' : 'Show password'}
                size="sm"
                className="absolute right-2 top-[34px] text-ink-muted"
                onClick={() => setShowPassword((value) => !value)}
              >
                <EyeIcon off={showPassword} className="size-4" />
              </IconButton>
            </div>

            <Input
              label="Mobile number"
              name="phoneNumber"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              required
              maxLength={10}
              value={form.phoneNumber}
              error={fieldErrors.phoneNumber}
              hint={fieldErrors.phoneNumber ? undefined : '10 digits, no country code.'}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="9876543210"
            />

            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              loadingLabel="Creating account…"
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-sm text-ink-muted">
            Already have an account?{' '}
            <Link
              to="/login"
              state={{ from }}
              className="press font-medium text-ink underline underline-offset-4 hover:text-ink-soft"
            >
              Sign in
            </Link>
          </p>
        </div>

        <aside className="hidden lg:block">
          <div className="rounded-2xl border border-line bg-canvas p-8">
            <h2 className="text-sm font-semibold text-ink">What your account unlocks</h2>
            <ul className="mt-4 space-y-3 text-sm text-ink-muted">
              <li>• The full catalog with live pricing and availability.</li>
              <li>• A bag that follows you between visits and tabs.</li>
              <li>• A wallet used for checkout, with a transparent balance.</li>
              <li>• Order history with the real status of every order.</li>
            </ul>

            <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
              Passwords are hashed by the user service and never stored by the storefront. Your
              session is a signed token held in this browser only.
            </p>
          </div>
        </aside>
      </div>
    </Container>
  )
}

export default Register
