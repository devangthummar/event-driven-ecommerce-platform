import { useCallback, useState } from 'react'
import { addFunds as addFundsRequest, createWallet as createWalletRequest, getWallet } from '../api/payments'
import { useApiResource } from './useApiResource'

/**
 * useWallet
 * --------------------------------------------------------------------------
 * The Payment Service answers 404 until a wallet exists for the user, and that
 * is a normal state — not an error — so it is surfaced as `status: 'missing'`
 * with a `create()` action. Every other failure stays an error.
 */
export function useWallet(userId, { enabled = true } = {}) {
  const resource = useApiResource(
    ({ signal }) => getWallet(userId, { signal }),
    [userId],
    { enabled: Boolean(userId) && enabled, initialData: null },
  )

  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState(null)

  const isMissing = resource.isError && resource.error?.isNotFound

  const status = !enabled || !userId
    ? 'idle'
    : isMissing
      ? 'missing'
      : resource.isLoading
        ? 'loading'
        : resource.isError
          ? 'error'
          : 'ready'

  const runMutation = useCallback(
    async (action) => {
      setIsMutating(true)
      setMutationError(null)
      try {
        const wallet = await action()
        resource.setData(wallet)
        return wallet
      } catch (error) {
        setMutationError(error)
        throw error
      } finally {
        setIsMutating(false)
      }
    },
    [resource],
  )

  const createWallet = useCallback(
    () => runMutation(() => createWalletRequest(userId)),
    [runMutation, userId],
  )

  const addFunds = useCallback(
    (amount) => runMutation(() => addFundsRequest(userId, amount)),
    [runMutation, userId],
  )

  return {
    wallet: resource.data,
    balance: Number(resource.data?.balance ?? 0),
    status,
    error: resource.isError && !isMissing ? resource.error : null,
    mutationError,
    isMutating,
    createWallet,
    addFunds,
    refetch: resource.refetch,
  }
}
