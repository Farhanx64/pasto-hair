#!/usr/bin/env bash
#
# Promo announcement to past clients. Run ON the cPanel host:
#
#   ~/repositories/pasto-hair/scripts/promo-email.sh count     CODE1 CODE2
#   ~/repositories/pasto-hair/scripts/promo-email.sh test  you@example.com CODE1 CODE2
#   ~/repositories/pasto-hair/scripts/promo-email.sh send-all  CODE1 CODE2
#
# Loads the node venv and .env the same way deploy.sh does (parsed, not
# sourced — see the note there), then runs scripts/send-promo-email.ts.
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

if [[ -z "${VIRTUAL_ENV:-}" ]]; then
  ACTIVATE=$(ls -d "$HOME"/nodevenv/"${APP_DIR#"$HOME"/}"/*/bin/activate 2>/dev/null | head -1 || true)
  [[ -n "$ACTIVATE" ]] || { echo "node venv activate script not found" >&2; exit 1; }
  set +u
  # shellcheck disable=SC1090
  source "$ACTIVATE"
  set -u
fi

[[ -f .env ]] || { echo ".env missing" >&2; exit 1; }
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
  [[ "$line" != *=* ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  key="${key#"${key%%[![:space:]]*}"}"
  key="${key%"${key##*[![:space:]]}"}"
  [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
  if [[ ${#val} -ge 2 && "$val" == \"*\" ]] || [[ ${#val} -ge 2 && "$val" == \'*\' ]]; then
    val="${val:1:${#val}-2}"
  fi
  export "$key=$val"
done < .env

# production: no dev schema push against the live database. react-server: the
# email templates import "server-only" (see scripts/preview-emails.ts).
NODE_ENV=production node --conditions=react-server --import tsx/esm scripts/send-promo-email.ts "$@"
