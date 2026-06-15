import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function readReservationListSource() {
  return readFile(new URL('../src/customer/reservations/ReservationBookingsList.tsx', import.meta.url), 'utf8')
}

async function readReservationDetailSource() {
  return readFile(new URL('../src/customer/reservations/$reservationId.tsx', import.meta.url), 'utf8')
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

test('reservation bookings list exposes customer booking chat entry points', async () => {
  const source = await readReservationListSource()

  assertTranspiles(source)
  assert.match(source, /import\s+\{[^}]*canOpenBookingChat[^}]*useBookingChatThreads[^}]*\}\s+from\s+['"]@glee\/api['"]/s)
  assert.match(source, /import\s+\{[^}]*MessageCircle[^}]*\}\s+from\s+['"]lucide-react['"]/s)
  assert.match(source, /const\s+\{\s*data:\s*chatThreads\s*=\s*\[\]\s*\}\s*=\s*useBookingChatThreads\(\)/)
  assert.match(source, /chatThreads\.find\(\s*thread\s*=>\s*thread\.reservationId\s*===\s*reservation\.id\s*\)/)
  assert.match(source, /unreadForCustomer/)
  assert.match(source, /canOpenBookingChat\(reservation\)/)
  assert.match(source, /navigate\(`\/app\/reservations\/detail\/\$\{reservation\.id\}#chat`\)/)
  assert.match(source, /unread\s*>\s*9\s*\?\s*['"]9\+['"]\s*:\s*unread/)
})

test('customer reservation detail renders the customer booking chat panel', async () => {
  const source = await readReservationDetailSource()

  assertTranspiles(source)
  assert.match(source, /import\s+\{[^}]*useEffect[^}]*\}\s+from\s+['"]react['"]/s)
  assert.match(source, /import\s+\{[^}]*useLocation[^}]*\}\s+from\s+['"]react-router-dom['"]/s)
  assert.match(source, /location\.hash\s*===\s*['"]#chat['"]/)
  assert.match(source, /document\.getElementById\(['"]chat['"]\)/)
  assert.match(source, /\.scrollIntoView\(/)
  assert.match(source, /import\s+\{\s*BookingChatPanel\s*\}\s+from\s+['"]\.\.\/\.\.\/components\/chat\/BookingChatPanel['"]/)
  assert.match(source, /<div\s+id=['"]chat['"]>/)
  assert.match(source, /<BookingChatPanel[\s\S]*reservation=\{reservation\}[\s\S]*viewer=['"]CUSTOMER['"][\s\S]*viewerName=\{reservation\.user\?\.name\s*\?\?\s*reservation\.guestName\s*\?\?\s*['"]Customer['"]\}[\s\S]*tone=['"]customer['"][\s\S]*\/>/)
})
