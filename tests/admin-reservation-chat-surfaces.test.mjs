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

test('admin reservations list exposes staff booking chat entry points', async () => {
  const source = await readReservationListSource()

  assertTranspiles(source)
  assert.match(source, /import\s+\{[^}]*canOpenBookingChat[^}]*useAdminReservations[^}]*useBookingChatThreads[^}]*\}\s+from\s+['"]@glee\/api['"]/s)
  assert.match(source, /import\s+\{[^}]*MessageCircle[^}]*\}\s+from\s+['"]lucide-react['"]/s)
  assert.match(source, /const\s+\{\s*data:\s*chatThreads\s*=\s*\[\]\s*\}\s*=\s*useBookingChatThreads\(\)/)
  assert.match(source, /<DateGroupSection[\s\S]*chatThreads=\{chatThreads\}[\s\S]*\/>/)
  assert.match(source, /<BookingDateTable[\s\S]*chatThreads=\{chatThreads\}[\s\S]*\/>/)
  assert.match(source, /chatThreads\.find\(\s*thread\s*=>\s*thread\.reservationId\s*===\s*reservation\.id\s*\)/)
  assert.match(source, /unreadForStaff/)
  assert.match(source, /canOpenBookingChat\(reservation\)/)
  assert.match(source, /<th[^>]*>\s*Chat\s*<\/th>[\s\S]*<th[^>]*>\s*Feedback\s*<\/th>/)
  assert.match(source, /navigate\(`\/dashboard\/booking-chats\?reservationId=\$\{reservation\.id\}`\)/)
  assert.match(source, /<MessageCircle\s+className=/)
  assert.match(source, /unread\s*>\s*0\s*\?\s*`\$\{unread\}\s+unread`\s*:\s*thread\s*\?\s*statusLabel\(thread\.status\)\s*:\s*['"]Open['"]/)
})

test('admin reservation detail renders the staff booking chat panel before feedback', async () => {
  const source = await readReservationDetailSource()

  assertTranspiles(source)
  assert.match(source, /import\s+\{\s*BookingChatPanel\s*\}\s+from\s+['"]\.\.\/\.\.\/components\/chat\/BookingChatPanel['"]/)
  assert.match(source, /<BookingChatPanel[\s\S]*reservation=\{reservation\}[\s\S]*viewer=['"]STAFF['"][\s\S]*viewerName=\{user\.name\s*\?\?\s*['"]Venue team['"]\}[\s\S]*tone=['"]admin['"][\s\S]*\/>[\s\S]*Customer Feedback/)
})
