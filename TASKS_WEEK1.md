# Week 1 tasks — Glee website rebuild

> Phase: Scope lock + design foundation
> Stack: React + TypeScript · React Router v6 · TanStack Query v5 · shadcn/ui · pnpm monorepo
> Read `CLAUDE.md` in full before starting any task.

---

## Monday — Project foundation + scope lock

### Task M1 — Scaffold the monorepo

Initialise a pnpm monorepo with the following structure:

```
glee/
├── apps/
│   ├── web/
│   ├── vendor/
│   └── admin/
├── packages/
│   ├── types/
│   ├── api/
│   ├── ui/
│   └── utils/
├── pnpm-workspace.yaml
├── package.json
├── .env.example
└── CLAUDE.md
```

Steps:
- Create root `package.json` with `"private": true` and root-level dev scripts
- Create `pnpm-workspace.yaml` declaring `apps/*` and `packages/*`
- Scaffold each app using `pnpm create vite` with the `react-ts` template
- Scaffold each package with a minimal `package.json` using the `@glee/` scope naming:
  - `@glee/types`
  - `@glee/api`
  - `@glee/ui`
  - `@glee/utils`
- Add `tsconfig.json` at root with `strict: true`, path aliases for `@glee/*` packages
- Each app should extend the root tsconfig
- Add `.env.example` at root with placeholder vars:
  ```
  VITE_API_BASE_URL=
  VITE_CDN_BASE_URL=
  VITE_STRIPE_PUBLIC_KEY=
  VITE_ANALYTICS_ID=
  ```
- Add `.gitignore` covering `node_modules`, `.env`, `dist`, `.turbo`
- Run `pnpm install` from root and confirm workspace links resolve correctly

Acceptance: `pnpm --filter web dev` starts the web app without errors.

---

### Task M2 — Install and configure shadcn/ui in `@glee/ui`

- Initialise shadcn inside `packages/ui` using `pnpm dlx shadcn@latest init`
- Configure Tailwind in `packages/ui` with a shared `globals.css`
- Install the following shadcn components to start:
  `button`, `input`, `form`, `label`, `select`, `dialog`, `badge`, `card`, `separator`, `table`, `dropdown-menu`, `toast`, `avatar`, `skeleton`
- Each app (`web`, `vendor`, `admin`) must import `globals.css` from `@glee/ui`
- Do not add Tailwind separately to each app — it runs through `@glee/ui` only

Acceptance: A `<Button>` imported from `@glee/ui` renders correctly inside `apps/web`.

---

### Task M3 — Write the feature scope document

Create `docs/scope.md` at the root. This is a written document, not code.

Include:

**In scope for the website phase:**
- Event listing and discovery
- Ticket purchase flow
- Club profile pages
- Table reservation and booking
- Bottle pre-order and package selection
- Menu and pricing display
- Vendor event creation and management
- Vendor menu and availability management
- Admin moderation and approval
- Admin reporting

**Out of scope for the website phase (app phase only):**
- Mobile application
- Push notifications
- In-app wallet and payment experience
- Post-purchase in-app flows

**Dependency map — website vs app phase:**
- Authentication system must be built on the website and reused by the app
- Booking data model defined on the website phase must not be changed in the app phase
- Design tokens defined in `@glee/ui` carry forward to the app

Save to `docs/scope.md` and commit on branch `docs/scope-lock`.

---

### Task M4 — Write all core user journeys

Create `docs/user-journeys.md` at the root.

Write out each journey in full as a numbered step sequence. Cover all 7:

1. User discovers an event and buys a ticket
2. User books a club table
3. User selects bottles or packages
4. User views live menu with pricing
5. Vendor posts an event
6. Vendor updates their club offering
7. Admin reviews and approves content

For each journey include:
- Entry point (where does the user start)
- Every step in order
- Decision points (e.g. sold out → what happens)
- Exit point (confirmation, error, redirect)

Save to `docs/user-journeys.md` and commit on branch `docs/scope-lock`.

---

### Task M5 — Write acceptance criteria per journey

Create `docs/acceptance-criteria.md` at the root.

For each of the 7 user journeys defined in `docs/user-journeys.md`, write explicit acceptance criteria in this format:

```
## Journey: [name]

Given [context]
When [action]
Then [expected outcome]
```

Write at minimum 3 Given/When/Then statements per journey covering:
- The happy path
- A key error or edge case
- A state visibility requirement (e.g. user must see "sold out" before attempting purchase)

Save to `docs/acceptance-criteria.md` and commit on branch `docs/scope-lock`.

---

### Task M6 — Commit and push to GitHub

- Merge branch `docs/scope-lock` into `main` via PR
- Push `main` to GitHub under the `dmhub-dev` organisation
- Confirm all three docs (`scope.md`, `user-journeys.md`, `acceptance-criteria.md`) are visible on GitHub

---

## Tuesday — TypeScript types + API contracts

### Task T1 — Write all shared domain types in `@glee/types`

Create the following files in `packages/types/src/`. Each must be a clean TypeScript file — no runtime code, no imports from outside `@glee/types`.

**`booking.ts`**
```ts
export type BookingStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'no_show'

export type ReservationType =
  | 'standard_table'
  | 'vip_table'
  | 'bottle_only'
  | 'full_package'

export interface Booking {
  id: string
  venueId: string
  userId: string
  reservationType: ReservationType
  status: BookingStatus
  tableCategory: string
  minimumSpend: number
  depositPaid: boolean
  fullPaymentPaid: boolean
  guestCount: number
  notes?: string
  createdAt: string
  updatedAt: string
  actingUserId: string // required for audit log
}
```

**`event.ts`**
```ts
export interface TicketTier {
  id: string
  name: string
  price: number
  quantity: number
  quantityRemaining: number
  description?: string
}

export interface Event {
  id: string
  vendorId: string
  venueId: string
  title: string
  description: string
  date: string
  startTime: string
  endTime?: string
  ticketTiers: TicketTier[]
  flyerPortraitUrl?: string
  flyerSquareUrl?: string
  status: 'draft' | 'pending_approval' | 'live' | 'rejected' | 'past'
  createdAt: string
  updatedAt: string
}
```

**`menu.ts`**
```ts
export type MenuCategory =
  | 'whisky'
  | 'vodka'
  | 'champagne'
  | 'gin'
  | 'cocktails'
  | 'mixers'
  | 'food'
  | 'packages'

export interface MenuItem {
  id: string
  venueId: string
  category: MenuCategory
  name: string
  description?: string
  price: number
  imageUrl?: string
  available: boolean
  upsellSuggestions?: string[] // array of MenuItem ids
}

export interface MenuBundle {
  id: string
  venueId: string
  name: string
  description?: string
  items: string[] // array of MenuItem ids
  price: number
  available: boolean
  validForDates?: string[] // ISO date strings
}
```

**`venue.ts`**
```ts
export interface TableCategory {
  id: string
  name: string
  capacity: number
  minimumSpend: number
  depositAmount: number
  requiresFullPayment: boolean
  count: number
}

export interface Venue {
  id: string
  vendorId: string
  name: string
  description: string
  location: string
  heroBannerUrl?: string
  galleryUrls?: string[]
  tableCategories: TableCategory[]
  bookingRules?: string
  status: 'active' | 'inactive' | 'pending_approval'
}
```

**`user.ts`**
```ts
export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'operations_manager'
  | 'commercial_manager'
  | 'finance'
  | 'vendor'
  | 'vendor_staff'
  | 'customer_support'
  | 'content_manager'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  vendorId?: string // only present for vendor and vendor_staff roles
  createdAt: string
}
```

Export everything from `packages/types/src/index.ts`.

Acceptance: `import type { Booking, UserRole } from '@glee/types'` resolves in all three apps without errors.

---

### Task T2 — Write the permissions map in `@glee/utils`

Create `packages/utils/src/auth/permissions.ts`.

Define a `ROLE_PERMISSIONS` map that lists what each role can do. Use this structure:

```ts
import type { UserRole } from '@glee/types'

export type Permission =
  | 'events:read'
  | 'events:create'
  | 'events:edit_own'
  | 'events:edit_any'
  | 'events:approve'
  | 'events:delete'
  | 'venues:read'
  | 'venues:create'
  | 'venues:edit_own'
  | 'venues:edit_any'
  | 'venues:approve'
  | 'bookings:read_own'
  | 'bookings:read_all'
  | 'bookings:create'
  | 'bookings:manage'
  | 'bookings:override'
  | 'menus:read'
  | 'menus:edit_own'
  | 'menus:edit_any'
  | 'menus:approve'
  | 'users:read'
  | 'users:manage'
  | 'finance:read'
  | 'finance:export'
  | 'reports:read'
  | 'media:upload'
  | 'media:manage'
  | 'system:admin'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: ['*'], // all permissions
  // define remaining roles based on CLAUDE.md role matrix
  ...
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role]
  return perms.includes('*') || perms.includes(permission)
}
```

Fill in all 9 roles with their correct permissions based on the role matrix in `CLAUDE.md`.

---

### Task T3 — Design and document the bookings API contract

Create `docs/api/bookings.md`.

Document the following endpoints with full request and response shapes typed against `@glee/types`:

- `GET /bookings` — list bookings (filtered by role: vendor sees own, admin sees all)
- `GET /bookings/:id` — single booking detail
- `POST /bookings` — create a new booking
- `PATCH /bookings/:id/status` — update booking status (ops/admin only)
- `POST /bookings/:id/override` — manual override with audit log entry

For each endpoint document:
- Method and path
- Required role(s)
- Request body or query params (typed)
- Success response shape (typed)
- Error responses (400, 401, 403, 404, 409 for double-booking)

---

### Task T4 — Design and document the events API contract

Create `docs/api/events.md`.

Document:
- `GET /events` — public listing with filters (date, venue, status)
- `GET /events/:id` — public event detail
- `POST /events` — vendor creates event (status starts as `draft`)
- `PATCH /events/:id` — vendor edits own event
- `POST /events/:id/submit` — vendor submits for approval
- `POST /events/:id/approve` — admin approves (changes status to `live`)
- `POST /events/:id/reject` — admin rejects with reason

---

### Task T5 — Design and document the venues and menus API contract

Create `docs/api/venues.md` and `docs/api/menus.md`.

For venues document:
- `GET /venues` — public listing
- `GET /venues/:id` — full club profile (tables, menu, availability)
- `POST /venues` — vendor creates venue
- `PATCH /venues/:id` — vendor edits own venue

For menus document:
- `GET /venues/:id/menu` — full menu for a venue
- `POST /venues/:id/menu/items` — vendor adds menu item
- `PATCH /venues/:id/menu/items/:itemId` — vendor edits item (price, availability)
- `DELETE /venues/:id/menu/items/:itemId` — vendor removes item
- `POST /venues/:id/menu/bundles` — create a bundle or package

---

### Task T6 — Write TanStack Query key files in `@glee/api`

Create the following in `packages/api/src/queries/`:

For each domain (`bookings`, `events`, `menus`, `venues`, `users`) create a `[domain].ts` file that exports:
- A `[domain]Keys` query key factory object
- A typed `queryFn` for each GET endpoint (use `fetch` — the real API client comes later)
- Placeholder `mutationFn` stubs for all write operations

Example pattern for one domain:
```ts
export const bookingKeys = {
  all: ['bookings'] as const,
  byVenue: (venueId: string) => ['bookings', 'venue', venueId] as const,
  byId: (id: string) => ['bookings', id] as const,
}
```

Stub queryFns can throw `new Error('Not implemented')` for now — the shape matters, not the implementation.

Export everything from `packages/api/src/index.ts`.

---

## Wednesday — Wireframes (public-facing pages)

> Wednesday tasks produce written wireframe specifications in markdown. These are not code — they are descriptions of layout, content hierarchy, and interaction states that will guide the UI build in week 2.

---

### Task W1 — Wireframe spec: home page

Create `docs/wireframes/home.md`.

Describe the layout and content for the home page. Include:

- Hero section: headline, subheadline, primary CTA (discover events / book a table)
- Featured events section: how event cards are displayed, what information each card shows
- Featured clubs section: venue cards with key info visible
- How the page behaves when there are no featured events or clubs (empty states)
- Mobile layout considerations (what stacks, what collapses)
- Navigation header: what links appear for logged-out vs logged-in users

---

### Task W2 — Wireframe spec: events listing page

Create `docs/wireframes/events-listing.md`.

Describe:
- Filter and search controls (by date, venue, price, availability)
- Event card layout — what fields are always visible (name, date, venue, price range, status)
- Sold out state on a card
- Pending approval state (should not be visible to public)
- Pagination or infinite scroll approach
- Empty state when no events match filters

---

### Task W3 — Wireframe spec: event detail page

Create `docs/wireframes/event-detail.md`.

Describe:
- Hero section (flyer, event name, date, venue)
- Ticket tier list — name, price, quantity remaining, sold out indicator
- Buy flow entry point — what happens when user clicks "buy"
- What is shown when all tiers are sold out
- Venue info section (link to club profile)
- Mobile layout

---

### Task W4 — Wireframe spec: club profile page

Create `docs/wireframes/club-profile.md`.

This page must display everything listed in `CLAUDE.md` under "What each club page must display". Describe the layout for:

- Venue overview (hero image, name, description, location)
- Available tables section — each table category card showing: name, capacity, minimum spend, availability status (available / sold out / requires approval)
- Prepaid vs pay-on-arrival label per table
- Bottle menu section — categories, items, prices
- Food menu section (shown only if venue has food menu)
- Add-ons section
- Timing and reservation rules
- Primary CTA — reserve a table

---

### Task W5 — Wireframe spec: club booking flow

Create `docs/wireframes/club-booking.md`.

Describe the multi-step booking flow as a series of steps:

**Step 1 — Select table**
- Table category options with minimum spend and availability
- Sold out and requires-approval states
- Guest count input

**Step 2 — Bottle pre-order (optional)**
- Menu displayed by category
- Add to order interaction
- Running total visible

**Step 3 — Add-ons and notes**
- Optional add-ons
- Special requests / notes field

**Step 4 — Review and confirm**
- Full order summary
- Prepaid vs pay-on-arrival distinction clearly labelled
- Confirmation CTA

Describe what happens at each step if the user goes back.

---

### Task W6 — Wireframe spec: reservation checkout

Create `docs/wireframes/checkout.md`.

Describe:
- Order summary (table, bottles, add-ons, total)
- Payment section — deposit only vs full payment (based on venue rules)
- Guest details form (name, email, phone)
- Confirmation screen — what the user sees immediately after booking
- What confirmation information is shown (booking reference, status, next steps)
- Error states (payment failed, table no longer available)

---

### Task W7 — Wireframe review against acceptance criteria

Review all 6 wireframe docs against `docs/acceptance-criteria.md`.

For each acceptance criterion, confirm which wireframe page it is covered by. If any criterion is not covered by any wireframe, add a note to the relevant wireframe doc describing what needs to be added.

Create `docs/wireframes/review-notes.md` listing:
- Any gaps found
- Any ambiguities that need a decision before build starts
- Any acceptance criteria that require backend behaviour not yet documented in the API contracts

---

## Thursday — Wireframes (vendor + admin flows)

### Task TH1 — Wireframe spec: vendor dashboard

Create `docs/wireframes/vendor-dashboard.md`.

Describe:
- Navigation structure (sidebar or top nav — pick one and justify)
- Dashboard home — summary stats visible on landing (upcoming events, pending bookings, recent activity)
- Quick action buttons (create event, update menu, view bookings)
- Approval state banner — if vendor has items pending approval, surface this prominently
- Mobile layout — vendor staff will use this on phones at the venue

---

### Task TH2 — Wireframe spec: vendor event creation flow

Create `docs/wireframes/vendor-event-create.md`.

Describe the full event creation flow as steps:

**Step 1 — Basic info**
- Event name, description, date, start/end time, venue selection

**Step 2 — Ticket tiers**
- Add multiple tiers (name, price, quantity)
- Remove tier interaction

**Step 3 — Media**
- Flyer upload — portrait and square variants required
- Upload validation feedback (file size, resolution, format)
- Preview before submitting

**Step 4 — Review and submit**
- Full summary
- Save as draft vs submit for approval — both options clearly presented
- What the vendor sees after submitting (pending approval state)

Describe the draft state — vendor can return and edit a draft at any time before submitting.

---

### Task TH3 — Wireframe spec: vendor menu management

Create `docs/wireframes/vendor-menu.md`.

Describe:
- Menu overview — all categories listed, item count per category
- Add item form — category, name, description, price, image, availability toggle
- Edit item inline or via modal — pick one approach
- Availability toggle — immediate visual feedback (item dims when unavailable)
- Add bundle / package — select multiple items, set bundle price
- Scheduled publishing — set a menu to go live on a specific date

---

### Task TH4 — Wireframe spec: vendor booking management

Create `docs/wireframes/vendor-bookings.md`.

Describe:
- Booking list — filterable by status, date, table category
- Booking card — what info is visible in the list view
- Booking detail view — full booking info, customer notes, order summary
- Confirm / decline interaction — confirmation prompt before status change
- No-show marking
- Status badge for each booking status from `BookingStatus` type

---

### Task TH5 — Wireframe spec: admin moderation screen

Create `docs/wireframes/admin-moderation.md`.

Describe:
- Pending approvals queue — events and venues awaiting review
- Item detail view — admin sees full submission before deciding
- Approve interaction
- Reject interaction — requires a rejection reason field
- Content manager view — media library, flagged uploads
- Filter queue by type (events / venues / menus)

---

### Task TH6 — Wireframe spec: admin reporting screen

Create `docs/wireframes/admin-reports.md`.

Describe:
- Summary metrics visible at the top (total bookings, revenue, active vendors, events this week)
- Bookings table — filterable by venue, date range, status
- Transaction log — every completed checkout with booking reference
- Export interaction — what formats are available (CSV minimum)
- Role visibility note — finance role sees payment data, ops role sees booking data, no overlap

---

### Task TH7 — Component inventory

Create `docs/component-inventory.md`.

Review all wireframe docs and list every distinct UI component needed across the entire site. Format as a table:

| Component | Used in | Package | Priority |
|---|---|---|---|
| EventCard | web: events listing, home | @glee/ui | High |
| BookingCalendar | web: club booking, vendor: availability | @glee/ui | High |
| ... | ... | ... | ... |

Mark priority as High (needed in week 2 build), Medium (week 3), or Low (later).

Separate components that are shared (go in `@glee/ui`) from those that are app-specific (stay in the app's own `components/` folder).

---

## Friday — Design system + governance + week review

### Task F1 — Set up design tokens in `@glee/ui`

In `packages/ui/src/globals.css`, define the full set of CSS custom properties for the Glee brand:

- Colour palette — primary, secondary, accent, surface, border, error, success, warning colours
- Typography scale — font sizes, weights, line heights
- Spacing scale — padding and gap values used consistently
- Border radius values
- Transition durations

These tokens are the single source of truth. No app should define its own colour or typography values.

Also configure `tailwind.config.ts` in `packages/ui` to extend the default theme with these tokens so Tailwind utility classes reflect the brand.

---

### Task F2 — Install remaining shadcn components

Based on the component inventory from Task TH7, install all shadcn components needed for the week 2 build. Run from `packages/ui`:

```bash
pnpm dlx shadcn@latest add [component-name]
```

At minimum ensure these are installed and exported from `@glee/ui`:
`button`, `input`, `textarea`, `form`, `label`, `select`, `checkbox`, `radio-group`, `switch`, `dialog`, `alert-dialog`, `sheet`, `popover`, `command`, `badge`, `card`, `separator`, `table`, `dropdown-menu`, `toast`, `toaster`, `avatar`, `skeleton`, `tabs`, `progress`, `calendar`, `date-picker`

Do not edit the generated files in `components/ui/` directly. Create wrapper components for any customisation.

---

### Task F3 — Write the image standards document

Create `docs/image-standards.md`.

Document the following standards for the platform:

**Event flyers**
- Required variants: portrait (2:3 ratio) and square (1:1)
- Minimum resolution: define in pixels
- Maximum file size: define in MB
- Safe zone for text: margins where text must not appear (to avoid cropping)
- No blurry or low-quality uploads — define what "low quality" means in measurable terms

**Venue images**
- Hero banner: define exact dimensions
- Gallery images: define dimensions and minimum count per venue
- Low-light photography guidance (nightlife venues will have dark images)

**Menu item images**
- Minimum width and height
- Background: plain or transparent preferred
- Naming convention: `{type}-{venueId}-{timestamp}.{ext}`

**Platform rules**
- Accepted formats: JPEG, PNG, WebP only
- Compression: define maximum file size after compression
- Watermark policy: define if and when platform watermarks are applied
- Fallback images: define what placeholder is shown for each asset type when no image is uploaded
- CDN/storage path convention

---

### Task F4 — Write the role and permissions matrix document

Create `docs/role-matrix.md`.

Produce a full permissions matrix as a table with roles as columns and permissions as rows. Use ✓ for allowed and — for not allowed.

Base the matrix on the `ROLE_PERMISSIONS` map written in Task T2. The document should be readable by a non-technical operations manager — avoid code, use plain language for permission names.

Also document:
- Approval flows for sensitive edits (who must approve what before it goes live)
- Audit log requirements — which actions must be logged
- Named account ownership — which roles own which parts of the system
- Recovery account requirement — there must always be at least one active `super_admin`

---

### Task F5 — Set up Google Workspace folder structure

Create `docs/google-workspace-structure.md` documenting the agreed folder structure for the team:

```
Glee (Shared Drive)
├── Product
│   ├── PRDs
│   ├── Roadmaps
│   ├── UX reviews
│   └── Release notes
├── Engineering
│   ├── Architecture
│   ├── API docs
│   ├── Credentials register
│   ├── Deployment docs
│   └── Bug tracker exports
├── Design
│   ├── UI files
│   ├── Brand assets
│   ├── Image standards
│   └── Copy bank
├── Operations
│   ├── Booking SOPs
│   ├── Dispute handling
│   ├── Venue onboarding
│   └── Vendor training
├── Commercial
│   ├── Partner contracts
│   ├── Pricing sheets
│   ├── Venue agreements
│   └── Campaign calendars
├── Finance
│   ├── Reconciliation
│   ├── Payout logs
│   ├── Payment integrations
│   └── Invoicing templates
└── Governance
    ├── Permissions matrix
    ├── Handover checklist
    ├── System ownership register
    ├── Risk log
    └── Acceptance testing sign-off
```

Rules to document:
- All folders live in a Shared Drive, not personal drives
- Access is role-based — document which team role accesses which folder
- Version control on key documents (scope, contracts, role matrix)
- No single-person dependency — every folder has at least two people with access

Then create the actual folder structure in Google Drive following this document.

---

### Task F6 — Week 1 review

Create `docs/week1-review.md`.

Go through every task in this file. For each task mark it as:
- ✓ Complete
- ~ Partially complete (describe what is missing)
- ✗ Not started (describe the blocker)

Then check every deliverable against the Phase 1 and Phase 2 acceptance criteria from the workplan:

**Phase 1 (scope lock) — check all of these are complete:**
- [ ] Final feature scope document exists and is committed
- [ ] All 7 user journeys documented
- [ ] Acceptance criteria written for each journey
- [ ] Dependency map between website and app phase documented
- [ ] API contracts written for bookings, events, venues, menus

**Phase 2 (UX redesign) — check all wireframe specs are complete:**
- [ ] Home page
- [ ] Events listing
- [ ] Event detail
- [ ] Club profile
- [ ] Club booking flow
- [ ] Reservation checkout
- [ ] Vendor dashboard
- [ ] Vendor event creation
- [ ] Vendor menu management
- [ ] Vendor booking management
- [ ] Admin moderation
- [ ] Admin reporting

**Design system:**
- [ ] Tokens defined in `@glee/ui`
- [ ] shadcn components installed
- [ ] Image standards documented
- [ ] Role matrix documented
- [ ] Google Workspace set up

List any items that are incomplete and note what is needed before week 2 build starts.

---

## Notes for the agent

- Work through tasks in the order listed — each day's tasks depend on the previous day's output.
- All written documents (scope, wireframes, API contracts) go in `docs/` at the repo root.
- All code output (types, query keys, package config) goes in the correct `packages/` location.
- Never write application UI code this week — that starts in week 2.
- Commit at the end of each day on a branch named `week1/[day]` (e.g. `week1/monday`).
- Do not commit directly to `main` — open a PR for each day's branch.
- Do not add AI co-author attribution to any commit.
- After completing each task, briefly state what was created and where it was saved before moving to the next task.
