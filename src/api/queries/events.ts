import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Event, EventMenuItem } from '@glee/types'
import { apiFetch } from '../client'

// ── Backend shapes ─────────────────────────────────────────────────────────────

interface BackendTicketCategory {
  id: string
  name: string
  price: string | number
  capacity: number | null
  available: number | null
}

interface BackendEventMenuItem {
  id: string
  name: string
  category: string
  price: string | number
  description?: string | null
}

interface BackendEvent {
  id: string
  name: string
  description: string | null
  price: string | number
  capacity: number | null
  availableTickets: number | null
  locationName: string | null
  city: string | null
  state: string | null
  country: string | null
  bannerImages: string[]
  startDate: string | null
  endDate: string | null
  status: string
  createdAt: string
  updatedAt: string
  location: { id: string; name: string; address: string } | null
  ticketCategories: BackendTicketCategory[]
  menuItems: BackendEventMenuItem[]
}

// ── Status maps ────────────────────────────────────────────────────────────────

const BACKEND_TO_STATUS: Record<string, Event['status']> = {
  ACTIVE:    'live',
  INACTIVE:  'draft',
  SUSPENDED: 'pending_approval',
  DONE:      'past',
}

const STATUS_TO_BACKEND: Record<string, string> = {
  live:             'ACTIVE',
  draft:            'INACTIVE',
  pending_approval: 'SUSPENDED',
  past:             'DONE',
  cancelled:        'DONE',
  postponed:        'DONE',
  rejected:         'INACTIVE',
}

// ── Mapper ─────────────────────────────────────────────────────────────────────

function mapBackendToEvent(raw: BackendEvent): Event {
  const start    = raw.startDate ? new Date(raw.startDate) : null
  const end      = raw.endDate   ? new Date(raw.endDate)   : null
  const locationStr = (raw.location?.name
    ?? raw.locationName
    ?? [raw.city, raw.state, raw.country].filter(Boolean).join(', '))
    || undefined

  const ticketTiers = raw.ticketCategories?.length
    ? raw.ticketCategories.map(tc => ({
        id:                tc.id,
        name:              tc.name,
        price:             Number(tc.price),
        quantity:          tc.capacity ?? 0,
        quantityRemaining: tc.available ?? tc.capacity ?? 0,
      }))
    : (() => {
        const price     = Number(raw.price) || 0
        const capacity  = raw.capacity ?? 0
        const available = raw.availableTickets ?? capacity
        return capacity > 0
          ? [{ id: raw.id + '_default', name: 'General', price, quantity: capacity, quantityRemaining: available }]
          : []
      })()

  return {
    id:               raw.id,
    vendorId:         '',
    venueId:          locationStr ?? '',
    title:            raw.name,
    description:      raw.description ?? '',
    startDate:        start ? start.toISOString().split('T')[0] : '',
    endDate:          end   ? end.toISOString().split('T')[0]   : (start ? start.toISOString().split('T')[0] : ''),
    startTime:        start ? start.toTimeString().slice(0, 5) : '',
    endTime:          end   ? end.toTimeString().slice(0, 5)   : undefined,
    ticketTiers,
    menuItems: raw.menuItems?.map((m): EventMenuItem => ({
      id:          m.id,
      name:        m.name,
      category:    m.category,
      price:       Number(m.price),
      description: m.description ?? undefined,
    })) ?? [],
    flyerSquareUrl:   raw.bannerImages[0] ?? undefined,
    flyerPortraitUrl: raw.bannerImages[1] ?? raw.bannerImages[0] ?? undefined,
    status:           BACKEND_TO_STATUS[raw.status] ?? 'draft',
    location:         locationStr,
    createdAt:        raw.createdAt,
    updatedAt:        raw.updatedAt,
  }
}

// ── Payload type used by create/update forms ──────────────────────────────────

export interface EventApiPayload {
  title: string
  description: string
  category: string
  categoryId: string
  status: 'draft' | 'live'
  startDate: string
  endDate: string
  startTime: string
  endTime?: string
  venueId: string
  location: string
  ticketTiers: Array<{
    id: string
    name: string
    price: number
    quantity: number
    quantityRemaining: number
    description?: string
  }>
  menuItems?: Array<{
    name: string
    category: string
    price: number
    description?: string
  }>
  posterFiles?: File[]
}

function buildFormData(payload: EventApiPayload): FormData {
  const fd = new FormData()

  fd.append('name',        payload.title)
  fd.append('description', payload.description)
  fd.append('location',    payload.location)
  fd.append('isActive',    STATUS_TO_BACKEND[payload.status] ?? 'INACTIVE')

  if (payload.categoryId) fd.append('category', payload.categoryId)

  const startIso = new Date(`${payload.startDate}T${payload.startTime}:00`).toISOString()
  const endIso   = payload.endTime
    ? new Date(`${payload.endDate}T${payload.endTime}:00`).toISOString()
    : startIso

  fd.append('date', JSON.stringify({ start: startIso, end: endIso }))
  fd.append('ticketCategories', JSON.stringify(
    payload.ticketTiers.map(t => ({ name: t.name, price: t.price, capacity: t.quantity })),
  ))

  if (payload.menuItems?.length) {
    fd.append('menuItems', JSON.stringify(payload.menuItems))
  }

  if (payload.posterFiles) {
    for (const file of payload.posterFiles) {
      fd.append('files', file)
    }
  }

  return fd
}

// ── Query keys ─────────────────────────────────────────────────────────────────

export const eventKeys = {
  all:   ['events'] as const,
  lists: () => ['events', 'list'] as const,
  list:  (filters: { date?: string; venueId?: string; status?: Event['status']; minPrice?: number; maxPrice?: number }) =>
    ['events', 'list', filters] as const,
  byId:  (id: string) => ['events', id] as const,
  admin: {
    all:  ['admin', 'events'] as const,
    byId: (id: string) => ['admin', 'events', id] as const,
  },
}

// ── Fetch functions (public — no auth) ────────────────────────────────────────

export async function fetchEvents(): Promise<Event[]> {
  const res = await apiFetch<{ success: boolean; data: BackendEvent[] }>(
    '/api/v1/event?page=1&limit=100',
    { skipAuth: true },
  )
  return (res.data ?? []).map(mapBackendToEvent).filter(e => e.status === 'live')
}

export async function fetchEvent(id: string): Promise<Event | undefined> {
  if (!id) return undefined
  const res = await apiFetch<{ success: boolean; data: BackendEvent }>(
    `/api/v1/event/${id}`,
    { skipAuth: true },
  )
  if (!res.data) return undefined
  return mapBackendToEvent(res.data)
}

// ── Fetch functions (admin — authenticated) ────────────────────────────────────

export async function getAdminEvents(): Promise<Event[]> {
  const res = await apiFetch<{ success: boolean; data: BackendEvent[] }>(
    '/api/v1/event?page=1&limit=100',
  )
  return (res.data ?? []).map(mapBackendToEvent)
}

export async function getAdminEvent(id: string): Promise<Event> {
  const res = await apiFetch<{ success: boolean; data: BackendEvent }>(`/api/v1/event/${id}`)
  return mapBackendToEvent(res.data)
}

export async function createAdminEvent(payload: EventApiPayload): Promise<Event> {
  const res = await apiFetch<{ success: boolean; data: BackendEvent }>(
    '/api/v1/admin/event',
    { method: 'POST', body: buildFormData(payload) },
  )
  return mapBackendToEvent(res.data)
}

export async function updateAdminEvent(id: string, payload: EventApiPayload): Promise<Event> {
  const res = await apiFetch<{ success: boolean; data: BackendEvent }>(
    `/api/v1/admin/event/${id}`,
    { method: 'PATCH', body: buildFormData(payload) },
  )
  return mapBackendToEvent(res.data)
}

export async function deleteAdminEvent(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/event/${id}`, { method: 'DELETE' })
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

type EventFilters = Parameters<typeof eventKeys.list>[0]

export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: filters ? eventKeys.list(filters) : eventKeys.lists(),
    queryFn:  () => fetchEvents(),
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.byId(id),
    queryFn:  () => fetchEvent(id),
    enabled:  Boolean(id),
  })
}

export function useAdminEvents() {
  return useQuery({
    queryKey: eventKeys.admin.all,
    queryFn:  getAdminEvents,
  })
}

export function useAdminEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.admin.byId(id),
    queryFn:  () => getAdminEvent(id),
    enabled:  !!id && id !== 'new',
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: EventApiPayload) => createAdminEvent(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: eventKeys.admin.all }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EventApiPayload }) => updateAdminEvent(id, data),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: eventKeys.admin.all })
      qc.invalidateQueries({ queryKey: eventKeys.admin.byId(id) })
    },
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAdminEvent(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: eventKeys.admin.all }),
  })
}
