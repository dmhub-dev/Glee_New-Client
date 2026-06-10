import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../client'
import { walletKeys } from './wallet'

export type VenueType = 'CLUB' | 'RESTAURANT' | 'HOTEL_RESTAURANT' | 'LOUNGE' | 'OTHER'
export type ReservationStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'
export type DepositType = 'FLAT' | 'PERCENTAGE'
export type ReservationSource = 'VENUE' | 'EVENT'

export interface LocationTable {
  id: string
  locationId: string
  name: string
  category: string
  description?: string | null
  minGuests: number
  maxGuests: number
  minimumSpend: string | number
  depositType: DepositType
  depositValue: string | number
  isActive: boolean
}

export interface ReservationSlot {
  id: string
  locationId: string
  label: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
  isActive: boolean
}

export interface EventReservationSlot {
  id: string
  eventId: string
  label: string
  startDateTime: string
  endDateTime: string
  isActive: boolean
}

export interface ReservationVenue {
  id: string
  name: string
  address: string
  description?: string | null
  capacity: number
  pictures: string[]
  venueType: VenueType
  bookingEnabled: boolean
  bookingRules?: string | null
  cancellationCutoffHours: number
  timezone?: string | null
  reservationSlots?: ReservationSlot[]
  reservationTables?: LocationTable[]
}

export interface AvailabilityCategory {
  category: string
  availableCount: number
  minGuests: number
  maxGuests: number
  minimumSpend: number
  depositAmount: number
}

export interface ReservationAvailability {
  locationId: string
  slotId: string
  startDateTime: string
  endDateTime: string
  categories: AvailabilityCategory[]
}

export interface EventReservationAvailability {
  eventId: string
  locationId: string
  eventSlotId: string
  startDateTime: string
  endDateTime: string
  categories: AvailabilityCategory[]
}

export interface ReservationPayment {
  id: string
  amount: string | number
  method: 'WALLET' | 'PAYSTACK'
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
  reference?: string | null
  createdAt: string
}

export interface Reservation {
  id: string
  reference: string
  userId: string
  locationId: string
  eventId?: string | null
  tableId: string
  slotId?: string | null
  eventSlotId?: string | null
  tableCategory: string
  guestCount: number
  minimumSpend: string | number
  depositAmount: string | number
  status: ReservationStatus
  source: ReservationSource
  reservationDate: string
  startDateTime: string
  endDateTime: string
  cancelBefore: string
  cancellationReason?: string | null
  location?: ReservationVenue
  table?: LocationTable
  payments?: ReservationPayment[]
}

export interface ReservationVenuesFilters {
  search?: string
  venueType?: VenueType
  page?: number
  limit?: number
}

export interface ReservationListFilters {
  status?: ReservationStatus
  locationId?: string
  eventId?: string
  date?: string
  page?: number
  limit?: number
}

export interface CreateReservationPayload {
  locationId: string
  slotId: string
  date: string
  tableCategory: string
  guestCount: number
  paymentMethod: 'WALLET'
}

export interface CreateEventReservationPayload {
  eventId: string
  eventSlotId: string
  tableCategory: string
  guestCount: number
  paymentMethod: 'WALLET'
}

export const reservationKeys = {
  all: ['reservations'] as const,
  venues: (filters?: ReservationVenuesFilters) => ['reservations', 'venues', filters ?? {}] as const,
  venue: (id: string) => ['reservations', 'venue', id] as const,
  availability: (locationId: string, params: { date: string; slotId: string; guestCount: number }) =>
    ['reservations', 'availability', locationId, params] as const,
  eventSlots: (eventId: string) => ['reservations', 'events', eventId, 'slots'] as const,
  eventAvailability: (eventId: string, params: { eventSlotId: string; guestCount: number }) =>
    ['reservations', 'events', eventId, 'availability', params] as const,
  my: (filters?: ReservationListFilters) => ['reservations', 'my', filters ?? {}] as const,
  byId: (id: string) => ['reservations', id] as const,
}

function withQuery(path: string, params: URLSearchParams) {
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export async function getReservationVenues(filters: ReservationVenuesFilters = {}) {
  const params = new URLSearchParams()
  params.set('page', String(filters.page ?? 1))
  params.set('limit', String(filters.limit ?? 100))
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  if (filters.venueType) params.set('venueType', filters.venueType)
  const response = await apiFetch<{ success: boolean; data: { items: ReservationVenue[]; total: number; page: number; limit: number } }>(withQuery('/api/v1/reservations/venues', params))
  return response.data
}

export async function getReservationVenue(id: string) {
  const response = await apiFetch<{ success: boolean; data: ReservationVenue }>(`/api/v1/reservations/venues/${id}`)
  return response.data
}

export async function getReservationAvailability(locationId: string, params: { date: string; slotId: string; guestCount: number }) {
  const query = new URLSearchParams({ date: params.date, slotId: params.slotId, guestCount: String(params.guestCount) })
  const response = await apiFetch<{ success: boolean; data: ReservationAvailability }>(withQuery(`/api/v1/reservations/venues/${locationId}/availability`, query))
  return response.data
}

export async function getEventReservationSlots(eventId: string) {
  const response = await apiFetch<{ success: boolean; data: EventReservationSlot[] }>(`/api/v1/reservations/events/${eventId}/reservation-slots`)
  return response.data
}

export async function getEventReservationAvailability(eventId: string, params: { eventSlotId: string; guestCount: number }) {
  const query = new URLSearchParams({ eventSlotId: params.eventSlotId, guestCount: String(params.guestCount) })
  const response = await apiFetch<{ success: boolean; data: EventReservationAvailability }>(withQuery(`/api/v1/reservations/events/${eventId}/availability`, query))
  return response.data
}

export async function createReservation(payload: CreateReservationPayload) {
  const response = await apiFetch<{ success: boolean; data: Reservation }>('/api/v1/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response.data
}

export async function createEventReservation(payload: CreateEventReservationPayload) {
  const { eventId, ...body } = payload
  const response = await apiFetch<{ success: boolean; data: Reservation }>(`/api/v1/reservations/events/${eventId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return response.data
}

export async function getMyReservations(filters: ReservationListFilters = {}) {
  const params = new URLSearchParams()
  params.set('page', String(filters.page ?? 1))
  params.set('limit', String(filters.limit ?? 100))
  if (filters.status) params.set('status', filters.status)
  if (filters.locationId) params.set('locationId', filters.locationId)
  if (filters.eventId) params.set('eventId', filters.eventId)
  if (filters.date) params.set('date', filters.date)
  const response = await apiFetch<{ success: boolean; data: { items: Reservation[]; total: number; page: number; limit: number } }>(withQuery('/api/v1/reservations/my', params))
  return response.data
}

export async function getReservation(id: string) {
  const response = await apiFetch<{ success: boolean; data: Reservation }>(`/api/v1/reservations/${id}`)
  return response.data
}

export async function cancelReservation(id: string, reason?: string) {
  const response = await apiFetch<{ success: boolean; data: Reservation }>(`/api/v1/reservations/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
  return response.data
}

export function useReservationVenues(filters: ReservationVenuesFilters = {}) {
  return useQuery({ queryKey: reservationKeys.venues(filters), queryFn: () => getReservationVenues(filters) })
}

export function useReservationVenue(id: string) {
  return useQuery({ queryKey: reservationKeys.venue(id), queryFn: () => getReservationVenue(id), enabled: Boolean(id) })
}

export function useReservationAvailability(locationId: string, params: { date: string; slotId: string; guestCount: number }, enabled: boolean) {
  return useQuery({ queryKey: reservationKeys.availability(locationId, params), queryFn: () => getReservationAvailability(locationId, params), enabled })
}

export function useEventReservationSlots(eventId: string) {
  return useQuery({ queryKey: reservationKeys.eventSlots(eventId), queryFn: () => getEventReservationSlots(eventId), enabled: Boolean(eventId) })
}

export function useEventReservationAvailability(eventId: string, params: { eventSlotId: string; guestCount: number }, enabled: boolean) {
  return useQuery({ queryKey: reservationKeys.eventAvailability(eventId, params), queryFn: () => getEventReservationAvailability(eventId, params), enabled })
}

export function useCreateReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createReservation,
    onSuccess: reservation => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      queryClient.invalidateQueries({ queryKey: walletKeys.wallet })
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions })
      queryClient.setQueryData(reservationKeys.byId(reservation.id), reservation)
    },
  })
}

export function useCreateEventReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createEventReservation,
    onSuccess: reservation => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      queryClient.invalidateQueries({ queryKey: walletKeys.wallet })
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions })
      queryClient.setQueryData(reservationKeys.byId(reservation.id), reservation)
    },
  })
}

export function useMyReservations(filters: ReservationListFilters = {}) {
  return useQuery({ queryKey: reservationKeys.my(filters), queryFn: () => getMyReservations(filters) })
}

export function useReservation(id: string) {
  return useQuery({ queryKey: reservationKeys.byId(id), queryFn: () => getReservation(id), enabled: Boolean(id) })
}

export function useCancelReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelReservation(id, reason),
    onSuccess: reservation => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      queryClient.setQueryData(reservationKeys.byId(reservation.id), reservation)
    },
  })
}
