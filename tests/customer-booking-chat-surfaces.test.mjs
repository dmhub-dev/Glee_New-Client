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

async function readReservationChatSource() {
  return readFile(new URL('../src/customer/reservations/ReservationChat.tsx', import.meta.url), 'utf8')
}

async function readEventChatSource() {
  return readFile(new URL('../src/customer/events/EventChat.tsx', import.meta.url), 'utf8')
}

async function readAppSource() {
  return readFile(new URL('../src/app/App.tsx', import.meta.url), 'utf8')
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
  assert.match(source, /navigate\(`\/app\/reservations\/detail\/\$\{reservation\.id\}\/chat`\)/)
  assert.match(source, /unread\s*>\s*9\s*\?\s*['"]9\+['"]\s*:\s*unread/)
})

test('customer reservation detail routes booking chat to a dedicated screen', async () => {
  const source = await readReservationDetailSource()

  assertTranspiles(source)
  assert.match(source, /navigate\(`\/app\/reservations\/detail\/\$\{reservation\.id\}\/chat`\)/)
  assert.doesNotMatch(source, /useLocation/)
  assert.doesNotMatch(source, /location\.hash\s*===\s*['"]#chat['"]/)
  assert.doesNotMatch(source, /document\.getElementById\(['"]chat['"]\)/)
  assert.doesNotMatch(source, /import\s+\{\s*BookingChatPanel\s*\}/)
  assert.doesNotMatch(source, /<BookingChatPanel/)
})

test('customer reservation chat screen renders the customer booking chat panel', async () => {
  const source = await readReservationChatSource()

  assertTranspiles(source)
  assert.doesNotMatch(source, /import\s+\{[^}]*Button[^}]*\}\s+from\s+['"]@glee\/ui['"]/s)
  assert.doesNotMatch(source, /import\s+\{[^}]*ArrowLeft[^}]*\}\s+from\s+['"]lucide-react['"]/s)
  assert.match(source, /<div className=['"]flex h-\[100dvh\] flex-col lg:h-\[calc\(100vh-0px\)\]['"]>/)
  assert.match(source, /import\s+\{\s*BookingChatPanel\s*\}\s+from\s+['"]\.\.\/\.\.\/components\/chat\/BookingChatPanel['"]/)
  assert.match(source, /<BookingChatPanel[\s\S]*reservation=\{reservation\}[\s\S]*viewer=['"]CUSTOMER['"][\s\S]*viewerName=\{reservation\?\.user\?\.name\s*\?\?\s*reservation\?\.guestName\s*\?\?\s*['"]Customer['"]\}[\s\S]*tone=['"]customer['"][\s\S]*className=['"]flex-1 overflow-hidden['"][\s\S]*\/>/)
  assert.match(source, /onBack=\{\(\)\s*=>\s*navigate\(['"]\/app\/tickets\?tab=reservations['"]\)\}/)
})

test('app registers the dedicated customer booking chat route', async () => {
  const source = await readAppSource()

  assertTranspiles(source)
  assert.match(source, /const\s+CustomerReservationChatPage\s*=\s*lazy\(\(\)\s*=>\s*import\(['"]\.\.\/customer\/reservations\/ReservationChat['"]\)\)/)
  assert.match(source, /path=['"]\/app\/reservations\/detail\/:reservationId\/chat['"][\s\S]*<ProtectedRoute roles=\{CUSTOMER_ROLES\}><CustomerReservationChatPage \/><\/ProtectedRoute>/)
})

test('customer booking ticket uses the event ticket mobile pass pattern', async () => {
  const source = await readReservationDetailSource()

  assertTranspiles(source)
  assert.match(source, /import\s+\{[^}]*ArrowLeft[^}]*\}\s+from\s+['"]lucide-react['"]/s)
  assert.match(source, /import\s+\{[^}]*QrCode[^}]*\}\s+from\s+['"]lucide-react['"]/s)
  assert.match(source, /import\s+\{[^}]*MessageCircle[^}]*\}\s+from\s+['"]lucide-react['"]/s)
  assert.match(source, /className=["']mx-auto w-full max-w-6xl px-3 pb-24 pt-5 sm:px-4 sm:pt-6 lg:px-8["']/)
  assert.match(source, /rounded-\[28px\][^"']*border-white\/12[^"']*bg-white\/\[0\.08\][^"']*p-4[^"']*sm:p-5/)
  assert.match(source, /Booking ticket/)
  assert.match(source, /w-full overflow-hidden rounded-2xl bg-white text-black shadow/)
  assert.match(source, /relative flex h-6 items-center bg-white px-3/)
  assert.match(source, /border-t-2 border-dashed border-slate-200/)
  assert.match(source, /lg:grid-cols-\[minmax\(0,360px\)_1fr\]/)
  assert.match(source, /text-2xl[^"']*sm:text-4xl/)
  assert.match(source, /navigate\('\/app\/tickets\?tab=reservations'\)/)
})

test('customer booking ticket exposes cancellation at the top without lower-page duplicate form', async () => {
  const source = await readReservationDetailSource()

  assertTranspiles(source)
  assert.match(source, /Dialog/)
  assert.match(source, /Cancel Booking/)
  assert.match(source, /setCancelOpen\(true\)/)
  assert.match(source, /<Dialog open=\{cancelOpen\} onOpenChange=\{setCancelOpen\}>/)
  assert.match(source, /placeholder=['"]Reason for cancellation/)
  assert.doesNotMatch(source, /Plans changed\?/)
  assert.doesNotMatch(source, /Cancel Reservation/)
})

test('customer event chat back action returns to tickets list', async () => {
  const source = await readEventChatSource()

  assertTranspiles(source)
  assert.match(source, /onBack=\{\(\)\s*=>\s*navigate\(['"]\/app\/tickets['"]\)\}/)
  assert.doesNotMatch(source, /onBack=\{\(\)\s*=>\s*navigate\(`\/app\/events\/\$\{eventId/)
})
