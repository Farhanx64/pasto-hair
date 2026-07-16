# Pasto Hair Rebuild — Progress Log

> ⚠️ **This repository is PUBLIC.** Do not record credentials, secrets, server
> hostnames/usernames/absolute paths, account identifiers, personal email
> addresses, or details of unpatched vulnerabilities in this file. Use
> placeholders (`<cpanel-user>`, `<host>`) and keep the real values and any
> security findings in the private project notes.

## Status: 🟢 LIVE at https://pasto.hair — deployed to Namecheap cPanel (2026-06-09). Booking + Google Calendar invites working.

---

## Deployment — LIVE (2026-06-09)

Deployed to Namecheap Stellar shared hosting (cPanel, **LiteSpeed** web server — not Apache — with the CloudLinux/Phusion Passenger Node loader `lsnode.js`). App root `/home/<cpanel-user>/repositories/pasto-hair`, data dir `/home/<cpanel-user>/pasto-data`. (Real host and username are in the private notes.)

### Deploy model that works
- **Build `.next` on a GitHub Actions Linux runner, server pulls the tarball** (`.github/workflows/deploy-build.yml`, commit `1be51ae`). Shared-host LVE memory limits kill `next build` on the server, and a Windows-built `.next` is **not portable** to Linux (throws "client reference manifest does not exist"). The workflow runs on `ubuntu-latest`, generates Payload types, builds, then publishes `next-build.tar.gz` (excluding `.next/cache`) as the `latest-build` release; the server curls it.
- Build uses `next build --webpack` (Turbopack panics on the venv symlinks).

> **Superseded:** the original model was "build locally on Windows, upload `next-build.zip` via File Manager, `rm -rf .next && unzip`". Kept here only as history — do **not** build on Windows.
- Restart authoritatively with the CloudLinux selector (NOT `touch tmp/restart.txt`, which is unreliable on LiteSpeed):
  ```
  /sbin/cloudlinux-selector restart --json --interpreter nodejs \
    --app-root repositories/pasto-hair --domain pasto.hair
  ```
  ⚠️ The `--app-root`/`--domain` must be exact — a typo returns `{"result":"success"}` but restarts nothing.
- App stderr (crash/runtime errors) → `<app-root>/stderr.log`. Check it first when the site errors but the app runs manually.

### Bugs fixed during deploy (root causes)
1. **Turbopack symlink panic** → build script uses `next build --webpack`.
2. **503, app never started** → LiteSpeed's `lsnode.js` loads `server.js` via `require()`, which throws `ERR_REQUIRE_ASYNC_MODULE` on an ESM module with **top-level await**. Fix: wrap startup in `app.prepare().then(...)` — no TLA. (Manual `node server.js` worked because ESM entry points allow TLA — that's why it was hard to spot.)
3. **`PORT` is a Unix socket path**, not a number — `parseInt` → `NaN` → `listen(NaN)` binds nothing. `server.js` now detects socket vs TCP.
4. **Old static site shadowed the app** — `public_html` was full of the old Website Builder site (`index.html`, etc.); LiteSpeed served those for `/` while only unmatched paths (`/healthz`) reached Node. Fix: moved everything except `.htaccess` + `.well-known` to `~/old-site-backup/`.
5. **Booking showed no services** — page fetched `/api/payload/services`; Payload's REST base is `/api` → corrected to `/api/services` + `/api/addons`.
6. **Payload 403 on anonymous reads** — added `access: { read: () => true }` to Services + Addons collections (the booking page reads them without auth).
7. **Stale 403/JSON served by LiteSpeed cache** — added `.htaccess` rule to bypass cache for `/api/`: `RewriteRule ^api/ - [E=Cache-Control:no-cache]`.
8. **Webpack build cache served stale config** — when iterating, do a **clean** `rm -rf .next` build or the access/config change silently won't ship.

### Env on the server
- `.env` at app root holds secrets; Next loads it at startup. **Gotcha:** `.env` had Windows CRLF — a trailing `\r` on `GOOGLE_CALENDAR_ID` caused a 404 (`...google.com\r`). Cleaned with `sed -i 's/\r$//' .env`.
- Critical env vars are **also** injected as `SetEnv` in the `.htaccess` `<IfModule Litespeed>` block (the reliable LiteSpeed delivery mechanism — `inject-htaccess-env.cjs` copies them from `.env`).

---

## Repo

**github.com/Farhanx64/pasto-hair-modern** (primary)
**github.com/Farhanx64/pasto-hair** — `modernized` branch (mirror, force-pushed 2026-06-08)

Old site reference: `/home/pasto/pasto-hair/old/` (cloned from github.com/Farhanx64/pasto-hair `main` — do not copy its markup)

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.7 — App Router, TypeScript strict |
| CMS / Admin | Payload CMS 3.85.0 |
| Database | SQLite via `@payloadcms/db-sqlite` (libSQL prebuilt binary — no native compile) |
| Styling | Tailwind CSS v4 |
| Animation | `motion` library |
| Icons | Lucide React |
| Calendar | Google Calendar API — **OAuth2 user-delegated** (acts as owner, so it can invite attendees). Service account kept as read-only fallback. |
| Email | Resend |
| Hosting target | Namecheap Stellar shared hosting — cPanel "Setup Node.js App" (Phusion Passenger) |
| Node requirement | ≥ 20.9.0 (host confirmed: 20.20.2, 22.22.2, 24.1 available) |

---

## What Was Built

### Phase 1 — Scaffold (commit `5f44257`)
- Next.js 16 + Payload CMS 3 + SQLite wired together
- Route groups: `(frontend)` for public pages, `(payload)` for admin
- `server.js` — Passenger-compatible startup file for cPanel
- `/healthz` — DB health check endpoint
- Brand design tokens in `globals.css`: `#0a0a0c` bg, `#bb86fc` violet accent, `#e8dcc4` champagne
- Fonts: Oswald (headings) + Montserrat (body) via `next/font/google`
- `DEPLOYMENT.md` — full cPanel runbook
- Verified locally: build clean, `/healthz` ok, `/admin` 200, `/api/users` 403

### Phase 2 — Payload Collections + Seed (commit `85df647`, PR #7)
**Collections:** Services, Addons, Staff, AvailabilityRules, BlockedDates, Bookings, GalleryItems, Testimonials (+ existing Users, Media)

**Globals:** BusinessSettings, BookingSettings

**Seeded data:**
- 7 services: Classic Taper $35/45m, Skin Fade $35/50m, Clean Up $20/20m, Beard Sculpt/Face Shave $10/30m, Top Trim $10/20m, Wax/Thread $10/5m, Perm $100/120m
- 4 add-ons: Beard Sculpt $10/30m, Top Trim $10/20m, Wax/Thread $10/20m, Hot Towel $10/10m
- 7 availability rules (all days, two shifts each — shifts split at 20:00 for evening surcharge)
- 1 staff member: "Pasto", role: owner (calendarId comes from `SEED_STAFF_CALENDAR_ID`)
- BusinessSettings: name "Pasto Hair", timezone `America/New_York`
- BookingSettings: 15-min slots, $10 surcharge at 20:00, fail-closed

Seed script at `scripts/seed.ts` — idempotent, safe to re-run.

### Phase 3 — Booking Engine + Tests (commit `512ebbb`, PR #8)
Pure TypeScript modules in `src/lib/booking/`:

| File | Purpose |
|---|---|
| `types.ts` | Shared interfaces (Shift, BusyBlock, PriceSummary, BookingRequest, etc.) |
| `slots.ts` | 15-min slot generation, shift boundaries, blocked dates, disabled days |
| `pricing.ts` | Price = service + addons + $10 surcharge if start ≥ 20:00 NY time |
| `conflicts.ts` | Google Calendar busy block overlap filter (exact boundary = allowed) |
| `idempotency.ts` | UUID v4 generation + duplicate submissionId detection |
| `index.ts` | Re-exports all modules |

**70 unit tests across 4 files — all passing** (as of 2026-07-15; was 56 at the time of PR #8, grew with later phases). Test runner: Vitest — `npx vitest run`.

### Phase 4 — API Routes (commit `de3e01a`, PR #9)
- `GET /api/availability?date=&serviceId=&addonIds=` — reads Payload rules + Google Calendar freebusy → returns valid slots. Respects `failBehavior` (open/closed) from BookingSettings global.
- `POST /api/bookings` — full server-side validation, idempotency check, slot revalidation, calendar event creation, Payload booking record, Resend confirmation email.

### Phase 6 — Integrations (commit `acdd4ab`, PR #10)
- `src/lib/calendar/index.ts` — Google Calendar service account integration, DST-safe NY→UTC conversion, `extendedProperties` idempotency, `import "server-only"` guard
- `src/lib/notifications/index.ts` — Resend HTML email templates, customer confirmation + owner notification, `import "server-only"` guard, console stub when unconfigured
- No credentials in `.next/static` client bundle (verified)
- `DEPLOYMENT.md` updated with Calendar + Resend wiring instructions

### Phase 5 — Public UI (commit `6be741b`, PR #11)
**Design system:** Modern Dark Cinema + Glassmorphism (ui-ux-pro-max MASTER.md at `design-system/pasto-hair/`)

**Components:**
- `components/ui/Button.tsx` — primary (violet gradient pill, glow), secondary, ghost; 44px+ touch targets
- `components/ui/GlassCard.tsx` — `rgba(255,255,255,0.04)` bg, `blur(12px)`, violet hover
- `components/layout/Navbar.tsx` — fixed glass header, logo, desktop + mobile nav, active state via `usePathname`
- `components/layout/Footer.tsx` — brand image, tagline, social links (TODO: real URLs), Book Now CTA, sticky mobile bottom bar
- `components/layout/PageWrapper.tsx` — `pt-16` navbar offset

**Pages:**
- `/` — Video hero (hero-video.webm), value props, featured services from Payload, gallery preview, footer
- `/pricing` — Server-rendered from Payload services + addons, evening surcharge note
- `/gallery` — Placeholder grid with CTA (real gallery = Phase 3 expansion)
- `/booking` — 5-step client flow: service → addons → date/time → customer info → confirm. Live availability fetch, live price with surcharge, submit to `/api/bookings`, success screen.

**Assets copied from old site:**
- `public/hero-video.webm`
- `public/logo.png`
- `public/footer-brand.png`

### ui-ux-pro-max Audit (commit `4710543`)
10 issues found and fixed:
- Skip-to-content link added
- Button `sm` touch target: 40px → 44px
- `role="alert"` + `aria-live` on all error/warning messages
- Step indicator `aria-label` + `aria-current="step"`
- Navbar mobile menu: `max-height` animation → GPU-composited `transform`+`opacity`
- `heroFadeIn` + `scrollPulse` keyframes defined in `globals.css`
- Global `prefers-reduced-motion` override added
- Input focus ring explicit violet color: `focus:ring-[rgba(187,134,252,0.5)]`
- Active nav state via `usePathname` + `aria-current="page"`
- Logo link `aria-label`

---

## Current `main` — 27 commits

Most recent first (see `git log` for the full list; the eight below the rule are the original Phase 1–6 scaffold):

```
0a8a425  Booking receipt reads admin global; add mobile sticky receipt
69fd295  Generate Payload types in CI before building
1be51ae  Add GitHub Actions workflow to build .next on Linux
13690ad  Add migration for discount schema fields
612fc30  Redesign frontend and revamp pricing with multi-service discount
931f0f4  docs: log cPanel deployment, fixes, and OAuth calendar in PROGRESS.md
61f0dba  feat: OAuth2 user-delegated calendar auth so bookings can invite attendees
ebc8e4a  chore: gitignore deployment build artifacts (next-build.zip, *.zip)
f7a89a5  fix: public read access for services and addons collections
69e115a  fix: booking page hits /api/services not /api/payload/services
be412de  docs: document LiteSpeed TLA/socket gotchas and fix stale calendar setup
dad560b  chore: drop legacy url.parse, let Next handle URL parsing
---
4710543  fix: ui-ux-pro-max audit — accessibility, touch targets, animation, focus
6be741b  feat: public pages and UI (#5)
acdd4ab  feat: complete Google Calendar + Resend integrations (#6)
de3e01a  feat: availability and booking API routes (#4)
512ebbb  feat: custom booking engine + 56 unit tests (#3)
85df647  feat: Payload collections, globals, migrations, seed (#2)
d90ed71  feat: ui-ux-pro-max design system
5f44257  feat: scaffold Next.js 16 + Payload CMS 3 + SQLite baseline
```

---

## What Still Needs Doing

> **Verified against the live site + git on 2026-07-15.** Several items below were stale and have been corrected — see "Corrections" at the end of this section.

### Deploy (DONE)
- [x] Deployed to Namecheap cPanel — site live at https://pasto.hair (live `/healthz` reports Node v24.16.0)
- [x] Node 24 selected in cPanel "Setup Node.js App"
- [x] Private data dir created: `/home/<cpanel-user>/pasto-data/media/`
- [x] Env vars set (`.env` + `.htaccess` SetEnv)
- [x] Migrations run + DB seeded on server
- [x] `/healthz` returns `{"status":"ok","db":"reachable"}`
- [x] **First Payload admin user created** — `/api/users/init` → `{"initialized":true}`, `users: 1`. First-user creation is sealed.

### Integrations
- [x] **Google Calendar — WORKING via OAuth2.** A service account on a personal Gmail **cannot invite attendees** (that needs Workspace Domain-Wide Delegation → 403 on `events.insert` with attendees). Switched to OAuth2 user delegation: an OAuth Desktop client with the consent screen **published to Production** (so the refresh token doesn't expire), plus a one-time consent as the calendar owner → credentials live in `.env` as `GOOGLE_OAUTH_CLIENT_ID` / `_CLIENT_SECRET` / `_REFRESH_TOKEN`. `getCalendarClient()` prefers OAuth and falls back to the service account. Target calendar ID is set via `GOOGLE_CALENDAR_ID`. (Account identifiers are in the private notes.)
- [ ] 🔴 **Resend — NOT configured. The live site sends NO emails.** `sendConfirmationEmail` / `sendOwnerNotification` (`src/lib/notifications/index.ts`) fall back to a console stub when `RESEND_API_KEY` is missing, and both are called fire-and-forget from `app/api/bookings/route.ts` — so a booking **succeeds silently**: the customer gets no confirmation and the owner gets no notification. Fix: create the API key, verify the sending domain, set `RESEND_API_KEY` + `EMAIL_FROM` in `.env` **and** the `.htaccess` `SetEnv` block, restart via cloudlinux-selector. **This is the biggest user-visible gap.**
- [ ] Footer social links: replace placeholder `href` values with real Instagram/Facebook/X URLs (`components/layout/Footer.tsx:41,50,57`)

### Security / cleanup follow-ups

> Security findings, credential status, and infrastructure detail are tracked in
> the **private project notes**, not here — this repo is public. The list below
> is intentionally non-specific.

- [ ] Credential rotation — see private notes.
- [ ] Booking endpoint hardening: rate limiting + anti-automation (was previously filed under "Future phases" as "CSRF + rate limiting").
- [ ] Booking concurrency: add a uniqueness guard so two simultaneous requests cannot take the same slot.
- [ ] Payload hardening — set `serverURL`, add it to `csrf`, set `auth.cookies.secure: true` on `Users` (Payload defaults to `secure: false`).
- [ ] Delete leftover server helper/test scripts and the "TEST …" calendar events. (None are tracked in this repo — server-side only.) **Keep `inject-htaccess-env.cjs`** — it copies env vars from `.env` into the `.htaccess` `SetEnv` block, which is how LiteSpeed delivers them. Keep `oauth-consent.cjs` until the credential rotation is done.

### Future phases
- [ ] Real gallery **content** — the page is already wired (`app/(frontend)/gallery/page.tsx` reads `gallery-items` via Payload); it currently shows demo placeholders from `scripts/seed-demo-content.ts`. Upload real photos/videos in Payload admin.
- [ ] Multi-staff support (Phase 2 spec)
- [ ] Booking reschedule/cancel flow
- [ ] Testimonials section on homepage
- [ ] Customer reminders (Phase 3 spec)
- [ ] Audit log for admin settings changes

### Fixed 2026-07-15
- [x] **Lead time + booking window enforced.** `minLeadTimeMinutes` / `maxBookingWindowDays` were defined in BookingSettings but read by nothing; they're now threaded from the global into both `/api/availability` and `/api/bookings`, and `generateSlots` compares against the current time. Enforcement is opt-in via a `now` param so the pure-function tests stay deterministic. +7 tests.
- [x] **Email templates escape user input.** All user-supplied values run through `esc()`; `mailto:`/`tel:` hrefs use `encodeURI`.
- [x] **`/healthz` returns a minimal body.** `{status:"ok",db:"reachable"}` on success, bare `{status:"error"}` + 503 on failure; detail goes to the server log.
- [x] **Owner notifications go to `OWNER_EMAIL`,** not to `EMAIL_FROM` (which must sit on the verified sending domain and is therefore a no-reply). Falls back to `EMAIL_FROM` when unset.

### Corrections to this log (2026-07-15)
This file had drifted ~20 commits behind reality. Fixed above:
- Claimed the first admin user was still pending (`users: 0`) — **false**, one exists and first-user creation is sealed (`/api/users/init` → `initialized:true`).
- Claimed the gallery was an unwired placeholder grid — it reads Payload; only the content is demo data.
- Listed junk file `zi2NTVxv` for deletion — already gone.
- Said "Current main — 7 commits" — actually 27.
- Documented the build-locally-and-upload deploy model — superseded by the Actions Linux build.

---

## Key File Locations

| What | Path |
|---|---|
| Design system | `design-system/pasto-hair/MASTER.md` |
| Page overrides | `design-system/pasto-hair/pages/` |
| Booking engine | `src/lib/booking/` |
| Calendar lib | `src/lib/calendar/index.ts` |
| Email lib | `src/lib/notifications/index.ts` |
| Payload config | `payload.config.ts` |
| Collections | `collections/` |
| Globals | `globals/` |
| Seed script | `scripts/seed.ts` |
| cPanel runbook | `DEPLOYMENT.md` |
| Env template | `.env.example` |
| Passenger startup | `server.js` |

---

## Dev Commands

```bash
# Start dev server
npm run dev

# Run tests
npm test

# Generate Payload types (after schema changes)
npm run generate:types

# Create + run DB migration (after collection changes)
node_modules/.bin/payload migrate:create --name <name>
node_modules/.bin/payload migrate

# Seed database
node --import tsx/esm scripts/seed.ts

# Build for production
npm run build

# Start production server (Passenger style)
NODE_ENV=production node server.js
```
