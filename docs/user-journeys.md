# Glee — User Journeys

> All 7 core user journeys for the website phase.  
> Each journey is written as a numbered step sequence with decision points and exit points.

---

## Journey 1 — User discovers an event and buys a ticket

**Entry point:** User arrives on the home page or events listing page (directly via URL, search, or social link).

**Steps:**

1. User lands on the home page. Featured events are displayed as cards with name, date, venue, and price range.
2. User clicks "View all events" or navigates to `/events`.
3. User browses the events listing. Available filter controls: date range, venue, price range, availability.
4. User applies filters or scans results. Events with no remaining tickets show a "Sold out" label.
5. User clicks an event card. They are taken to the event detail page (`/events/:eventId`).
6. Event detail page shows: flyer image, event name, date, start time, venue name (linked to club profile), description, and ticket tier list.
7. Each ticket tier shows: tier name, price, quantity remaining. Sold-out tiers show "Sold out" and a disabled buy button.

**Decision point — are any tiers available?**
- If all tiers are sold out → "Sold out" is shown across the page. No purchase CTA is available. User can navigate to the venue profile or browse other events.
- If at least one tier is available → User selects a tier and clicks "Buy tickets".

8. User is prompted to log in or create an account if not authenticated.
9. User selects quantity (within the tier's remaining stock).
10. User is taken to checkout (`/checkout`).
11. Checkout shows: event name, tier name, quantity, unit price, total price. User enters payment details.
12. Payment is processed.

**Decision point — payment outcome:**
- If payment succeeds → User is shown a confirmation screen with booking reference, event details, and next steps. Confirmation email is sent.
- If payment fails → User sees an error message with the reason. They can retry or change payment method.

**Exit point:** Confirmation page with booking reference. Email confirmation sent.

---

## Journey 2 — User books a club table

**Entry point:** User navigates to a club profile page (`/clubs/:clubId`) directly or from the events listing/home page.

**Steps:**

1. User lands on the club profile page. They see: venue overview (hero image, name, description, location), available table categories, bottle menu, food menu (if applicable), add-ons, timing and reservation rules.
2. Each table category card shows: category name, capacity, minimum spend, availability status (available / sold out / requires approval), and prepaid vs pay-on-arrival flag.

**Decision point — table availability:**
- If all tables are sold out → "Sold out" is shown per category. No booking CTA is available for that category.
- If a category "requires approval" → Booking proceeds but is confirmed by the venue before finalised.
- If a table is available → User clicks "Reserve a table" CTA.

3. User is prompted to log in if not authenticated.
4. User enters the booking flow (`/clubs/:clubId/book`).
5. **Step 1 — Select table:** User selects a table category, enters guest count, and confirms minimum spend.
6. **Step 2 — Bottle pre-order (optional):** Menu is displayed by category. User can add items to the order. Running total is shown.
7. **Step 3 — Add-ons and notes:** User selects optional add-ons and enters any special requests.
8. **Step 4 — Review and confirm:** Full order summary is shown with pricing breakdown and payment type (prepaid vs pay-on-arrival).
9. User confirms and is taken to checkout.
10. Checkout shows order summary and payment section. Deposit-only or full payment depends on venue configuration.
11. Payment is processed.

**Decision point — payment outcome:**
- If payment succeeds → Booking is created with status `awaiting_payment` (if deposit only) or `confirmed` (if full payment). Confirmation screen is shown.
- If payment fails → Error message shown. User can retry.

**Decision point — requires approval:**
- If table category requires approval → Booking is created with status `pending`. User is informed that the venue will confirm within X hours.

**Exit point:** Confirmation screen with booking reference and status. Email sent.

---

## Journey 3 — User selects bottles or packages

**Entry point:** User is inside the club booking flow at Step 2 (Bottle pre-order), or browsing the venue menu directly from the club profile page.

**Steps:**

1. User reaches the bottle pre-order step in the booking flow. The menu is displayed by category: whisky, vodka, champagne, gin, cocktails, mixers, packages.
2. Each item shows: name, description, price, availability status.

**Decision point — item availability:**
- If an item is marked unavailable → It is greyed out and cannot be added.
- If an item is available → User clicks "Add to order".

3. User adds items. A running total is shown in a sticky order summary panel.
4. User can remove items from the running order.
5. User can view bundle packages that group multiple items at a combined price.
6. User clicks "Continue" to proceed to the next step.

**Decision point — empty pre-order:**
- If user adds nothing → Step 2 is skipped without blocking the flow. A "No bottles" option is shown.

**Exit point:** User proceeds to Step 3 (Add-ons and notes) with or without pre-ordered bottles.

---

## Journey 4 — User views live menu with pricing

**Entry point:** User navigates to a club profile page. Menu is displayed below the table availability section.

**Steps:**

1. User lands on the club profile page.
2. Menu section is divided into categories: bottle categories (whisky, vodka, etc.), cocktails, mixers, food (if applicable), packages.
3. Each category shows all items with name and price visible without any action required.
4. Sold-out items are shown with a "Sold out" label but are not hidden.
5. User can browse by scrolling or by clicking a category anchor/tab.
6. Package bundles are shown in a dedicated section with the bundle price and included items listed.

**Decision point — no menu configured:**
- If the venue has not configured a menu → A placeholder message is shown: "Menu coming soon."

**Exit point:** User has viewed the menu. They can proceed to book a table or navigate away.

---

## Journey 5 — Vendor posts an event

**Entry point:** Vendor logs in and lands on the vendor dashboard (`/` in the vendor app). Vendor role must be `vendor` or `vendor_staff` (with event creation permission).

**Steps:**

1. Vendor clicks "Create event" from the dashboard quick actions.
2. **Step 1 — Basic info:** Vendor enters event name, description, date, start time, end time (optional), and selects the venue.
3. **Step 2 — Ticket tiers:** Vendor adds at least one ticket tier (name, price, quantity). Multiple tiers can be added. Tiers can be removed.
4. **Step 3 — Media:** Vendor uploads event flyer. Portrait (2:3) and square (1:1) variants are required. Upload validation enforces file size, resolution, and format. A preview is shown before proceeding.
5. **Step 4 — Review and submit:** Full summary is shown.

**Decision point — save or submit:**
- If vendor clicks "Save as draft" → Event is saved with status `draft`. Vendor can return and edit at any time.
- If vendor clicks "Submit for approval" → Event status changes to `pending_approval`. Vendor sees a "Pending approval" banner on their dashboard.

6. Admin reviews the event in the moderation queue.

**Decision point — admin decision:**
- If admin approves → Event status changes to `live`. Vendor is notified.
- If admin rejects → Event status changes to `rejected` with a rejection reason. Vendor is notified and can edit and resubmit.

**Exit point:** Event is live on the public events listing, or vendor is awaiting approval/has received rejection feedback.

---

## Journey 6 — Vendor updates their club offering

**Entry point:** Vendor logs in to the vendor dashboard and navigates to the menu management section or venue settings.

**Steps:**

1. Vendor navigates to "Menu" in the sidebar.
2. Menu overview shows all categories with item count per category.
3. Vendor can add a new menu item: selects category, enters name, description, price, uploads image (optional), sets availability.
4. Vendor can edit an existing item inline or via modal: updates any field, toggles availability.
5. If vendor toggles an item to unavailable → Item is immediately marked unavailable (optimistic update). Customers see it as sold out.
6. Vendor can add a bundle/package: selects multiple items, sets bundle name and price.
7. Vendor can set a menu item or bundle to go live on a specific scheduled date.
8. Vendor navigates to "Availability" to manage table categories.
9. Vendor can update table category minimum spend, deposit, and capacity settings.

**Decision point — changes saved:**
- All menu edits are saved immediately (no approval required for menu changes).
- Table category structure changes may require admin approval (TBD — flag for clarification).

**Exit point:** Menu and availability are updated and reflected on the public club profile page.

---

## Journey 7 — Admin reviews and approves content

**Entry point:** Admin logs in to the admin panel and navigates to the moderation screen.

**Steps:**

1. Admin sees the pending approvals queue. Queue lists all events and venues awaiting review.
2. Queue is filterable by type: events, venues, menus.
3. Admin clicks a pending item to view full submission details.
4. Admin reviews all submitted information: event details, flyer images, ticket tiers, or venue profile.

**Decision point — admin decision:**
- If admin clicks "Approve" → Content status changes to `live`. Vendor is notified. Content appears on the public site.
- If admin clicks "Reject" → Admin is required to enter a rejection reason. Status changes to `rejected`. Vendor is notified with the rejection reason and can edit and resubmit.

5. Admin can filter the report screen to view all completed transactions.
6. Admin can view and export booking reports.

**Decision point — content manager view:**
- Content manager role can review media submissions (banners, uploaded images) separately from the moderation queue.

**Exit point:** Moderation queue is cleared. Approved content is live. Rejected content is returned to the vendor with feedback.
