import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser } from '@glee/api'
import { apiLogin, apiLogout, apiMe, apiVerifyLoginTwoFactor } from '@glee/api'
import { tokens } from '@glee/utils'

// Roles permitted in the authenticated dashboard. Public users stay on the public side.
const DASHBOARD_ROLES = new Set([
  'super_admin',
  'admin',
  'operations_manager',
  'commercial_manager',
  'finance',
  'vendor',
  'vendor_staff',
  'customer_support',
  'content_manager',
])

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ requiresTwoFactor: boolean; email?: string; message?: string }>
  verifyTwoFactor: (email: string, otp: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ requiresTwoFactor: false }),
  verifyTwoFactor: async () => {},
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
        if (DASHBOARD_ROLES.has(me.role)) setUser(me)
        else tokens.clear()
      })
      .catch(() => tokens.clear())
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password)
    if ('requiresTwoFactor' in result) {
      if (result.role && !DASHBOARD_ROLES.has(result.role)) {
        throw new Error('Access denied — your account does not have dashboard access.')
      }
      return { requiresTwoFactor: true, email: result.email, message: result.message }
    }
    if (!DASHBOARD_ROLES.has(result.user.role)) {
      throw new Error('Access denied — your account does not have dashboard access.')
    }
    tokens.setAccess(result.accessToken)
    tokens.setRefresh(result.refreshToken)
    setUser(result.user)
    return { requiresTwoFactor: false }
  }, [])

  const verifyTwoFactor = useCallback(async (email: string, otp: string) => {
    const { accessToken, refreshToken, user: me } = await apiVerifyLoginTwoFactor(email, otp)
    if (!DASHBOARD_ROLES.has(me.role)) {
      throw new Error('Access denied — your account does not have dashboard access.')
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
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, verifyTwoFactor, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
