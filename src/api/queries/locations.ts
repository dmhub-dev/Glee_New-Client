import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../client'

export interface Location {
  id: string
  name: string
  address: string
  description: string | null
  capacity: number
  vendorId: string | null
  isIndoors: boolean
  isOutdoors: boolean
  latitude: number
  longitude: number
  isParkingAvailable: boolean
  floorPlanImageUrl: string | null
  pictures: string[]
  venueType?: 'CLUB' | 'RESTAURANT' | 'HOTEL_RESTAURANT' | 'LOUNGE' | 'OTHER'
  bookingEnabled?: boolean
  bookingRules?: string | null
  cancellationCutoffHours?: number
  timezone?: string | null
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
  pictures?: string[]
  venueType?: 'CLUB' | 'RESTAURANT' | 'OTHER'
  bookingEnabled?: boolean
  bookingRules?: string
  cancellationCutoffHours?: number
  timezone?: string
}

export interface UpdateLocationDto extends Partial<CreateLocationDto> {}

type LocationScope = 'admin' | 'vendor'

export const locationKeys = {
  all:  (scope: LocationScope = 'admin') => ['locations', scope] as const,
  byId: (id: string) => ['locations', id] as const,
}

export function getLocations(): Promise<Location[]> {
  return apiFetch<{ success: boolean; data: Location[] }>('/api/v1/admin/locations').then(r => r.data ?? [])
}

export function getLocation(id: string): Promise<Location> {
  return apiFetch<{ success: boolean; data: Location }>(`/api/v1/admin/locations/${id}`).then(r => r.data)
}

export function createLocation(dto: CreateLocationDto): Promise<Location> {
  return apiFetch<{ success: boolean; data: Location }>('/api/v1/admin/locations', {
    method: 'POST',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

export function updateLocation(id: string, dto: UpdateLocationDto): Promise<Location> {
  return apiFetch<{ success: boolean; data: Location }>(`/api/v1/admin/locations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

export function uploadLocationPictures(locationId: string, files: File[]): Promise<Location> {
  const formData = new FormData()
  files.forEach(f => formData.append('pictures', f))
  return apiFetch<{ success: boolean; data: Location }>(
    `/api/v1/admin/locations/${locationId}/pictures`,
    { method: 'POST', body: formData },
  ).then(r => r.data)
}

export function deleteLocation(id: string): Promise<void> {
  return apiFetch(`/api/v1/admin/locations/${id}`, { method: 'DELETE' })
}

export function useLocations(options?: { vendorScoped?: boolean }) {
  const scope: LocationScope = options?.vendorScoped ? 'vendor' : 'admin'
  return useQuery({ queryKey: locationKeys.all(scope), queryFn: getLocations })
}

export function useLocation(id: string) {
  return useQuery({ queryKey: locationKeys.byId(id), queryFn: () => getLocation(id) })
}

export function useCreateLocation(options?: { vendorScoped?: boolean }) {
  const qc = useQueryClient()
  const scope: LocationScope = options?.vendorScoped ? 'vendor' : 'admin'
  return useMutation({
    mutationFn: async ({ dto, pictures }: { dto: CreateLocationDto; pictures: File[] }) => {
      const created = await createLocation(dto)
      if (pictures.length) await uploadLocationPictures(created.id, pictures)
      return created
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all(scope) }),
  })
}

export function useUpdateLocation(options?: { vendorScoped?: boolean }) {
  const qc = useQueryClient()
  const scope: LocationScope = options?.vendorScoped ? 'vendor' : 'admin'
  return useMutation({
    mutationFn: async ({ id, dto, pictures }: { id: string; dto: UpdateLocationDto; pictures: File[] }) => {
      const updated = await updateLocation(id, dto)
      if (pictures.length) await uploadLocationPictures(updated.id, pictures)
      return updated
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: locationKeys.all(scope) })
      qc.invalidateQueries({ queryKey: locationKeys.byId(id) })
    },
  })
}

export function useDeleteLocation(options?: { vendorScoped?: boolean }) {
  const qc = useQueryClient()
  const scope: LocationScope = options?.vendorScoped ? 'vendor' : 'admin'
  return useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all(scope) }),
  })
}
