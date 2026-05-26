import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Event, EventMenuItem, EventSchedule } from '@glee/types'
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

interface BackendEventSchedule {
  id: string
  name: string
  description?: string | null
  startDate: string
  endDate: string
}

interface BackendEvent {
  id: string
  name: string
  description: string | null
  price?: string | number
  capacity: number | null
  availableTickets?: number | null
  locationName?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  photos?: string[]
  bannerImages?: string[]
  startDate: string | null
  endDate: string | null
  status: string
  createdAt: string
  updatedAt: string
  location: { id: string; name: string; address: string } | null
  ticketCategories: BackendTicketCategory[]
  menuItems: BackendEventMenuItem[]
  schedules?: BackendEventSchedule[]
  categoryId?: string | null
  vendorId?: string | null
}

// ── Status maps ────────────────────────────────────────────────────────────────

const BACKEND_TO_STATUS: Record<string, Event['status']> = {
  DRAFT:     'draft',
  ACTIVE:    'active',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  SOLD_OUT:  'sold_out',
}

const STATUS_TO_BACKEND: Record<string, string> = {
  draft:     'DRAFT',
  active:    'ACTIVE',
  postponed: 'POSTPONED',
  cancelled: 'CANCELLED',
  sold_out:  'SOLD_OUT',
}

// ── Mapper ─────────────────────────────────────────────────────────────────────

function mapBackendToEvent(raw: BackendEvent): Event {
  const start    = raw.startDate ? new Date(raw.startDate) : null
  const end      = raw.endDate   ? new Date(raw.endDate)   : null
  const locationStr = (raw.location?.name
    ?? raw.locationName
    ?? [raw.city, raw.state, raw.country].filter(Boolean).join(', '))
    || undefined
  const photos = raw.photos ?? raw.bannerImages ?? []

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
    vendorId:         raw.vendorId ?? '',
    venueId:          raw.location?.id ?? '',
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
    schedules: raw.schedules?.map((s): EventSchedule => ({
      id:          s.id,
      name:        s.name,
      description: s.description ?? '',
      startDate:   s.startDate,
      endDate:     s.endDate,
    })) ?? [],
    flyerSquareUrl:   photos[0] ?? undefined,
    flyerPortraitUrl: photos[1] ?? photos[0] ?? undefined,
    status:           BACKEND_TO_STATUS[raw.status] ?? 'draft',
    location:         locationStr,
    locationId:       raw.location?.id ?? undefined,
    categoryId:       raw.categoryId ?? undefined,
    createdAt:        raw.createdAt,
    updatedAt:        raw.updatedAt,
  }
}

// ── Payload type used by create/update forms ──────────────────────────────────

export interface EventApiPayload {
  title: string
  description: string
  categoryId: string
  status: Event['status']
  startDate: string
  endDate: string
  startTime: string
  endTime?: string
  locationId: string
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
  schedules?: Array<{
    name: string
    description: string
    startDate: string
    endDate: string
    startTime: string
    endTime: string
  }>
  posterFiles?: File[]
}

function buildFormData(payload: EventApiPayload): FormData {
  const fd = new FormData()

  fd.append('name',        payload.title)
  fd.append('description', payload.description)
  fd.append('locationId',  payload.locationId)
  fd.append('status',      STATUS_TO_BACKEND[payload.status] ?? 'DRAFT')

  if (payload.categoryId) fd.append('category', payload.categoryId)

  const startIso = new Date(`${payload.startDate}T${payload.startTime}:00`).toISOString()
  const endIso   = payload.endTime
    ? new Date(`${payload.endDate}T${payload.endTime}:00`).toISOString()
    : startIso

  fd.append('date', JSON.stringify({ start: startIso, end: endIso }))
  fd.append('ticketCategories', JSON.stringify(
    payload.ticketTiers.map(t => ({ name: t.name, price: t.price, capacity: t.quantity })),
  ))

  if (payload.schedules?.length) {
    fd.append('eventSchedule', JSON.stringify(
      payload.schedules.map(s => ({
        name: s.name,
        description: s.description,
        startDate: new Date(`${s.startDate}T${s.startTime}:00`).toISOString(),
        endDate: new Date(`${s.endDate}T${s.endTime}:00`).toISOString(),
      })),
    ))
  }

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
  return (res.data ?? []).map(mapBackendToEvent).filter(e => e.status === 'active')
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
