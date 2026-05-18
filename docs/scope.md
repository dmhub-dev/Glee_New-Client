# Glee — Feature Scope

> Phase: Website rebuild  
> Version: 1.0  
> Date: 2026-05-18

---

## In scope — Website phase

### Event listing and discovery
Users can browse all live events on the platform. Events are filterable by date, venue, price range, and availability. Each event has a dedicated detail page.

### Ticket purchase flow
Users can select a ticket tier and complete a purchase. Multiple ticket tiers per event are supported (e.g. early bird, general, VIP). Sold-out tiers are clearly indicated and cannot be selected.

### Club profile pages
Each venue has a public-facing profile page displaying its overview, available tables, bottle menu, food menu (if applicable), add-ons, timing and reservation rules, and prepaid vs pay-on-arrival flags.

### Table reservation and booking
Users can reserve a table at a venue by selecting a table category, specifying guest count, and completing payment. The booking flow is multi-step with back-navigation preserved. Double-booking is prevented server-side.

### Bottle pre-order and package selection
During the booking flow, users can pre-order bottles and packages from the venue's menu. A running total is shown throughout. Add-ons can also be selected.

### Menu and pricing display
Venue menus are displayed in full on the club profile page, organised by category. Pricing is always visible. Sold-out items are marked but remain visible.

### Vendor event creation and management
Vendors can create, edit, and manage their events. Events move through a defined status lifecycle: draft → pending approval → live or rejected. Vendors can save drafts, preview before submitting, and see approval state at all times.

### Vendor menu and availability management
Vendors can add, edit, and remove menu items. Availability can be toggled per item. Menu bundles and packages can be created. Scheduled publishing is supported.

### Admin moderation and approval
Admins can review event and venue submissions via a moderation queue. Admins can approve or reject submissions with a required rejection reason. The queue is filterable by content type.

### Admin reporting
Admins can view platform-wide metrics including total bookings, revenue, active vendors, and events. A full transaction log is available and exportable. Role-based visibility applies (finance sees payment data, ops sees booking data).

---

## Out of scope — App phase only

### Mobile application
A separate mobile UX rebuild is planned for the app phase. This is out of scope for the website phase and must not be built or scaffolded here.

### Push notifications
In-app push notifications are an app-phase feature. Email and in-app confirmation notifications are in scope for the website phase.

### In-app wallet and payment experience
The in-app wallet and any native payment flows are app-phase only. Website payments go through an external payment gateway (Stripe or equivalent).

### Post-purchase in-app flows
Post-purchase experiences beyond confirmation (e.g. event countdown, in-app ticket display) are app-phase features.

---

## Dependency map — Website phase to app phase

| Dependency | Detail |
|---|---|
| **Authentication system** | Auth must be built on the website and reused by the app. The auth model, token format, and role system defined here must not be changed for the app phase. |
| **Booking data model** | The `Booking` type and `BookingStatus` enum defined in `@glee/types` are the source of truth. The app phase must not modify these schemas — any additions must be backwards-compatible. |
| **Design tokens** | CSS custom properties and Tailwind token extensions defined in `@glee/ui/globals.css` and `tailwind.config.ts` carry forward to the app phase. The app phase uses the same design system. |
| **API contracts** | API endpoint shapes and response types documented in `docs/api/` define the backend contract. Both website and app phases consume the same API. |
| **User roles** | The `UserRole` type and `ROLE_PERMISSIONS` map in `@glee/utils` define the full permission model. The app phase inherits these roles — no new roles should be introduced without updating the website implementation first. |
