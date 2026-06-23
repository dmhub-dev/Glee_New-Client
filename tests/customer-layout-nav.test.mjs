import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function readCustomerLayoutSource() {
  return readFile(new URL('../src/customer/CustomerLayout.tsx', import.meta.url), 'utf8')
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

test('customer bottom nav remains visible on booking tickets and booking chat', async () => {
  const source = await readCustomerLayoutSource()

  assertTranspiles(source)
  assert.match(source, /const\s+isReservationBookingDetail\s*=\s*location\.pathname\.startsWith\(['"]\/app\/reservations\/detail\/['"]\)/)
  assert.match(source, /const\s+isReservationVenueDetail\s*=\s*location\.pathname\.startsWith\(['"]\/app\/reservations\/['"]\)\s*&&\s*!isReservationBookingDetail/)
  assert.match(source, /const\s+hideNav\s*=\s*isEventDetail\s*\|\|\s*isReservationVenueDetail/)
  assert.doesNotMatch(source, /const\s+isReservationDetail\s*=\s*location\.pathname\.startsWith\(['"]\/app\/reservations\/['"]\)/)
})

test('tickets tab is active for ticket detail, event chat, booking ticket, and booking chat routes', async () => {
  const source = await readCustomerLayoutSource()

  assertTranspiles(source)
  assert.match(source, /label:\s*['"]Tickets['"][\s\S]*isActive:\s*\(pathname:\s*string\)\s*=>[\s\S]*pathname\s*===\s*['"]\/app\/tickets['"]/)
  assert.match(source, /label:\s*['"]Tickets['"][\s\S]*pathname\.startsWith\(['"]\/app\/tickets\/['"]\)/)
  assert.match(source, /label:\s*['"]Tickets['"][\s\S]*pathname\.startsWith\(['"]\/app\/reservations\/detail\/['"]\)/)
  assert.match(source, /label:\s*['"]Tickets['"][\s\S]*\/\^\\\/app\\\/events\\\/\[\^\/]\+\\\/chat\$\/\.test\(pathname\)/)
})

test('explore tab does not stay active on event chat screens', async () => {
  const source = await readCustomerLayoutSource()

  assertTranspiles(source)
  assert.match(source, /label:\s*['"]Explore['"][\s\S]*isActive:\s*\(pathname:\s*string\)\s*=>[\s\S]*pathname\.startsWith\(['"]\/app\/events\/['"]\)\s*&&\s*!pathname\.endsWith\(['"]\/chat['"]\)/)
  assert.match(source, /const\s+active\s*=\s*item\.isActive\s*\?\s*item\.isActive\(location\.pathname\)\s*:\s*isActive/)
})
