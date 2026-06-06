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
GOOGLE_CALENDAR_ID=oppasto6@gmail.com
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
touch tmp/restart.txt   # triggers Passenger reload
```

### Option B — Build on server via SSH

```bash
ssh user@pasto.hair
cd ~/public_html/pasto-hair
npm install
npm run build
touch tmp/restart.txt
```

> Note: Shared hosting may have LVE (CPU/memory) limits that kill `next build`.
> If it fails, use Option A (build locally, upload).

---

## Restart After Code Changes

```bash
touch ~/public_html/pasto-hair/tmp/restart.txt
```

Passenger watches this file and reloads the Node process.

---

## Verify Deploy

Hit these URLs after each deploy:

| URL | Expected |
|---|---|
| `https://pasto.hair/` | Homepage (dark, Pasto Hair brand) |
| `https://pasto.hair/admin` | Payload CMS admin login |
| `https://pasto.hair/healthz` | `{"status":"ok","db":"reachable",...}` |
| `https://pasto.hair/api/payload/users` | Payload REST API (returns 401 without auth) |

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
6. Open [Google Calendar](https://calendar.google.com/) → find the calendar `oppasto6@gmail.com` → Settings → **Share with specific people** → add the service account email with **Make changes to events** (Editor) permission.
7. Set `GOOGLE_CALENDAR_ID=oppasto6@gmail.com`.

**Env vars to set:**
```
GOOGLE_CALENDAR_ID=oppasto6@gmail.com
GOOGLE_CALENDAR_CLIENT_EMAIL=<service-account-email>
GOOGLE_CALENDAR_PRIVATE_KEY=<private-key-with-literal-newlines-or-\n-escaped>
```

> When these vars are absent the booking flow still works — availability returns [] (no busy blocks) and calendar events are skipped. Set them before going live.

### Resend setup

1. Sign up at [resend.com](https://resend.com) and create an API key (Sending Access).
2. Verify your sending domain (or use Resend's sandbox `onboarding@resend.dev` for initial testing — note: sandbox only delivers to the account owner email).
3. Set `RESEND_API_KEY=re_...` (your API key).
4. Set `EMAIL_FROM=noreply@yourdomain.com` — this address must belong to your verified domain. It is also used as the **owner notification recipient** (new booking alerts go to this address).

**Env vars to set:**
```
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
```

> When `RESEND_API_KEY` is absent, both `sendConfirmationEmail` and `sendOwnerNotification` log to the console instead of throwing, so the booking flow still completes successfully in dev.
