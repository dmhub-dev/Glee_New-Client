import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function readReservationCallbackSource() {
  return readFile(new URL('../src/public/routes/reservations/ReservationCallback.tsx', import.meta.url), 'utf8')
}

async function readPublicReservationDetailSource() {
  return readFile(new URL('../src/public/routes/reservations/$token.tsx', import.meta.url), 'utf8')
}

async function readStandaloneVenueBookingSource() {
  return readFile(new URL('../src/customer/reservations/$locationId.tsx', import.meta.url), 'utf8')
}

async function readEventReservationPanelSource() {
  return readFile(new URL('../src/customer/events/EventReservationPanel.tsx', import.meta.url), 'utf8')
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

test('public reservation detail does not show the confirmed-arrival instruction copy', async () => {
  const source = await readPublicReservationDetailSource()

  assertTranspiles(source)
  assert.doesNotMatch(source, /Keep this page available when you arrive/)
  assert.match(source, /case ['"]CONFIRMED['"]:\s*return null/)
  assert.match(source, /\{notice && NoticeIcon \? \(/)
})

test('reservation callback shows a success confirmation with email and customer ticket actions', async () => {
  const source = await readReservationCallbackSource()

  assertTranspiles(source)
  assert.match(source, /type CallbackState = ['"]loading['"] \| ['"]success['"] \| ['"]review['"] \| ['"]error['"]/)
  assert.match(source, /setState\(['"]success['"]\)/)
  assert.match(source, /Confirmation sent to/)
  assert.match(source, /successDetails\.email/)
  assert.match(source, /Your booking ticket is in Tickets/)
  assert.match(source, /Back Home/)
  assert.match(source, /View Ticket/)
  assert.match(source, /\/app\/tickets\?tab=reservations/)
  assert.match(source, /\/app\/reservations\/detail\/\$\{successDetails\.reservationId\}/)
})

test('reservation callback uses club and restaurant explore routes after reservation payment', async () => {
  const source = await readReservationCallbackSource()

  assert.match(source, /mode === ['"]customer['"] \? ['"]\/app\/reservations['"] : ['"]\/reservations['"]/)
  assert.doesNotMatch(source, /navigate\(`\/reservation\/\$\{reservation\.publicAccessToken\}`/)
  assert.doesNotMatch(source, /navigate\(`\/app\/reservations\/detail\/\$\{fallbackReservationId\}`/)
})

test('reservation checkout context preserves email for payment callback messaging', async () => {
  const standaloneSource = await readStandaloneVenueBookingSource()
  const eventSource = await readEventReservationPanelSource()

  assert.match(standaloneSource, /email:\s*isAuthenticated\s*\?\s*user\?\.email/)
  assert.match(standaloneSource, /:\s*guestEmail\.trim\(\)/)
  assert.match(eventSource, /email:\s*isAuthenticated\s*\?\s*user\?\.email/)
  assert.match(eventSource, /:\s*guestEmail\.trim\(\)/)
})
