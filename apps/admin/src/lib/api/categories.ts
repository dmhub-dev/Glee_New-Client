// apps/admin/src/lib/api/categories.ts
import { apiFetch } from './client'

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

interface CategoriesResponse {
  success: boolean
  data: Category[]
}

interface CategoryResponse {
  success: boolean
  data: Category
}

export function getCategories(): Promise<Category[]> {
  return apiFetch<CategoriesResponse>('/api/v1/categories').then(r => r.data ?? [])
}

export function createCategory(dto: CreateCategoryDto): Promise<Category> {
  return apiFetch<CategoryResponse>('/api/v1/admin/categories', {
    method: 'POST',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

export function updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
  return apiFetch<CategoryResponse>(`/api/v1/admin/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

export function deleteCategory(id: string): Promise<void> {
  return apiFetch(`/api/v1/admin/categories/${id}`, { method: 'DELETE' })
}
