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
