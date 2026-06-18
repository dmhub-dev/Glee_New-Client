# Glee UI/UX Polish Pass Design

## Goal

Run one focused frontend UI/UX pass that improves consistency, mobile polish, empty/error states, and customer conversion flows without changing product scope or backend contracts.

The pass should make event discovery, ticket purchase, and table reservation feel like one coherent Glee experience across public and logged-in customer surfaces, while giving admin event management a cleaner empty/loading pattern.

## Scope

Primary customer-facing surfaces:

- Public landing and event discovery: `src/public/routes/index.tsx`, `src/public/routes/events/index.tsx`, `src/public/components/events/EventGrid.tsx`, `src/public/components/events/EventCard.tsx`.
- Public event purchase: `src/public/routes/events/$eventId.tsx`.
- Logged-in customer discovery: `src/customer/events/index.tsx`.
- Logged-in event purchase and reservation: `src/customer/events/$eventId.tsx`, `src/customer/events/EventReservationPanel.tsx`, `src/components/events/EventCheckoutTableBooking.tsx`.

Admin consistency surface:

- Admin event list and grid: `src/routes/events/index.tsx`.

Shared UI foundation:

- Add small shared feedback primitives in `src/ui/components/ui/` and export them from `src/ui/index.ts`.
- Keep the primitives theme-aware so customer/public dark surfaces and admin surfaces can share behavior without sharing the exact same visual weight.

## Non-Goals

- No backend API changes.
- No full brand redesign.
- No major routing changes.
- No broad admin dashboard redesign outside event list consistency.
- No new checkout payment methods.
- No changes to ticket, wallet, or reservation business rules.

## Design Direction

Glee should keep its dark nightlife identity: deep indigo surfaces, neon pink as the primary action color, rounded but stable cards, and media-led event discovery. The polish pass should reduce one-off surface treatments and make purchase decisions clearer.

Customer-facing screens can stay expressive and image-rich. Admin screens should stay restrained, dense, and operational. Shared components should provide consistent structure, but each surface can use the appropriate tone through variants.

## Shared Feedback Components

Add a reusable `EmptyState` primitive with:

- Icon slot.
- Title.
- Description.
- Optional primary action.
- Optional secondary action.
- Variants for `customer`, `admin`, and `danger`.

Add a lightweight loading feedback primitive, either `LoadingPanel` or a documented skeleton panel pattern, for screens that currently show plain text like "Loading events...".

Use these primitives for:

- No public events.
- No customer event results.
- No customer venue results.
- No admin events for the selected status.
- No admin search results.
- No available table category for selected slot and guest count.

Empty states should tell the user what happened and what they can do next. Examples:

- "No events match your filters" with "Clear filters".
- "No active events yet" with "Create event" for eligible admin users.
- "No tables for this group size" with guidance to adjust guests or select another slot.

## Customer Conversion Flows

### Event Discovery

Public and customer discovery should use consistent naming and recovery actions:

- Keep the search/filter layout compact on mobile.
- Use sentence case for action text.
- Use consistent CTA labels: "Details" for browsing cards, "Select tickets" before selection, "Continue to payment" when checkout can proceed, and "Reserve table" or "Pay deposit" for table bookings.
- Replace one-off empty blocks with shared empty states.
- Keep event cards stable on mobile so images, titles, prices, and CTAs do not shift awkwardly with longer event names.

### Public Event Detail

The public event detail page should remain optimized for guest purchase:

- Keep the media hero and sticky bottom action bar.
- Add safe-area padding to sticky actions.
- Make the checkout overlay mobile-first: max height, scrollable body, fixed final action, and no clipped close button.
- Standardize order summary and buyer detail spacing.
- Use "Continue to payment" instead of mixed "Buy Tickets" / "Proceed to Pay" labels once a selection exists.
- Keep guest purchase validation and Paystack flow unchanged.

### Logged-In Customer Event Detail

The customer event detail page should feel like the signed-in version of the same purchase path:

- Align ticket tier card layout and selected states with public detail.
- Align sticky action copy with public detail.
- Improve payment dialog hierarchy so wallet, installment, and direct payment options are easy to compare.
- Keep wallet/installment business logic unchanged.
- Keep success dialog focused on the next action: view ticket or return to event.

### Table Reservation

Table reservation should be clearer and less abrupt:

- Do not silently disappear when no slots exist; show an empty state only if the section is expected for that event.
- For no category availability, show a directional state: change guest count or choose another slot.
- Make guest fields, payment method, due-now amount, minimum spend, and pre-order items easier to scan.
- Use consistent CTA labels:
  - Guest Paystack: "Pay deposit".
  - Logged-in wallet: "Pay with wallet".
  - No selected category: disabled "Select a table".

## Mobile Polish

Apply mobile polish where the pass touches a screen:

- Add bottom padding that accounts for sticky bars and `env(safe-area-inset-bottom)`.
- Keep sticky bars compact and single-row where possible, but allow CTAs to remain readable on narrow screens.
- Ensure dialogs and overlays use `max-h` plus internal scrolling.
- Avoid text overflow in buttons, badges, and price blocks.
- Keep tap targets at least 40px high for key conversion actions.
- Keep horizontal filter rows scrollable without visible scrollbar.

## Admin Event Consistency

Admin event management should receive a small consistency pass:

- Replace the local empty event state with the shared empty state.
- Differentiate no-data from no-search-results.
- Keep current status tabs, grid/list toggle, and create event action.
- Keep visual density and avoid customer-style marketing treatment.

## Testing Strategy

Use test-first changes for behavior and source-level UI contracts:

- Add or update unit/source tests that confirm the shared feedback primitive is exported from `@glee/ui`.
- Add source-level tests confirming target event discovery screens use the shared empty state instead of plain one-off empty blocks.
- Add source-level tests for conversion CTA wording on public and customer event detail pages.
- Preserve existing checkout table booking tests.

Verification after implementation:

- `pnpm test:unit`
- `pnpm type-check`
- `pnpm lint`
- `pnpm build`
- Browser screenshot pass on mobile and desktop for public home, public event detail, customer event detail, and admin events.

## Acceptance Criteria

- Event discovery empty/loading states are consistent and actionable across public, customer, and admin event screens.
- Customer checkout CTAs use consistent language across public and logged-in event details.
- Sticky mobile action bars do not cover important content and respect safe-area padding.
- Checkout and payment dialogs fit within small mobile viewports and remain scrollable.
- Table reservation states explain what to do when no category is available.
- Admin event empty states are clearer without changing the admin workflow.
- Existing tests pass, and the frontend builds successfully.

## Self-Review

- No placeholders or undefined requirements remain.
- Scope is limited to the approved option 1 surfaces.
- Backend and payment business rules are explicitly out of scope.
- Mobile, empty/error, consistency, and conversion goals each have concrete acceptance criteria.
