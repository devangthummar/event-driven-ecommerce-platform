import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { changePassword, updateProfile } from '../api/auth'
import Container from '../components/layout/Container'
import PageHeader from '../components/layout/PageHeader'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import Input from '../components/ui/Input'
import Skeleton from '../components/ui/Skeleton'
import { ShieldIcon, WalletIcon } from '../components/ui/Icons'
import { useAuth } from '../contexts/useAuth'
import { useToast } from '../contexts/useToast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useWallet } from '../hooks/useWallet'
import { formatCurrency, fullName, initials, toNumber } from '../lib/format'

const TABS = [
  { to: '/account', label: 'Profile', end: true },
  { to: '/account/wallet', label: 'Wallet' },
  { to: '/account/security', label: 'Security' },
]

const PHONE_PATTERN = /^[6-9]\d{9}$/

function ProfilePanel({ user, refreshUser }) {
  const toast = useToast()
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phoneNumber: user?.phoneNumber || '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSaving) return

    const errors = {}
    if (form.firstName.trim().length < 2) errors.firstName = 'First name is required.'
    if (form.lastName.trim().length < 2) errors.lastName = 'Last name is required.'
    if (!PHONE_PATTERN.test(form.phoneNumber.trim()))
      errors.phoneNumber = 'Enter a valid 10-digit mobile number starting with 6–9.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSaving(true)
    setFormError(null)
    try {
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phoneNumber: form.phoneNumber.trim(),
      })
      await refreshUser()
      toast.success('Profile updated', 'Your account details were saved.')
    } catch (error) {
      if (error?.fieldErrors) setFieldErrors(error.fieldErrors)
      else setFormError(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
          {initials(user?.firstName, user?.lastName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">{fullName(user) || 'Your account'}</p>
          <p className="truncate text-sm text-ink-muted">{user?.email}</p>
        </div>
      </div>

      {formError && (
        <Alert tone="danger" className="mt-5" title="We could not save your details">
          {formError.message}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="First name"
            value={form.firstName}
            error={fieldErrors.firstName}
            onChange={(event) => setForm({ ...form, firstName: event.target.value })}
          />
          <Input
            label="Last name"
            value={form.lastName}
            error={fieldErrors.lastName}
            onChange={(event) => setForm({ ...form, lastName: event.target.value })}
          />
        </div>

        <Input
          label="Mobile number"
          value={form.phoneNumber}
          error={fieldErrors.phoneNumber}
          inputMode="numeric"
          maxLength={10}
          onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })}
        />

        <Input
          label="Email"
          value={user?.email || ''}
          readOnly
          hint="Email addresses cannot be changed — it is the account identifier used to sign in."
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isLoading={isSaving} loadingLabel="Saving…">
            Save changes
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setForm({
                firstName: user?.firstName || '',
                lastName: user?.lastName || '',
                phoneNumber: user?.phoneNumber || '',
              })
            }
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
  )
}

function WalletPanelAccount({ userId }) {
  const toast = useToast()
  const wallet = useWallet(userId)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState(null)

  const handleTopUp = async (event) => {
    event.preventDefault()
    const parsed = toNumber(amount)
    if (parsed <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    setError(null)
    try {
      await wallet.addFunds(parsed)
      setAmount('')
      toast.success('Funds added', `${formatCurrency(parsed)} is now available in your wallet.`)
    } catch (caught) {
      toast.error('Top-up failed', caught.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <WalletIcon className="size-4 text-ink-muted" />
              Wallet balance
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Checkout debits this balance through the payment service.
            </p>
          </div>

          {wallet.status === 'loading' && <Skeleton className="h-8 w-24" rounded="rounded-md" />}

          {wallet.status === 'ready' && (
            <p className="text-2xl font-semibold text-ink tabular-nums">
              {formatCurrency(wallet.balance)}
            </p>
          )}
        </div>

        {wallet.status === 'error' && (
          <Alert tone="danger" className="mt-4" title="We could not read your wallet">
            {wallet.error?.message}
          </Alert>
        )}

        {wallet.status === 'missing' && (
          <div className="mt-5">
            <Alert tone="info" title="No wallet yet">
              A wallet is created on demand and is required before you can place an order.
            </Alert>
            <Button
              className="mt-4"
              variant="secondary"
              isLoading={wallet.isMutating}
              onClick={async () => {
                try {
                  await wallet.createWallet()
                  toast.success('Wallet ready', 'Add funds whenever you are ready to order.')
                } catch (caught) {
                  toast.error('Could not create your wallet', caught.message)
                }
              }}
            >
              Create my wallet
            </Button>
          </div>
        )}
      </div>

      {wallet.status === 'ready' && (
        <form onSubmit={handleTopUp} className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-ink">Add funds</h2>
          <p className="mt-1 text-xs text-ink-muted">
            The payment service credits your wallet atomically — concurrent top-ups are both applied.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
            <Input
              label="Amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              placeholder="100.00"
              value={amount}
              error={error}
              containerClassName="sm:max-w-48"
              onChange={(event) => {
                setAmount(event.target.value)
                setError(null)
              }}
            />
            <Button type="submit" className="sm:mt-7" isLoading={wallet.isMutating} loadingLabel="Adding…">
              Add funds
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function SecurityPanel() {
  const toast = useToast()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSaving) return

    const errors = {}
    if (!form.currentPassword) errors.currentPassword = 'Enter your current password.'
    if (form.newPassword.length < 8) errors.newPassword = 'New password must be at least 8 characters.'
    if (form.newPassword !== form.confirmPassword)
      errors.confirmPassword = 'The two passwords do not match.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSaving(true)
    setFormError(null)
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Password changed', 'Use your new password the next time you sign in.')
    } catch (error) {
      setFormError(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <ShieldIcon className="size-4 text-ink-muted" />
        Change password
      </h2>
      <p className="mt-1 text-xs text-ink-muted">
        Passwords are hashed by the user service. Your current session stays valid until the token
        expires.
      </p>

      {formError && (
        <Alert tone="danger" className="mt-4" title="We could not change your password">
          {formError.message}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-5 max-w-md space-y-5" noValidate>
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          error={fieldErrors.currentPassword}
          onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
        />
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          error={fieldErrors.newPassword}
          hint={fieldErrors.newPassword ? undefined : 'At least 8 characters.'}
          onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          error={fieldErrors.confirmPassword}
          onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
        />

        <Button type="submit" isLoading={isSaving} loadingLabel="Updating…">
          Update password
        </Button>
      </form>
    </div>
  )
}

function Account() {
  const { user, refreshUser, logout, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  useDocumentTitle('Account')

  const activeTab = location.pathname.startsWith('/account/wallet')
    ? 'wallet'
    : location.pathname.startsWith('/account/security')
      ? 'security'
      : 'profile'

  return (
    <Container className="py-8 sm:py-10 lg:py-12">
      <PageHeader
        eyebrow="Account"
        title="Your account"
        description={`Signed in as ${user?.email}. Account ID #${user?.id ?? '—'}.`}
        actions={
          <>
            <Link to="/orders" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Your orders
            </Link>
            {isAdmin && (
              <Link to="/admin" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                Admin console
              </Link>
            )}
          </>
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Account sections">
          <ul className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible no-scrollbar">
            {TABS.map((tab) => (
              <li key={tab.to} className="shrink-0 lg:shrink">
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    [
                      'press block rounded-md px-3.5 py-2.5 text-sm font-medium',
                      isActive
                        ? 'bg-canvas text-ink lg:bg-ink lg:text-white'
                        : 'text-ink-soft hover:bg-canvas hover:text-ink',
                    ].join(' ')
                  }
                >
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="mt-6 hidden border-t border-line-soft pt-6 lg:block">
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="press w-full rounded-md px-3.5 py-2.5 text-left text-sm font-medium text-ink-soft hover:bg-canvas hover:text-danger"
            >
              Sign out
            </button>
          </div>
        </nav>

        <div>
          {activeTab === 'profile' && <ProfilePanel user={user} refreshUser={refreshUser} />}
          {activeTab === 'wallet' && <WalletPanelAccount userId={user?.id} />}
          {activeTab === 'security' && <SecurityPanel />}
        </div>
      </div>
    </Container>
  )
}

export default Account
