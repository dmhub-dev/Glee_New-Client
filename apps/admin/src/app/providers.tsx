import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth/AuthContext'
import type { AuthUser } from '../lib/api/auth'

// ── Admin user (reads from AuthContext — ProtectedRoute guarantees non-null) ──

export type AdminUser = AuthUser

export function useAdminUser(): AdminUser {
  const { user } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return user!
}

// ── Theme ─────────────────────────────────────────────────────────────────────

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
})

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('glee-admin-theme') as Theme) ?? 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('glee-admin-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
