import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function readAppSource() {
  return readFile(new URL('../src/app/App.tsx', import.meta.url), 'utf8')
}

async function readInboxSource() {
  return readFile(new URL('../src/routes/booking-chats/index.tsx', import.meta.url), 'utf8')
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

test('App registers the admin booking chat inbox route with reservation roles', async () => {
  const source = await readAppSource()

  assertTranspiles(source)
  assert.match(source, /const\s+BookingChatsPage\s*=\s*lazy\(\(\)\s*=>\s*import\(['"]\.\.\/routes\/booking-chats\/index['"]\)\)/)
  assert.match(source, /path=['"]\/dashboard\/booking-chats['"][\s\S]*<ProtectedRoute\s+roles=\{RESERVATION_ROLES\}>[\s\S]*<BookingChatsPage\s*\/>/)
})

test('admin booking chat inbox wires reservations, threads, filters, and staff panel', async () => {
  const source = await readInboxSource()

  assertTranspiles(source)
  assert.match(source, /import\s+\{[^}]*canOpenBookingChat[^}]*useAdminReservations[^}]*useBookingChatThreads[^}]*\}\s+from\s+['"]@glee\/api['"]/s)
  assert.match(source, /import\s+\{\s*BookingChatPanel\s*\}\s+from\s+['"]\.\.\/\.\.\/components\/chat\/BookingChatPanel['"]/)
  assert.match(source, /useSearchParams\(\)/)
  assert.match(source, /useAdminReservations\(\{\s*page:\s*1,\s*limit:\s*100\s*\}\)/)
  assert.match(source, /useBookingChatThreads\(\)/)
  assert.match(source, /canOpenBookingChat\(reservation\)/)
  assert.match(source, /type\s+ChatStatusFilter\s*=\s*['"]OPEN['"]\s*\|\s*['"]RESOLVED['"]\s*\|\s*['"]ALL['"]/)
  assert.match(source, /viewer=['"]STAFF['"]/)
  assert.match(source, /viewerName=\{user\.name\s*\?\?\s*['"]Venue team['"]\}/)
  assert.match(source, /tone=['"]admin['"]/)
  assert.match(source, /navigate\(`\/dashboard\/reservations\/\$\{selected\.reservation\.id\}`\)/)
})

test('admin booking chat inbox preserves URL preselect outside active filters', async () => {
  const source = await readInboxSource()

  assertTranspiles(source)
  assert.match(source, /const\s+requestedReservationId\s*=\s*searchParams\.get\(['"]reservationId['"]\)/)
  assert.match(source, /const\s+selectedRow\s*=\s*selectedReservationId\s*\?\s*rows\.find\(row\s*=>\s*row\.reservation\.id\s*===\s*selectedReservationId\)\s*\?\?\s*null\s*:\s*null/)
  assert.match(source, /const\s+fallbackSelectedRow\s*=\s*!selectedReservationId\s*\?\s*filteredRows\[0\]\s*\?\?\s*null\s*:\s*null/)
  assert.match(source, /const\s+selected\s*=\s*selectedRow\s*\?\?\s*fallbackSelectedRow/)
  assert.doesNotMatch(source, /const\s+selected\s*=\s*filteredRows\.find/)
  assert.match(source, /if\s*\(\s*selectedRow\s*\)\s*return/)
  assert.match(source, /filteredRows\.length\s*===\s*0\s*&&\s*!selected\s*\?/)
})
