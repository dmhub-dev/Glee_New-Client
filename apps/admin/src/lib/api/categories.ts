import { apiFetch } from './client'

export interface Category {
  id: string
  name: string
}

export async function getCategories(): Promise<Category[]> {
  const res = await apiFetch<{ success: boolean; data: Category[] }>('/api/v1/categories')
  return res.data ?? []
}
