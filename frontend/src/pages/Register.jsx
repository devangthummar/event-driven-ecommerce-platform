import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register as authRegister } from '../services/authService'
import { normalizeError } from '../services/api/apiClient'
import Button from '../components/ui/Button'

function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setErrors({})
    setLoading(true)

    try {
      await authRegister(form)
      setSuccess(true)
      // Redirect to login after a brief moment so user sees the success message
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      const apiError = normalizeError(err)

      // Handle field-level validation errors (returned as { field: message } map)
      if (apiError.fieldErrors) {
        setErrors(apiError.fieldErrors)
      } else {
        setErrors({ _form: apiError.message })
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="py-12 lg:py-20">
        <div className="max-w-md mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-semibold text-primary tracking-tight mb-4">
            Account created
          </h1>
          <p className="text-secondary">
            Redirecting you to sign in…
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="py-12 lg:py-20">
      <div className="max-w-md mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-primary tracking-tight mb-3">
            Create an account
          </h1>
          <p className="text-secondary">
            Join Aureum for a better shopping experience
          </p>
        </div>

        {errors._form && (
          <div className="mb-6 p-4 bg-bg-secondary border border-border-light text-sm text-secondary text-center">
            {errors._form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-primary mb-2">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              minLength={2}
              maxLength={50}
              value={form.firstName}
              onChange={handleChange}
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
              className={`w-full px-4 py-3 bg-white border rounded-lg text-primary placeholder:text-muted focus:outline-none transition-colors duration-200 ${
                errors.firstName ? 'border-red-400 focus:border-red-400' : 'border-border focus:border-primary'
              }`}
              placeholder="John"
            />
            {errors.firstName && (
              <p id="firstName-error" className="mt-1 text-xs text-red-500">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-primary mb-2">
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              minLength={2}
              maxLength={50}
              value={form.lastName}
              onChange={handleChange}
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? 'lastName-error' : undefined}
              className={`w-full px-4 py-3 bg-white border rounded-lg text-primary placeholder:text-muted focus:outline-none transition-colors duration-200 ${
                errors.lastName ? 'border-red-400 focus:border-red-400' : 'border-border focus:border-primary'
              }`}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p id="lastName-error" className="mt-1 text-xs text-red-500">{errors.lastName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={`w-full px-4 py-3 bg-white border rounded-lg text-primary placeholder:text-muted focus:outline-none transition-colors duration-200 ${
                errors.email ? 'border-red-400 focus:border-red-400' : 'border-border focus:border-primary'
              }`}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={`w-full px-4 py-3 bg-white border rounded-lg text-primary placeholder:text-muted focus:outline-none transition-colors duration-200 ${
                errors.password ? 'border-red-400 focus:border-red-400' : 'border-border focus:border-primary'
              }`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p id="password-error" className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-primary mb-2">
              Phone number
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              required
              pattern="^[6-9]\d{9}$"
              value={form.phoneNumber}
              onChange={handleChange}
              aria-invalid={!!errors.phoneNumber}
              aria-describedby={errors.phoneNumber ? 'phoneNumber-error' : undefined}
              className={`w-full px-4 py-3 bg-white border rounded-lg text-primary placeholder:text-muted focus:outline-none transition-colors duration-200 ${
                errors.phoneNumber ? 'border-red-400 focus:border-red-400' : 'border-border focus:border-primary'
              }`}
              placeholder="9876543210"
            />
            {errors.phoneNumber && (
              <p id="phoneNumber-error" className="mt-1 text-xs text-red-500">{errors.phoneNumber}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-secondary underline underline-offset-4 transition-colors duration-200">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default Register
