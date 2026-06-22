# Status Dropdown Polish Design

## Goal

The public and customer event status dropdown should feel intentional and should close predictably. Users should see a compact premium menu that matches the Glee visual style, and clicking anywhere outside the dropdown menu or its filter trigger should close it.

## Scope

This applies to the customer-facing event status filter controls on:

- Public home route `/`
- Public events route `/events`
- Customer home route `/app`
- Customer explore route `/app/events`

This builds on the existing status-filter change. It does not add statuses, alter event status values, change API contracts, or touch dashboard/admin status controls.

## Behavior

- The only visible status options remain `Active` and `Live`.
- The default selected status remains `Active`.
- Selecting a status still closes the dropdown.
- Clicking the filter trigger toggles the dropdown.
- Clicking inside the dropdown menu does not close it unless a status option is selected.
- Clicking anywhere else closes the dropdown, including the search input, category filters, event cards, and page background.
- Customer venue exploration still hides the event status dropdown.

## UI Design

Use a compact premium menu style across public and customer surfaces:

- Floating menu aligned to the filter trigger.
- Dark glass-style background that fits the existing public/customer dark theme.
- Subtle border and stronger shadow than the current flat menu.
- Small uppercase `Status` header.
- Two full-width option rows: `Active` and `Live`.
- Selected row uses the existing neon pink brand treatment and a check icon.
- Non-selected rows use soft white text and a restrained hover state.
- Menu dimensions should stay stable and not resize the search input.

The filter trigger remains an icon button inside the search area. It keeps `aria-label="Filter events by status"` and `aria-expanded={statusMenuOpen}`.

## Implementation Shape

The current public and customer route files each own their status dropdown markup and outside-click behavior. The implementation can either:

- Apply the same scoped styling and click-boundary fix in each route file, or
- Extract a tiny shared helper/component only if it clearly reduces duplicated behavior without broadening scope.

The click-away boundary should treat only the dropdown trigger and the dropdown menu as inside. The search input wrapper should not count as inside the dropdown boundary.

## Testing

Add or update focused static surface tests to verify:

- Public/customer dropdowns retain only `Active` and `Live`.
- Public/customer dropdown triggers expose `aria-expanded`.
- Public/customer implementations include separate refs or equivalent boundaries for the trigger/menu click-away behavior.
- Old desktop segmented selector classes remain absent.

Run required checks before handoff:

- `node --test tests/customer-facing-status-filters.test.mjs`
- `pnpm test:unit`
- `pnpm type-check`
- `pnpm build`
