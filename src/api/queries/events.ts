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
  category?: { id: string; name: string } | null
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
    categoryName:     raw.category?.name ?? undefined,
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

function combineDateTime(date: string, time?: string) {
  return new Date(`${date}T${time || '00:00'}:00`)
}

function buildEndDateTime(startDate: string, startTime: string, endDate: string, endTime?: string) {
  const start = combineDateTime(startDate, startTime)
  const safeEndDate = !endDate || endDate < startDate ? startDate : endDate
  const end = combineDateTime(safeEndDate, endTime || startTime)
  if (end < start) {
    end.setDate(end.getDate() + 1)
  }
  return { start, end }
}

function buildFormData(payload: EventApiPayload): FormData {
  const fd = new FormData()

  fd.append('name',        payload.title)
  fd.append('description', payload.description)
  fd.append('locationId',  payload.locationId)
  fd.append('status',      STATUS_TO_BACKEND[payload.status] ?? 'DRAFT')

  if (payload.categoryId) fd.append('category', payload.categoryId)

  const eventDateRange = buildEndDateTime(
    payload.startDate,
    payload.startTime,
    payload.endDate,
    payload.endTime || payload.startTime,
  )
  const startIso = eventDateRange.start.toISOString()
  const endIso   = eventDateRange.end.toISOString()

  fd.append('date', JSON.stringify({ start: startIso, end: endIso }))
  fd.append('ticketCategories', JSON.stringify(
    payload.ticketTiers.map(t => ({ name: t.name, price: t.price, capacity: t.quantity })),
  ))

  if (payload.schedules?.length) {
    fd.append('eventSchedule', JSON.stringify(
      payload.schedules.map(s => {
        const scheduleDateRange = buildEndDateTime(s.startDate, s.startTime, s.endDate, s.endTime)
        return {
          name: s.name,
          description: s.description,
          startDate: scheduleDateRange.start.toISOString(),
          endDate: scheduleDateRange.end.toISOString(),
        }
      }),
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
    all:  (scope: 'admin' | 'vendor' = 'admin') => ['admin', 'events', scope] as const,
    byId: (id: string, scope: 'admin' | 'vendor' = 'admin') => ['admin', 'events', scope, id] as const,
  },
}

// ── Fetch functions (public — no auth) ────────────────────────────────────────

export async function fetchEvents(): Promise<Event[]> {
  const res = await apiFetch<{ success: boolean; data: BackendEvent[] }>(
    '/api/v1/event?page=1&limit=100',
    { skipAuth: true },
  )
  return (res.data ?? [])
    .map(mapBackendToEvent)
    .filter(e => e.status === 'active' || e.status === 'postponed' || e.status === 'sold_out')
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

export async function getAdminEvents(vendorScoped = false): Promise<Event[]> {
  const res = await apiFetch<{ success: boolean; data: BackendEvent[] }>(
    `${vendorScoped ? '/api/v2' : '/api/v1'}/event?page=1&limit=100`,
  )
  return (res.data ?? []).map(mapBackendToEvent)
}

export async function getAdminEvent(id: string, vendorScoped = false): Promise<Event> {
  const res = await apiFetch<{ success: boolean; data: BackendEvent }>(`${vendorScoped ? '/api/v2' : '/api/v1'}/event/${id}`)
  return mapBackendToEvent(res.data)
}

export async function createAdminEvent(payload: EventApiPayload, vendorScoped = false): Promise<Event> {
  const res = await apiFetch<{ success: boolean; data: BackendEvent }>(
    `${vendorScoped ? '/api/v2' : '/api/v1'}/admin/event`,
    { method: 'POST', body: buildFormData(payload) },
  )
  return mapBackendToEvent(res.data)
}

export async function updateAdminEvent(id: string, payload: EventApiPayload, vendorScoped = false): Promise<Event> {
  const res = await apiFetch<{ success: boolean; data: BackendEvent }>(
    `${vendorScoped ? '/api/v2' : '/api/v1'}/admin/event/${id}`,
    { method: 'PATCH', body: buildFormData(payload) },
  )
  return mapBackendToEvent(res.data)
}

export async function deleteAdminEvent(id: string, vendorScoped = false): Promise<void> {
  await apiFetch(`${vendorScoped ? '/api/v2' : '/api/v1'}/admin/event/${id}`, { method: 'DELETE' })
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

export function useAdminEvents(options?: { vendorScoped?: boolean }) {
  const scope = options?.vendorScoped ? 'vendor' : 'admin'
  return useQuery({
    queryKey: eventKeys.admin.all(scope),
    queryFn:  () => getAdminEvents(Boolean(options?.vendorScoped)),
  })
}

export function useAdminEvent(id: string, options?: { vendorScoped?: boolean }) {
  const scope = options?.vendorScoped ? 'vendor' : 'admin'
  return useQuery({
    queryKey: eventKeys.admin.byId(id, scope),
    queryFn:  () => getAdminEvent(id, Boolean(options?.vendorScoped)),
    enabled:  !!id && id !== 'new',
  })
}

export function useCreateEvent(options?: { vendorScoped?: boolean }) {
  const qc = useQueryClient()
  const scope = options?.vendorScoped ? 'vendor' : 'admin'
  return useMutation({
    mutationFn: (payload: EventApiPayload) => createAdminEvent(payload, Boolean(options?.vendorScoped)),
    onSuccess:  () => qc.invalidateQueries({ queryKey: eventKeys.admin.all(scope) }),
  })
}

export function useUpdateEvent(options?: { vendorScoped?: boolean }) {
  const qc = useQueryClient()
  const scope = options?.vendorScoped ? 'vendor' : 'admin'
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EventApiPayload }) => updateAdminEvent(id, data, Boolean(options?.vendorScoped)),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: eventKeys.admin.all(scope) })
      qc.invalidateQueries({ queryKey: eventKeys.admin.byId(id, scope) })
    },
  })
}

export function useDeleteEvent(options?: { vendorScoped?: boolean }) {
  const qc = useQueryClient()
  const scope = options?.vendorScoped ? 'vendor' : 'admin'
  return useMutation({
    mutationFn: (id: string) => deleteAdminEvent(id, Boolean(options?.vendorScoped)),
    onSuccess:  () => qc.invalidateQueries({ queryKey: eventKeys.admin.all(scope) }),
  })
}
