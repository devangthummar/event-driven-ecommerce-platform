import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import { ApiError } from '../api/client'

describe('ErrorState', () => {
  test('tells an offline user something actionable', () => {
    render(<ErrorState error={new ApiError('nope', { status: 0, code: 'network' })} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/appear to be offline/i)).toBeInTheDocument()
  })

  test('distinguishes a server fault from a timeout', () => {
    const { unmount } = render(
      <ErrorState error={new ApiError('boom', { status: 500 })} />,
    )
    expect(screen.getByText(/service is having trouble/i)).toBeInTheDocument()
    unmount()

    render(<ErrorState error={new ApiError('slow', { status: 0, code: 'timeout' })} />)
    expect(screen.getByText(/took too long/i)).toBeInTheDocument()
  })

  test('surfaces the backend message when there is one', () => {
    render(<ErrorState error={new ApiError('Product service is temporarily unavailable.')} />)
    expect(screen.getByText('Product service is temporarily unavailable.')).toBeInTheDocument()
  })

  test('offers a retry that calls back', () => {
    const onRetry = vi.fn()
    render(<ErrorState error={new ApiError('boom', { status: 500 })} onRetry={onRetry} />)

    screen.getByRole('button', { name: /try again/i }).click()
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})

describe('EmptyState', () => {
  test('renders a title, description and optional actions', () => {
    render(
      <EmptyState
        title="Nothing here yet"
        description="Add something to see it."
        actions={<button type="button">Do the thing</button>}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument()
    expect(screen.getByText('Add something to see it.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Do the thing' })).toBeInTheDocument()
  })
})
