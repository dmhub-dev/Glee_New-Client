import type { Event } from '@glee/types'
import { apiFetch } from './client'

// ── Backend shapes ────────────────────────────────────────────────────────────

interface BackendTicketCategory {
  id: string
  name: string
  price: string | number
  capacity: number | null
  available: number | null
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
}

// ── Status maps ───────────────────────────────────────────────────────────────

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

// ── Mappers ───────────────────────────────────────────────────────────────────

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
        const price    = Number(raw.price) || 0
        const capacity = raw.capacity ?? 0
        const available = raw.availableTickets ?? capacity
        return capacity > 0 ? [{ id: raw.id + '_default', name: 'General', price, quantity: capacity, quantityRemaining: available }] : []
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
    flyerSquareUrl:   raw.bannerImages[0] ?? undefined,
    flyerPortraitUrl: raw.bannerImages[1] ?? raw.bannerImages[0] ?? undefined,
    status:           BACKEND_TO_STATUS[raw.status] ?? 'draft',
    location:         locationStr,
    createdAt:        raw.createdAt,
    updatedAt:        raw.updatedAt,
  }
}

// ── Payload type used by mutations ────────────────────────────────────────────

export interface EventApiPayload {
  title: string
  description: string
  category: string    // display name — not sent to API
  categoryId: string  // CUID sent to API
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

  fd.append(
    'ticketCategories',
    JSON.stringify(
      payload.ticketTiers.map(t => ({ name: t.name, price: t.price, capacity: t.quantity })),
    ),
  )

  if (payload.posterFiles) {
    for (const file of payload.posterFiles) {
      fd.append('files', file)
    }
  }

  return fd
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getAdminEvents(): Promise<Event[]> {
  const res = await apiFetch<{ success: boolean; data: BackendEvent[] }>(
    '/api/v1/event?page=1&limit=100',
  )
  return (res.data ?? []).map(mapBackendToEvent)
}

export async function getAdminEvent(id: string): Promise<Event> {
  const res = await apiFetch<{ success: boolean; data: BackendEvent }>(
    `/api/v1/event/${id}`,
  )
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
