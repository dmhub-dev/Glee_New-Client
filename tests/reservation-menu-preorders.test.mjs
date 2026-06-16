import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadReservationMenuUtils() {
  const source = await readFile(new URL('../src/components/reservations/reservationMenuUtils.ts', import.meta.url), 'utf8')
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

async function loadMenuPricingSource() {
  return readFile(new URL('../src/routes/menu-pricing/index.tsx', import.meta.url), 'utf8')
}

function extractFunctionSource(source, name) {
  const start = source.indexOf(`async function ${name}`)
  assert.notEqual(start, -1, `${name} should exist`)

  const bodyStart = source.indexOf('{', start)
  assert.notEqual(bodyStart, -1, `${name} should have a body`)

  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(start, index + 1)
  }

  assert.fail(`${name} should have a complete body`)
}

function extractNamedFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}`)
  assert.notEqual(start, -1, `${name} should exist`)

  const bodyStart = source.indexOf('{', start)
  assert.notEqual(bodyStart, -1, `${name} should have a body`)

  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(start, index + 1)
  }

  assert.fail(`${name} should have a complete body`)
}

test('selectedReservationMenuRows keeps only positive quantities', async () => {
  const { selectedReservationMenuRows } = await loadReservationMenuUtils()
  const rows = selectedReservationMenuRows(
    [
      { id: 'menu-1', name: 'Mocktail', category: 'drink', price: 800 },
      { id: 'menu-2', name: 'Chicken platter', category: 'food', price: 3500 },
    ],
    { 'menu-1': 2, 'menu-2': 0 },
  )

  assert.deepEqual(rows, [
    {
      item: { id: 'menu-1', name: 'Mocktail', category: 'drink', price: 800 },
      quantity: 2,
      lineTotal: 1600,
    },
  ])
})

test('reservationMenuPayload maps selected rows to backend item ids and quantities', async () => {
  const { reservationMenuPayload } = await loadReservationMenuUtils()

  assert.deepEqual(
    reservationMenuPayload([
      {
        item: { id: 'menu-1', name: 'Mocktail', category: 'drink', price: 800 },
        quantity: 3,
        lineTotal: 2400,
      },
    ]),
    [{ id: 'menu-1', quantity: 3 }],
  )
})

test('reservationMenuTotal is informational and separate from deposit due now', async () => {
  const { reservationMenuTotal, reservationDueNow } = await loadReservationMenuUtils()

  const rows = [
    {
      item: { id: 'menu-1', name: 'Mocktail', category: 'drink', price: 800 },
      quantity: 3,
      lineTotal: 2400,
    },
  ]

  assert.equal(reservationMenuTotal(rows), 2400)
  assert.equal(reservationDueNow({ depositAmount: 5000, selectedMenuRows: rows }), 5000)
})

test('reservationDueNow treats invalid deposits as zero and ignores menu totals', async () => {
  const { reservationDueNow } = await loadReservationMenuUtils()

  const rows = [
    {
      item: { id: 'menu-1', name: 'Mocktail', category: 'drink', price: 800 },
      quantity: 3,
      lineTotal: 2400,
    },
  ]

  assert.equal(reservationDueNow({ depositAmount: 'bad', selectedMenuRows: rows }), 0)
  assert.equal(reservationDueNow({ depositAmount: -500, selectedMenuRows: rows }), 0)
})

test('normalizedReservationPreOrderMenu accepts stored snapshot arrays only', async () => {
  const { normalizedReservationPreOrderMenu } = await loadReservationMenuUtils()

  assert.deepEqual(
    normalizedReservationPreOrderMenu([
      { id: 'menu-1', name: 'Mocktail', category: 'drink', price: '800', quantity: 2, lineTotal: '1600' },
    ]),
    [{ id: 'menu-1', name: 'Mocktail', category: 'drink', price: 800, quantity: 2, lineTotal: 1600 }],
  )
  assert.deepEqual(normalizedReservationPreOrderMenu(null), [])
})

test('normalizedReservationPreOrderMenu rejects invalid quantities and keeps finite money values', async () => {
  const { normalizedReservationPreOrderMenu } = await loadReservationMenuUtils()

  assert.deepEqual(
    normalizedReservationPreOrderMenu([{ name: 'Mocktail', quantity: 'bad', price: 'bad', lineTotal: 'bad' }]),
    [],
  )

  assert.deepEqual(
    normalizedReservationPreOrderMenu([{ name: 'Mocktail', quantity: 2, price: 'bad', lineTotal: 'bad' }]),
    [{ name: 'Mocktail', price: 0, quantity: 2, lineTotal: 0 }],
  )
})

test('location menu mutations invalidate venue list caches', async () => {
  const source = await readFile(new URL('../src/api/queries/reservations.ts', import.meta.url), 'utf8')

  assert.match(source, /venuesRoot:\s*\['reservations',\s*'venues'\]\s+as const/)
  assert.match(source, /venues:\s*\(filters\?: ReservationVenuesFilters\)\s*=>\s*\[\.\.\.reservationKeys\.venuesRoot,\s*filters \?\? \{\}\]\s+as const/)
  assert.equal((source.match(/invalidateQueries\(\{\s*queryKey:\s*reservationKeys\.venuesRoot\s*\}\)/g) ?? []).length, 2)
})

test('menu pricing page manages location menu items alongside event menu items', async () => {
  const source = await loadMenuPricingSource()

  assert.match(source, /useLocations\(/)
  assert.match(source, /useLocationMenuItems\(/)
  assert.match(source, /useCreateLocationMenuItem\(/)
  assert.match(source, /useUpdateLocationMenuItem\(/)
  assert.match(source, /Venue Menu Items/)
})

test('menu pricing page handles venue menu item toggle failures and pending state', async () => {
  const source = await loadMenuPricingSource()
  const handler = extractFunctionSource(source, 'handleToggleLocationMenuItem')

  assert.match(handler, /if\s*\(\s*!selectedLocation\s*\|\|\s*updateLocationMenuItem\.isPending\s*\)\s*return/)
  assert.match(handler, /try\s*\{[\s\S]*updateLocationMenuItem\.mutateAsync/)
  assert.match(handler, /catch\s*\(\s*error\s*\)\s*\{[\s\S]*variant:\s*'destructive'/)
  assert.match(source, /disabled=\{[^}]*updateLocationMenuItem\.isPending/)
})

test('menu pricing page blocks duplicate venue menu item creates in the handler', async () => {
  const source = await loadMenuPricingSource()
  const handler = extractFunctionSource(source, 'handleCreateLocationMenuItem')

  assert.match(handler, /createLocationMenuItem\.isPending/)
  assert.match(source, /useRef\(\s*false\s*\)/)
  assert.match(handler, /if\s*\(\s*(?:createLocationMenuItem\.isPending\s*\|\|\s*)?[A-Za-z_$][\w$]*\.current\s*\)\s*return/)
  assert.match(handler, /[A-Za-z_$][\w$]*\.current\s*=\s*true[\s\S]*createLocationMenuItem\.mutateAsync/)
  assert.match(handler, /finally\s*\{[\s\S]*[A-Za-z_$][\w$]*\.current\s*=\s*false[\s\S]*\}/)
  assert.ok(
    handler.indexOf('createLocationMenuItem.isPending') < handler.indexOf('createLocationMenuItem.mutateAsync'),
    'pending guard should run before the create mutation',
  )
  assert.ok(
    handler.search(/[A-Za-z_$][\w$]*\.current\s*=\s*true/) < handler.indexOf('createLocationMenuItem.mutateAsync'),
    'synchronous guard should be set before the create mutation',
  )
})

test('menu pricing page gives venue menu toggle buttons item-specific accessible names', async () => {
  const source = await loadMenuPricingSource()

  assert.match(source, /aria-label=\{`\$\{item\.isActive \? 'Deactivate' : 'Activate'\}\s+\$\{item\.name\}`\}/)
})

test('menu pricing page renders malformed money values as zero', async () => {
  const source = await loadMenuPricingSource()
  const money = extractNamedFunctionSource(source, 'money')

  assert.match(money, /Number\.isFinite\(/)
  assert.match(money, /Math\.max\(\s*0\s*,/)
})

test('menu pricing page requires finite positive venue menu item prices', async () => {
  const source = await loadMenuPricingSource()
  const handler = extractFunctionSource(source, 'handleCreateLocationMenuItem')
  const priceDeclaration = handler.match(/const\s+([A-Za-z_$][\w$]*)\s*=\s*Number\(\s*menuForm\.price\s*\)/)

  assert.ok(priceDeclaration, 'price should be parsed once before validation')
  const priceIdentifier = priceDeclaration[1]
  assert.match(handler, new RegExp(`Number\\.isFinite\\(\\s*${priceIdentifier}\\s*\\)`))
  assert.match(handler, new RegExp(`${priceIdentifier}\\s*<=\\s*0`))
  assert.match(handler, new RegExp(`(?:price:\\s*${priceIdentifier}\\b|\\b${priceIdentifier},)`))
})
