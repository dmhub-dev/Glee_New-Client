// apps/admin/src/lib/queries/categories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCategories, createCategory, updateCategory, deleteCategory,
} from '../api/categories'
import type { CreateCategoryDto, UpdateCategoryDto } from '../api/categories'

export const categoryKeys = {
  all: ['categories'] as const,
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
