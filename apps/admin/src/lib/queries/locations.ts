// apps/admin/src/lib/queries/locations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getLocations, createLocation, updateLocation, deleteLocation,
} from '../api/locations'
import type { CreateLocationDto, UpdateLocationDto } from '../api/locations'

export const locationKeys = {
  all: ['locations'] as const,
}

export function useLocations() {
  return useQuery({ queryKey: locationKeys.all, queryFn: getLocations })
}

export function useCreateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateLocationDto) => createLocation(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  })
}

export function useUpdateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateLocationDto }) => updateLocation(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  })
}

export function useDeleteLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  })
}
