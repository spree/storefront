# Seller Badges Storefront V1 Release Validation

## Current Status — 2026-10-10

**Seller Badging storefront V1: PASS. Marketplace release readiness: IMPLEMENTED — VERIFICATION BLOCKED.** The latest canonical badge compatibility edits were verified with 8 storefront unit tests and 6 seller-badge Playwright tests. Axe reported no critical or serious violations on audited seller, PDP, product-card, and open-explanation surfaces at 375px and 1440px; browser checks also covered responsive widths 375/768/1024/1440px, keyboard open/Escape close, and focus restoration. The shared browser fixture currently returns its actual earned badges without `star_seller`; no award was fabricated or added. Canonical `star_seller` rendering and legacy `top_shop` compatibility are covered by the storefront unit/API checks.

The sponsored PDP regression below remains historical and was not rerun as part of the 2026-10-10 closure. Its isolated Ads stack was previously unavailable, so the broader marketplace verification must remain blocked until that separate journey is executed safely.

The results below include historical evidence from the 2026-10-09 storefront validation. The latest backend changes canonicalize legacy `top_shop` awards to one `star_seller` Store API entry while preserving historical awards. Current backend and browser test details are recorded in the stabilization closure notes.

Validation completed 2026-10-09. All Seller Badging checks remain green. The final sponsored-click regression did not run: the dedicated local-code Compose stack created its private database, but its Rails API never became reachable; Docker Desktop then returned HTTP 500/502 for container-management requests. No test was sent to the shared development app. Do not sign off until the isolated stack is healthy and the focused journey passes.

## Sign-Off Matrix

| Gate | Result | Evidence |
| --- | --- | --- |
| Badge fixtures and Store API | Pass | Nine deterministic sellers cover all seven badges, no awards, and lost qualification. Stable repeated seed; public Store API exposes only active awards. |
| Core specs | Pass | 8 examples, 0 failures. |
| Store API specs | Pass | 13 focused examples, 0 failures, including the seller badge preload regression; the product serializer badge expansion example also passed (1 example). A broader 29-example serializer run had 2 unrelated existing shipping assertion failures. |
| Storefront unit tests | Pass | 35 tests passed. |
| Seller Badge Playwright | Pass | 6 tests passed, 0 skipped. Seller header, PDP identity, product-card trust indicators, explanations, and duplicate Top Shop copy are covered. |
| Automated accessibility | Pass | 2 axe runs passed at 375px and 1440px. Each run audits seller header, PDP seller identity, product-card trust strip, and the opened explanation dialog: 0 critical and 0 serious violations. Accessible control names, dialog labeling, keyboard open, Escape close, and focus restoration are also asserted. |
| Responsive | Pass | Badge surfaces checked at 375, 768, 1024, and 1440px with no horizontal overflow. |
| Localization | Pass for configured launch locales | The active Market has only `en` enabled. The storefront bundles `en`, `de`, `es`, `fr`, and `pl`; backend badge definition catalogs contain translations for all five, but this Store's routing and Store API select only English. Requests for other locales receive the English default. No new production locales were enabled. This is English-only launch coverage, not multilingual live verification. |
| Performance / batching | Pass | Read-only requests used the real Store API and persisted awards. Both requests contain awarded sellers. Each emits two badge-table SQL queries total (award and definition reads), one API request, and no per-badge HTTP calls; qualifier-registry calls are instrumented at zero. See the exact counts below. |
| Standalone TypeScript | Pass for Seller Badging | Same TypeScript/dependency tree and Node 22.17.0 compared clean archived commit `5edd1f027f5c7bb5ca5063c1c10d9616565214dc` to the working tree. Baseline: 599 diagnostics; current: 651; 30 added and 4 removed signatures. Added diagnostics are confined to existing dirty Ads/search, reviews, account, and theme/layout work: Testing Library exports, review `chunks` typing, unrelated appearance/style property typing, and E2E fixture/spec types. No diagnostic is in Seller Badge components, helpers, tests, or badge-specific E2E assertions. `ProductCard.tsx` additions are existing image-ratio/swatch inline style typings, not badge rendering; `ProductDetails.tsx` additions concern media border styling and review `chunks` types, not badge integration. No unrelated errors were suppressed. The Next production build's TypeScript phase passes. |
| Production build | Pass | `next build` completed TypeScript and prerender phases, generated 123/123 pages, and exited 0. |
| Sponsored PDP regression | Blocked; not run | The isolated Rails service exited and the Docker API returned HTTP 500. No Playwright journey, click, reset, or funding operation ran. A prior one-test pass is historical evidence only, not this isolated closure gate. |
| Shared Ads data protection | Prior attempt: captured values matched; this execution: not verified | The historical read-only snapshots below matched. No fresh before/after snapshot could be taken in this execution because Docker's container inspect/exec API returned HTTP 500; do not treat the historical values as a current snapshot. |
| Keyboard/focus | Pass | Manual browser assertions in the badge Playwright suite verify keyboard open, Escape close, and focus restoration to the trigger. |

## Performance Evidence and Limits

Measurements below are development data, not a production benchmark. Each product page was fetched as one Store API request with `expand=seller`; the frontend made no per-card badge requests.

| Listing page | Products | Distinct sellers | Awarded sellers / badges | HTTP requests / badge HTTP | SQL events / uncached | Badge-table SQL total / uncached | SQL duration | Elapsed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 24 items, page 2 | 24 | 5 | 1 / 3 | 1 / 0 | 290 / 94 | 2 / 2 | 77.23 ms | 2,346 ms |
| 50 items, page 1 | 50 | 6 | 2 / 4 | 1 / 0 | 541 / 122 | 2 / 2 | 59.61 ms | 1,764 ms |

The first page at 24 has no awards; page 2 is used to meet the awarded-seller sample requirement. SQL duration is summed from actual `sql.active_record` event start/finish times. The qualification registry was instrumented during both requests and recorded zero calls. The API request regression also proves the award query does not grow per seller. Badge-table SQL remains two queries for both 24 and 50 results, demonstrating bounded batch reads rather than per-seller growth. Total SQL differs between page sizes due to the different product/seller mix; no unrelated SQL optimization was performed.

## Notes on the Changes

Seller badge awards are preloaded with their definitions for expanded seller product responses. `Seller#public_badge_awards` filters already-loaded active awards in memory while retaining its ordered database path for callers without a loaded association. The API request spec guards against per-seller award query growth.

The axe checks found contrast and dialog labeling problems. Badge chip text and the explanation dialog now use explicit readable foreground colors, and the dialog has accessible title/description relationships. This does not replace manual keyboard testing, which was also run.

The existing local Rails server was not restarted. SQL evidence came from a fresh Rails request process in the same container and development database. Requests were read-only and used persisted badge awards; no business records were modified. The badge Playwright suite and production build were rerun on 2026-10-09. The isolated Ads stack was attempted, but the Rails container exited and Docker's management API became unavailable; the sponsored browser test was not run.

## Isolated Sponsored Regression

The shared baseline was captured read-only from `spree_development` on the shared `postgres` Compose host before preparing isolated test data. A direct read-only SQL check after the failed attempt matched the accounts and metering counts:

| Measure | Before | After |
| --- | ---: | ---: |
| Ad account cached/computed balances (IDs 1, 2, 3, 4) | 196.50, 100.00, 0.10, 10.00 | 196.50, 100.00, 0.10, 10.00 cached |
| Ledger entries | 13 | 13 |
| Clicks | 8 | 8 |
| Impressions | 8 | 8 |
| Conversions | 1 | 1 |
| Funding records | 12 | 12 |

Campaign rows and daily budgets were also captured before the attempt (20 campaigns); the model has no stored spend column, so campaign spend is ledger-derived. No E2E ran and no shared ledger writer was invoked. A later query of campaign rows timed out while Docker became unavailable. Thus no campaign-spend mutation was made by this test attempt, but per-campaign ledger-derived spend values are not reported as a measured before/after comparison.

The test stack used the existing `server/docker-compose.dev.yml` and Windows monorepo overlay with a temporary isolated override. Resolved configuration:

- Compose project: `seller-badge-isolated-20261009`
- Rails container: `seller-badge-isolated-20261009-web-1`
- Database: `spree_seller_badge_e2e` at the isolated Compose `postgres` host; no host database port published
- Postgres volume/network: project-scoped `seller-badge-isolated-20261009_postgres_data` and `seller-badge-isolated-20261009_default`
- Rails HTTP port: `127.0.0.1:4012`; Solid Queue worker processing disabled; cache is Rails memory store; no Redis is configured in this Rails app stack
- Startup command: `docker compose -p seller-badge-isolated-20261009 -f server/docker-compose.dev.yml -f server/docker-compose.windows-monorepo.yml -f server/.tmp-seller-badge-isolated.yml up -d --wait`

The initial image-build attempt was rejected because the Dockerfile's default Ruby version did not match this checkout and the app-only image build could not resolve local path gems. The retry reused the existing local Spree image and its bundle cache read-only, with the current monorepo source bind-mounted. The isolated database was created as `spree_seller_badge_e2e`; however, requests to `127.0.0.1:4012/up` timed out before the Rails app became usable. Docker's container listing API then returned HTTP 500/502, preventing further inspection and teardown. The required Ads fixture reset and browser test were never invoked. The private Compose project may still exist; its temporary override is `server/.tmp-seller-badge-isolated.yml`. Remove only project `seller-badge-isolated-20261009` and its private volumes after Docker is healthy; do not target the `server` shared project.

**Focused test command:** not run. The isolated Rails service and its publishable key were unavailable, so there is no honest Playwright command/result pair to record. The existing journey remains `e2e/ads-search.spec.ts`, test title `H–K: sponsored click opens PDP with discovery context`; its fixture setup resets/updates campaigns and its click bills CPC. It must be run with `ADS_E2E_DOCKER_CONTAINER=seller-badge-isolated-20261009-web-1` and a storefront pointed at port 4012, only after that isolated service is healthy and its fixtures are ready.

## Remaining Release Gate

Restore Docker service health, remove or repair only the isolated project `seller-badge-isolated-20261009`, then run the focused sponsored-click PDP journey against a healthy isolated stack. Confirm the CPC ledger entry exists only in the isolated database and the PDP response includes public `seller.badges` with sponsored attribution intact. Recheck the shared baseline afterward. Do not run `AdsE2eReset` or the sponsored click against `spree_development`.

No P0 Seller Badging functionality, accessibility, localization, or performance issues were observed. Overall sign-off remains NOT READY solely because the required isolated sponsored regression could not execute.

## Latest Closure Attempt — 2026-10-09

No Ads writer, fixture reset, Stripe operation, or sponsored-click test was run. Docker Compose listed the isolated project as follows immediately before verification failed: `seller-badge-isolated-20261009-web-1` Up, `seller-badge-isolated-20261009-postgres-1` Up (healthy), and `seller-badge-isolated-20261009-mailpit-1` Up (unhealthy). The temporary override declares `DATABASE_URL=postgresql://postgres@postgres:5432/spree_seller_badge_e2e`, but this is configuration evidence only; runtime database identity could not be proven.

Read-only health and identity checks were attempted through `docker exec`; both failed because Docker Desktop returned HTTP 500 for the container inspect API. Host requests to ports 4012 and 3010 were blocked by local socket permissions. The Docker Desktop app process was running, but `com.docker.service` was stopped; starting it failed with “Cannot open 'com.docker.service' service on computer '.'”. A shutdown scoped to project `seller-badge-isolated-20261009` also failed at Docker's container-list API (HTTP 500). No global cleanup, container recreation, volume deletion, or shared service operation was attempted.

**Current release status: NOT READY.** Sponsored PDP regression: NOT EXECUTED. Isolated database identity: NOT VERIFIED. Shared Ads data: NOT VERIFIED in this execution; the previous captured values above are historical only. Cleanup: PENDING; the three isolated containers may remain, and the project-scoped Postgres volume was deliberately preserved. Documentation updated to record this blocked attempt. Retry only after Docker inspection and exec APIs work, verify the database from the running Rails connection, take fresh read-only shared snapshots, run the focused journey against the isolated API, compare fresh snapshots, then shut down only the isolated project.
