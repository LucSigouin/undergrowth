#!/usr/bin/env bash
# Deploy Undergrowth v2 to Cloudflare Pages. One command, and it refuses to run when the tree
# is not in a shippable state. Nothing in package.json calls this file: you run it by hand.
#
#   ./deploy/deploy.sh
#
# What it checks before it uploads anything:
#   1. the unit tests pass
#   2. the golden replay still matches, so game behaviour has not drifted
#   3. src/ has no uncommitted changes, so the thing you deploy is the thing that is committed
#   4. the build succeeds
#   5. node tools/check-ship.mjs is green
# Only then does it call wrangler.
#
# Credentials come from /Users/ls/Claude-Workspace/personal/.env. This script sources that file
# so the values live in the environment for the length of the run. It never prints them and never
# copies them anywhere.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/.." && pwd)"
cd "$root"

say() { printf '\n== %s\n' "$1"; }
die() {
  printf '\nSTOPPED: %s\n' "$1" >&2
  exit 1
}

say "1/6 unit tests"
npm test || die "npm test failed. Fix the tests before deploying."

say "2/6 behaviour freeze"
node tests/golden.mjs || die "the golden replay failed. Game behaviour drifted, so do not deploy."

say "3/6 working tree"
if [ -n "$(git status --porcelain src)" ]; then
  git status --short src
  die "src/ has uncommitted changes. Commit them first so the deploy matches a commit."
fi

say "4/6 build"
npm run build || die "the build failed."

say "5/6 ship gate"
node tools/check-ship.mjs || die "the ship gate is red. Read the reasons above."

say "6/6 credentials"
# The .env sits one level above the project, in the personal workspace root.
env_file="$root/../.env"
[ -f "$env_file" ] || die "no .env at $env_file. See deploy/README.md."
# set -a exports every variable the file defines, so wrangler picks them up without any of the
# values being echoed or written down here.
set -a
# shellcheck disable=SC1090
source "$env_file"
set +a
[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || die "CLOUDFLARE_ACCOUNT_ID is not set in $env_file."
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  printf 'No CLOUDFLARE_API_TOKEN in the .env, so wrangler will use its own saved login.\n'
  printf 'If it asks you to sign in, run "npx wrangler login" once and start this again.\n'
fi

say "deploying dist/ to the undergrowth Pages project"
npx wrangler pages deploy dist --project-name undergrowth

say "done"
printf 'Verify it now, do not assume. See the "Verify the deploy" section of deploy/README.md.\n'
