import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser } from '../api/auth'
import { apiLogin, apiLogout, apiMe } from '../api/auth'
import { tokens } from './tokens'

// Roles permitted in the admin panel
const ADMIN_ROLES = new Set([
  'super_admin',
  'admin',
  'operations_manager',
  'commercial_manager',
  'finance',
  'content_manager',
])

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
})

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount: verify stored token, hydrate user
  useEffect(() => {
    if (!tokens.getAccess()) {
      setIsLoading(false)
      return
    }
    apiMe()
      .then(me => {
        if (ADMIN_ROLES.has(me.role)) setUser(me)
        else tokens.clear()
      })
      .catch(() => tokens.clear())
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, refreshToken, user: me } = await apiLogin(email, password)
    if (!ADMIN_ROLES.has(me.role)) {
      throw new Error('Access denied — your account does not have admin access.')
    }
    tokens.setAccess(accessToken)
    tokens.setRefresh(refreshToken)
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {})
    tokens.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
