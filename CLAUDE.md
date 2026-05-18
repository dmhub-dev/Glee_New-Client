# Glee — Website Rebuild

## Project overview

Glee is a nightlife platform. This codebase is the **website phase** — a full rebuild covering event discovery, ticketing, club booking, table reservations, bottle buying, menu/pricing management, and vendor + admin tooling.

After this phase, a separate app UX rebuild will follow (out of scope here).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| UI components | shadcn/ui |
| Package manager | pnpm |
| Styling | Tailwind CSS (via shadcn) |

Always use `pnpm` — never `npm` or `yarn`.

---

## Monorepo structure

This is a pnpm monorepo. Three apps share common packages for types, API, UI, and utilities. Always run commands from the root unless targeting a specific app.

```
glee/
├── apps/
│   ├── web/                        # Public-facing site (events, clubs, checkout)
│   │   ├── src/
│   │   │   ├── app/                # App shell, providers, root layout
│   │   │   ├── routes/
│   │   │   │   ├── index.tsx       # Home page
│   │   │   │   ├── events/
│   │   │   │   │   ├── index.tsx   # Events listing
│   │   │   │   │   └── $eventId.tsx
│   │   │   │   ├── clubs/
│   │   │   │   │   └── $clubId/
│   │   │   │   │       ├── index.tsx   # Club profile
│   │   │   │   │       └── book.tsx    # Booking flow
│   │   │   │   └── checkout/
│   │   │   │       └── index.tsx
│   │   │   └── components/         # Web-only components
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── vendor/                     # Vendor dashboard (role-gated)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── routes/
│   │   │   │   ├── index.tsx       # Vendor home
│   │   │   │   ├── events/
│   │   │   │   ├── menus/
│   │   │   │   ├── bookings/
│   │   │   │   └── availability/
│   │   │   └── components/         # Vendor-only components
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── admin/                      # Admin panel (role-gated)
│       ├── src/
│       │   ├── app/
│       │   ├── routes/
│       │   │   ├── index.tsx       # Admin home
│       │   │   ├── events/
│       │   │   ├── venues/
│       │   │   ├── vendors/
│       │   │   └── reports/
│       │   └── components/         # Admin-only components
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   ├── types/                      # @glee/types — all shared TS types, single source of truth
│   │   ├── src/
│   │   │   ├── booking.ts
│   │   │   ├── event.ts
│   │   │   ├── menu.ts
│   │   │   ├── user.ts
│   │   │   └── venue.ts
│   │   └── package.json
│   │
│   ├── api/                        # @glee/api — API client + all TanStack Query fns
│   │   ├── src/
│   │   │   ├── client.ts           # Base fetch, auth injection, error handling
│   │   │   ├── queries/
│   │   │   │   ├── bookings.ts
│   │   │   │   ├── events.ts
│   │   │   │   ├── menus.ts
│   │   │   │   ├── venues.ts
│   │   │   │   └── users.ts
│   │   │   └── mutations/
│   │   └── package.json
│   │
│   ├── ui/                         # @glee/ui — shared shadcn/ui components + design tokens
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/             # shadcn primitives — do not edit manually
│   │   │   │   ├── booking/        # BookingCalendar, TableCard, ReservationStatus
│   │   │   │   ├── events/         # EventCard, EventDetail, TicketTier
│   │   │   │   └── menu/           # MenuCategory, BottleCard, PriceDisplay
│   │   │   └── globals.css         # Tailwind config, CSS variables, token overrides
│   │   └── package.json
│   │
│   └── utils/                      # @glee/utils — formatters, validators, helpers, auth
│       ├── src/
│       │   ├── auth/               # Auth context, role helpers, token storage
│       │   ├── formatters/         # Price, date, status formatters
│       │   └── validators/         # Zod schemas shared across apps
│       └── package.json
│
├── pnpm-workspace.yaml
├── package.json                    # Root — scripts, shared devDependencies
├── turbo.json                      # Turborepo pipeline config (optional but recommended)
├── .env.example
└── CLAUDE.md
```

### Workspace config

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Package naming

Internal packages use the `@glee/` scope:

```json
{ "name": "@glee/types" }
{ "name": "@glee/api" }
{ "name": "@glee/ui" }
{ "name": "@glee/utils" }
```

Import in any app:

```ts
import type { Booking, BookingStatus } from '@glee/types'
import { useBookings } from '@glee/api'
import { BookingCalendar } from '@glee/ui'
```

### Running commands

```bash
pnpm dev                        # runs all apps in parallel
pnpm --filter web dev           # runs only the public web app
pnpm --filter vendor dev        # runs only the vendor dashboard
pnpm --filter admin dev         # runs only the admin panel
pnpm --filter @glee/ui build    # builds a specific package
```

### Rules

- Never import between `apps/` directly — shared code belongs in `packages/`.
- Never import from `apps/` inside `packages/` — packages must be app-agnostic.
- `@glee/types` has no dependencies — it is pure TypeScript. Do not add runtime imports.
- `@glee/ui` owns the design system. Do not define tokens or override shadcn in app-level CSS.
- Each app has its own `.env` file — never share environment variables across apps directly.

---

## Roles and permissions

There are 9 roles. Every protected route and every mutation must check the active user's role before rendering or executing.

| Role | Key permissions |
|---|---|
| `super_admin` | Full system access, infra settings, all overrides |
| `admin` | Day-to-day management: events, venues, bookings, menus, reporting |
| `operations_manager` | Booking management, reservation overrides, status changes, limited pricing edits |
| `commercial_manager` | Vendor onboarding, packages, campaigns, discounts, revenue reporting |
| `finance` | Payment status, refunds, reconciliation exports — no content editing |
| `vendor` | Own events, own club profile, own menu, own bookings and sales |
| `vendor_staff` | View bookings, check in customers, update table status, limited menu edits |
| `customer_support` | View bookings, view basic user profile, resend confirmations, log issues |
| `content_manager` | Upload banners, edit event copy, manage media library |

### Role enforcement pattern

```tsx
// src/lib/auth/useRequireRole.ts
// Always use this hook at the top of role-gated route components.
// Never conditionally render sensitive UI — redirect instead.

const { user } = useAuth()
useRequireRole(['admin', 'super_admin']) // redirects if role not in list
```

Vendor data is scoped — vendors must never see competitor data. Always filter API results by `vendor_id === user.vendorId` on vendor routes.

---

## Core domain types

These are the source of truth. Do not redefine inline.

```ts
// src/types/booking.ts
type BookingStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'no_show'

type ReservationType =
  | 'standard_table'
  | 'vip_table'
  | 'bottle_only'
  | 'full_package'
```

```ts
// src/types/menu.ts
type MenuCategory =
  | 'whisky' | 'vodka' | 'champagne' | 'gin'
  | 'cocktails' | 'mixers' | 'food' | 'packages'
```

---

## TanStack Query conventions

- All query keys live in `src/queries/` as exported constants — never inline a query key in a component.
- Use `queryClient.invalidateQueries` after mutations, not manual cache updates, unless optimistic UI is explicitly needed.
- Optimistic updates are appropriate for: availability toggles, booking status changes, item in/out of stock.
- Use `suspense: true` with `<Suspense>` + `<ErrorBoundary>` boundaries at the route level, not inside components.

```ts
// Example query key convention
export const bookingKeys = {
  all: ['bookings'] as const,
  byVenue: (venueId: string) => ['bookings', 'venue', venueId] as const,
  byId: (id: string) => ['bookings', id] as const,
}
```

---

## React Router conventions

- Route files mirror the URL path (see structure above).
- Use `loader` functions for data that must exist before the page renders (event detail, club profile).
- Use TanStack Query inside components for data that can load progressively (menus, availability, upsells).
- Protected routes use a `<ProtectedRoute roles={[...]}>` wrapper — implement this before building any vendor or admin routes.
- Booking and checkout flows use nested routes so step state is preserved on back navigation.

---

## API layer

- All API calls go through `src/lib/api/client.ts` — never use raw `fetch` in components or query files.
- The client handles: auth token injection, 401 refresh logic, error normalisation.
- API errors must be typed — no silent `any` catches.
- All responses are typed against `src/types/`.

---

## Image and media rules

All uploaded images must be validated before submission:

| Asset type | Required |
|---|---|
| Event flyer | Portrait + square variants, min resolution enforced, max file size |
| Venue hero | Specific banner dimensions |
| Menu item | Min width/height, plain/transparent background preferred |

- Accepted formats: JPEG, PNG, WebP
- Always show an upload preview before confirming
- Always have a fallback image defined — never render a broken `<img>`
- Asset naming convention: `{type}-{venueId}-{timestamp}.{ext}`

---

## Booking module rules

- **No double-booking**: time-slot inventory must be checked server-side, not just client-side.
- Minimum spend logic is per table category, per venue — do not hardcode values.
- Deposit vs full-payment rules are venue-configurable — read from venue settings, never assume.
- Booking status transitions must be logged with a timestamp and the acting user's ID.
- Manual overrides (ops/admin) must write to the audit log.

---

## Vendor UI principles

The vendor dashboard must be self-serve. Build it so a non-technical venue manager can:
- Create and publish an event without founder help
- Upload and update a menu
- Manage table availability
- Confirm or decline reservation requests
- See their own bookings and payout status

Every vendor form must support:
- Save as draft
- Preview before publish
- Clear approval state visibility (draft / pending approval / live / rejected)

---

## What each club page must display

```
Venue overview
Available tables (with status: available / sold out / requires approval)
Table price or minimum spend
Bottle menu
Food menu (if applicable)
Add-ons
Timing and reservation rules
Prepaid vs pay-on-arrival flag
```

Users must always know: what is available, what is sold out, what requires approval, what is prepaid vs pay-on-arrival.

---

## Checkout and confirmation

- Checkout supports: ticket purchase, table reservation, bottle pre-order, full packages.
- Confirmation must be visible in-app AND sent via email/notification.
- Every completed transaction must appear in admin reporting.

---

## Code standards

- TypeScript strict mode — no `any`, no non-null assertions without comment.
- Components are functional with hooks — no class components.
- Co-locate component styles with the component (Tailwind classes, not separate CSS files).
- No direct DOM manipulation — use React state and refs only.
- All form validation uses a schema library (zod recommended — pairs well with shadcn form primitives).
- Keep components focused: if a component exceeds ~200 lines, it probably needs splitting.
- Write the type first, then the component.

---

## shadcn/ui usage

- Install components with `pnpm dlx shadcn@latest add <component>` — do not copy-paste from docs.
- Do not edit files in `src/components/ui/` directly — extend via wrapper components.
- For data tables (admin reports, booking lists) use the shadcn `DataTable` pattern with TanStack Table.
- For forms use `Form`, `FormField`, `FormItem` with zod + react-hook-form as shadcn expects.

---

## Environment variables

```
VITE_API_BASE_URL=
VITE_CDN_BASE_URL=
VITE_STRIPE_PUBLIC_KEY=   # or relevant payment gateway
VITE_ANALYTICS_ID=
```

Never commit `.env`. Always use `.env.example` with placeholder values.

---

## Git commit rules

- **Never add Claude as a co-author.** Do not include `Co-authored-by: Claude` or any AI attribution in commit messages.
- Do not add any AI tool signatures, trailer lines, or tool-generated footers to commits.
- Commits are attributed to the human developer making them — nothing else.
- After every feature or bug fix, write a clear commit message summarising the change. Use the imperative mood and keep it concise.
- Write commit messages in the imperative mood: `Add booking calendar`, not `Added` or `Adding`.
- Keep the subject line under 72 characters.
- If a commit needs more detail, add a blank line after the subject and write the body — do not cram everything into one line.
- Do not commit `.env`, secrets, or API keys under any circumstances.
- Do not commit directly to `main` — always work on a feature branch thats is calvin-dev

---

## What is out of scope for this phase

- Mobile app (post-website phase, separate Replit rebuild)
- In-app push notifications (app phase)
- Wallet/payment experience in-app (app phase)
- Post-purchase flows in-app (app phase)

---

## Key acceptance criteria (DoD)

Before any feature is considered done:
- [ ] No broken booking flow
- [ ] Pricing displays correctly everywhere it appears
- [ ] Reservation status is clear to the user at all times
- [ ] No data leaks across vendor accounts
- [ ] Booking confirmation visible to user and firing notifications
- [ ] Admin reporting reflects the transaction
- [ ] Renders correctly on mobile and desktop
- [ ] Role restrictions enforced (not just hidden — actually blocked)
- [ ] Media renders correctly with fallback
