# Glee UI/UX Polish Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the approved option 1 Glee frontend surfaces: customer conversion flows, mobile polish, actionable empty/loading states, and light admin event consistency.

**Architecture:** Add a small shared feedback layer in `@glee/ui`, then apply it to event discovery, event detail checkout, reservation checkout, and admin event listing. Keep business logic, routing, and backend API contracts unchanged.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, lucide-react, `node:test`, TypeScript source-transpile assertions.

## Global Constraints

- No backend API changes.
- No full brand redesign.
- No major routing changes.
- No broad admin dashboard redesign outside event list consistency.
- No new checkout payment methods.
- No changes to ticket, wallet, or reservation business rules.
- Use sentence case for new action labels.
- Preserve the dark Glee customer identity and restrained admin density.
- Use TDD: write each test first, run it and confirm failure, then implement.
- Use `apply_patch` for manual file edits.

---

## File Structure

- Create `src/ui/components/ui/empty-state.tsx`: shared `EmptyState` component plus `LoadingPanel`.
- Modify `src/ui/index.ts`: export the new UI primitives.
- Create `tests/ui-ux-polish-surfaces.test.mjs`: source-level tests for exports, feedback-state usage, CTA copy, mobile sticky/dialog classes, and reservation/admin state copy.
- Modify `src/public/components/events/EventGrid.tsx`: use shared empty state and expose empty action props.
- Modify `src/public/routes/index.tsx`: pass clear-filter actions and consistent empty copy to `EventGrid`.
- Modify `src/public/routes/events/index.tsx`: pass clear-filter actions and consistent empty copy to `EventGrid`.
- Modify `src/customer/events/index.tsx`: replace repeated one-off loading/empty blocks with shared primitives.
- Modify `src/public/routes/events/$eventId.tsx`: align checkout CTA copy and mobile checkout overlay behavior.
- Modify `src/customer/events/$eventId.tsx`: align sticky CTA copy and dialog action copy.
- Modify `src/customer/events/EventReservationPanel.tsx`: add directional empty state and consistent reservation CTA labels.
- Modify `src/routes/events/index.tsx`: replace local admin empty state with shared admin variant.

---

### Task 1: Shared Feedback Primitives

**Files:**
- Create: `src/ui/components/ui/empty-state.tsx`
- Modify: `src/ui/index.ts`
- Test: `tests/ui-ux-polish-surfaces.test.mjs`

**Interfaces:**
- Produces: `EmptyState(props: EmptyStateProps): JSX.Element`
- Produces: `LoadingPanel(props: LoadingPanelProps): JSX.Element`
- Produces types: `EmptyStateVariant = 'customer' | 'admin' | 'danger'`
- Later tasks import from `@glee/ui`.

- [ ] **Step 1: Write the failing tests**

Add `tests/ui-ux-polish-surfaces.test.mjs` with:

```js
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
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm test:unit`

Expected: FAIL because `src/ui/components/ui/empty-state.tsx` does not exist or `src/ui/index.ts` does not export it.

- [ ] **Step 3: Implement the shared component**

Create `src/ui/components/ui/empty-state.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export type EmptyStateVariant = 'customer' | 'admin' | 'danger'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  secondaryAction?: ReactNode
  variant?: EmptyStateVariant
  className?: string
}

const emptyStateStyles: Record<EmptyStateVariant, string> = {
  customer: 'border-white/10 bg-white/[0.06] text-white shadow-[0_18px_55px_rgba(0,0,0,0.18)]',
  admin: 'border-admin bg-admin-surface text-foreground shadow-admin',
  danger: 'border-red-500/25 bg-red-500/10 text-white shadow-[0_18px_55px_rgba(0,0,0,0.18)]',
}

const iconStyles: Record<EmptyStateVariant, string> = {
  customer: 'bg-neon-pink/10 text-neon-pink ring-1 ring-neon-pink/20',
  admin: 'bg-neon-pink/10 text-neon-pink ring-1 ring-neon-pink/20',
  danger: 'bg-red-500/15 text-red-200 ring-1 ring-red-500/25',
}

const descriptionStyles: Record<EmptyStateVariant, string> = {
  customer: 'text-white/58',
  admin: 'text-admin-40',
  danger: 'text-red-100/75',
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'customer',
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex min-h-44 flex-col items-center justify-center rounded-2xl border px-5 py-10 text-center',
        emptyStateStyles[variant],
        className,
      )}
    >
      {icon && (
        <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-2xl', iconStyles[variant])}>
          {icon}
        </div>
      )}
      <h3 className="font-heading text-base font-black">{title}</h3>
      {description && (
        <p className={cn('mt-2 max-w-md text-sm leading-6', descriptionStyles[variant])}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

export interface LoadingPanelProps {
  label?: string
  variant?: EmptyStateVariant
  className?: string
}

export function LoadingPanel({ label = 'Loading', variant = 'customer', className }: LoadingPanelProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex min-h-32 items-center justify-center gap-3 rounded-2xl border px-5 py-8 text-sm font-semibold',
        emptyStateStyles[variant],
        variant === 'admin' ? 'text-admin-50' : 'text-white/60',
        className,
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin text-neon-pink" />
      <span>{label}</span>
    </div>
  )
}
```

Modify `src/ui/index.ts`:

```ts
export * from './components/ui/empty-state'
```

Place the export near the other shadcn/ui component exports.

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm test:unit`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/ui-ux-polish-surfaces.test.mjs src/ui/components/ui/empty-state.tsx src/ui/index.ts
git commit -m "feat(ui): add shared feedback states"
```

---

### Task 2: Public Event Discovery States

**Files:**
- Modify: `tests/ui-ux-polish-surfaces.test.mjs`
- Modify: `src/public/components/events/EventGrid.tsx`
- Modify: `src/public/routes/index.tsx`
- Modify: `src/public/routes/events/index.tsx`

**Interfaces:**
- Consumes: `EmptyState` from `@glee/ui`.
- Extends: `EventGridProps` with `emptyTitle?: string`, `emptyDescription?: string`, `emptyAction?: ReactNode`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/ui-ux-polish-surfaces.test.mjs`:

```js
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
  assert.match(events, /const clearFilters = \(\) => \{/)
  assert.match(landing, literal('No events match your search'))
  assert.match(events, literal('No events match your filters'))
  assert.match(landing, literal('Clear filters'))
  assert.match(events, literal('Clear filters'))
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm test:unit`

Expected: FAIL because `EventGrid` does not accept empty state props and public routes do not pass recovery actions.

- [ ] **Step 3: Implement `EventGrid` empty state props**

Modify the top of `src/public/components/events/EventGrid.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { Event } from '@glee/types'
import { EmptyState, Skeleton } from '@glee/ui'
import { CalendarX2 } from 'lucide-react'
import EventCard from './EventCard'

interface EventGridProps {
  events: Event[]
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
}
```

Replace the empty branch with:

```tsx
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX2 className="h-6 w-6" />}
        title={emptyTitle ?? 'No upcoming events right now'}
        description={emptyDescription ?? 'Check back soon for new Glee experiences.'}
        action={emptyAction}
        variant="customer"
      />
    )
  }
```

- [ ] **Step 4: Add clear-filter actions to public landing**

In `src/public/routes/index.tsx`, add:

```tsx
  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setCategoryId(undefined)
    setStatusFilter('active')
    setStatusMenuOpen(false)
  }
```

Replace the `EventGrid` call with:

```tsx
              <EventGrid
                events={listedEvents}
                isLoading={isLoading}
                emptyTitle={search || categoryId ? 'No events match your search' : 'No active events right now'}
                emptyDescription={search || categoryId ? 'Clear filters to see more events.' : 'New Glee events will appear here as soon as they go live.'}
                emptyAction={(search || categoryId || statusFilter !== 'active') ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-full bg-neon-pink px-4 py-2 text-sm font-semibold text-white shadow-neon transition-colors hover:bg-neon-pink/90"
                  >
                    Clear filters
                  </button>
                ) : undefined}
              />
```

- [ ] **Step 5: Add clear-filter actions to public events page**

In `src/public/routes/events/index.tsx`, add:

```tsx
  const clearFilters = () => {
    setPage(1)
    setSearchInput('')
    setSearch('')
    setCategoryId(undefined)
    setStatusFilter('active')
    setStatusMenuOpen(false)
  }
```

Replace the `EventGrid` call with:

```tsx
              <EventGrid
                events={listedEvents}
                isLoading={isLoading}
                emptyTitle={search || categoryId || statusFilter !== 'active' ? 'No events match your filters' : 'No active events right now'}
                emptyDescription={search || categoryId || statusFilter !== 'active' ? 'Clear filters to return to active events.' : 'New Glee events will appear here as soon as they go live.'}
                emptyAction={(search || categoryId || statusFilter !== 'active') ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-full bg-neon-pink px-4 py-2 text-sm font-semibold text-white shadow-neon transition-colors hover:bg-neon-pink/90"
                  >
                    Clear filters
                  </button>
                ) : undefined}
              />
```

- [ ] **Step 6: Run the tests and verify they pass**

Run: `pnpm test:unit`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add tests/ui-ux-polish-surfaces.test.mjs src/public/components/events/EventGrid.tsx src/public/routes/index.tsx src/public/routes/events/index.tsx
git commit -m "feat(events): polish public empty states"
```

---

### Task 3: Customer Discovery Empty and Loading States

**Files:**
- Modify: `tests/ui-ux-polish-surfaces.test.mjs`
- Modify: `src/customer/events/index.tsx`

**Interfaces:**
- Consumes: `EmptyState`, `LoadingPanel`, `Button`, and `cn` from `@glee/ui`.
- Produces no new public API.

- [ ] **Step 1: Write the failing tests**

Append:

```js
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
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm test:unit`

Expected: FAIL because `src/customer/events/index.tsx` still uses one-off text blocks.

- [ ] **Step 3: Add imports**

Change the `@glee/ui` import in `src/customer/events/index.tsx` to include:

```tsx
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, EmptyState, Input, LoadingPanel, cn } from '@glee/ui'
import { Bell, CalendarX2, Check, ChevronLeft, ChevronRight, Filter, MapPinned, MapPin, Search } from 'lucide-react'
```

- [ ] **Step 4: Replace one-off loading and empty blocks**

Use this pattern for loading branches:

```tsx
            isLoading ? (
              <LoadingPanel label="Searching events" variant="customer" />
            ) : filteredEvents.length === 0 ? (
              <EmptyState
                icon={<CalendarX2 className="h-6 w-6" />}
                title={`No events match your search`}
                description={`Clear search to browse active events.`}
                action={<Button variant="link" className="text-neon-pink active:scale-95" onClick={clearFilters}>Clear filters</Button>}
                variant="customer"
              />
            ) : (
              <EventList events={filteredEvents} showCategory={false} />
            )
```

Use this pattern for venue loading and empty branches:

```tsx
          ) : isVenueExplore && isReservationVenuesLoading ? (
            <LoadingPanel label="Loading clubs and restaurants" variant="customer" />
          ) : isVenueExplore && visibleReservationVenues.length === 0 ? (
            <EmptyState
              icon={<MapPinned className="h-6 w-6" />}
              title="No clubs or restaurants match your search"
              description="Clear search to browse available table spots."
              action={<Button variant="link" className="text-neon-pink active:scale-95" onClick={clearFilters}>Clear filters</Button>}
              variant="customer"
            />
```

Use this pattern for event filter empty branches:

```tsx
          ) : isExplore && isLoading ? (
            <LoadingPanel label="Loading events" variant="customer" />
          ) : isExplore && filteredEvents.length === 0 ? (
            <EmptyState
              icon={<CalendarX2 className="h-6 w-6" />}
              title="No events match your filters"
              description="Clear filters to return to active events."
              action={<Button variant="link" className="text-neon-pink active:scale-95" onClick={clearFilters}>Clear filters</Button>}
              variant="customer"
            />
```

For the home carousel and more-events sections, use:

```tsx
            <LoadingPanel label="Loading events" variant="customer" />
```

and:

```tsx
              <EmptyState
                icon={<CalendarX2 className="h-6 w-6" />}
                title="No featured events right now"
                description="New Glee events will appear here as soon as they go live."
                variant="customer"
              />
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `pnpm test:unit`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/ui-ux-polish-surfaces.test.mjs src/customer/events/index.tsx
git commit -m "feat(customer): standardize discovery feedback states"
```

---

### Task 4: Event Detail Conversion Copy and Mobile Checkout Polish

**Files:**
- Modify: `tests/ui-ux-polish-surfaces.test.mjs`
- Modify: `src/public/routes/events/$eventId.tsx`
- Modify: `src/customer/events/$eventId.tsx`

**Interfaces:**
- Consumes existing payment and purchase functions unchanged.
- Produces no new public API.

- [ ] **Step 1: Write the failing tests**

Append:

```js
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
  assert.doesNotMatch(publicDetail, /selectedItems\.length === 0 \? 'Select a Ticket' : 'Buy Tickets'/)
  assert.doesNotMatch(customerDetail, /canPurchase \? 'Pay Now' :/)
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm test:unit`

Expected: FAIL because event detail pages still use mixed CTA copy and the public overlay lacks the new mobile-safe class.

- [ ] **Step 3: Update public sticky bar copy and safe-area spacing**

In `src/public/routes/events/$eventId.tsx`, update the sticky bar container class:

```tsx
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-glee-bg/90 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
```

Update the button label:

```tsx
            {!isPurchasable ? 'Unavailable' : selectedItems.length === 0 ? 'Select tickets' : 'Continue to payment'}
```

- [ ] **Step 4: Update public checkout overlay layout**

Replace the overlay panel wrapper with:

```tsx
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
```

Replace the modal panel opening div with:

```tsx
          <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-[#0f0f15] sm:rounded-2xl">
```

Wrap the existing summary, table booking, buyer form, final button, and Paystack note in:

```tsx
            <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-8">
              ...existing scrollable checkout content...
            </div>
```

Keep the title/close row outside that scroll area with:

```tsx
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8">
```

Use this final button label:

```tsx
              {isPreparing
                ? 'Preparing payment...'
                : isProcessing
                  ? 'Opening Paystack...'
                  : 'Continue to payment'}
```

- [ ] **Step 5: Update customer sticky bar copy and safe-area spacing**

In `src/customer/events/$eventId.tsx`, update the sticky bar class:

```tsx
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050017]/88 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl">
```

Update the button label:

```tsx
                {canPurchase ? 'Continue to payment' : isSoldOut ? 'Sold out' : 'Select tickets'}
```

- [ ] **Step 6: Keep dialog action copy sentence-case**

In `src/customer/events/$eventId.tsx`, change:

```tsx
<DialogTitle className="text-white">Choose payment</DialogTitle>
```

Change wallet/direct actions to sentence case:

```tsx
<p className="font-semibold text-white">Pay with wallet</p>
<p className="font-semibold">Pay directly</p>
```

Change confirm buttons:

```tsx
{purchase.isPending ? 'Processing...' : 'Confirm payment'}
{purchase.isPending ? 'Processing...' : 'Confirm reservation'}
```

- [ ] **Step 7: Run the tests and verify they pass**

Run: `pnpm test:unit`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add tests/ui-ux-polish-surfaces.test.mjs src/public/routes/events/\$eventId.tsx src/customer/events/\$eventId.tsx
git commit -m "feat(events): align checkout conversion copy"
```

---

### Task 5: Table Reservation Directional States

**Files:**
- Modify: `tests/ui-ux-polish-surfaces.test.mjs`
- Modify: `src/customer/events/EventReservationPanel.tsx`

**Interfaces:**
- Consumes: `EmptyState` from `@glee/ui`.
- Existing reservation mutation payload remains unchanged.

- [ ] **Step 1: Write the failing tests**

Append:

```js
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
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm test:unit`

Expected: FAIL because the panel returns null when no slots exist and still uses old CTA labels.

- [ ] **Step 3: Add imports**

Modify the imports:

```tsx
import { Badge, Button, EmptyState, Input, Skeleton, useToast } from '@glee/ui'
import { CalendarClock, CreditCard, Table2, Users, Wallet } from 'lucide-react'
```

- [ ] **Step 4: Show a no-slots reservation state**

Replace:

```tsx
  if (isLoading || slots.length === 0) return null
```

with:

```tsx
  if (isLoading) return <Skeleton className="h-48 rounded-3xl bg-white/10" />

  if (slots.length === 0) {
    return (
      <section className="rounded-3xl border border-white/12 bg-white/[0.08] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
        <EmptyState
          icon={<Table2 className="h-6 w-6" />}
          title="Table reservations are not open for this event"
          description="Check the event details again later or continue with ticket checkout."
          variant="customer"
          className="min-h-40 border-white/10 bg-black/20"
        />
      </section>
    )
  }
```

- [ ] **Step 5: Replace no-category availability copy**

Replace the category empty branch with:

```tsx
            <EmptyState
              icon={<Table2 className="h-6 w-6" />}
              title="No tables for this group size"
              description="Choose another slot or adjust the guest count to see available tables."
              variant="customer"
              className="min-h-40 border-white/10 bg-black/20"
            />
```

- [ ] **Step 6: Update reservation CTA labels**

Replace the button label with:

```tsx
            {createReservation.isPending
              ? 'Reserving...'
              : !selectedCategory
                ? 'Select a table'
                : paymentMethod === 'WALLET'
                  ? 'Pay with wallet'
                  : 'Pay deposit'}
```

- [ ] **Step 7: Run the tests and verify they pass**

Run: `pnpm test:unit`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add tests/ui-ux-polish-surfaces.test.mjs src/customer/events/EventReservationPanel.tsx
git commit -m "feat(reservations): clarify event table states"
```

---

### Task 6: Admin Event Empty State Consistency

**Files:**
- Modify: `tests/ui-ux-polish-surfaces.test.mjs`
- Modify: `src/routes/events/index.tsx`

**Interfaces:**
- Consumes: `EmptyState` from `@glee/ui`.
- Admin event filters and create navigation remain unchanged.

- [ ] **Step 1: Write the failing tests**

Append:

```js
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
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm test:unit`

Expected: FAIL because the admin event page still uses a local empty state.

- [ ] **Step 3: Add imports**

Add `EmptyState` to the existing `@glee/ui` import and add `CalendarX2` to lucide imports:

```tsx
  EmptyState,
```

```tsx
import { Plus, Search, LayoutGrid, List, MapPin, Calendar, CalendarX2, Ticket, Pencil, Trash2, Tags, MapPinned } from 'lucide-react'
```

- [ ] **Step 4: Add empty-state derivation before return**

Inside `EventsListPage`, after `pendingDeleteEvent`, add:

```tsx
  const activeTabLabel = STATUS_TABS.find(tab => tab.key === activeTab)?.label.toLowerCase() ?? 'selected'
  const emptyTitle = search ? 'No events match your search' : 'No events in this status'
  const emptyDescription = search
    ? `No events matched "${search}". Clear search or try another term.`
    : `There are no ${activeTabLabel} events to show right now.`
```

- [ ] **Step 5: Replace the local empty state branch**

Replace the `filtered.length === 0` branch with:

```tsx
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CalendarX2 className="h-6 w-6" />}
            title={emptyTitle}
            description={emptyDescription}
            variant="admin"
            action={search ? (
              <Button type="button" variant="outline" onClick={() => setSearch('')} className="rounded-full border-admin bg-admin-overlay text-foreground hover:bg-admin-overlay-lg">
                Clear search
              </Button>
            ) : activeTab === 'active' && canCreateEvents ? (
              <Button type="button" onClick={() => navigate('/dashboard/events/new')} className="rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
                <Plus className="mr-2 h-4 w-4" />
                Create event
              </Button>
            ) : undefined}
          />
```

- [ ] **Step 6: Run the tests and verify they pass**

Run: `pnpm test:unit`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add tests/ui-ux-polish-surfaces.test.mjs src/routes/events/index.tsx
git commit -m "feat(admin): standardize event empty states"
```

---

### Task 7: Full Verification and Browser QA

**Files:**
- No required source edits unless verification finds a regression.

**Interfaces:**
- Consumes all prior task changes.
- Produces final verified UI polish pass.

- [ ] **Step 1: Run full automated verification**

Run:

```bash
pnpm test:unit
pnpm type-check
pnpm lint
pnpm build
```

Expected: all commands complete successfully.

- [ ] **Step 2: Start the local app**

Run:

```bash
pnpm dev --host 127.0.0.1
```

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`. Keep the server running until screenshot QA completes.

- [ ] **Step 3: Capture browser screenshots**

Use Playwright or the browser tool to check:

- Public home at `/`.
- Public event listing at `/events`.
- Public event detail for a seeded/available event.
- Customer event listing at `/app/events`.
- Customer event detail for a seeded/available event.
- Admin events at `/dashboard/events`.

Check both:

- Mobile viewport: `390x844`.
- Desktop viewport: `1280x900`.

Expected:

- No overlapping sticky bars.
- Empty states fit and actions are visible.
- Event card text does not overflow buttons or price blocks.
- Checkout/payment dialogs fit within the viewport and scroll internally.
- Admin empty states remain restrained and operational.

- [ ] **Step 4: Fix any QA regressions with a test first**

If QA finds a regression, add a failing source-level assertion to `tests/ui-ux-polish-surfaces.test.mjs` that captures it, run `pnpm test:unit` to confirm failure, then patch the relevant component and rerun all verification commands.

- [ ] **Step 5: Commit QA fixes if any**

If Step 4 changed files:

```bash
git add tests/ui-ux-polish-surfaces.test.mjs src
git commit -m "fix(ui): resolve polish QA regressions"
```

- [ ] **Step 6: Final status**

Run:

```bash
git status --short
```

Expected: clean working tree.

Report:

- Commits created.
- Verification commands and results.
- Any browser screenshots reviewed.
- Any residual risks.

---

## Self-Review

- Spec coverage: shared feedback components, public/customer discovery, public/customer event checkout, table reservation states, mobile safe-area/dialog polish, admin event empty states, automated verification, and browser QA are covered.
- Placeholder scan: no unresolved planning markers or unspecified edge handling remains.
- Type consistency: `EmptyState`, `LoadingPanel`, `EmptyStateVariant`, and `EventGridProps` names are defined before later tasks consume them.
- Scope check: no backend changes, no route changes, no new payment methods, and no broad admin redesign are included.
