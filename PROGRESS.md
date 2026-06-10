# Pasto Hair Rebuild — Progress Log

## Status: 🟢 LIVE at https://pasto.hair — deployed to Namecheap cPanel (2026-06-09). Booking + Google Calendar invites working.

---

## Deployment — LIVE (2026-06-09)

Deployed to Namecheap Stellar shared hosting (cPanel, **LiteSpeed** web server — not Apache — with the CloudLinux/Phusion Passenger Node loader `lsnode.js`). Host: `server377`, user `pastvucd`, app root `/home/pastvucd/repositories/pasto-hair`, data dir `/home/pastvucd/pasto-data`.

### Deploy model that works
- **Build locally, upload `.next`** (shared-host LVE memory limits kill `next build` on the server). Build with `next build --webpack` (Turbopack panics on the venv symlinks). Zip excludes `.next/cache` **and** `.next/dev` → ~3.9 MB (a stray `.next/dev/` from a past `next dev` had bloated it to 240 MB).
- Upload `next-build.zip` to app root via File Manager → `rm -rf .next && unzip -q next-build.zip`.
- Restart authoritatively with the CloudLinux selector (NOT `touch tmp/restart.txt`, which is unreliable on LiteSpeed):
  ```
  /sbin/cloudlinux-selector restart --json --interpreter nodejs \
    --app-root repositories/pasto-hair --domain pasto.hair
  ```
  ⚠️ The `--app-root`/`--domain` must be exact — a typo returns `{"result":"success"}` but restarts nothing.
- App stderr (crash/runtime errors) → `/home/pastvucd/repositories/pasto-hair/stderr.log`. Check it first when the site errors but the app runs manually.

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
- 1 staff member: "Pasto", calendarId: `oppasto6@gmail.com`, role: owner
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

**56 unit tests — all passing.** Test runner: Vitest.

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

## Current `main` — 7 commits

```
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

### Deploy (DONE)
- [x] Deployed to Namecheap cPanel (Node 24.15.0) — site live at https://pasto.hair
- [x] Node 24 selected in cPanel "Setup Node.js App"
- [x] Private data dir created: `/home/pastvucd/pasto-data/media/`
- [x] Env vars set (`.env` + `.htaccess` SetEnv)
- [x] Migrations run + DB seeded on server
- [x] `/healthz` returns `{"status":"ok","db":"reachable"}`
- [ ] **Create first Payload admin user at `/admin`** (still pending — `users: 0`)

### Integrations
- [x] **Google Calendar — WORKING via OAuth2.** Service account on a personal Gmail (`farfarvip2003@gmail.com`) **cannot invite attendees** (needs Workspace Domain-Wide Delegation → 403 on `events.insert` with attendees). Switched to OAuth2 user delegation: OAuth Desktop client (ID `431451096136-...`), consent screen **published to Production** (so refresh token doesn't expire), one-time consent as the owner → refresh token in `.env` as `GOOGLE_OAUTH_CLIENT_ID/_CLIENT_SECRET/_REFRESH_TOKEN`. `getCalendarClient()` prefers OAuth, falls back to service account. Target calendar = **"CUTS"** (`27b3...@group.calendar.google.com`).
- [ ] Resend: create API key, verify sending domain, set `RESEND_API_KEY` + `EMAIL_FROM` (booking still completes without it — emails just log to console)
- [ ] Footer social links: replace placeholder `href` values with real Instagram/Facebook/X URLs

### Security / cleanup follow-ups
- [ ] **Rotate the OAuth refresh token** — it was printed in the terminal/chat during setup. Revoke at myaccount.google.com/permissions, re-run `oauth-consent.cjs`, restart. (Risk is low — transcript only, not a public repo.)
- [ ] Rotate the **Google service-account key** — its private key was exposed earlier (likely already auto-revoked by Google secret-scanning; OAuth is now the active path anyway).
- [ ] Delete server helper/test scripts: `test-*.cjs`, `oauth-consent.cjs`, `update-calendar-key.cjs`, `inject-htaccess-env.cjs`, and the "TEST …" events on the CUTS calendar.
- [ ] Delete junk file `zi2NTVxv` (268 MB) in repo root.

### Future phases
- [ ] Real gallery — upload photos/videos in Payload admin, wire `galleryItems` collection to gallery page
- [ ] Multi-staff support (Phase 2 spec)
- [ ] Booking reschedule/cancel flow
- [ ] Testimonials section on homepage
- [ ] Customer reminders (Phase 3 spec)
- [ ] CSRF protection + rate limiting on booking endpoint (Phase 2 spec)
- [ ] Audit log for admin settings changes

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
