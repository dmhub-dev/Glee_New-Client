import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../client'

export interface Category {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface CreateCategoryDto {
  name: string
}

export interface UpdateCategoryDto {
  name?: string
}

export const categoryKeys = {
  all: ['categories'] as const,
}

export function getCategories(): Promise<Category[]> {
  return apiFetch<{ success: boolean; data: Category[] }>('/api/v1/categories').then(r => r.data ?? [])
}

export function createCategory(dto: CreateCategoryDto): Promise<Category> {
  return apiFetch<{ success: boolean; data: Category }>('/api/v1/admin/categories', {
    method: 'POST',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

export function updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
  return apiFetch<{ success: boolean; data: Category }>(`/api/v1/admin/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

export function deleteCategory(id: string): Promise<void> {
  return apiFetch(`/api/v1/admin/categories/${id}`, { method: 'DELETE' })
}

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCategoryDto) => createCategory(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCategoryDto }) => updateCategory(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  })
}
