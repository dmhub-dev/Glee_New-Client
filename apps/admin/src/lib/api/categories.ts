// apps/admin/src/lib/api/categories.ts
import { apiFetch } from './client'

export interface Category {
  id: string
  name: string
  description: string
  isActive: boolean
  createdAt: string
}

export interface CreateCategoryDto {
  name: string
  description?: string
  isActive?: boolean
}

export interface UpdateCategoryDto {
  name?: string
  description?: string
  isActive?: boolean
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
  return apiFetch<CategoryResponse>('/api/v1/categories', {
    method: 'POST',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

export function updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
  return apiFetch<CategoryResponse>(`/api/v1/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

export function deleteCategory(id: string): Promise<void> {
  return apiFetch(`/api/v1/categories/${id}`, { method: 'DELETE' })
}
