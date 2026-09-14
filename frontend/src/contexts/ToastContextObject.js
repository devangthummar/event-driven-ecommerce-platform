import { createContext } from 'react'

// Kept in its own module (like the auth/cart contexts) so the provider and the
// consumer hook can import it without a circular dependency.
const ToastContext = createContext(null)

export default ToastContext
