import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserRole } from '@glee/types'
import { getRolePermissions, setRolePermissions, reassignUserRole } from '../api/roles'
import type { RolePermissions } from '../api/roles'
import { adminUserKeys } from './users'

export const roleKeys = {
  permissions: (role: UserRole) => ['admin', 'roles', role, 'permissions'] as const,
}

export function useRolePermissions(role: UserRole) {
  return useQuery({
    queryKey: roleKeys.permissions(role),
    queryFn: () => getRolePermissions(role),
  })
}

export function useSetRolePermissions(role: UserRole) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (permissions: RolePermissions) => setRolePermissions(role, permissions),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.permissions(role) }),
  })
}

export function useReassignUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      reassignUserRole(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminUserKeys.all }),
  })
}
