import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { login as authLogin } from '../services/authService'
import { normalizeError } from '../services/api/apiClient'
import Button from '../components/ui/Button'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Where to redirect after login (preserves return URL from ProtectedRoute)
  const redirectTo = location.state?.from || '/'

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (error) setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      const { accessToken } = await authLogin({
        email: form.email,
        password: form.password,
      })
      login(accessToken)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const apiError = normalizeError(err)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="py-12 lg:py-20">
      <div className="max-w-md mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-primary tracking-tight mb-3">
            Welcome back
          </h1>
          <p className="text-secondary">
            Sign in to your account
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-bg-secondary border border-border-light text-sm text-secondary text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="w-full px-4 py-3 bg-white border border-border rounded-lg text-primary placeholder:text-muted focus:outline-none focus:border-primary transition-colors duration-200"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white border border-border rounded-lg text-primary placeholder:text-muted focus:outline-none focus:border-primary transition-colors duration-200"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-secondary">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-primary hover:text-secondary underline underline-offset-4 transition-colors duration-200">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}

export default Login
