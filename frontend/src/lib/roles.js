/* ==========================================================================
   Roles
   --------------------------------------------------------------------------
   The User Service serializes its `Role` enum as "USER" / "ADMIN" in
   UserResponse, while the JWT carries the Spring authority form
   "ROLE_USER" / "ROLE_ADMIN". Normalizing here means every call site compares
   the same value no matter which shape it received.

   These checks shape UX only. The backend re-derives the role from the signed
   token for every request and remains the authority.
   ========================================================================== */

export const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
}

export function normalizeRole(role) {
  if (!role || typeof role !== 'string') return null
  return role.replace(/^ROLE_/i, '').toUpperCase()
}

export function isAdmin(user) {
  return normalizeRole(user?.role) === ROLES.ADMIN
}

/** @param {string[]} required */
export function hasAnyRole(user, required = []) {
  if (required.length === 0) return true
  const role = normalizeRole(user?.role)
  return required.map(normalizeRole).filter(Boolean).includes(role)
}
