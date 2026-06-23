# Public And Customer Status Filter Design

## Goal

Public web users and logged-in customers should only see event status filter choices that are useful for browsing available experiences. The platform should continue supporting all event statuses internally, but public/customer filter controls should expose only `Active` and `Live`.

## Scope

This applies to customer-facing event browsing surfaces:

- Public home route `/`
- Public events route `/events`
- Customer home route `/app`
- Customer explore route `/app/events`

This does not change dashboard/admin event status controls, API contracts, event status values, or event cards/detail behavior outside of the filter controls.

## Behavior

- The status filter options shown to public/customer users are `Active` and `Live`.
- `Sold Out` and `Cancelled` remain valid event statuses in the system, but are hidden from public/customer status filter menus.
- The default filter remains `Active`.
- Selecting a status still clears category filters where the existing screen already does that.
- Clearing filters returns the status filter to `Active`.

## UI Design

The public and customer event status filter should use a dropdown on all screen sizes. Large screens should no longer render the segmented pill selector for `Active`, `Live`, `Sold Out`, and `Cancelled`.

The dropdown should follow the existing mobile dropdown pattern already present in these screens:

- Search field with a filter button.
- Dropdown menu anchored near the filter button.
- Current selection indicated clearly.
- Accessible button label and expanded state.

## Components And Files

Expected touch points:

- `src/public/routes/index.tsx`
- `src/public/routes/events/index.tsx`
- `src/customer/events/index.tsx`

The customer home route currently reuses `CustomerHomePage` from `src/customer/events/index.tsx`, so the customer change should cover both `/app` and `/app/events`.

## Data Flow

No API or query contract changes are required. Existing `useEvents` calls can continue passing the selected `status` value. The only status values selectable from these public/customer controls will be `active` and `live`.

## Error Handling

No new error handling is needed. Existing loading and empty states remain unchanged. If the API returns no results for `Active` or `Live`, existing empty states should continue to display.

## Testing

Add or update focused unit/surface tests to confirm:

- Public/customer-facing status filter constants or rendered controls include `Active` and `Live`.
- Public/customer-facing controls do not expose `Sold Out` or `Cancelled`.
- Large-screen rendering no longer depends on a segmented status selector.

Run required checks before handoff:

- `pnpm type-check`
- `pnpm build`
