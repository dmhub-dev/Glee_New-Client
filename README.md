# Glee Client

Single Vite React app for the public Glee event site and authenticated role-based dashboard.

## Scripts

- `pnpm dev` starts the local dev server.
- `pnpm type-check` runs TypeScript checks.
- `pnpm build` creates the production build.

## Routes

- `/` public event listing.
- `/events/:eventId` public event detail and ticket purchase.
- `/checkout` public checkout route.
- `/login` dashboard login.
- `/dashboard` authenticated dashboard.
- `/dashboard/events`, `/dashboard/calendar`, `/dashboard/settings` authenticated role-gated sections.
