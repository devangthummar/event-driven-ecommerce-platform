import { userClient } from './api/apiClient'

/**
 * Auth Service API
 *
 * Backend contract (User Service):
 *   POST /api/users/register  → UserResponse  (201 Created)
 *   POST /api/users/login     → LoginResponse
 *   GET  /api/users/me        → UserResponse  (requires JWT)
 *
 * RegisterRequest: { firstName, lastName, email, password, phoneNumber }
 * LoginRequest:    { email, password }
 * LoginResponse:   { accessToken, tokenType }
 * UserResponse:    { id, firstName, lastName, email, phoneNumber, role }
 *
 * Validation error (400): { field: "message" } map
 * Email conflict (409):   { timestamp, status, error, message, path }
 * Bad credentials (401):  { timestamp, status, error, message, path }
 */

/**
 * Register a new user.
 * @param {{ firstName: string, lastName: string, email: string, password: string, phoneNumber: string }} data
 * @returns {Promise<Object>} UserResponse
 */
export async function register({ firstName, lastName, email, password, phoneNumber }) {
  const response = await userClient.post('/api/users/register', {
    firstName,
    lastName,
    email,
    password,
    phoneNumber,
  })
  return response.data
}

/**
 * Login with email and password.
 * @param {{ email: string, password: string }} data
 * @returns {Promise<Object>} LoginResponse { accessToken, tokenType }
 */
export async function login({ email, password }) {
  const response = await userClient.post('/api/users/login', { email, password })
  return response.data
}

/**
 * Get the current authenticated user's profile.
 * @returns {Promise<Object>} UserResponse
 */
export async function getCurrentUser() {
  const response = await userClient.get('/api/users/me')
  return response.data
}
