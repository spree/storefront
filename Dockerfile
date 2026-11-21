# syntax=docker/dockerfile:1.7

# Multi-stage build for Next.js 16 (standalone output) on Node.js 22 (Alpine).
#
# Build (Spree env required: pages are prerendered against the Spree API at build time):
#   docker build \
#     --build-arg SPREE_API_URL=https://your-spree.example.com \
#     --build-arg SPREE_PUBLISHABLE_KEY=your_publishable_key \
#     -t storefront .
#
# Run:
#   docker run -p 3001:3001 --env-file .env.local storefront
#
# Optional Sentry source map upload at build time (skipped when SENTRY_DSN is unset).
# SENTRY_AUTH_TOKEN is read via a BuildKit secret so it never lands in image
# layers, history, or shared builder caches.
#   SENTRY_AUTH_TOKEN=... docker build \
#     --build-arg SPREE_API_URL=... \
#     --build-arg SPREE_PUBLISHABLE_KEY=... \
#     --build-arg SENTRY_DSN=... \
#     --build-arg SENTRY_ORG=... \
#     --build-arg SENTRY_PROJECT=... \
#     --secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
#     -t storefront .

ARG NODE_VERSION=22-alpine


# ---- base: Node with pnpm (same version as package.json's `packageManager`) ----
FROM node:${NODE_VERSION} AS base
RUN npm install -g pnpm@10.33.4
RUN apk add --no-cache libc6-compat


# ---- deps: install production+dev dependencies for the build ----
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store


# ---- builder: compile the Next.js app ----
FROM base AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Spree API config — required at build time because the app prerenders pages
# that fetch from Spree (categories, products, etc.).
ARG SPREE_API_URL
ARG SPREE_PUBLISHABLE_KEY
ENV SPREE_API_URL=$SPREE_API_URL \
    SPREE_PUBLISHABLE_KEY=$SPREE_PUBLISHABLE_KEY

# Optional Sentry release/source-map upload. When SENTRY_DSN is empty,
# next.config.ts skips withSentryConfig entirely, so the build still works.
# SENTRY_AUTH_TOKEN is intentionally not declared as ARG/ENV — it's mounted
# only for the build step via --mount=type=secret below, so it never persists
# in image layers or build cache.
ARG SENTRY_DSN=""
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
ENV SENTRY_DSN=$SENTRY_DSN \
    SENTRY_ORG=$SENTRY_ORG \
    SENTRY_PROJECT=$SENTRY_PROJECT

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN --mount=type=secret,id=sentry_auth_token,required=false \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token 2>/dev/null || true)" \
    pnpm run build


# ---- runner: minimal runtime image ----
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Static assets and the standalone server bundle.
# The standalone output ships its own minimal node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

CMD ["node", "server.js"]
