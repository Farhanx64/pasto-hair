#!/usr/bin/env bash
#
# One-command server update. Run ON the cPanel host, from anywhere:
#
#   ~/repositories/pasto-hair/scripts/deploy.sh
#
# Does the whole sequence in the order that actually works, and verifies each
# step instead of trusting it. No hardcoded username, host or domain — paths are
# derived from the script's own location and the site URL comes from .env — so
# this file is safe to keep in the public repo.
#
# Why it does what it does (all learned the hard way):
#
#   * TWO artifacts must update. Payload loads config/collections/globals/access
#     from on-disk SOURCE at runtime, not from .next. Pulling without the tarball
#     leaves the frontend stale; taking the tarball without pulling leaves access
#     rules stale. Symptom of the latter: the UI updates but an endpoint keeps
#     returning the old 403.
#
#   * Migrations are not optional. Production does not pushDevSchema, so new
#     columns simply do not exist until `payload migrate` runs. Deploying code
#     that writes a column that isn't there 500s every request that touches it.
#
#   * cloudlinux-selector lies. It returns {"result":"success"} while leaving the
#     old process running — observed twice, once serving a cached Payload config
#     for 1h46m. So we kill the process directly and let LiteSpeed respawn it on
#     the next request. That is deterministic; the selector is not.
#
#   * An absent lsnode process is NORMAL after a kill. LiteSpeed spawns Node on
#     demand at the first request, which is why the script curls the site to
#     bring it back rather than waiting for something to happen.
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

step() { printf '\n\033[1;35m==> %s\033[0m\n' "$1"; }
ok()   { printf '    \033[0;32m%s\033[0m\n' "$1"; }
die()  { printf '    \033[0;31mFAILED: %s\033[0m\n' "$1" >&2; exit 1; }

# --- node venv -------------------------------------------------------------
if [[ -z "${VIRTUAL_ENV:-}" ]]; then
  ACTIVATE=$(ls -d "$HOME"/nodevenv/"${APP_DIR#"$HOME"/}"/*/bin/activate 2>/dev/null | head -1 || true)
  [[ -n "$ACTIVATE" ]] || die "node venv activate script not found — activate it manually first"
  # cPanel's generated activate script isn't written defensively against
  # `set -u` (it references at least CL_VIRTUAL_ENV with no default) —
  # relax nounset just for the source, then restore this script's own.
  set +u
  # shellcheck disable=SC1090
  source "$ACTIVATE"
  set -u
fi
ok "node $(node -v)"

# --- env -------------------------------------------------------------------
[[ -f .env ]] || die ".env missing"
# Windows editors leave CR bytes that Linux does not strip; a trailing \r on a
# value is invisible and has broken this deploy before (a 404 from Google on a
# calendar id with a \r glued to it). Cheap to make idempotent.
if grep -q $'\r' .env; then
  sed -i 's/\r$//' .env
  ok "stripped CRLF from .env"
fi

# Parse .env rather than `source` it. dotenv is NOT bash: a perfectly valid line
# like
#     EMAIL_FROM=Pasto Hair <noreply@pasto.hair>
# is a bash syntax error — unquoted spaces, and `<` is a redirect. Sourcing dies
# there and silently leaves every later variable unset, which is exactly the trap
# this script exists to remove.
load_env() {
  local line key val
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
    [[ "$line" != *=* ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    key="${key#"${key%%[![:space:]]*}"}"   # ltrim
    key="${key%"${key##*[![:space:]]}"}"   # rtrim
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    # strip one layer of surrounding quotes, if present
    if [[ ${#val} -ge 2 && "$val" == \"*\" ]] || [[ ${#val} -ge 2 && "$val" == \'*\' ]]; then
      val="${val:1:${#val}-2}"
    fi
    export "$key=$val"
  done < .env
}
load_env
ok "env loaded"

SITE="${NEXT_PUBLIC_SITE_URL:-}"
[[ -n "$SITE" ]] || die "NEXT_PUBLIC_SITE_URL not set in .env"
ok "site $SITE"

# --- 1. source -------------------------------------------------------------
step "Pulling source"
BEFORE=$(git rev-parse --short HEAD)
git pull origin main
AFTER=$(git rev-parse --short HEAD)
[[ "$BEFORE" == "$AFTER" ]] && ok "already at $AFTER" || ok "$BEFORE -> $AFTER"

# --- 2. migrations ---------------------------------------------------------
step "Running migrations"
node_modules/.bin/payload migrate
ok "schema up to date"

# --- 3. compiled frontend --------------------------------------------------
step "Fetching Linux build"
REPO_URL=$(git remote get-url origin)
REPO_PATH=$(printf '%s' "$REPO_URL" | sed -E 's#.*github\.com[:/]##; s#\.git$##')
TARBALL="https://github.com/${REPO_PATH}/releases/download/latest-build/next-build.tar.gz"

curl -fsSL -o next-build.tar.gz "$TARBALL" || die "could not download $TARBALL"
[[ -s next-build.tar.gz ]] || die "downloaded tarball is empty"
tar -tzf next-build.tar.gz >/dev/null 2>&1 || die "tarball is corrupt"

rm -rf .next
tar -xzf next-build.tar.gz
rm -f next-build.tar.gz
[[ -f .next/BUILD_ID ]] || die ".next/BUILD_ID missing after extract"
ok "build $(cat .next/BUILD_ID)"

# --- 4. restart ------------------------------------------------------------
step "Restarting"
if pkill -u "$(id -u)" -f "lsnode:${APP_DIR}" 2>/dev/null; then
  ok "sent TERM to lsnode"
  sleep 2
  # Escalate only if it ignored TERM.
  if pgrep -u "$(id -u)" -f "lsnode:${APP_DIR}" >/dev/null 2>&1; then
    pkill -9 -u "$(id -u)" -f "lsnode:${APP_DIR}" 2>/dev/null || true
    sleep 1
    ok "escalated to KILL"
  fi
else
  ok "no running process (fine — spawns on demand)"
fi

# LiteSpeed starts Node lazily, so nothing exists until something asks for it.
step "Waking the app"
for i in $(seq 1 15); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$SITE/healthz" || true)
  [[ "$CODE" == "200" ]] && break
  sleep 2
done
[[ "${CODE:-}" == "200" ]] || die "/healthz returned ${CODE:-no response} after 30s — check stderr.log"

# --- 5. verify -------------------------------------------------------------
step "Verifying"
PS_LINE=$(ps -u "$(id -un)" -o pid,etime,command | grep "lsnode:${APP_DIR}" | grep -v grep | head -1 || true)
[[ -n "$PS_LINE" ]] && ok "process: $PS_LINE" || ok "process not listed (served anyway)"

BODY=$(curl -s --max-time 20 "$SITE/healthz")
# /healthz doubles as a version tell: the trimmed body means the new build is
# live. Anything carrying users/node/ms is the pre-2026-07-16 build, i.e. the
# restart did not take.
if [[ "$BODY" == '{"status":"ok","db":"reachable"}' ]]; then
  ok "healthz: $BODY"
else
  printf '    \033[0;33mhealthz returned: %s\033[0m\n' "$BODY"
  die "unexpected /healthz body — old build may still be serving"
fi

printf '\n\033[1;32mDeployed.\033[0m %s is live on %s\n\n' "$(git rev-parse --short HEAD)" "$SITE"
