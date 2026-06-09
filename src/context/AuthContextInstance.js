import { createContext } from 'react'

// Exported separately so that AuthContext.jsx (which has the component
// AuthProvider) stays a pure "component module" compatible with Vite Fast
// Refresh. Mixing component + non-component exports in the same file causes
// the "incompatible export" HMR warning and forces full page reloads.
export const AuthContext = createContext(null)
