import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function readPanelSource() {
  return readFile(new URL('../src/components/chat/BookingChatPanel.tsx', import.meta.url), 'utf8')
}

test('BookingChatPanel exposes the booking support chat API surface', async () => {
  const source = await readPanelSource()
  const { diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  })

  assert.deepEqual(diagnostics?.map(diagnostic => diagnostic.messageText) ?? [], [])
  assert.match(source, /export function BookingChatPanel/)
  assert.match(source, /interface BookingChatPanelProps/)

  for (const requiredToken of [
    'canOpenBookingChat',
    'useBookingChatThread',
    'useBookingChatMessages',
    'useSendBookingChatMessage',
    'useMarkBookingChatRead',
    'useResolveBookingChatThread',
    'useReopenBookingChatThread',
    'Chat opens after this booking is confirmed and paid.',
    'Mark Resolved',
    'Reopen',
  ]) {
    assert.match(source, new RegExp(requiredToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('admin thread actions require a staff viewer', async () => {
  const source = await readPanelSource()

  assert.match(
    source,
    /const\s+canManageThread\s*=\s*viewer\s*===\s*['"]STAFF['"]/,
    'expected a staff-only management guard',
  )
  assert.match(
    source,
    /\{canManageThread\s*&&\s*thread\s*&&/,
    'expected resolve/reopen controls to use the staff-only guard',
  )
})

test('draft is cleared when the reservation changes', async () => {
  const source = await readPanelSource()

  assert.match(
    source,
    /useEffect\(\(\)\s*=>\s*\{\s*setDraft\(['"]{2}\)\s*\},\s*\[reservationId\]\)/s,
    'expected reservationId-keyed draft reset effect',
  )
})

test('message textarea has an accessible label', async () => {
  const source = await readPanelSource()

  assert.match(source, /aria-label=['"]Booking chat message['"]/, 'expected textarea aria-label')
})
