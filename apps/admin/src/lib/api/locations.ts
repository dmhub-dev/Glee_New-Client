// apps/admin/src/lib/api/locations.ts
import { apiFetch } from './client'

export interface Location {
  id: string
  name: string
  address: string
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
  capacity: number
  isIndoors: boolean
  isOutdoors: boolean
  latitude: number
  longitude: number
  isParkingAvailable: boolean
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
  return apiFetch<LocationsResponse>('/api/v1/locations').then(r => r.data ?? [])
}

export function createLocation(dto: CreateLocationDto): Promise<Location> {
  return apiFetch<LocationResponse>('/api/v1/locations', {
    method: 'POST',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

export function updateLocation(id: string, dto: UpdateLocationDto): Promise<Location> {
  return apiFetch<LocationResponse>(`/api/v1/locations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

export function deleteLocation(id: string): Promise<void> {
  return apiFetch(`/api/v1/locations/${id}`, { method: 'DELETE' })
}
