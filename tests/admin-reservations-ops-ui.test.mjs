import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function readReservationListSource() {
  return readFile(new URL('../src/routes/reservations/index.tsx', import.meta.url), 'utf8')
}

async function readReservationDetailSource() {
  return readFile(new URL('../src/routes/reservations/$reservationId.tsx', import.meta.url), 'utf8')
}

function assertTranspiles(source) {
  const { diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  })

  assert.deepEqual(diagnostics?.map(diagnostic => diagnostic.messageText) ?? [], [])
}

test('admin reservations list exposes an operational bookings desk', async () => {
  const source = await readReservationListSource()

  assertTranspiles(source)
  assert.match(source, /const\s+BOOKING_GROUP_TABS/)
  assert.match(source, /function\s+BookingOpsRow\(/)
  assert.match(source, /type\s+BookingLocationView\s*=\s*['"]grid['"]\s*\|\s*['"]list['"]/)
  assert.match(source, /function\s+VenueGroupListRow\(/)
  assert.match(source, /function\s+SelectedVenueBookingsView\(/)
  assert.match(source, /function\s+VenueDetailRow\(/)
  assert.match(source, /Search bookings\.\.\./)
  assert.match(source, /viewMode/)
  assert.match(source, /Grid view/)
  assert.match(source, /List view/)
  assert.match(source, /Add Location/)
  assert.match(source, /\/dashboard\/locations\/new/)
  assert.match(source, /selectedGroupId/)
  assert.match(source, /!\s*selectedGroup\s*&&\s*\(/)
  assert.doesNotMatch(source, /BOOKING_OPS_TABS/)
  assert.doesNotMatch(source, /OperationsSnapshot/)
  assert.doesNotMatch(source, /bookingOpsTab/)
  assert.doesNotMatch(source, /type=["']date["']/)
  assert.doesNotMatch(source, /<select/)
  assert.doesNotMatch(source, /All bookings/)
  assert.doesNotMatch(source, /Unread chats/)

  const selectedVenueSource = source.slice(
    source.indexOf('function SelectedVenueBookingsView'),
    source.indexOf('function VenueDetailRow'),
  )
  assert.doesNotMatch(selectedVenueSource, /Search bookings\.\.\./)
  assert.doesNotMatch(selectedVenueSource, /Grid view/)
  assert.doesNotMatch(selectedVenueSource, /List view/)
  assert.doesNotMatch(selectedVenueSource, /Add Location/)
  assert.doesNotMatch(selectedVenueSource, /SummaryCard/)
  assert.doesNotMatch(selectedVenueSource, /<Metric/)
})

test('admin reservation detail exposes a richer booking command view', async () => {
  const source = await readReservationDetailSource()

  assertTranspiles(source)
  assert.match(source, /type\s+BookingDetailTab\s*=/)
  assert.match(source, /const\s+BOOKING_DETAIL_TABS/)
  assert.match(source, /function\s+BookingDetailTabs\(/)
  assert.match(source, /function\s+OverviewPanel\(/)
  assert.match(source, /function\s+StatusActionRail\(/)
  assert.match(source, /function\s+BookingTimeline\(/)
  assert.match(source, /function\s+BookingMoneyPanel\(/)
  assert.match(source, /function\s+CustomerPanel\(/)
  assert.match(source, /function\s+PreOrderPanel\(/)
  assert.match(source, /function\s+PreviousBookingsPanel\(/)
  assert.match(source, /function\s+DetailRow\(/)
  assert.match(source, /historyDate/)
  assert.match(source, /Filter previous bookings by date/)
  assert.match(source, /Minimum spend/)
  assert.match(source, /Deposit paid/)
  assert.match(source, /Venue pre-order/)
  assert.match(source, /Booking chat/)
  assert.match(source, /Customer Feedback/)
  assert.doesNotMatch(source, /preOrderQuantity/)
  assert.doesNotMatch(source, /<Metric label=["']Pre-orders["']/)
  assert.doesNotMatch(source, /Search bookings\.\.\./)
  assert.doesNotMatch(source, /Grid view/)
  assert.doesNotMatch(source, /List view/)
  assert.doesNotMatch(source, /Add Location/)

  const topBarSource = source.slice(
    source.indexOf('<AdminLayout title="Booking Detail">'),
    source.indexOf('<BookingDetailTabs'),
  )
  assert.doesNotMatch(topBarSource, /Mark\s+\{statusLabel\(status\)\}/)
})
