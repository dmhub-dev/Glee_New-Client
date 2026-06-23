import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadEventCheckoutTableBooking() {
  const source = await readFile(new URL('../src/components/events/eventCheckoutTableBookingUtils.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })

  const module = { exports: {} }
  const evaluate = new Function('exports', 'module', outputText)
  evaluate(module.exports, module)
  return module.exports
}

function tableBookingSelection(overrides = {}) {
  return {
    enabled: true,
    eventSlotId: 'slot-main',
    tableCategory: 'VIP lounge',
    guestCount: 6,
    depositAmount: 1500,
    minimumSpend: 9000,
    ...overrides,
  }
}

test('combinedCheckoutTotal includes table deposit but excludes minimum spend', async () => {
  const { combinedCheckoutTotal } = await loadEventCheckoutTableBooking()

  assert.equal(
    combinedCheckoutTotal({
      ticketTotal: 3200,
      menuTotal: 800,
      tableBooking: tableBookingSelection({ depositAmount: 1500, minimumSpend: 9000 }),
    }),
    5500,
  )
})

test('combinedCheckoutTotal ignores disabled table booking', async () => {
  const { combinedCheckoutTotal } = await loadEventCheckoutTableBooking()

  assert.equal(
    combinedCheckoutTotal({
      ticketTotal: 3200,
      menuTotal: 800,
      tableBooking: tableBookingSelection({ enabled: false, depositAmount: 1500 }),
    }),
    4000,
  )
})

test('table booking payload is omitted from ticket-only orders', async () => {
  const { selectedTableBookingPayload } = await loadEventCheckoutTableBooking()

  assert.equal(selectedTableBookingPayload(null), undefined)
})

test('selectedTableBookingPayload allows guest count to differ from ticket quantity', async () => {
  const { selectedTableBookingPayload } = await loadEventCheckoutTableBooking()
  const ticketQuantity = 2
  const selection = tableBookingSelection({ guestCount: 7 })

  assert.notEqual(selection.guestCount, ticketQuantity)
  assert.deepEqual(selectedTableBookingPayload(selection), {
    eventSlotId: 'slot-main',
    tableCategory: 'VIP lounge',
    guestCount: 7,
  })
})

test('minimum spend is preserved for display but not sent in purchase payload', async () => {
  const { selectedTableBookingPayload } = await loadEventCheckoutTableBooking()

  const payload = selectedTableBookingPayload(
    tableBookingSelection({
      enabled: true,
      eventSlotId: 'slot_2',
      tableCategory: 'Balcony',
      guestCount: 8,
      depositAmount: 7000,
      minimumSpend: 45000,
    }),
  )

  assert.deepEqual(payload, {
    eventSlotId: 'slot_2',
    tableCategory: 'Balcony',
    guestCount: 8,
  })
  assert.equal(Object.hasOwn(payload, 'minimumSpend'), false)
  assert.equal(Object.hasOwn(payload, 'depositAmount'), false)
})

test('selectedTableBookingPayload returns undefined when table booking is incomplete', async () => {
  const { selectedTableBookingPayload } = await loadEventCheckoutTableBooking()

  assert.equal(selectedTableBookingPayload(null), undefined)
  assert.equal(selectedTableBookingPayload(tableBookingSelection({ eventSlotId: '' })), undefined)
  assert.equal(selectedTableBookingPayload(tableBookingSelection({ tableCategory: '' })), undefined)
  assert.equal(selectedTableBookingPayload(tableBookingSelection({ guestCount: 0 })), undefined)
})

test('adminTicketTableBooking reads tableBooking or reservation metadata and normalizes missing optional fields to null', async () => {
  const { adminTicketTableBooking } = await loadEventCheckoutTableBooking()

  assert.deepEqual(
    adminTicketTableBooking({
      tableBooking: {
        id: 'booking-1',
        tableCategory: 'Terrace',
        guestCount: 5,
        depositAmount: '1200',
        minimumSpend: '7000',
        status: 'CONFIRMED',
      },
    }),
    {
      id: 'booking-1',
      reference: null,
      eventSlotId: null,
      tableCategory: 'Terrace',
      guestCount: 5,
      depositAmount: '1200',
      minimumSpend: '7000',
      status: 'CONFIRMED',
      startDateTime: null,
      endDateTime: null,
    },
  )

  assert.deepEqual(
    adminTicketTableBooking({
      tableBooking: null,
      reservation: {
        id: 'reservation-1',
        reference: 'RSV-001',
        eventSlotId: 'slot-evening',
        tableCategory: 'Balcony',
        guestCount: 8,
        depositAmount: 2000,
        minimumSpend: 12000,
        status: 'SEATED',
        startDateTime: '2026-07-18T18:00:00.000Z',
        endDateTime: '2026-07-18T23:00:00.000Z',
      },
    }),
    {
      id: 'reservation-1',
      reference: 'RSV-001',
      eventSlotId: 'slot-evening',
      tableCategory: 'Balcony',
      guestCount: 8,
      depositAmount: 2000,
      minimumSpend: 12000,
      status: 'SEATED',
      startDateTime: '2026-07-18T18:00:00.000Z',
      endDateTime: '2026-07-18T23:00:00.000Z',
    },
  )

  assert.equal(adminTicketTableBooking({}), null)
})
