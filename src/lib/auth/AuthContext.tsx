import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser } from '../../api'
import { apiLogin, apiLogout, apiMe, apiRefreshSession, apiVerifyLoginTwoFactor } from '../../api'
import { ALL_USER_ROLES } from '../../types'
import { tokens } from '../../utils'

const AUTH_ROLES = new Set(ALL_USER_ROLES)

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ requiresTwoFactor: boolean; email?: string; message?: string; role?: string | null; passwordChangeRequired?: boolean }>
  verifyTwoFactor: (email: string, otp: string) => Promise<{ role: string | null; passwordChangeRequired?: boolean }>
  refreshUser: () => Promise<AuthUser | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ requiresTwoFactor: false }),
  verifyTwoFactor: async () => ({ role: null }),
  refreshUser: async () => null,
  logout: async () => {},
})

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount: refresh from the httpOnly cookie, then hydrate the user.
  useEffect(() => {
    let cancelled = false

    async function hydrateSession() {
      try {
        const accessToken = tokens.getAccess() ?? await apiRefreshSession()
        if (!accessToken) {
          tokens.clear()
          setUser(null)
          return
        }
        const me = await apiMe()
        if (cancelled) return
        if (AUTH_ROLES.has(me.role)) setUser(me)
        else tokens.clear()
      } catch {
        tokens.clear()
        setUser(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    hydrateSession()

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password)
    if ('requiresTwoFactor' in result) {
      if (result.role && !AUTH_ROLES.has(result.role)) {
        throw new Error('Access denied — your account does not have access.')
      }
      return { requiresTwoFactor: true, email: result.email, message: result.message, role: result.role }
    }
    if (!AUTH_ROLES.has(result.user.role)) {
      throw new Error('Access denied — your account does not have access.')
    }
    tokens.setAccess(result.accessToken)
    setUser(result.user)
    return { requiresTwoFactor: false, role: result.user.role, passwordChangeRequired: result.user.passwordChangeRequired }
  }, [])

  const verifyTwoFactor = useCallback(async (email: string, otp: string) => {
    const { accessToken, user: me } = await apiVerifyLoginTwoFactor(email, otp)
    if (!AUTH_ROLES.has(me.role)) {
      throw new Error('Access denied — your account does not have access.')
    }
    tokens.setAccess(accessToken)
    setUser(me)
    return { role: me.role, passwordChangeRequired: me.passwordChangeRequired }
  }, [])

  const refreshUser = useCallback(async () => {
    if (!tokens.getAccess()) {
      const accessToken = await apiRefreshSession()
      if (!accessToken) {
        tokens.clear()
        setUser(null)
        return null
      }
    }
    const me = await apiMe()
    if (AUTH_ROLES.has(me.role)) {
      setUser(me)
      return me
    }
    tokens.clear()
    setUser(null)
    return null
  }, [])

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {})
    tokens.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, verifyTwoFactor, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
