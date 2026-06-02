import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser } from '@glee/api'
import { apiLogin, apiLogout, apiMe, apiVerifyLoginTwoFactor } from '@glee/api'
import { ALL_USER_ROLES } from '@glee/types'
import { tokens } from '@glee/utils'

const AUTH_ROLES = new Set(ALL_USER_ROLES)

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ requiresTwoFactor: boolean; email?: string; message?: string; role?: string | null }>
  verifyTwoFactor: (email: string, otp: string) => Promise<{ role: string | null }>
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

  // On mount: verify stored token, hydrate user
  useEffect(() => {
    if (!tokens.getAccess()) {
      setIsLoading(false)
      return
    }
    apiMe()
      .then(me => {
        if (AUTH_ROLES.has(me.role)) setUser(me)
        else tokens.clear()
      })
      .catch(() => tokens.clear())
      .finally(() => setIsLoading(false))
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
    tokens.setRefresh(result.refreshToken)
    setUser(result.user)
    return { requiresTwoFactor: false, role: result.user.role }
  }, [])

  const verifyTwoFactor = useCallback(async (email: string, otp: string) => {
    const { accessToken, refreshToken, user: me } = await apiVerifyLoginTwoFactor(email, otp)
    if (!AUTH_ROLES.has(me.role)) {
      throw new Error('Access denied — your account does not have access.')
    }
    tokens.setAccess(accessToken)
    tokens.setRefresh(refreshToken)
    setUser(me)
    return { role: me.role }
  }, [])

  const refreshUser = useCallback(async () => {
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
