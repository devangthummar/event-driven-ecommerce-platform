import { api } from './client'

/* ==========================================================================
   User Service — /api/users
   --------------------------------------------------------------------------
   POST /api/users/register        → UserResponse        (201)
   POST /api/users/login           → { accessToken, tokenType }
   GET  /api/users/me              → UserResponse
   PUT  /api/users/profile         → UserResponse
   PUT  /api/users/change-password → "Password changed successfully." (text)

   RegisterRequest: { firstName, lastName, email, password, phoneNumber }
   UpdateProfileRequest: { firstName, lastName, phoneNumber }
   ChangePasswordRequest: { currentPassword, newPassword }

   UserResponse: { id, firstName, lastName, email, phoneNumber, role }
   role is the enum name: "USER" | "ADMIN" (the JWT claim carries "ROLE_USER").
   ========================================================================== */

export function register({ firstName, lastName, email, password, phoneNumber }, options = {}) {
  return api.post('/api/users/register', {
    data: { firstName, lastName, email, password, phoneNumber },
    ...options,
  })
}

export function login({ email, password }, options = {}) {
  return api.post('/api/users/login', {
    data: { email, password },
    // 401 here means bad credentials, not an expired session.
    messageOverrides: { 401: 'Incorrect email or password. Please try again.' },
    ...options,
  })
}

export function getCurrentUser(options = {}) {
  return api.get('/api/users/me', options)
}

export function updateProfile({ firstName, lastName, phoneNumber }, options = {}) {
  return api.put('/api/users/profile', {
    data: { firstName, lastName, phoneNumber },
    ...options,
  })
}

export function changePassword({ currentPassword, newPassword }, options = {}) {
  return api.put('/api/users/change-password', {
    data: { currentPassword, newPassword },
    messageOverrides: {
      400: 'Your current password is incorrect, or the new password is too short.',
    },
    ...options,
  })
}
