#!/usr/bin/env bash
# Bootstrap the E2E Spree backend using @spree/cli.
#
# Steps:
#   1. `spree seed` — seed the default store, roles, countries.
#   2. `spree sample-data` — load sample products, categories, images.
#   3. mint a publishable API key bound to a public channel, and capture
#      its pk_… token.
#
# Idempotent: the CLI's seed/sample-data tasks are no-ops on already-seeded
# databases, and the API key step reuses a correctly-bound "E2E" key when one
# already exists.
#
# Output: writes `.env.e2e` at the repo root with SPREE_API_URL +
# SPREE_PUBLISHABLE_KEY for the storefront to consume.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
readonly BACKEND_DIR="$REPO_ROOT/e2e-backend"
readonly ENV_FILE="$REPO_ROOT/.env.e2e"
readonly SPREE_URL="http://localhost:4000"

# Stripe test-mode API keys. Both must come from the SAME Stripe sandbox
# account — a mismatched pair makes Stripe.js fail to confirm the
# PaymentIntent during checkout. Stripe no longer publishes a working
# sample pair (the old docs sk_test_… key is expired), so use keys from
# your own Stripe sandbox:
#
#   export STRIPE_PUBLISHABLE_KEY=pk_test_…
#   export STRIPE_SECRET_KEY=sk_test_…
#   pnpm run e2e:up
#
# The secret key is never committed: GitHub's push protection flags any
# sk_test_ literal as a secret regardless of provenance. In CI,
# STRIPE_SECRET_KEY is a repository secret and STRIPE_PUBLISHABLE_KEY a
# repository variable, both injected via the workflow env (see
# .github/workflows/ci.yml).
if [[ -z "${STRIPE_PUBLISHABLE_KEY:-}" || -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY must both be set." >&2
  echo "Use a pk_test_…/sk_test_… pair from your own Stripe sandbox." >&2
  echo "See script header for details." >&2
  exit 1
fi

# Full-shape checks (not just prefix): a stray quote, space, or other
# copy-paste artifact would otherwise flow into .env.e2e and break parsing.
if [[ ! "$STRIPE_PUBLISHABLE_KEY" =~ ^pk_test_[A-Za-z0-9_]+$ ]]; then
  echo "STRIPE_PUBLISHABLE_KEY must be a test-mode key (pk_test_…)." >&2
  echo "Got: ${STRIPE_PUBLISHABLE_KEY:0:8}…" >&2
  exit 1
fi

if [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_test_[A-Za-z0-9_]+$ ]]; then
  echo "STRIPE_SECRET_KEY must be a test-mode key (sk_test_…)." >&2
  echo "Got: ${STRIPE_SECRET_KEY:0:8}…" >&2
  exit 1
fi

# @spree/cli looks for docker-compose.yml in the cwd, so all CLI calls
# happen from the backend dir.
cd "$BACKEND_DIR"

# Both callers (`pnpm run e2e:up` and CI) already gate on the compose
# healthcheck via `up -d --wait`; this guard only covers running the
# script standalone against a still-booting stack.
echo "==> Waiting for Spree to accept HTTP requests at $SPREE_URL/up"
if ! curl -fsS --retry 60 --retry-delay 2 --retry-all-errors "$SPREE_URL/up" >/dev/null 2>&1; then
  echo "Spree never came up. Check 'docker compose -f $BACKEND_DIR/docker-compose.yml logs web'." >&2
  exit 1
fi

echo "==> Seeding default Spree data (spree seed)"
npx @spree/cli seed

echo "==> Loading sample products and categories (spree sample-data)"
npx @spree/cli sample-data

# The official Spree image bundles the Stripe integration (spree_stripe), so
# SpreeStripe::Gateway is available — but no gateway row is seeded, since that
# carries account-specific API keys. We create one with a `bin/rails runner`
# snippet that writes the row directly with the E2E test keys — version-agnostic,
# so it works whichever Spree image is pinned. The script is idempotent:
# re-running matches the existing row by name (where(...).first_or_initialize)
# and reapplies the same attributes.
# The keys reach Ruby via the container environment (-e pass-through from
# this script's env) rather than heredoc interpolation, so the Ruby source
# never embeds them — the heredoc delimiter is quoted on purpose.
echo "==> Configuring Stripe payment gateway on the default store"
docker compose exec -T -e STRIPE_PUBLISHABLE_KEY -e STRIPE_SECRET_KEY web bin/rails runner - <<'RUBY'
store = Spree::Store.default
gateway = Spree::PaymentMethod.where(type: 'SpreeStripe::Gateway', name: 'E2E Stripe', store: store).first_or_initialize
gateway.assign_attributes(
  active: true,
  display_on: 'both',
  auto_capture: true,
  store: store,
  preferences: {
    publishable_key: ENV.fetch('STRIPE_PUBLISHABLE_KEY'),
    secret_key: ENV.fetch('STRIPE_SECRET_KEY')
  }
)
# validate: false skips SpreeStripe's validate_secret_key hook — a live
# Stripe API roundtrip at save time. The key still gets exercised for real
# when checkout creates a PaymentIntent.
gateway.save!(validate: false)
puts "OK: gateway #{gateway.id} (#{gateway.name})"
RUBY

# Created via `bin/rails runner` rather than `spree api-key create`, because the
# key must be bound to a channel and the CLI has no --channel flag. Sample data
# seeds three channels ("Online Store", "Wholesale", "Point of Sale"), and a key
# with no channel cannot resolve one — every Store API read is then gated by
# StorefrontGating and answers 401 (surfacing to the client as 404). Binding to
# a channel whose storefront access is "public" is what makes guest reads work.
#
# The channel is immutable after creation ("Channel cannot be changed after the
# key is created"), so an existing E2E key bound to the wrong channel is revoked
# and replaced rather than updated.
echo "==> Creating publishable API key bound to a public channel"
api_key_output=$(docker compose exec -T web bin/rails runner - <<'RUBY'
store = Spree::Store.default
channel = store.channels.detect { |c| c.resolved_storefront_access == 'public' }
raise 'No public channel found on the default store.' if channel.nil?

existing = Spree::ApiKey.active.publishable.find_by(store: store, name: 'E2E')
existing.update!(revoked_at: Time.current) if existing && existing.channel_id != channel.id

key = Spree::ApiKey.active.publishable.find_by(store: store, name: 'E2E', channel: channel)
key ||= Spree::ApiKey.create!(store: store, name: 'E2E', key_type: 'publishable', channel: channel)

puts key.token
RUBY
)

publishable_key=$(printf '%s\n' "$api_key_output" | grep -oE 'pk_[A-Za-z0-9_-]+' | head -n 1)
if [[ -z "$publishable_key" ]]; then
  echo "Could not create a publishable API key:" >&2
  printf '%s\n' "$api_key_output" >&2
  exit 1
fi

cat >"$ENV_FILE" <<EOF
# Generated by scripts/e2e/bootstrap-spree.sh — DO NOT EDIT
SPREE_API_URL=$SPREE_URL
SPREE_PUBLISHABLE_KEY=$publishable_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
EOF

echo
echo "==> Done. Wrote $ENV_FILE"
echo "    SPREE_API_URL=$SPREE_URL"
echo "    SPREE_PUBLISHABLE_KEY=${publishable_key:0:12}…"
