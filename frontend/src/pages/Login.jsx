import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { login as loginRequest } from '../api/auth'
import Container from '../components/layout/Container'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import Input from '../components/ui/Input'
import { ArrowRightIcon, EyeIcon, ShieldIcon, TruckIcon, WalletIcon } from '../components/ui/Icons'
import { useAuth } from '../contexts/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const PANEL_POINTS = [
  { icon: ShieldIcon, text: 'Sessions are signed tokens, verified on every request.' },
  { icon: TruckIcon, text: 'Stock is reserved from live inventory when you order.' },
  { icon: WalletIcon, text: 'Payments settle from your wallet through the payment service.' },
]

function Login() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  useDocumentTitle('Sign in')

  const from = location.state?.from || '/'
  const justRegistered = location.state?.justRegistered

  const [form, setForm] = useState({
    email: location.state?.email || '',
    password: '',
  })
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    const errors = {}
    if (!form.email.trim()) errors.email = 'Enter your email address.'
    if (!form.password) errors.password = 'Enter your password.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    setFormError(null)

    try {
      const { accessToken } = await loginRequest({
        email: form.email.trim(),
        password: form.password,
      })
      // The provider stores the token and loads /api/users/me.
      await login(accessToken)
      navigate(from, { replace: true })
    } catch (error) {
      if (error?.fieldErrors) setFieldErrors(error.fieldErrors)
      else setFormError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container className="py-10 sm:py-14 lg:py-20">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="mx-auto w-full max-w-md">
          <p className="text-eyebrow mb-3">Welcome back</p>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Sign in to Aureum</h1>
          <p className="mt-2 text-sm text-ink-muted">
            The catalog, your bag and your orders are all tied to your account.
          </p>

          {justRegistered && (
            <Alert tone="success" className="mt-6" title="Account created">
              Sign in with the password you just chose.
            </Alert>
          )}

          {location.state?.from && (
            <Alert tone="info" className="mt-6" title="Sign in to continue">
              You were heading to a page that needs an account.
            </Alert>
          )}

          {formError && (
            <Alert tone="danger" className="mt-6" title="We could not sign you in">
              {formError.message}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              error={fieldErrors.email}
              onChange={handleChange}
              placeholder="you@example.com"
            />

            <div className="relative">
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={form.password}
                error={fieldErrors.password}
                onChange={handleChange}
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

            <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} loadingLabel="Signing in…">
              Sign in
              <ArrowRightIcon className="size-4" />
            </Button>
          </form>

          <p className="mt-6 text-sm text-ink-muted">
            New to Aureum?{' '}
            <Link
              to="/register"
              state={{ from }}
              className="press font-medium text-ink underline underline-offset-4 hover:text-ink-soft"
            >
              Create an account
            </Link>
          </p>
        </div>

        <aside className="hidden rounded-2xl bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Aureum
            </p>
            <p className="mt-4 text-2xl font-semibold leading-snug tracking-[-0.02em]">
              Considered goods, backed by systems that behave.
            </p>
          </div>

          <ul className="mt-12 space-y-4">
            {PANEL_POINTS.map((point) => (
              <li key={point.text} className="flex items-start gap-3 text-sm text-white/70">
                <point.icon className="mt-0.5 size-4 shrink-0 text-white/50" />
                {point.text}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </Container>
  )
}

export default Login
