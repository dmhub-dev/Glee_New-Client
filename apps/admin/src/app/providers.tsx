import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { MOCK_ADMIN_USER, type AdminUser } from '../lib/mock-admin-user'

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
