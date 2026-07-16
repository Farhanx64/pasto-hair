# Pasto Hair — cPanel Deployment Runbook

## Prerequisites (check before deploying)

1. **Node version** — In cPanel > Setup Node.js App, confirm Node **20.9.0 or higher** is selectable.
   Next.js 16 requires `engines: { node: ">=20.9.0" }`. If the host only offers Node 18, downgrade to Next 15.
2. **Private persistent directory** — Create a directory *outside* `public_html`, e.g. `/home/<user>/pasto-data/`.
   This is where the SQLite DB and media uploads live. It must survive between deploys.

---

## cPanel Setup Node.js App Settings

| Field | Value |
|---|---|
| Node.js version | 20.x or 22.x (highest available ≥ 20.9.0) |
| Application mode | Production |
| Application root | `public_html/pasto-hair` (or your chosen subdir) |
| Application URL | `pasto.hair` (or subdomain) |
| Application startup file | `server.js` |

---

## Environment Variables (set in cPanel or `.env` on server)

```
PAYLOAD_SECRET=<long random string — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
DATABASE_URI=file:/home/<user>/pasto-data/pasto.db
DATA_DIR=/home/<user>/pasto-data
MEDIA_DIR=/home/<user>/pasto-data/media
NEXT_PUBLIC_SITE_URL=https://pasto.hair
NODE_ENV=production

# Google Calendar (fill when ready)
GOOGLE_CALENDAR_ID=<dedicated-group-calendar-id>@group.calendar.google.com
GOOGLE_CALENDAR_CLIENT_EMAIL=
GOOGLE_CALENDAR_PRIVATE_KEY=

# Email (Resend)
EMAIL_FROM=
RESEND_API_KEY=
```

---

## Build & Deploy Steps

### Option A — Build locally, upload build output (recommended for shared hosting)

```bash
# 1. On your local machine:
npm install
npm run build

# 2. Upload to server (rsync or cPanel File Manager):
#    - .next/           → app root
#    - node_modules/    → app root (or run npm ci on server after uploading package.json)
#    - public/          → app root
#    - server.js        → app root
#    - package.json     → app root
#    - next.config.ts   → app root (needed for next start in some configs)
#    - .env             → app root (or set vars in cPanel UI — preferred)

# 3. On the server via SSH:
mkdir -p /home/<user>/pasto-data/media
pkill -u "$(id -u)" -f "lsnode:$HOME/repositories/pasto-hair"   # then curl the site to respawn
```

### Option B — Build on server via SSH

```bash
ssh user@pasto.hair
cd ~/public_html/pasto-hair
npm install
npm run build
pkill -u "$(id -u)" -f "lsnode:$HOME/repositories/pasto-hair"   # then curl the site to respawn
```

> In practice the server can't `npm run build` (LVE memory limits OOM-kill it) — this is why the real pipeline builds `.next` on GitHub Actions. See "Deploying — one command" above.

> Note: Shared hosting may have LVE (CPU/memory) limits that kill `next build`.
> If it fails, use Option A (build locally, upload).

---

## Deploying — one command

```bash
~/repositories/pasto-hair/scripts/deploy.sh
```

Pull → migrate → fetch the Linux build tarball → restart → verify. Each step is checked; it fails loudly rather than half-deploying, and won't report success unless `/healthz` returns the new-build body. Prefer it. The rest of this section is what it automates, for when you need to do it by hand.

## Restart After Code Changes — kill the process, don't ask

**Neither `touch tmp/restart.txt` nor `cloudlinux-selector restart` reliably cycles the app.** The selector returns `{"result":"success"}` while leaving the old process running — observed twice, once serving a cached Payload config for **1h46m**, and a typo in `--app-root`/`--domain` returns success while restarting nothing. So it can't even be trusted to fail.

What works deterministically is to kill the Node process and let LiteSpeed respawn it on the next request:

```bash
pkill -u "$(id -u)" -f "lsnode:$HOME/repositories/pasto-hair"
curl -s https://pasto.hair/healthz    # LiteSpeed spawns Node on demand
```

- **After the kill, `ps` showing no `lsnode` process is normal** — nothing exists until a request arrives. That's why you curl the site.
- **Always verify the restart actually happened**, whatever any command reported:
  ```bash
  ps -u <user> -o pid,etime,command | grep lsnode
  ```
  `etime` must have reset to near-zero. If it didn't, the restart didn't take.
- **`/healthz` is the version tell.** It returns exactly `{"status":"ok","db":"reachable"}`; a body carrying `users`/`node`/`ms` is the old build still serving.

---

## ⚠️ LiteSpeed gotcha: NO top-level await in `server.js`

LiteSpeed's Node loader (`/usr/local/lsws/fcgi-bin/lsnode.js`) loads the startup file via **`require()`**, not as an ESM entry point. Node throws `ERR_REQUIRE_ASYNC_MODULE` when `require()` hits an ESM module (`"type": "module"`) that uses **top-level await**. The app silently fails to spawn → **503 Service Unavailable**, while `node server.js` from the shell works fine (ESM entry points permit TLA).

**Rule:** keep all async startup inside `.then()` / callbacks. Never write `await app.prepare()` at the top level. See `server.js` for the correct pattern.

Errors from failed spawns land in `~/repositories/pasto-hair/stderr.log` — check there first when the site 503s but the app runs manually.

### PORT may be a Unix socket path

LiteSpeed/Passenger passes `process.env.PORT` as a **Unix socket path**, not a numeric TCP port. `parseInt(PORT)` yields `NaN` and `server.listen(NaN)` silently no-ops (app runs, binds nothing → 503). `server.js` detects socket vs. number and calls `listen()` accordingly.

---

## Verify Deploy

Hit these URLs after each deploy:

| URL | Expected |
|---|---|
| `https://pasto.hair/` | Homepage (dark, Pasto Hair brand) |
| `https://pasto.hair/admin` | Payload CMS admin login |
| `https://pasto.hair/healthz` | `{"status":"ok","db":"reachable",...}` |
| `https://pasto.hair/api/users` | Payload REST API (returns 401 without auth) |
| `https://pasto.hair/api/services` | Seeded services JSON (`docs` array) |

---

## SQLite Database

- File location: `DATA_DIR/pasto.db` (e.g. `/home/<user>/pasto-data/pasto.db`)
- **Do not** put the DB inside `public_html` — it would be publicly accessible.
- The libSQL client (`@libsql/linux-x64-gnu`) ships a prebuilt glibc binary — no native compilation needed on CloudLinux/CentOS hosts.
- To migrate to Postgres later: swap `@payloadcms/db-sqlite` for `@payloadcms/db-postgres` and update `DATABASE_URI`. Both adapters use Drizzle ORM so schema migrations carry over.

---

## Media Uploads

- Upload dir: `MEDIA_DIR` (e.g. `/home/<user>/pasto-data/media`)
- Payload serves media at `/api/media/file/<filename>` via its REST handler.
- **Do not** store media inside `public_html` (security) or inside `.next/` (wiped on rebuild).

---

## Host-Side Verification Checklist

- [ ] cPanel Node.js selector shows Node 20+ available
- [ ] `server.js` is set as the startup file
- [ ] `PAYLOAD_SECRET`, `DATABASE_URI`, `DATA_DIR`, `MEDIA_DIR`, `NEXT_PUBLIC_SITE_URL` are set
- [ ] Private data dir exists and is writable: `ls -la /home/<user>/pasto-data/`
- [ ] `/healthz` returns `{"status":"ok","db":"reachable"}`
- [ ] Payload admin is accessible and first-user setup completes
- [ ] A test media upload saves to the correct dir
- [ ] `NODE_ENV=production` is set (disables Next.js dev overlays, enables caching)

---

## Wiring Google Calendar & Resend

### Google Calendar setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → IAM & Admin → Service Accounts → **Create Service Account**.
2. Give it a name (e.g. `pasto-hair-calendar`) and click **Done**.
3. In the Google Cloud Console, go to **APIs & Services → Library** and enable the **Google Calendar API** for your project.
4. Back on the Service Account, click **Keys → Add Key → Create new key → JSON**. Download the file.
5. Open the JSON key file and copy:
   - `client_email` → set as `GOOGLE_CALENDAR_CLIENT_EMAIL`
   - `private_key` → set as `GOOGLE_CALENDAR_PRIVATE_KEY` (the full key including `-----BEGIN PRIVATE KEY-----` and newlines; on cPanel paste the literal multi-line value or replace actual newlines with `\n`)
6. Create a **dedicated calendar** (Google Calendar → "+" next to *Other calendars* → *Create new calendar*) rather than using a personal one. Then open its **Settings and sharing** → **Share with specific people** → add the service account email with **Make changes to events** (Editor) permission.
7. In that calendar's settings, copy the **Calendar ID** (looks like `...@group.calendar.google.com`) and set `GOOGLE_CALENDAR_ID` to it.

**Env vars to set:**
```
GOOGLE_CALENDAR_ID=<dedicated-group-calendar-id>@group.calendar.google.com
GOOGLE_CALENDAR_CLIENT_EMAIL=<service-account-email>
GOOGLE_CALENDAR_PRIVATE_KEY=<private-key-with-literal-newlines-or-\n-escaped>
```

> When these vars are absent the booking flow still works — availability returns [] (no busy blocks) and calendar events are skipped. Set them before going live.

### Resend setup

1. Sign up at [resend.com](https://resend.com) and create an API key (Sending Access).
2. Verify your sending domain (or use Resend's sandbox `onboarding@resend.dev` for initial testing — note: sandbox only delivers to the account owner email).
3. Set `RESEND_API_KEY=re_...` (your API key).
4. Set `EMAIL_FROM` — the **sender**. Must be on the domain you verified in step 2.
5. Set `OWNER_EMAIL` — where **new-booking alerts land**. Any mailbox; a personal gmail is fine because it is only ever a recipient, never a sender.

> **Why two variables.** `EMAIL_FROM` has to live on the Resend-verified domain, so it is normally a `noreply@` address that nobody reads. Sending owner alerts there black-holes them. `OWNER_EMAIL` is the inbox a human checks. If `OWNER_EMAIL` is unset it falls back to `EMAIL_FROM` — i.e. alerts go to the no-reply. Set it.

**Env vars to set:**
```
RESEND_API_KEY=re_...
EMAIL_FROM="Pasto Hair <noreply@pasto.hair>"
OWNER_EMAIL=you@gmail.com
```

> **Keep the quotes on `EMAIL_FROM`.** The value has spaces and angle brackets. That's fine for dotenv and fine for the app, but `source .env` from bash reads `<` as a redirect and errors out — then **silently stops loading every variable below that line**, so `OWNER_EMAIL` and `RESEND_API_KEY` come back empty with no clue why. `scripts/deploy.sh` parses `.env` instead of sourcing it and doesn't care either way, but anything you run by hand does.

Both `sendConfirmationEmail` and `sendOwnerNotification` stub to a console log when `RESEND_API_KEY` or `EMAIL_FROM` is missing, and they are called fire-and-forget from the booking route — so a misconfiguration is **silent**: bookings succeed and nobody is emailed. After wiring, always confirm with a real test booking.

> When `RESEND_API_KEY` is absent, both `sendConfirmationEmail` and `sendOwnerNotification` log to the console instead of throwing, so the booking flow still completes successfully in dev.
