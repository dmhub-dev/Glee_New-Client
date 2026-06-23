import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function readSource(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

function assertTranspiles(source, path) {
  const { diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path,
    reportDiagnostics: true,
  })

  assert.deepEqual(diagnostics?.map(diagnostic => diagnostic.messageText) ?? [], [])
}

function literal(token) {
  return new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
}

test('ui package exports shared feedback primitives', async () => {
  const component = await readSource('src/ui/components/ui/empty-state.tsx')
  const index = await readSource('src/ui/index.ts')

  assertTranspiles(component, 'empty-state.tsx')
  assert.match(component, /export type EmptyStateVariant = 'customer' \| 'admin' \| 'danger'/)
  assert.match(component, /export interface EmptyStateProps/)
  assert.match(component, /export function EmptyState/)
  assert.match(component, /export interface LoadingPanelProps/)
  assert.match(component, /export function LoadingPanel/)
  assert.match(component, /variant = 'customer'/)
  assert.match(component, /role="status"/)
  assert.match(component, /aria-live="polite"/)
  assert.match(index, /export \* from '\.\/components\/ui\/empty-state'/)
})

test('public event grids use shared empty states with recovery actions', async () => {
  const grid = await readSource('src/public/components/events/EventGrid.tsx')
  const landing = await readSource('src/public/routes/index.tsx')
  const events = await readSource('src/public/routes/events/index.tsx')

  assertTranspiles(grid, 'EventGrid.tsx')
  assertTranspiles(landing, 'public-index.tsx')
  assertTranspiles(events, 'public-events-index.tsx')
  assert.match(grid, /import \{[^}]*EmptyState[^}]*\} from '@glee\/ui'/)
  assert.match(grid, /emptyTitle\?: string/)
  assert.match(grid, /emptyDescription\?: string/)
  assert.match(grid, /emptyAction\?: ReactNode/)
  assert.match(grid, /<EmptyState/)
  assert.match(grid, /title=\{emptyTitle/)
  assert.match(landing, /const clearFilters = \(\) => \{/)
  assert.match(landing, /const hasEventFilters = Boolean\(search \|\| categoryId \|\| statusFilter !== 'active'\)/)
  assert.match(landing, /emptyTitle=\{hasEventFilters \? 'No events match your search' : 'No active events right now'\}/)
  assert.match(events, /const clearFilters = \(\) => \{/)
  assert.match(landing, literal('No events match your search'))
  assert.match(events, literal('No events match your filters'))
  assert.match(landing, literal('Clear filters'))
  assert.match(events, literal('Clear filters'))
})

test('customer discovery uses shared loading and empty states', async () => {
  const source = await readSource('src/customer/events/index.tsx')

  assertTranspiles(source, 'customer-events-index.tsx')
  assert.match(source, /import \{[^}]*EmptyState[^}]*LoadingPanel[^}]*\} from '@glee\/ui'/)
  assert.match(source, /<LoadingPanel label="Searching events"/)
  assert.match(source, /<LoadingPanel label="Loading clubs and restaurants"/)
  assert.match(source, /<EmptyState[\s\S]*No events match your search/)
  assert.match(source, /<EmptyState[\s\S]*No clubs or restaurants match your search/)
  assert.match(source, /<EmptyState[\s\S]*No events match your filters/)
  assert.doesNotMatch(source, />Loading events\.\.\.</)
  assert.doesNotMatch(source, />No events found matching your criteria\.</)
  assert.match(source, /Clear filters/)
})

test('event detail checkout CTAs use consistent conversion copy and mobile-safe bars', async () => {
  const publicDetail = await readSource('src/public/routes/events/$eventId.tsx')
  const customerDetail = await readSource('src/customer/events/$eventId.tsx')

  assertTranspiles(publicDetail, 'public-event-detail.tsx')
  assertTranspiles(customerDetail, 'customer-event-detail.tsx')
  assert.match(publicDetail, /Continue to payment/)
  assert.match(customerDetail, /Continue to payment/)
  assert.match(publicDetail, /env\(safe-area-inset-bottom\)/)
  assert.match(customerDetail, /env\(safe-area-inset-bottom\)/)
  assert.match(publicDetail, /max-h-\[calc\(100dvh-1rem\)\]/)
  assert.match(publicDetail, /overflow-hidden/)
  assert.match(publicDetail, /overflow-y-auto/)
  assert.match(customerDetail, literal('Pay in installments'))
  assert.doesNotMatch(publicDetail, /selectedItems\.length === 0 \? 'Select a Ticket' : 'Buy Tickets'/)
  assert.doesNotMatch(customerDetail, /canPurchase \? 'Pay Now' :/)
  assert.doesNotMatch(customerDetail, literal('Pay in Installments'))
})

test('event reservation panel has directional empty states and deposit-focused CTAs', async () => {
  const source = await readSource('src/customer/events/EventReservationPanel.tsx')

  assertTranspiles(source, 'EventReservationPanel.tsx')
  assert.match(source, /import \{[^}]*EmptyState[^}]*\} from '@glee\/ui'/)
  assert.match(source, /Table reservations are not open for this event/)
  assert.match(source, /No tables for this group size/)
  assert.match(source, /Choose another slot or adjust the guest count/)
  assert.match(source, /Select a table/)
  assert.match(source, /Pay deposit/)
  assert.match(source, /Pay with wallet/)
  assert.doesNotMatch(source, /if \(isLoading \|\| slots\.length === 0\) return null/)
  assert.doesNotMatch(source, /Proceed to Pay/)
  assert.doesNotMatch(source, /Pay With Wallet/)
})

test('admin event list uses shared admin empty states for no-data and no-results', async () => {
  const source = await readSource('src/routes/events/index.tsx')

  assertTranspiles(source, 'admin-events-index.tsx')
  assert.match(source, /import \{[\s\S]*EmptyState[\s\S]*\} from '@glee\/ui'/)
  assert.match(source, /variant="admin"/)
  assert.match(source, /No events match your search/)
  assert.match(source, /No events in this status/)
  assert.match(source, /Create event/)
  assert.match(source, /Clear search/)
  assert.doesNotMatch(source, /Create your first event →/)
})

test('admin event mobile tab rows hide horizontal scrollbars', async () => {
  const source = await readSource('src/routes/events/index.tsx')

  assertTranspiles(source, 'admin-events-index.tsx')
  assert.ok(
    (source.match(/\[scrollbar-width:none\]/g) ?? []).length >= 2,
    'section and status tab rows should hide Firefox scrollbars',
  )
  assert.ok(
    (source.match(/\[&::-webkit-scrollbar\]:hidden/g) ?? []).length >= 2,
    'section and status tab rows should hide WebKit scrollbars',
  )
})
