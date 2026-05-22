// apps/admin/src/lib/queries/locations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getLocations, getLocation, createLocation, updateLocation, deleteLocation,
  uploadLocationPictures,
} from '../api/locations'
import type { CreateLocationDto, UpdateLocationDto } from '../api/locations'

export const locationKeys = {
  all:    ['locations']            as const,
  byId:   (id: string) => ['locations', id] as const,
}

export function useLocations() {
  return useQuery({ queryKey: locationKeys.all, queryFn: getLocations })
}

export function useLocation(id: string) {
  return useQuery({ queryKey: locationKeys.byId(id), queryFn: () => getLocation(id) })
}

export function useCreateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ dto, pictures }: { dto: CreateLocationDto; pictures: File[] }) => {
      const created = await createLocation(dto)
      if (pictures.length) await uploadLocationPictures(created.id, pictures)
      return created
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  })
}

export function useUpdateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dto, pictures }: { id: string; dto: UpdateLocationDto; pictures: File[] }) => {
      const updated = await updateLocation(id, dto)
      if (pictures.length) await uploadLocationPictures(updated.id, pictures)
      return updated
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: locationKeys.all })
      qc.invalidateQueries({ queryKey: locationKeys.byId(id) })
    },
  })
}

export function useDeleteLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  })
}
