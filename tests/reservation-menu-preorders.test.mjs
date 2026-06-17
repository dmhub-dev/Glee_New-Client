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

async function loadStandaloneReservationSource() {
  return readFile(new URL('../src/customer/reservations/$locationId.tsx', import.meta.url), 'utf8')
}

async function loadEventReservationPanelSource() {
  return readFile(new URL('../src/customer/events/EventReservationPanel.tsx', import.meta.url), 'utf8')
}

async function loadCustomerEventSource() {
  return readFile(new URL('../src/customer/events/$eventId.tsx', import.meta.url), 'utf8')
}

async function loadPublicEventSource() {
  return readFile(new URL('../src/public/routes/events/$eventId.tsx', import.meta.url), 'utf8')
}

async function loadCustomerReservationDetailSource() {
  return readFile(new URL('../src/customer/reservations/$reservationId.tsx', import.meta.url), 'utf8')
}

async function loadPublicReservationDetailSource() {
  return readFile(new URL('../src/public/routes/reservations/$token.tsx', import.meta.url), 'utf8')
}

async function loadAdminReservationDetailSource() {
  return readFile(new URL('../src/routes/reservations/$reservationId.tsx', import.meta.url), 'utf8')
}

async function loadAdminReservationsListSource() {
  return readFile(new URL('../src/routes/reservations/index.tsx', import.meta.url), 'utf8')
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

test('standalone venue booking wires menu preorder helpers and sends preOrderMenu', async () => {
  const source = await loadStandaloneReservationSource()
  const handler = extractFunctionSource(source, 'handleReserve')

  assert.match(source, /selectedReservationMenuRows/)
  assert.match(source, /reservationMenuPayload/)
  assert.match(source, /reservationMenuTotal/)
  assert.match(source, /reservationDueNow/)
  assert.match(source, /venue\?\.menuItems/)
  assert.match(source, /Food & drink pre-order/)
  assert.match(source, /Saved for the venue, not charged now/)
  assert.match(handler, /preOrderMenu:\s*[^,\n]+/)
  assert.doesNotMatch(handler, /menuItems:\s*[^,\n]+/)
})

test('standalone venue booking keeps only active menu items and sends preOrderMenu only', async () => {
  const source = await loadStandaloneReservationSource()
  const handler = extractFunctionSource(source, 'handleReserve')
  const menuItemsDeclaration = source.slice(source.indexOf('const menuItems = useMemo'))

  assert.match(menuItemsDeclaration, /\.filter\(\s*item\s*=>\s*item\.isActive\s*\)/)
  assert.match(handler, /preOrderMenu:\s*selectedMenuRows\.length\s*\?\s*reservationMenuPayload\(selectedMenuRows\)\s*:\s*undefined/)
  assert.doesNotMatch(handler, /\bmenuItems:\s*/)
})

test('standalone venue booking normalizes menu item prices with a finite guard', async () => {
  const source = await loadStandaloneReservationSource()
  const menuItemsDeclaration = source.slice(source.indexOf('const menuItems = useMemo'), source.indexOf('const selectedMenuRows = useMemo'))

  assert.match(menuItemsDeclaration, /Number\.isFinite\(/)
  assert.match(menuItemsDeclaration, /Math\.max\(\s*0\s*,/)
})

test('standalone venue booking menu quantity buttons have item-specific accessible names', async () => {
  const source = await loadStandaloneReservationSource()

  assert.match(source, /aria-label=\{`Decrease \$\{item\.name\} quantity`\}/)
  assert.match(source, /aria-label=\{`Increase \$\{item\.name\} quantity`\}/)
})

test('standalone venue booking checkout keeps backdrop behind guest form', async () => {
  const source = await loadStandaloneReservationSource()
  const checkoutOverlay = source.slice(
    source.indexOf('{checkoutOpen && selectedCategory &&'),
    source.indexOf('{venue.bookingRules &&'),
  )

  assert.match(checkoutOverlay, /aria-label=["']Close checkout["'][\s\S]*className=["']absolute inset-0 z-0["']/)
  assert.match(checkoutOverlay, /className=["']relative z-10[\s\S]*max-w-2xl/)
  assert.ok(
    checkoutOverlay.indexOf('className="absolute inset-0 z-0"') < checkoutOverlay.indexOf('className="relative z-10'),
    'backdrop should render before the raised checkout panel',
  )
  assert.match(checkoutOverlay, /value=\{guestName\}[\s\S]*onChange=\{event => setGuestName/)
  assert.match(checkoutOverlay, /value=\{guestEmail\}[\s\S]*onChange=\{event => setGuestEmail/)
  assert.match(checkoutOverlay, /value=\{guestPhone\}[\s\S]*onChange=\{event => setGuestPhone/)
})

test('event reservation panel accepts menu items and sends selected preOrderMenu', async () => {
  const source = await loadEventReservationPanelSource()
  const handler = extractNamedFunctionSource(source, 'EventReservationPanel')
  const reserveTable = source.slice(source.indexOf('async function reserveTable'))

  assert.match(source, /type\s+ReservationMenuSelectableItem/)
  assert.match(handler, /menuItems/)
  assert.match(source, /selectedReservationMenuRows/)
  assert.match(source, /reservationMenuPayload/)
  assert.match(source, /reservationMenuTotal/)
  assert.match(source, /reservationDueNow/)
  assert.match(source, /Food & drink pre-order/)
  assert.match(source, /Saved for the venue, not charged now/)
  assert.match(reserveTable, /preOrderMenu:\s*[^,\n]+/)
  assert.doesNotMatch(reserveTable, /menuItems:\s*[^,\n]+/)
})

test('event reservation panel menu quantity buttons have item-specific accessible names', async () => {
  const source = await loadEventReservationPanelSource()

  assert.match(source, /aria-label=\{`Decrease \$\{item\.name\} quantity`\}/)
  assert.match(source, /aria-label=\{`Increase \$\{item\.name\} quantity`\}/)
})

test('customer and public event pages pass event menu items to reservation panel', async () => {
  const customerSource = await loadCustomerEventSource()
  const publicSource = await loadPublicEventSource()

  assert.match(customerSource, /<EventReservationPanel\s+eventId=\{event\.id\}\s+menuItems=\{event\.menuItems\}/)
  assert.match(publicSource, /<EventReservationPanel\s+eventId=\{event\.id\}\s+menuItems=\{event\.menuItems\}/)
})

test('reservation detail pages render saved preorder snapshots with customer-facing copy', async () => {
  const customerSource = await loadCustomerReservationDetailSource()
  const publicSource = await loadPublicReservationDetailSource()

  for (const source of [customerSource, publicSource]) {
    assert.match(source, /normalizedReservationPreOrderMenu/)
    assert.match(source, /reservation\.preOrderMenu/)
    assert.match(source, /Food & drink pre-order/)
    assert.match(source, /Saved for the venue, not charged during table checkout\./)
    assert.match(source, /preOrderTotal/)
    assert.match(source, /lineTotal/)
    assert.match(source, /quantity/)
  }
})

test('admin reservation detail renders saved preorder snapshots for fulfillment', async () => {
  const source = await loadAdminReservationDetailSource()

  assert.match(source, /normalizedReservationPreOrderMenu/)
  assert.match(source, /reservation\.preOrderMenu/)
  assert.match(source, /Venue pre-order/)
  assert.match(source, /Saved for the venue team/)
  assert.match(source, /preOrderTotal/)
  assert.match(source, /lineTotal/)
  assert.match(source, /quantity/)
})

test('admin reservations list shows compact preorder indicators', async () => {
  const source = await loadAdminReservationsListSource()

  assert.match(source, /normalizedReservationPreOrderMenu/)
  assert.match(source, /reservation\.preOrderMenu/)
  assert.match(source, /Pre-order/)
  assert.match(source, /preOrderTotal/)
  assert.match(source, /preOrderCount/)
})
