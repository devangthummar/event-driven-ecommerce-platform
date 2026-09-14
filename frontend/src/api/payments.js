import { api } from './client'

/* ==========================================================================
   Payment Service — /api/wallets
   --------------------------------------------------------------------------
   POST  /api/wallets/{userId}                  → Wallet (201)
   GET   /api/wallets/{userId}                  → Wallet
   PATCH /api/wallets/{userId}/balance?amount=X → Wallet

   Wallet: { id, userId, balance, createdAt, updatedAt }

   Ownership rules are enforced server-side: a caller may only touch their own
   wallet unless they hold ROLE_ADMIN. A missing wallet is a 404, which the UI
   treats as "set up your wallet" rather than an error.

   Wallet is the only payment method the platform supports (PaymentMethod
   enum has a single value, WALLET) and payments themselves are created by the
   saga — there is no client-side payment endpoint, by design.
   ========================================================================== */

export const WALLET_MISSING = 'wallet-not-created'

export function getWallet(userId, options = {}) {
  return api.get(`/api/wallets/${encodeURIComponent(userId)}`, options)
}

export function createWallet(userId, options = {}) {
  return api.post(`/api/wallets/${encodeURIComponent(userId)}`, {
    messageOverrides: { 409: 'Your wallet is already set up.' },
    ...options,
  })
}

/**
 * Credit the wallet. The backend only accepts a strictly positive amount and
 * performs the increment atomically.
 */
export function addFunds(userId, amount, options = {}) {
  return api.patch(`/api/wallets/${encodeURIComponent(userId)}/balance`, {
    params: { amount },
    messageOverrides: {
      400: 'Enter an amount greater than zero.',
      404: 'Your wallet has not been created yet.',
    },
    ...options,
  })
}
