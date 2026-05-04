#!/usr/bin/env bash
# Push to GitHub over HTTPS without embedding PAT in shell history.
# Usage (interactive TTY):
#   ./scripts/github-https-setup-and-push.sh
# Usage (non-interactive / CI — set secret in env first):
#   GITHUB_TOKEN="$(cat /path/to/secret)" ./scripts/github-https-setup-and-push.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

git config --global credential.helper store

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Paste GitHub PAT (input hidden):" >&2
  read -rs GITHUB_TOKEN
  echo >&2
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "error: no PAT provided (set GITHUB_TOKEN or paste when prompted)" >&2
  exit 1
fi

printf 'protocol=https\nhost=github.com\nusername=EduardoDamas\npassword=%s\n\n' "$GITHUB_TOKEN" | git credential approve
GITHUB_TOKEN=""
unset GITHUB_TOKEN

if [[ -f "${HOME}/.git-credentials" ]]; then
  chmod 600 "${HOME}/.git-credentials"
fi

git push -u origin main
echo "Push complete. HTTPS credentials for github.com are stored for future pushes." >&2
