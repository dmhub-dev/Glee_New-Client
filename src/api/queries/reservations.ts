import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../client'
import { walletKeys } from './wallet'
import { tokens } from '../../utils'

export type VenueType = 'CLUB' | 'RESTAURANT' | 'HOTEL_RESTAURANT' | 'LOUNGE' | 'OTHER'
export type ReservationStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'
export type DepositType = 'FLAT' | 'PERCENTAGE'
export type ReservationSource = 'VENUE' | 'EVENT'
export type ReservationPaymentMethod = 'WALLET' | 'PAYSTACK'

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

export interface LocationMenuItem {
  id: string
  locationId: string
  name: string
  category: string
  price: string | number
  description?: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
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

export interface ReservationEventSummary {
  id: string
  name: string
  startDate: string
  endDate: string
}

export interface ReservationCustomerSummary {
  id: string
  name?: string | null
  email?: string | null
  phone?: string | null
  profileImage?: string | null
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
  menuItems?: LocationMenuItem[]
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
  method: ReservationPaymentMethod
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
  reference?: string | null
  createdAt: string
}

export interface ReservationPreOrderMenuItem {
  id?: string | null
  source?: 'EVENT_MENU_ITEM' | 'LOCATION_MENU_ITEM' | string | null
  name: string
  category?: string | null
  price: string | number
  quantity: number
  lineTotal: string | number
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
  guestName?: string | null
  guestEmail?: string | null
  guestPhone?: string | null
  publicAccessToken?: string | null
  location?: ReservationVenue
  table?: LocationTable
  slot?: ReservationSlot | null
  event?: ReservationEventSummary | null
  eventSlot?: EventReservationSlot | null
  user?: ReservationCustomerSummary | null
  payment?: ReservationPayment | null
  paymentMethod?: ReservationPaymentMethod | null
  paymentStatus?: ReservationPayment['status'] | null
  payments?: ReservationPayment[]
  preOrderMenu?: ReservationPreOrderMenuItem[] | null
}

export interface ReservationPaymentIntent {
  reservation: Reservation
  authorization_url: string
  access_code?: string
  reference: string
  verificationToken: string
}

export interface ReservationVenuesFilters {
  search?: string
  venueType?: VenueType
  page?: number
  limit?: number
}

export interface ReservationListFilters {
  status?: ReservationStatus
  source?: ReservationSource
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
  paymentMethod: ReservationPaymentMethod
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  callbackUrl?: string
  menuItems?: ReservationMenuOrderPayload[]
  preOrderMenu?: ReservationMenuOrderPayload[]
}

export interface CreateEventReservationPayload {
  eventId: string
  eventSlotId: string
  tableCategory: string
  guestCount: number
  paymentMethod: ReservationPaymentMethod
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  callbackUrl?: string
  menuItems?: ReservationMenuOrderPayload[]
  preOrderMenu?: ReservationMenuOrderPayload[]
}

export interface ConfirmReservationPaymentPayload {
  verificationToken?: string
  reference?: string
}

export interface ConfirmReservationPaymentResponse {
  success: boolean
  message?: string
  data?: Reservation | null
}

export interface UpsertLocationTablePayload {
  name: string
  category: string
  description?: string
  minGuests: number
  maxGuests: number
  minimumSpend: number
  depositType: DepositType
  depositValue: number
  isActive?: boolean
}

export interface ReservationMenuOrderPayload {
  id: string
  quantity: number
}

export interface UpsertLocationMenuItemPayload {
  name: string
  category?: string
  price: number
  description?: string
  isActive?: boolean
}

export interface UpsertReservationSlotPayload {
  label: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
  isActive?: boolean
}

export interface UpsertEventReservationSlotPayload {
  label: string
  startDateTime: string
  endDateTime: string
  isActive?: boolean
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
  publicByToken: (token: string) => ['reservations', 'public', token] as const,
  adminRoot: ['reservations', 'admin'] as const,
  admin: (filters?: ReservationListFilters) => ['reservations', 'admin', filters ?? {}] as const,
  adminById: (id: string) => ['reservations', 'admin', id] as const,
  locationTables: (locationId: string) => ['reservations', 'locations', locationId, 'tables'] as const,
  locationSlots: (locationId: string) => ['reservations', 'locations', locationId, 'slots'] as const,
  locationMenuItems: (locationId: string) => ['reservations', 'locations', locationId, 'menu-items'] as const,
  adminEventSlots: (eventId: string) => ['reservations', 'admin', 'events', eventId, 'slots'] as const,
}

export function reservationVerificationStorageKey(reference: string) {
  return `glee:reservation-verification:${reference}`
}

export function reservationCheckoutContextStorageKey(reference: string) {
  return `glee:reservation-context:${reference}`
}

function shouldSkipReservationAuth(paymentMethod: ReservationPaymentMethod) {
  return paymentMethod === 'PAYSTACK' && !tokens.getAccess()
}

function isReservationPaymentIntent(result: Reservation | ReservationPaymentIntent): result is ReservationPaymentIntent {
  return 'reservation' in result && 'authorization_url' in result
}

function reservationFromMutationResult(result: Reservation | ReservationPaymentIntent) {
  return isReservationPaymentIntent(result) ? result.reservation : result
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

export async function createReservation(payload: CreateReservationPayload): Promise<Reservation | ReservationPaymentIntent> {
  const response = await apiFetch<{ success: boolean; data: Reservation | ReservationPaymentIntent }>('/api/v1/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: shouldSkipReservationAuth(payload.paymentMethod),
  })
  return response.data
}

export async function createEventReservation(payload: CreateEventReservationPayload): Promise<Reservation | ReservationPaymentIntent> {
  const { eventId, ...body } = payload
  const response = await apiFetch<{ success: boolean; data: Reservation | ReservationPaymentIntent }>(`/api/v1/reservations/events/${eventId}`, {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: shouldSkipReservationAuth(payload.paymentMethod),
  })
  return response.data
}

export async function confirmReservationPayment(payload: ConfirmReservationPaymentPayload): Promise<ConfirmReservationPaymentResponse> {
  const response = await apiFetch<ConfirmReservationPaymentResponse>('/api/v1/reservations/confirm-payment', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  })
  return response
}

export async function getMyReservations(filters: ReservationListFilters = {}) {
  const params = new URLSearchParams()
  params.set('page', String(filters.page ?? 1))
  params.set('limit', String(filters.limit ?? 100))
  if (filters.status) params.set('status', filters.status)
  if (filters.source) params.set('source', filters.source)
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

export async function getPublicReservation(token: string) {
  const response = await apiFetch<{ success: boolean; data: Reservation }>(`/api/v1/reservations/public/${encodeURIComponent(token)}`, {
    skipAuth: true,
  })
  return response.data
}

export async function cancelReservation(id: string, reason?: string) {
  const response = await apiFetch<{ success: boolean; data: Reservation }>(`/api/v1/reservations/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
  return response.data
}

export async function getAdminReservations(filters: ReservationListFilters = {}) {
  const params = new URLSearchParams()
  params.set('page', String(filters.page ?? 1))
  params.set('limit', String(filters.limit ?? 100))
  if (filters.status) params.set('status', filters.status)
  if (filters.source) params.set('source', filters.source)
  if (filters.locationId) params.set('locationId', filters.locationId)
  if (filters.eventId) params.set('eventId', filters.eventId)
  if (filters.date) params.set('date', filters.date)
  const response = await apiFetch<{ success: boolean; data: { items: Reservation[]; total: number; page: number; limit: number } }>(withQuery('/api/v1/admin/reservations', params))
  return response.data
}

export async function getAdminReservation(id: string) {
  const response = await apiFetch<{ success: boolean; data: Reservation }>(`/api/v1/admin/reservations/${id}`)
  return response.data
}

export async function updateAdminReservationStatus(id: string, status: ReservationStatus, reason?: string) {
  const response = await apiFetch<{ success: boolean; data: Reservation }>(`/api/v1/admin/reservations/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  })
  return response.data
}

export async function getLocationReservationTables(locationId: string) {
  const response = await apiFetch<{ success: boolean; data: LocationTable[] }>(`/api/v1/admin/locations/${locationId}/tables`)
  return response.data ?? []
}

export async function createLocationReservationTable(locationId: string, payload: UpsertLocationTablePayload) {
  const response = await apiFetch<{ success: boolean; data: LocationTable }>(`/api/v1/admin/locations/${locationId}/tables`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response.data
}

export async function updateLocationReservationTable(locationId: string, tableId: string, payload: Partial<UpsertLocationTablePayload>) {
  const response = await apiFetch<{ success: boolean; data: LocationTable }>(`/api/v1/admin/locations/${locationId}/tables/${tableId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return response.data
}

export async function getLocationMenuItems(locationId: string) {
  const response = await apiFetch<{ success: boolean; data: LocationMenuItem[] }>(`/api/v1/admin/locations/${locationId}/menu-items`)
  return response.data ?? []
}

export async function createLocationMenuItem(locationId: string, payload: UpsertLocationMenuItemPayload) {
  const response = await apiFetch<{ success: boolean; data: LocationMenuItem }>(`/api/v1/admin/locations/${locationId}/menu-items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response.data
}

export async function updateLocationMenuItem(locationId: string, menuItemId: string, payload: Partial<UpsertLocationMenuItemPayload>) {
  const response = await apiFetch<{ success: boolean; data: LocationMenuItem }>(`/api/v1/admin/locations/${locationId}/menu-items/${menuItemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return response.data
}

export async function getLocationReservationSlots(locationId: string) {
  const response = await apiFetch<{ success: boolean; data: ReservationSlot[] }>(`/api/v1/admin/locations/${locationId}/reservation-slots`)
  return response.data ?? []
}

export async function createLocationReservationSlot(locationId: string, payload: UpsertReservationSlotPayload) {
  const response = await apiFetch<{ success: boolean; data: ReservationSlot }>(`/api/v1/admin/locations/${locationId}/reservation-slots`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response.data
}

export async function updateLocationReservationSlot(locationId: string, slotId: string, payload: Partial<UpsertReservationSlotPayload>) {
  const response = await apiFetch<{ success: boolean; data: ReservationSlot }>(`/api/v1/admin/locations/${locationId}/reservation-slots/${slotId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return response.data
}

export async function getAdminEventReservationSlots(eventId: string) {
  const response = await apiFetch<{ success: boolean; data: EventReservationSlot[] }>(`/api/v1/admin/events/${eventId}/reservation-slots`)
  return response.data ?? []
}

export async function createAdminEventReservationSlot(eventId: string, payload: UpsertEventReservationSlotPayload) {
  const response = await apiFetch<{ success: boolean; data: EventReservationSlot }>(`/api/v1/admin/events/${eventId}/reservation-slots`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response.data
}

export async function updateAdminEventReservationSlot(eventId: string, slotId: string, payload: Partial<UpsertEventReservationSlotPayload>) {
  const response = await apiFetch<{ success: boolean; data: EventReservationSlot }>(`/api/v1/admin/events/${eventId}/reservation-slots/${slotId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
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
    onSuccess: result => {
      const reservation = reservationFromMutationResult(result)
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
    onSuccess: result => {
      const reservation = reservationFromMutationResult(result)
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

export function usePublicReservation(token: string | undefined) {
  return useQuery({
    queryKey: reservationKeys.publicByToken(token ?? ''),
    queryFn: () => getPublicReservation(token as string),
    enabled: Boolean(token),
    retry: false,
  })
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

export function useAdminReservations(filters: ReservationListFilters = {}) {
  return useQuery({ queryKey: reservationKeys.admin(filters), queryFn: () => getAdminReservations(filters) })
}

export function useAdminReservation(id: string) {
  return useQuery({ queryKey: reservationKeys.adminById(id), queryFn: () => getAdminReservation(id), enabled: Boolean(id) })
}

export function useUpdateAdminReservationStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: ReservationStatus; reason?: string }) => updateAdminReservationStatus(id, status, reason),
    onSuccess: reservation => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.adminRoot })
      queryClient.setQueryData(reservationKeys.adminById(reservation.id), reservation)
    },
  })
}

export function useLocationReservationTables(locationId: string) {
  return useQuery({ queryKey: reservationKeys.locationTables(locationId), queryFn: () => getLocationReservationTables(locationId), enabled: Boolean(locationId) })
}

export function useCreateLocationReservationTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ locationId, payload }: { locationId: string; payload: UpsertLocationTablePayload }) => createLocationReservationTable(locationId, payload),
    onSuccess: table => queryClient.invalidateQueries({ queryKey: reservationKeys.locationTables(table.locationId) }),
  })
}

export function useUpdateLocationReservationTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ locationId, tableId, payload }: { locationId: string; tableId: string; payload: Partial<UpsertLocationTablePayload> }) =>
      updateLocationReservationTable(locationId, tableId, payload),
    onSuccess: table => queryClient.invalidateQueries({ queryKey: reservationKeys.locationTables(table.locationId) }),
  })
}

export function useLocationMenuItems(locationId: string) {
  return useQuery({
    queryKey: reservationKeys.locationMenuItems(locationId),
    queryFn: () => getLocationMenuItems(locationId),
    enabled: Boolean(locationId),
  })
}

export function useCreateLocationMenuItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ locationId, payload }: { locationId: string; payload: UpsertLocationMenuItemPayload }) => createLocationMenuItem(locationId, payload),
    onSuccess: item => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.locationMenuItems(item.locationId) })
      queryClient.invalidateQueries({ queryKey: reservationKeys.venue(item.locationId) })
    },
  })
}

export function useUpdateLocationMenuItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ locationId, menuItemId, payload }: { locationId: string; menuItemId: string; payload: Partial<UpsertLocationMenuItemPayload> }) =>
      updateLocationMenuItem(locationId, menuItemId, payload),
    onSuccess: item => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.locationMenuItems(item.locationId) })
      queryClient.invalidateQueries({ queryKey: reservationKeys.venue(item.locationId) })
    },
  })
}

export function useLocationReservationSlots(locationId: string) {
  return useQuery({ queryKey: reservationKeys.locationSlots(locationId), queryFn: () => getLocationReservationSlots(locationId), enabled: Boolean(locationId) })
}

export function useCreateLocationReservationSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ locationId, payload }: { locationId: string; payload: UpsertReservationSlotPayload }) => createLocationReservationSlot(locationId, payload),
    onSuccess: slot => queryClient.invalidateQueries({ queryKey: reservationKeys.locationSlots(slot.locationId) }),
  })
}

export function useUpdateLocationReservationSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ locationId, slotId, payload }: { locationId: string; slotId: string; payload: Partial<UpsertReservationSlotPayload> }) =>
      updateLocationReservationSlot(locationId, slotId, payload),
    onSuccess: slot => queryClient.invalidateQueries({ queryKey: reservationKeys.locationSlots(slot.locationId) }),
  })
}

export function useAdminEventReservationSlots(eventId: string) {
  return useQuery({ queryKey: reservationKeys.adminEventSlots(eventId), queryFn: () => getAdminEventReservationSlots(eventId), enabled: Boolean(eventId) })
}

export function useCreateAdminEventReservationSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: UpsertEventReservationSlotPayload }) => createAdminEventReservationSlot(eventId, payload),
    onSuccess: slot => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.adminEventSlots(slot.eventId) })
      queryClient.invalidateQueries({ queryKey: reservationKeys.eventSlots(slot.eventId) })
    },
  })
}

export function useUpdateAdminEventReservationSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, slotId, payload }: { eventId: string; slotId: string; payload: Partial<UpsertEventReservationSlotPayload> }) =>
      updateAdminEventReservationSlot(eventId, slotId, payload),
    onSuccess: slot => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.adminEventSlots(slot.eventId) })
      queryClient.invalidateQueries({ queryKey: reservationKeys.eventSlots(slot.eventId) })
    },
  })
}
