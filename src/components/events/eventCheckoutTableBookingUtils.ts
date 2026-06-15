import type { EventTicketTableBooking, TicketTableBookingPayload } from '@glee/api'

export interface CheckoutTableBookingSelection {
  enabled: boolean
  eventSlotId: string
  tableCategory: string
  guestCount: number
  depositAmount: number
  minimumSpend: number
}

export interface CombinedCheckoutTotalInput {
  ticketTotal: number
  menuTotal: number
  tableBooking?: CheckoutTableBookingSelection | null
}

export interface AdminTicketWithTableBooking {
  tableBooking?: EventTicketTableBooking | null
  reservation?: EventTicketTableBooking | null
}

export function tableBookingDeposit(selection?: CheckoutTableBookingSelection | null): number {
  if (!selection?.enabled) return 0
  return Number(selection.depositAmount ?? 0)
}

export function combinedCheckoutTotal(input: CombinedCheckoutTotalInput): number {
  return input.ticketTotal + input.menuTotal + tableBookingDeposit(input.tableBooking)
}

export function selectedTableBookingPayload(
  selection?: CheckoutTableBookingSelection | null,
): TicketTableBookingPayload | undefined {
  if (!selection?.enabled || !selection.eventSlotId || !selection.tableCategory || selection.guestCount < 1) {
    return undefined
  }

  return {
    eventSlotId: selection.eventSlotId,
    tableCategory: selection.tableCategory,
    guestCount: selection.guestCount,
  }
}

export function adminTicketTableBooking(ticket: AdminTicketWithTableBooking): EventTicketTableBooking | null {
  const tableBooking = ticket.tableBooking ?? ticket.reservation ?? null
  if (!tableBooking) return null

  return {
    ...tableBooking,
    reference: tableBooking.reference ?? null,
    eventSlotId: tableBooking.eventSlotId ?? null,
    startDateTime: tableBooking.startDateTime ?? null,
    endDateTime: tableBooking.endDateTime ?? null,
  }
}
