# Pasto Hair Website Rebuild Specification

## 1. Product Overview

Pasto Hair is a premium barbershop website for a New York-based barber brand. The current site combines a static marketing website with a custom booking system, an admin dashboard, and Google Calendar integration.

The rebuild should preserve the business logic while replacing the generated site-builder structure with a cleaner, maintainable application.

Primary goals:

- Present a sharp, premium, modern barbershop brand.
- Convert visitors into booked appointments quickly.
- Keep pricing and booking services in sync from one source of truth.
- Let the owner manage services and weekly availability without editing code.
- Prevent double-bookings by checking Google Calendar availability.
- Send customers confirmation details after successful booking.

## 2. Current Site Map

Public pages:

- `/` - Homepage with video hero, brand logo, navigation, and visual CTAs.
- `/pricing` - Dynamic pricing page generated from the booking settings.
- `/new-page` - Gallery placeholder. Currently mostly empty.
- `/booking` - Dynamic booking page with service selection, add-ons, date/time selection, and submit flow.

Admin pages:

- `/admin/login.php` - Admin login.
- `/admin/dashboard.php` - Service manager and weekly availability editor.
- `/admin/logout.php` - Ends the admin session.

Backend endpoints:

- `/booking/availability.php` - Returns Google Calendar busy blocks for a selected date.
- `/booking/submit.php` - Validates a booking request and forwards it to Google Apps Script.
- `/api.php` - Site-builder proxy/form endpoint. Not core to the custom booking flow.

## 3. Brand And UX Direction

Current brand language:

- Dark, premium, cyber/nightlife barbershop mood.
- Black and charcoal base colors.
- Purple accent color, especially `#BB86FC` and `#6D5DFC`.
- Fonts are Oswald for headings and Montserrat for body text.
- Homepage uses a fullscreen video hero, glassy navigation, scanline texture, glow effects, and animated CTA images.
- Footer tagline: "Built for sharp cuts and sharper presence."

Rebuild direction:

- Keep the high-contrast dark atmosphere, but make the layout feel more intentional than the current generated export.
- Replace image-only CTA buttons with accessible text buttons plus visual treatment.
- Keep motion purposeful: hero video, subtle gradient glow, hover states, and lightweight page-load reveals.
- Use real semantic headings and accessible form labels.
- Make booking the obvious primary action on every page.

Recommended visual system:

- Background: near-black layered gradients with subtle texture.
- Primary accent: violet/electric purple.
- Secondary accent: warm off-white or muted champagne to avoid an all-purple interface.
- Components: glass panels, thin glowing borders, strong typography, and large tappable buttons.
- Mobile priority: fast booking flow, sticky "Book Now" CTA, simplified nav.

## 4. Core Content Model

### Service

Represents a bookable primary service.

Fields:

- `id`: stable slug, unique.
- `name`: customer-facing service name.
- `price`: numeric dollar amount.
- `duration_minutes`: integer duration used for booking slot calculations.
- `active`: boolean. Inactive services should not appear on public pricing or booking pages.
- `sort_order`: integer for display ordering.
- `description`: recommended new field. Current pricing descriptions are hardcoded in `pricing/index.php`.
- `image`: optional future field for service cards.

Current services:

- Classic Taper, $35, 45 minutes.
- Skin Fade, $35, 50 minutes.
- Clean Up, $20, 20 minutes.
- Beard Sculpt or Face Shave, $10, 30 minutes.
- Top Trim, $10, 20 minutes.
- Wax/Thread, $10, 5 minutes.
- Perm, $100, 120 minutes.

### Add-On

Represents an optional extra added to a booking.

Fields:

- `id`: stable slug, unique.
- `name`: customer-facing add-on name.
- `price`: numeric dollar amount.
- `duration_minutes`: integer extra time added to appointment duration.
- `active`: boolean.
- `description`: recommended new field.

Current add-ons:

- Beard Sculpt or Face Shave, $10, 30 minutes.
- Top Trim, $10, 20 minutes.
- Wax/Thread, $10, 20 minutes.
- Hot Towel, $10, 10 minutes.

### Weekly Availability

Defines normal business hours by day.

Fields:

- `day`: sunday through saturday.
- `enabled`: whether bookings can be made on that day.
- `shifts`: list of `{ start, end }` time windows in `HH:MM` format.

Current logic supports multiple shifts in the settings file, but the admin UI currently edits up to two shifts per day.

### Blocked Date

Represents a closed day or unavailable date.

Fields:

- `date`: `YYYY-MM-DD`.
- `reason`: recommended new field for admin clarity.

Current settings support blocked dates as strings only.

### Booking Request

Payload created by the booking form and sent to the local submit endpoint.

Fields:

- `name`: customer full name.
- `email`: customer email.
- `phone`: customer phone.
- `service`: selected service name.
- `addons`: array of selected add-on names.
- `notes`: optional text.
- `timeZone`: currently `America/New_York`.
- `localDate`: selected date in `YYYY-MM-DD`.
- `localStartTime`: selected start time in `HH:MM`.
- `localEndTime`: computed end time in `HH:MM`.
- `totalPrice`: computed price including add-ons and surcharges.
- `eveningSurcharge`: boolean.
- `submissionId`: UUID used to prevent duplicate booking creation.

### Booking Response

Expected response from the booking endpoint.

Fields:

- `success`: boolean.
- `message`: customer-facing message.
- `eventId`: optional Google Calendar event ID.

## 5. Booking Business Rules

Service selection:

- Only active services are shown.
- Services display in ascending `sort_order`.
- The selected service determines the base appointment duration and base price.

Add-on selection:

- Only active add-ons are shown.
- Selected add-ons increase both total duration and total price.
- Add-on tiles should visibly toggle selected state.

Price calculation:

- `total = service.price + sum(addon.price) + applicable surcharges`.
- Current surcharge rule: bookings starting at or after 8:00 PM receive a $10 evening surcharge.
- The UI should update the visible total whenever service, add-ons, or time changes.

Time slot generation:

- Slots are generated in 15-minute increments.
- A slot is valid only if the appointment end time fits fully inside the selected shift.
- Total duration is service duration plus selected add-on durations.
- Disabled weekdays return no slots.
- Blocked dates return no slots.
- Timezone should be treated as `America/New_York`, independent of the visitor's browser timezone.

Calendar conflict logic:

- The booking page asks the backend for busy blocks for the selected date.
- Busy blocks come from Google Calendar Free/Busy.
- Any slot overlapping a busy block is removed.
- A slot that ends exactly when a busy block starts is allowed.
- A slot that starts exactly when a busy block ends is allowed.
- If availability lookup fails, the current implementation fails open and shows locally generated slots. A rebuild should either fail closed or show a clear "availability temporarily unavailable" message.

Submission logic:

- Validate required fields before submit.
- Prevent double-submit while a request is in flight.
- Revalidate service availability server-side.
- Recheck calendar conflicts at submit time before creating the event.
- Use `submissionId` idempotency so retries do not create duplicate calendar events.
- Return structured JSON for every success and failure case.

## 6. Current Data Flow

Admin settings flow:

1. Admin logs in.
2. Admin creates, edits, or toggles services.
3. Admin updates weekly availability.
4. Server validates settings.
5. Settings are saved to `data/settings.json`.
6. Pricing and booking pages read the same settings.

Booking availability flow:

1. Customer selects service, add-ons, and date.
2. Browser computes total appointment duration.
3. Browser generates slots from weekly hours and blocked dates.
4. Browser calls `/booking/availability.php?date=YYYY-MM-DD`.
5. Server calls Google Calendar Free/Busy.
6. Browser removes any slots that overlap returned busy blocks.

Booking submission flow:

1. Customer submits the booking form.
2. Browser sends JSON to `/booking/submit.php`.
3. PHP validates required fields, email, date format, time format, active service, and blocked date.
4. PHP forwards the booking payload to Google Apps Script.
5. Apps Script checks for duplicate submission ID.
6. Apps Script checks for calendar conflicts.
7. Apps Script creates a Google Calendar event.
8. Apps Script optionally invites the customer and sends a confirmation email.
9. Browser shows the returned success or error message.

## 7. Recommended Rebuild Architecture

Recommended stack:

- Next.js for the public website, booking UI, API route handlers, animation layer, and server-rendered pages.
- Payload CMS for the admin panel, content model, booking settings, services, add-ons, gallery, staff, and site settings.
- TypeScript for all application, Payload, API, booking-engine, and integration code.
- Tailwind CSS for the design system, layout, responsive styling, and reusable component variants.
- A motion layer for polished interaction design, page transitions, booking-step transitions, hero reveals, and gallery interactions.
- A Payload-supported database for persistent content and booking records.
- Google Calendar API as an integration for conflict checks, event creation, invites, and optional owner calendar visibility.

Architectural principle:

- Do not build around standardized booking software as the source of truth.
- Treat the booking engine as custom business logic owned by the application.
- Treat Payload as the business control panel.
- Treat Google Calendar as an external calendar sync target, not the place where pricing, services, or appointment rules are modeled.

Recommended application shape:

- `app/(site)/page.tsx` - Homepage.
- `app/(site)/pricing/page.tsx` - Pricing page, rendered from active Payload services and add-ons.
- `app/(site)/gallery/page.tsx` - Gallery page, rendered from Payload gallery items.
- `app/(booking)/booking/page.tsx` - Booking experience.
- `app/api/availability/route.ts` - Public availability endpoint.
- `app/api/bookings/route.ts` - Public booking submission endpoint.
- `app/(payload)/admin` or Payload's configured admin route - CMS/admin interface.
- `src/lib/booking` - Slot generation, pricing, surcharge, conflict, and idempotency logic.
- `src/lib/calendar` - Google Calendar integration.
- `src/lib/notifications` - Confirmation emails and owner notifications.

Recommended Payload collections:

- `services`: bookable services.
- `addons`: optional add-ons.
- `staff`: staff members, calendar IDs, roles, service eligibility, and optional personal availability overrides.
- `availabilityRules`: weekly hours, shifts, effective dates, and optional staff-specific rules.
- `blockedDates`: closed days, holidays, vacations, and staff-specific blocks.
- `bookings`: submitted bookings, status, selected service/add-ons, computed price, duration, customer details, calendar event ID, and submission ID.
- `galleryItems`: images/videos, captions, style tags, before/after grouping, and sort order.
- `testimonials`: customer quotes and display controls.
- `siteSettings`: logo, contact info, social links, SEO defaults, homepage copy, surcharge settings, timezone, and business metadata.

Recommended Payload globals:

- `businessSettings`: timezone, business name, address, phone, email, social URLs, and booking policy text.
- `bookingSettings`: slot interval, evening surcharge start time, evening surcharge amount, minimum lead time, maximum booking window, cancellation policy, and fail-open/fail-closed behavior.

Recommended data ownership:

- Payload is the source of truth for services, add-ons, public content, staff, local availability rules, blocked dates, and booking records.
- Google Calendar is the source of truth for real-time busy events and the synced appointment event.
- The booking endpoint writes a `bookings` record before or during calendar creation so the site has its own operational history.

Recommended frontend architecture:

- Use Server Components for static and CMS-driven page sections.
- Use Client Components only for interactive booking steps, form controls, motion, and live availability refresh.
- Use route handlers for public JSON contracts such as availability and booking submission.
- Use server actions for authenticated admin-adjacent mutations only when they stay inside the Next.js app boundary.
- Keep all slot and price calculations in shared server-side modules, with a small client-side mirror only for instant UI feedback.
- Use Tailwind design tokens for colors, spacing, typography, shadows, radii, and breakpoints.
- Keep Tailwind classes readable by extracting repeated UI patterns into typed components rather than building long one-off class strings everywhere.
- Use TypeScript strict mode and shared types for Payload documents, booking inputs, booking results, price summaries, staff availability, and calendar blocks.

Recommended custom booking engine:

- Input: service, add-ons, optional staff member, date, timezone, current settings, local availability rules, blocked dates, and Google busy blocks.
- Generate candidate slots using Payload rules.
- Filter candidate slots by total duration, blocked dates, staff eligibility, staff availability, calendar busy blocks, minimum lead time, and booking window.
- Return display-ready slots plus pricing metadata.
- On submit, re-run the same calculation server-side and reject stale selections.

Staff scaling model:

- Phase 1 can use one default staff member/calendar.
- Phase 2 should support "first available" booking across multiple staff calendars.
- Phase 2 should also support choosing a specific barber.
- A service can be eligible for all staff or a selected staff subset.
- Staff can inherit business hours and override them with personal shifts or blocked dates.

Animation and interface model:

- Keep motion in the Next.js component layer, not inside CMS content.
- Use CMS content to define sections, media, copy, and CTA labels.
- Use reusable visual components for hero, pricing cards, gallery grids, booking steps, testimonials, and CTA bands.
- Use a focused motion library or carefully scoped CSS animation utilities for step transitions, hero reveals, hover states, mobile menu transitions, and gallery interactions.
- Respect `prefers-reduced-motion` and provide non-animated fallbacks.

Recommended architecture:

- One canonical backend API for settings, pricing, availability, and booking.
- Server-side calendar integration instead of browser-side secrets.
- Database or managed storage for settings and appointments.
- Environment variables for secrets and calendar credentials.
- Admin-authenticated settings management.
- Structured logging for booking failures.
- Consistent JSON response contracts.

Recommended backend modules:

- `SettingsService`: load, validate, save services, add-ons, hours, blocked dates.
- `AvailabilityService`: generate local slots and subtract real calendar busy blocks.
- `BookingService`: validate payload, price booking, check conflicts, create calendar event.
- `NotificationService`: customer confirmation, optional owner notification.
- `AdminAuthService`: login, sessions, password management.

## 8. Public Page Requirements

### Homepage

Purpose:

- Establish brand instantly and push users toward booking.

Required sections:

- Hero with logo, short brand headline, video or strong visual background.
- Primary CTA: Book Now.
- Secondary CTA: View Pricing.
- Short value proposition, such as premium cuts, clean fades, late appointments.
- Featured services.
- Social proof or gallery preview.
- Footer with socials, contact, and booking CTA.

Expansion ideas:

- Add location, hours, and embedded map.
- Add "first time here?" section explaining the booking process.
- Add testimonials or Instagram feed.
- Add sticky mobile booking button.

### Pricing Page

Purpose:

- Give quick price transparency and route customers to booking.

Requirements:

- Read services from the same source as booking.
- Hide inactive services.
- Show service name, price, duration, and description.
- Include add-on prices.
- Include evening surcharge note.
- Include CTA beside or below the pricing table.

Expansion ideas:

- Service cards with "Book this" deep links.
- Categories: Haircuts, Beard, Enhancements, Specialty.
- Bundle suggestions.

### Gallery Page

Purpose:

- Show proof of work and style range.

Current status:

- Placeholder only.

Requirements for rebuild:

- Responsive gallery grid.
- Before/after support.
- Image captions or style tags.
- CTA after gallery sections.
- Optional Instagram/TikTok integration.

Expansion ideas:

- Filter by cut type.
- Featured transformations.
- Short video clips.

### Booking Page

Purpose:

- Complete appointment reservation with minimal friction.

Required fields:

- Full name.
- Email.
- Phone.
- Service.
- Add-ons.
- Date.
- Time.
- Notes.

Required UI behaviors:

- Service selection updates duration and total price.
- Add-on selection updates duration and total price.
- Date and service selection trigger availability refresh.
- Time dropdown shows only valid, non-conflicting slots.
- Submit button disables while request is in progress.
- Success and error messages are clear.
- The page should warn if availability cannot be checked.

Recommended enhancements:

- Step-by-step booking flow on mobile.
- Calendar-style date picker with closed days disabled.
- Show appointment summary before submit.
- Show cancellation/reschedule instructions.
- Support deposits or payment later if needed.

## 9. Admin Requirements

Authentication:

- Password-protected admin area.
- Session cookies should be HTTP-only, SameSite=Lax, and secure on HTTPS.
- Password hashes, not plain text passwords.
- Add CSRF protection in the rebuild.
- Add rate limiting or lockout for repeated failed logins.

Services manager:

- Create service.
- Edit service name, price, duration, description, active state, sort order.
- Archive instead of hard delete by default.

Add-ons manager:

- Create/edit add-ons.
- Set price, duration, active state.
- Sort order recommended.

Availability manager:

- Enable/disable days.
- Add/edit multiple shifts per day.
- Validate `HH:MM` and ensure end is after start.
- Prevent overlapping shifts.
- Manage blocked dates with optional reason.

Dashboard improvements:

- Show upcoming bookings pulled from Google Calendar.
- Show booking health status: calendar configured, API reachable, last successful booking.
- Show quick links to public booking/pricing pages.

## 10. Integrations

Google Calendar:

- Used to detect busy times and create booking events.
- Calendar timezone: `America/New_York`.
- Rebuild should use server-side credentials only.
- Secrets must live in environment variables, not committed files.

Google Apps Script:

- Current system forwards bookings to Apps Script for event creation.
- Rebuild can either keep Apps Script or replace it with direct Google Calendar API calls.
- If kept, define a strict request and response contract.

Email:

- Current Apps Script can send customer confirmation.
- Rebuild should support customer confirmation and optional owner notification.
- Email content should include service, add-ons, date, start/end time, timezone, total price, and contact instructions.

Social links:

- Footer currently includes Facebook, X, and Instagram placeholders.
- Rebuild should use real profile URLs.

## 11. Security Requirements

Must have:

- No API keys or credentials in client-side JavaScript.
- No committed secrets in config files.
- Server-side validation for every booking field.
- CSRF protection for admin POST actions.
- Admin password reset/update process.
- Escaped output for all dynamic content.
- Structured error handling without leaking internal details.

Should have:

- Rate limiting for booking submissions.
- Spam protection for booking form.
- Audit log for admin settings changes.
- Backups or version history for settings.
- Monitoring for failed calendar/API calls.

## 12. Accessibility Requirements

Must have:

- Semantic headings.
- Real labels for form fields.
- Keyboard-accessible navigation and controls.
- Visible focus states.
- Sufficient color contrast.
- Error messages associated with inputs.
- Reduced-motion support for animations.
- Text alternatives for non-decorative images.

Current issues to avoid:

- Image-only CTAs.
- Empty `tel:` link.
- Placeholder-like gallery page.
- Generated markup with unnecessary wrappers.

## 13. SEO And Metadata Requirements

Core SEO:

- Unique title and meta description per page.
- Canonical URLs.
- Open Graph title and description.
- Local business schema.
- Sitemap.
- Robots configuration if needed.

Recommended local SEO content:

- Business name.
- Service area or physical location.
- Hours.
- Booking URL.
- Service list.
- Social profile links.
- Photos.

## 14. Performance Requirements

Targets:

- Mobile-first loading.
- Minimize render-blocking CSS and JS.
- Optimize hero video with poster image, compressed formats, and reduced-motion fallback.
- Lazy-load gallery images.
- Avoid large generated builder bundles in a rebuild.
- Use responsive images.

Recommended metrics:

- Largest Contentful Paint under 2.5 seconds on good mobile connections.
- Interaction to Next Paint under 200 ms.
- Cumulative Layout Shift under 0.1.

## 15. Testing Requirements

Unit tests:

- Settings validation.
- Service and add-on price calculations.
- Slot generation.
- Busy-block overlap filtering.
- Evening surcharge rule.
- Booking payload construction.

Integration tests:

- Availability endpoint returns valid JSON.
- Booking submit endpoint rejects invalid data.
- Booking submit endpoint prevents conflicts.
- Apps Script or Calendar API returns expected response shape.

End-to-end tests:

- Customer can book a basic service.
- Customer can book service plus add-ons.
- Closed/blocked dates show no slots.
- Already-booked calendar slots are hidden.
- Double-clicking submit creates only one event.
- Admin can update service and public pricing changes.

## 16. Known Current Risks To Fix In Rebuild

- Current `architecture.md` is outdated compared with the code.
- Calendar credentials are currently stored in a PHP config file. Move them to environment variables.
- Admin POST actions do not appear to have CSRF protection.
- Gallery page is empty.
- Some generated static markup is heavy and hard to maintain.
- `data/settings.json` and defaults in `settings-schema.php` may drift if updates are made manually.
- Availability currently fails open if Google Calendar cannot be reached, which can expose unavailable slots.
- Pricing descriptions are hardcoded separately from the service settings.
- The phone icon link has an empty `tel:` target.

## 17. Suggested MVP Rebuild Scope

Phase 1:

- Create the Next.js application with Payload CMS installed and configured.
- Model services, add-ons, gallery items, site settings, booking settings, blocked dates, and a default staff member in Payload.
- Rebuild homepage, pricing, gallery, and booking pages with clean Next.js templates/components.
- Move all service descriptions into Payload service records.
- Preserve current service, add-on, availability, surcharge, and booking behavior.
- Build custom Next.js route handlers for availability and booking submission.
- Keep Google Calendar conflict checking and event creation.
- Keep confirmation emails through the selected server-side notification path.

Phase 2:

- Expand Payload admin management for add-ons, blocked dates, sort order, booking settings, staff, and health checks.
- Store every submitted booking in Payload with status, total price, calendar event ID, and submission ID.
- Add multi-staff availability and "first available" slot selection.
- Add CSRF protection, audit log, and rate limiting.

Phase 3:

- Add payments/deposits if desired.
- Add reschedule/cancel flows.
- Add customer reminders.
- Add testimonials, gallery filters, and social feed integration.

## 18. Acceptance Criteria

A rebuild is complete when:

- All public pages are responsive and visually aligned with the Pasto Hair brand.
- Pricing and booking both read from Payload services and add-ons.
- Admin can update services, add-ons, content, gallery, weekly hours, blocked dates, and booking settings without code changes.
- Booking shows only valid slots based on weekly hours, blocked dates, appointment duration, and Google Calendar conflicts.
- Booking logic lives in shared server-side modules and is re-run at submit time.
- Booking submission creates exactly one calendar event per unique submission.
- Booking submission also creates or updates a Payload booking record.
- Customer receives a confirmation email or calendar invite.
- Invalid submissions return clear errors.
- Secrets are not exposed in the browser or committed to the codebase.
- Core booking logic is covered by automated tests.

## 19. Implementation References

Official docs to use during implementation:

- Next.js App Router docs: https://nextjs.org/docs/app
- Next.js Route Handlers docs: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Payload Local API docs: https://payloadcms.com/docs/local-api/overview
- Payload Admin Panel docs: https://payloadcms.com/docs/admin/overview

## 20. Claude Code Handoff

The `ui-ux-pro-max` Claude Code skill should be used as the design and implementation accelerator for the rebuild.

Primary instruction for Claude Code:

```text
Use the ui-ux-pro-max skill. Read WEBSITE_SPECIFICATION.md first, then inspect the current public_html site to extract the existing brand, booking logic, pricing data, assets, and admin behavior. Build a new Next.js + Payload CMS version of the Pasto Hair website from scratch, preserving the booking/business logic while replacing the generated site-builder markup with a clean, scalable architecture.
```

Claude Code should optimize for:

- A premium, dark, high-conversion barbershop website.
- Strong UX and visual polish, not a generic template.
- A custom booking engine owned by the app, not by third-party scheduling software.
- Payload CMS as the admin/content/settings layer.
- Next.js as the public site, API route, animation, and booking UI layer.
- TypeScript across the full app.
- Tailwind CSS as the styling and design-system layer.
- Purposeful motion for hero, navigation, booking steps, gallery, and CTA interactions.
- Maintainable code, testable booking logic, and clear separation between content, settings, and integrations.

Non-negotiable constraints:

- Do not copy the old generated Sitejet/Webcard markup into the new build.
- Do not expose Google Calendar API keys, service account credentials, or secrets to the browser.
- Do not hardcode service descriptions separately from service data.
- Do not let pricing and booking use different sources of truth.
- Do not create calendar events without submit-time server-side validation and conflict checks.
- Do not make availability silently fail open unless the business explicitly chooses that behavior in Payload booking settings.
- Do not remove or overwrite the old site files until the new build is verified.

Recommended Claude Code workflow:

1. Audit the current site files listed in this specification.
2. Produce a concise implementation plan before scaffolding the new app.
3. Scaffold or migrate into a Next.js + Payload CMS structure.
4. Define Payload collections and globals before building public UI.
5. Seed Payload with current services, add-ons, weekly hours, blocked dates, brand assets, and site settings.
6. Build shared booking logic in strict TypeScript modules with unit tests.
7. Build API route handlers for availability and booking submission.
8. Build public pages using clean reusable TypeScript components styled with Tailwind.
9. Apply the `ui-ux-pro-max` design direction to create a distinctive visual system.
10. Run type checks, tests, linting, and browser QA.
11. Document environment variables, deployment steps, and admin usage.

Recommended first implementation milestone:

- Create a working Next.js + Payload app with Payload admin accessible.
- Add `services`, `addons`, `staff`, `availabilityRules`, `blockedDates`, `bookings`, `galleryItems`, `testimonials`, and `siteSettings`.
- Render homepage, pricing, gallery, and booking pages from Payload data.
- Implement booking slot generation and price calculation without Google Calendar first.
- Add Google Calendar conflict checking and event creation after local booking logic is tested.

Recommended second implementation milestone:

- Add multi-staff support.
- Add owner booking dashboard.
- Add booking status management: pending, confirmed, cancelled, failed.
- Add email notification templates.
- Add gallery filters, testimonials, and stronger local SEO.

Claude Code should preserve these current business rules:

- Slot interval is 15 minutes.
- Business timezone is `America/New_York`.
- Total duration equals service duration plus selected add-on durations.
- Evening surcharge currently starts at 8:00 PM and adds $10.
- Blocked dates are unavailable.
- Disabled weekdays are unavailable.
- Existing calendar busy blocks remove overlapping slots.
- Booking submission must be idempotent using a unique submission ID.

Claude Code should extract these current assets:

- Logo image from `/images/0/24031449/...png`.
- Hero video from `/images/0/24032634/...webm` or `/images/0/hero-video.webm`.
- Footer/brand image from `/images/600/24030183/...png`.
- Current CTA images only as visual reference, not as required UI controls.

Recommended environment variables for the new build:

```text
DATABASE_URI=
PAYLOAD_SECRET=
NEXT_PUBLIC_SITE_URL=
GOOGLE_CALENDAR_ID=
GOOGLE_CALENDAR_CLIENT_EMAIL=
GOOGLE_CALENDAR_PRIVATE_KEY=
EMAIL_FROM=
EMAIL_PROVIDER_API_KEY=
```

Recommended acceptance check for Claude Code:

- Public pages load on desktop and mobile.
- Payload admin can update services and pricing.
- Pricing page updates from Payload service data.
- Booking page updates from Payload service and availability data.
- Booking logic rejects stale or invalid slots server-side.
- Calendar conflicts are hidden from the time selector.
- A successful booking creates one booking record and one calendar event.
- Tests cover slot generation, pricing, surcharge, conflict filtering, and idempotency.

Paste-ready prompt for Claude Code:

```text
Use the ui-ux-pro-max skill.

We are rebuilding the Pasto Hair website from this existing public_html export. Start by reading WEBSITE_SPECIFICATION.md, then inspect the current files to verify services, pricing, booking logic, assets, and admin behavior.

Build a new Next.js + Payload CMS architecture from scratch using TypeScript, Tailwind CSS, and a polished motion layer. Payload should own services, add-ons, staff, availability rules, blocked dates, gallery items, testimonials, site settings, booking settings, and booking records. Next.js should own the public site, booking UI, route handlers, animations, and shared TypeScript booking engine.

Preserve the current business rules: 15-minute slots, America/New_York timezone, total duration = service + add-ons, $10 evening surcharge at/after 8:00 PM, blocked dates unavailable, disabled days unavailable, Google Calendar busy blocks remove overlapping slots, and booking submission must be idempotent.

Do not copy generated Sitejet/Webcard markup. Use the current site only as a reference for brand, content, assets, and behavior. Create a premium, dark, high-conversion barbershop interface with strong mobile UX, Tailwind-based design tokens, and polished motion.

Before editing, give me a concise implementation plan. Then scaffold the app, define Payload collections/globals, seed current data, build the booking engine with tests, implement availability and booking APIs, build the pages, and verify everything with type checks/tests/browser QA.
```
