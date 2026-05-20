export const MOCK_ADMIN_USER = {
  id: 'admin-001',
  name: 'Orlando Laurentius',
  email: 'admin@glee.co.ke',
  role: 'admin' as const,
  avatarUrl: null as string | null,
}

export type AdminUser = typeof MOCK_ADMIN_USER
