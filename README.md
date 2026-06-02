# Glee Client

Single Vite React app for the public Glee event website, logged-in customer account, and authenticated role-based operations dashboards.

This project is intentionally **one app**, not a monorepo. Public users, customers, admins, vendors, vendor staff, finance, support, and super admins all enter the same frontend and are routed by authentication role and permissions from the backend.

## Stack

- React 18
- Vite 5
- TypeScript
- React Router
- TanStack Query
- Tailwind CSS
- Radix UI primitives
- React Hook Form + Zod
- React Toastify
- React Paystack
- Recharts
- Lucide icons

## Requirements

- Node.js `>=18`
- pnpm `>=9`
- Glee backend running locally or remotely

The local backend default used during development is:

```txt
http://localhost:8003
```

## Setup

Install dependencies:

```bash
pnpm install
```

Create local environment config:

```bash
cp .env.example .env.local
```

Example local values:

```env
VITE_API_BASE_URL=http://localhost:8003
VITE_CDN_BASE_URL=
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxx
VITE_ANALYTICS_ID=
```

Start the dev server:

```bash
pnpm dev
```

If the default port is occupied, Vite will automatically use the next available port.

## Scripts

```bash
pnpm dev
pnpm type-check
pnpm build
pnpm preview
```

- `pnpm dev`: starts Vite locally.
- `pnpm type-check`: runs TypeScript without emitting files.
- `pnpm build`: runs TypeScript and creates a production build in `dist/`.
- `pnpm preview`: serves the built production bundle locally.

Run this before handing off changes:

```bash
pnpm type-check
pnpm build
```

## App Areas

The frontend has three main surfaces.

### Public Website

Unauthenticated users can browse events and purchase tickets.

Routes:

```txt
/                      Public event/home page
/events/:eventId       Public event detail and guest ticket purchase
/checkout              Public checkout route
/login                 Login for all authenticated roles
/signup                Customer signup and email OTP confirmation
```

Relevant files:

```txt
src/public/
src/public/routes/
src/public/components/
```

### Customer Account

Logged-in normal users use `/app`. This is separate from the operational dashboard.

Routes:

```txt
/app                   Customer dashboard
/app/events            Customer event browsing
/app/events/:eventId   Customer event detail and ticket purchase
/app/tickets           Customer purchased tickets
/app/wallet            Customer wallet and top-up
/app/profile           Customer profile, security, notifications, password
```

Relevant files:

```txt
src/customer/CustomerLayout.tsx
src/customer/dashboard/
src/customer/events/
src/customer/tickets/
src/customer/wallet/
src/customer/profile/
```

Customer behavior:

- Can view active, postponed, and sold-out events.
- Sold-out events are visible but cannot be purchased.
- Ticket remaining counts are not shown to customers.
- Can pay with wallet or Paystack.
- Can buy menu add-ons with tickets when the event is purchasable.
- Can manage profile details, 2FA preference, notification preferences, and password.
- Can sign up from `/signup`; the account is activated after email OTP confirmation.

### Operations Dashboard

Company roles, vendors, vendor staff, finance, support, and super admin use `/dashboard`.

Routes:

```txt
/dashboard
/dashboard/events
/dashboard/events/new
/dashboard/events/:eventId
/dashboard/events/:eventId/edit
/dashboard/bookings
/dashboard/menu-pricing
/dashboard/sales-reports
/dashboard/calendar
/dashboard/settings
/dashboard/users
/dashboard/roles
/dashboard/audit-logs
/dashboard/profile
/dashboard/locations/:locationId
```

Relevant files:

```txt
src/routes/
src/components/layout/
src/components/events/
```

Dashboard access is role-gated in:

```txt
src/app/App.tsx
src/components/auth/ProtectedRoute.tsx
```

## Roles And Routing

Authentication state lives in:

```txt
src/lib/auth/AuthContext.tsx
```

The login route redirects by role:

- `user` goes to `/app`
- operational roles go to `/dashboard`

Operational dashboard roles currently include:

```txt
super_admin
admin
operations_manager
commercial_manager
finance
vendor
vendor_staff
customer_support
content_manager
```

Normal customer role:

```txt
user
```

Route protection is handled through `ProtectedRoute`:

```tsx
<ProtectedRoute roles={['user']}>
  <CustomerDashboardPage />
</ProtectedRoute>
```

If a user hits a route their role cannot access, they are redirected back to their correct home area.

## API Layer

API code is centralized under:

```txt
src/api/
src/api/client.ts
src/api/queries/
```

Important query modules:

```txt
src/api/queries/auth.ts
src/api/queries/events.ts
src/api/queries/tickets.ts
src/api/queries/wallet.ts
src/api/queries/profile.ts
src/api/queries/users.ts
src/api/queries/roles.ts
src/api/queries/audit-logs.ts
src/api/queries/bookings.ts
src/api/queries/menus.ts
src/api/queries/locations.ts
src/api/queries/categories.ts
```

Use existing hooks before adding new fetch logic. For example:

```tsx
const { data: events = [], isLoading } = useEvents()
const purchase = usePurchaseTicket()
```

The shared API client:

- prepends `VITE_API_BASE_URL`
- attaches bearer tokens by default
- supports `skipAuth` for public endpoints
- refreshes access tokens on `401`
- throws `ApiError` for failed responses

## Environment Variables

Defined in `.env.example`:

```env
VITE_API_BASE_URL=
VITE_CDN_BASE_URL=
VITE_PAYSTACK_PUBLIC_KEY=
VITE_ANALYTICS_ID=
```

Use `VITE_API_BASE_URL` for the backend origin only, not the `/api/v1` prefix.

Correct:

```env
VITE_API_BASE_URL=http://localhost:8003
```

Incorrect:

```env
VITE_API_BASE_URL=http://localhost:8003/api/v1
```

## Styling And UI

Global design tokens and Tailwind helpers are in:

```txt
src/ui/globals.css
tailwind.config.ts
```

Shared UI components are in:

```txt
src/ui/components/ui/
```

Common imports:

```tsx
import { Button, Input, Skeleton, Tabs, useToast } from '@glee/ui'
import { Calendar, Ticket } from 'lucide-react'
```

Theme state is in:

```txt
src/app/providers.tsx
```

Current themes:

```txt
dark
light
```

Customer layout exposes the theme selector in:

```txt
src/customer/CustomerLayout.tsx
```

Design notes:

- Use existing `bg-admin-*`, `text-admin-*`, `border-admin`, and `shadow-admin` utilities for dashboard/customer surfaces.
- Use `neon-pink` only as the primary accent, not as the whole page palette.
- Keep mobile layouts first-class. Most customer pages should be usable on phones.
- Use Lucide icons inside buttons and compact actions.
- Avoid showing operational/admin-only data on customer pages.

## Event UX Rules

Customer event pages:

- show `active`, `postponed`, and `sold_out`
- do not show ticket remaining counts
- show sold-out badges clearly
- disable ticket/menu/payment controls for sold-out events
- use `/app/events/:eventId` for logged-in customers
- use `/events/:eventId` for public guest users

Admin/vendor event pages:

- can show operational metrics such as ticket sales progress
- can access create/edit flows when role allows it
- use `/dashboard/events`

## Payments

There are two customer purchase paths:

1. Wallet payment through the backend ticket purchase endpoint.
2. Paystack payment through a backend-generated payment intent.

Customer ticket hooks live in:

```txt
src/api/queries/tickets.ts
```

Wallet hooks live in:

```txt
src/api/queries/wallet.ts
```

Paystack public key comes from:

```env
VITE_PAYSTACK_PUBLIC_KEY
```

## Project Structure

```txt
src/
  api/                 API client, query hooks, mutations
  app/                 App routes and providers
  components/          Shared app components
  customer/            Logged-in user/customer account
  lib/                 Auth helpers, schemas, utilities, legacy helpers
  public/              Public website and guest event purchase
  routes/              Dashboard/operations routes
  types/               Shared local types
  ui/                  Local UI component library and global styles
  utils/               Generic utilities
```

## Adding A Page

1. Add the page under the correct app area:
   - public: `src/public/routes/`
   - customer: `src/customer/`
   - dashboard: `src/routes/`

2. Add or reuse API hooks under `src/api/queries/`.

3. Register the route in:

```txt
src/app/App.tsx
```

4. Add navigation only in the correct layout:
   - public navigation in public components
   - customer navigation in `CustomerLayout`
   - dashboard navigation in admin layout/sidebar

5. Run:

```bash
pnpm type-check
pnpm build
```

## Troubleshooting

### Login works but the user lands on the wrong page

Check:

```txt
src/routes/login.tsx
src/lib/auth/AuthContext.tsx
src/app/App.tsx
```

The backend role name must match the frontend role union.

### API requests are going to the wrong URL

Check `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8003
```

Restart Vite after changing env vars.

### Customer cannot see events

Check:

```txt
src/api/queries/events.ts
src/customer/events/index.tsx
```

The customer list currently includes active, postponed, and sold-out events.

### Paystack does not open

Check:

```env
VITE_PAYSTACK_PUBLIC_KEY
```

Also confirm the backend Paystack secret key is configured and the ticket endpoint returns an `authorization_url`.

### Build passes but Vite warns about large chunks

This is a warning, not a failure. The current app has large chart/dashboard dependencies. Use route-level lazy imports and consider manual chunks later if bundle size becomes a priority.
