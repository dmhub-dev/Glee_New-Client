# Glee — Acceptance Criteria

> Based on the 7 user journeys in `docs/user-journeys.md`.  
> Format: Given / When / Then — minimum 3 per journey covering happy path, error/edge case, and state visibility.

---

## Journey 1: User discovers an event and buys a ticket

**Given** a user is on the events listing page with at least one live event available  
**When** they click on an event card  
**Then** they are taken to the event detail page showing the flyer, event name, date, venue, and all ticket tiers with prices and remaining quantity

---

**Given** a user selects an available ticket tier and completes payment successfully  
**When** the payment is confirmed by the payment gateway  
**Then** a confirmation screen is shown immediately with a booking reference, event details, and next steps — and a confirmation email is sent to the user's address

---

**Given** all ticket tiers for an event are sold out  
**When** a user views the event detail page  
**Then** all tier buy buttons are disabled, a "Sold out" indicator is shown on each tier, and no payment flow can be initiated

---

**Given** a user is not authenticated and clicks "Buy tickets"  
**When** the buy action is triggered  
**Then** the user is redirected to login/signup and returned to the same event detail page after authenticating

---

**Given** a user attempts to buy tickets and the payment fails  
**When** the payment gateway returns a failure response  
**Then** an error message is shown explaining the failure, and the user can retry or change payment method without losing their selected tier

---

## Journey 2: User books a club table

**Given** a user is on a club profile page with at least one available table category  
**When** they click "Reserve a table" and complete all booking steps  
**Then** a booking is created, a confirmation screen is shown with booking reference and status, and a confirmation email is sent

---

**Given** a table category is marked as "sold out"  
**When** a user views the club profile page  
**Then** the sold-out category is clearly labelled "Sold out", the reserve button for that category is disabled, and available categories remain bookable

---

**Given** a table category requires venue approval  
**When** a user completes a booking for that category  
**Then** the booking is created with status `pending`, the confirmation screen informs the user that the venue will confirm their reservation, and no payment is taken until approval (or deposit logic per venue config)

---

**Given** a user attempts to book a table that becomes unavailable between step 1 and checkout  
**When** the server checks inventory at the time of booking creation  
**Then** the booking is rejected with a clear message ("This table is no longer available"), and the user is returned to step 1 to select an alternative

---

**Given** a user is in the booking flow and wants to go back  
**When** they click the back button at any step  
**Then** they return to the previous step with all previously entered data intact (guest count, bottle pre-order, add-ons)

---

## Journey 3: User selects bottles or packages

**Given** a user is at Step 2 (Bottle pre-order) in the booking flow  
**When** they add items to their order  
**Then** a running total is updated immediately and a summary panel shows all added items with individual and total prices

---

**Given** a menu item is marked as unavailable by the vendor  
**When** a user views the bottle pre-order step  
**Then** the item is shown in its category but is greyed out, cannot be added to the order, and an "Unavailable" or "Out of stock" label is displayed

---

**Given** a user reaches the bottle pre-order step and chooses not to add any items  
**When** they click "Continue" with an empty pre-order  
**Then** the flow advances to Step 3 without error, and the order summary at review reflects £0 for bottles

---

## Journey 4: User views live menu with pricing

**Given** a venue has configured a menu with items in multiple categories  
**When** a user views the club profile page  
**Then** the full menu is displayed, organised by category, with all item names and prices visible without requiring any user action

---

**Given** a menu item is marked as sold out by the vendor  
**When** a user views the club profile page  
**Then** the item remains visible in its category with a "Sold out" label, and no "Add to order" action is available for that item

---

**Given** a venue has not configured any menu items  
**When** a user views the menu section on the club profile page  
**Then** a "Menu coming soon" placeholder is shown — the section is not hidden, and no broken or empty state is rendered

---

## Journey 5: Vendor posts an event

**Given** a vendor completes all four event creation steps with valid data  
**When** they click "Submit for approval"  
**Then** the event is saved with status `pending_approval`, the vendor dashboard shows a "Pending approval" banner, and the event does not appear on the public listing

---

**Given** a vendor is creating an event and closes the browser mid-flow  
**When** they return to the vendor dashboard  
**Then** a draft of their in-progress event is listed under drafts, and all previously entered fields are preserved

---

**Given** a vendor uploads a flyer image that does not meet the resolution or file size requirements  
**When** the upload validation runs  
**Then** the upload is rejected with a clear error message specifying which requirement failed (e.g. "File too large — maximum 5 MB"), and the vendor cannot proceed until a valid image is uploaded

---

**Given** an admin rejects a vendor's submitted event  
**When** the rejection is processed  
**Then** the event status changes to `rejected`, the vendor sees the rejection reason on their dashboard, and they can edit and resubmit the event

---

## Journey 6: Vendor updates their club offering

**Given** a vendor toggles a menu item to unavailable  
**When** the toggle is activated  
**Then** the item is immediately shown as unavailable in the vendor's menu management view, and within the next page load the item appears as sold out on the public club profile page

---

**Given** a vendor edits the price of a menu item  
**When** the change is saved  
**Then** the updated price is reflected on the public club profile menu without requiring admin approval

---

**Given** a vendor attempts to delete a menu item that is part of an active bundle  
**When** the delete action is triggered  
**Then** the vendor is warned that the item is used in a bundle and must confirm the deletion, after which the bundle is also updated to reflect the removed item

---

## Journey 7: Admin reviews and approves content

**Given** a vendor has submitted an event for approval  
**When** an admin views the moderation queue  
**Then** the submitted event appears in the queue with its title, vendor name, submission date, and a link to the full submission detail

---

**Given** an admin approves a pending event  
**When** the approval is confirmed  
**Then** the event status changes to `live`, the event appears immediately on the public events listing, and the vendor receives a notification of approval

---

**Given** an admin rejects a pending event  
**When** the rejection action is triggered  
**Then** the admin is required to enter a rejection reason before the rejection can be submitted — the form cannot be submitted with an empty reason field

---

**Given** a user with the `finance` role navigates to the reporting screen  
**When** they view the transaction log  
**Then** they see full payment data including amounts and payment status — and they cannot access the moderation queue or content management tools that are restricted to `admin` and `content_manager` roles
