import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function readSource(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

function loadModule(source, path) {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path,
  }).outputText

  const module = { exports: {} }
  const evaluate = new Function('exports', 'module', output)
  evaluate(module.exports, module)
  return module.exports
}

test('event attendee export utilities build rows and downloadable files', async () => {
  const source = await readSource('src/routes/events/eventAttendeeExport.ts')
  const module = loadModule(source, 'eventAttendeeExport.ts')
  const ticket = {
    id: 'ticket-1',
    eventId: 'event-1',
    userId: null,
    quantity: 2,
    totalPrice: '6000',
    amountPaid: '3000',
    outstandingAmount: '3000',
    createdAt: '2026-06-17T10:00:00.000Z',
    guestName: 'Nesh Calvin',
    guestEmail: 'nesh@example.com',
    guestPhone: '0712345678',
    user: null,
    payment: {
      paymentMethod: 'PAYSTACK',
      isPaid: false,
      totalPrice: '6000',
    },
    ticketCategory: {
      id: 'vip',
      name: 'VIP',
      price: '3000',
    },
    tableBooking: {
      tableCategory: 'VIP Booth',
      guestCount: 6,
      status: 'PENDING',
      depositAmount: 3000,
      minimumSpend: 15000,
    },
  }

  const rows = module.buildAttendeeExportRows([ticket])

  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0], {
    name: 'Nesh Calvin',
    email: 'nesh@example.com',
    phone: '0712345678',
    tickets: '2',
    ticketTier: 'VIP',
    tableBooking: 'VIP Booth, 6 guests, PENDING, deposit KES 3,000, min spend KES 15,000',
    paymentMethod: 'PAYSTACK',
    paymentStatus: 'Outstanding KES 3,000',
    amountPaid: 'KES 3,000',
    purchasedAt: '17 Jun 2026',
  })

  const excelHtml = module.buildAttendeeExcelHtml('Neon Nights', rows, new Date('2026-06-17T12:00:00.000Z'))
  assert.match(excelHtml, /Neon Nights/)
  assert.match(excelHtml, /Nesh Calvin/)
  assert.match(excelHtml, /Table booking/)
  assert.match(excelHtml, /Glee/)
  assert.match(excelHtml, /glee-logo-final\.svg/)

  assert.equal(module.attendeeExportFilename('Neon Nights: VIP/Launch', 'pdf'), 'neon-nights-vip-launch-attendees.pdf')
})

test('event attendee PDF export uses a plain document layout with only the Glee logo branded', async () => {
  const source = await readSource('src/routes/events/eventAttendeeExport.ts')

  assert.match(source, /await import\('jspdf'\)/)
  assert.match(source, /loadGleeLogoDataUrl/)
  assert.match(source, /loadGleeLogoSvgText/)
  assert.match(source, /addSvgAsImage/)
  assert.match(source, /Glee/)
  assert.match(source, /Event attendee report/)
  assert.match(source, /setTextColor\(0,\s*0,\s*0\)/)
  assert.match(source, /setTextColor\(90,\s*90,\s*90\)/)
  assert.match(source, /setDrawColor\(210,\s*210,\s*210\)/)
  assert.match(source, /return response\.text\(\)/)
  assert.doesNotMatch(source, /#10101d/)
  assert.doesNotMatch(source, /#111827/)
  assert.doesNotMatch(source, /#555/)
  assert.doesNotMatch(source, /#999/)
  assert.doesNotMatch(source, /logo-black/)
  assert.doesNotMatch(source, /doc\.setFillColor/)
  assert.doesNotMatch(source, /rect\(x,\s*startY,\s*column\.width,\s*height,\s*'F'\)/)
  assert.doesNotMatch(source, /setFillColor\(255,\s*232,\s*244\)/)
  assert.doesNotMatch(source, /setTextColor\(219,\s*39,\s*119\)/)
  assert.doesNotMatch(source, /setTextColor\(244,\s*114,\s*182\)/)
  assert.doesNotMatch(source, /setDrawColor\(249,\s*168,\s*212\)/)
  assert.doesNotMatch(source, /setDrawColor\(255,\s*182,\s*213\)/)
  assert.doesNotMatch(source, /setFillColor\(16,\s*16,\s*29\)/)
  assert.doesNotMatch(source, /setTextColor\(31,\s*41,\s*55\)/)
  assert.doesNotMatch(source, /setTextColor\(75,\s*85,\s*99\)/)
  assert.doesNotMatch(source, /setTextColor\(104,\s*112,\s*128\)/)
  assert.doesNotMatch(source, /setDrawColor\(225,\s*228,\s*235\)/)
  assert.doesNotMatch(source, /setTextColor\(255,\s*255,\s*255\)/)
  assert.doesNotMatch(source, /roundedRect\(options\.margin/)
})

test('event attendees page exposes an export choice and confirmation flow', async () => {
  const source = await readSource('src/routes/events/EventAttendees.tsx')

  assert.match(source, /Export attendees/)
  assert.match(source, /Choose export format/)
  assert.match(source, /Confirm export/)
  assert.match(source, /getAdminEventTickets/)
  assert.match(source, /loadTicketsForExport/)
  assert.match(source, /downloadAttendeePdf/)
  assert.match(source, /downloadAttendeeExcel/)
})
