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
  const source = await readFile(new URL('../src/routes/menu-pricing/index.tsx', import.meta.url), 'utf8')

  assert.match(source, /useLocations\(/)
  assert.match(source, /useLocationMenuItems\(/)
  assert.match(source, /useCreateLocationMenuItem\(/)
  assert.match(source, /useUpdateLocationMenuItem\(/)
  assert.match(source, /Venue Menu Items/)
})

test('menu pricing page handles venue menu item toggle failures and pending state', async () => {
  const source = await readFile(new URL('../src/routes/menu-pricing/index.tsx', import.meta.url), 'utf8')

  assert.match(source, /try\s*\{[\s\S]*updateLocationMenuItem\.mutateAsync/)
  assert.match(source, /catch\s*\(\s*error\s*\)\s*\{[\s\S]*variant:\s*'destructive'/)
  assert.match(source, /updateLocationMenuItem\.isPending/)
  assert.match(source, /disabled=\{[^}]*updateLocationMenuItem\.isPending/)
})
