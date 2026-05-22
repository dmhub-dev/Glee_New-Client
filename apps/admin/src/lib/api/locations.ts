// apps/admin/src/lib/api/locations.ts
import { apiFetch } from './client'

export interface Location {
  id: string
  name: string
  address: string
  description: string | null
  capacity: number
  isIndoors: boolean
  isOutdoors: boolean
  latitude: number
  longitude: number
  isParkingAvailable: boolean
  floorPlanImageUrl: string | null
  pictures: string[]
  createdAt: string
}

export interface CreateLocationDto {
  name: string
  address: string
  description?: string
  capacity: number
  isIndoors: boolean
  isOutdoors: boolean
  latitude?: number
  longitude?: number
  isParkingAvailable: boolean
}

export function uploadLocationPictures(locationId: string, files: File[]): Promise<Location> {
  const formData = new FormData()
  files.forEach(f => formData.append('pictures', f))
  return apiFetch<{ success: boolean; data: Location }>(`/api/v1/admin/locations/${locationId}/pictures`, {
    method: 'POST',
    body: formData,
  }).then(r => r.data)
}

export interface UpdateLocationDto extends Partial<CreateLocationDto> {}

interface LocationsResponse {
  success: boolean
  data: Location[]
}

interface LocationResponse {
  success: boolean
  data: Location
}

export function getLocations(): Promise<Location[]> {
  return apiFetch<LocationsResponse>('/api/v1/admin/locations').then(r => r.data ?? [])
}

export function getLocation(id: string): Promise<Location> {
  return apiFetch<LocationResponse>(`/api/v1/admin/locations/${id}`).then(r => r.data)
}

export function createLocation(dto: CreateLocationDto): Promise<Location> {
  return apiFetch<LocationResponse>('/api/v1/admin/locations', {
    method: 'POST',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

export function updateLocation(id: string, dto: UpdateLocationDto): Promise<Location> {
  return apiFetch<LocationResponse>(`/api/v1/admin/locations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

export function deleteLocation(id: string): Promise<void> {
  return apiFetch(`/api/v1/admin/locations/${id}`, { method: 'DELETE' })
}
