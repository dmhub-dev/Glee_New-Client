import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { MOCK_ADMIN_USER, type AdminUser } from '../lib/mock-admin-user'

// ── Admin user ────────────────────────────────────────────────────────────────

const AdminUserContext = createContext<AdminUser>(MOCK_ADMIN_USER)

export function useAdminUser(): AdminUser {
  return useContext(AdminUserContext)
}

export function AdminUserProvider({ children }: { children: ReactNode }) {
  return (
    <AdminUserContext.Provider value={MOCK_ADMIN_USER}>
      {children}
    </AdminUserContext.Provider>
  )
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
