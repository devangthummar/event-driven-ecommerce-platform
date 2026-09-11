import { createContext } from 'react'

// The context object is created in a dedicated file so that
// AuthContext.jsx (which exports the provider component) and
// useAuth.js (which exports the consumer hook) can both import
// it without creating a circular dependency or triggering the
// oxlint only-export-components rule.
const AuthContext = createContext(null)

export default AuthContext
