# Makazi Go Development Roadmap

- **Status:** Stages 1–14 implemented locally; production-engine and operational verification remain pending
- **Audit date:** 2026-11-09
- **Baseline revision:** `1ccb3d3` (`main`)
**Scope:** Current repository working tree, including existing uncommitted changes

## Product direction

Evolve the existing Makazi Go marketplace into Tanzania's trusted property
ecosystem without replacing its current stack or breaking accommodation,
booking, agent, and admin workflows. The product promise is:

> FIND IT. VERIFY IT. CONNECT. MOVE.

Property purchase, long-term rent, short-stay accommodation, land, and
commercial property should become distinct but related journeys. Investment
functionality remains informational until legal and regulatory requirements
are reviewed; do not collect pooled funds or promise returns.

## Current system map

| Surface | Current implementation | Relationship |
|---|---|---|
| Public web | Vite-built static pages and vanilla JavaScript (`index.html`, `listings.html`, `listing-detail.html`, `app.js`) served by the Express service | Calls the Express API directly |
| Server-rendered web | Django marketplace routes and templates in `django_admin/marketplace/` | Proxies API and media requests to Express |
| Operations console | Django `console` app under `/admin/` on the separate Django service; Express redirects its `/admin/` route there | Uses shared MySQL data and Django-side admin workflows |
| API/business logic | Node.js + Express in `server/index.js`, with focused helpers for DB, validation, storage, permissions, notifications, and integrations | Shared backend for web and mobile |
| Persistence | MySQL-compatible database (configured for TiDB in deployed setup), schema in `database/schema.sql`, SQL migration files in `database/` | Expected to be the canonical data store across services |
| Native mobile | Expo, React Native, and TypeScript in `mobile/` | Uses the same Express API; parity work is tracked in `mobile/docs/feature-parity.md` |

`render.yaml` configures separate Node and Django web services. `PROJECT-INFO.txt`
currently describes the public root as the Django marketplace, while the
deployment configuration builds and starts the Node service as the primary
service and that service serves the Vite build. Reconcile this documentation
with the intended public host before changing routes or retiring either web
surface.

## Phase 1 — System audit

This is a repository-level audit of the implementation and configuration,
not a penetration test or a production database/provider review. Behaviors
marked “present” are supported by code/schema inspection; automated tests
provide additional but not exhaustive evidence.

### Findings by requested audit area

| Area | Current state | Audit finding / next concern |
|---|---|---|
| Frontend architecture | **Present, multiple surfaces** | The Vite/vanilla-JS site, Django-rendered marketplace, and Expo app coexist. Keep them intact while establishing which routes and controls are authoritative; do not silently drop a capability during parity work. |
| Backend architecture | **Present** | Express is the main API and business-logic service. Django has a marketplace proxy and a separate operations console. Some logic and admin workflows exist in both services, so authorization and status changes need contract tests across both. |
| Database schema and relationships | **Present, incrementally extended** | The baseline schema defines relational tables for accounts, roles, listings, media, bookings, payments, reviews, messaging, notifications, verification, reports, and audit. Listings now model sale/rent/stay intent and structured land/commercial facts. Runtime migrations use an ordered checksum ledger; production-engine compatibility and data recovery still need operational verification. |
| Authentication and authorization | **Present** | Email/username login, bcrypt, Google OAuth, email verification, password recovery, MFA, MySQL-backed Express sessions, CSRF checks, request limits, role checks, sub-agent permissions, and delegated administrator features exist. The Django console now accepts active administrator accounts by username or email and checks feature grants; the protected Founder Console remains separate. Django signed-cookie sessions and Express database sessions have different revocation behavior and should remain clearly separated. |
| Registration and login | **Present** | Tenant and agent registration flows and the recent homepage username-login fix exist. Agent applications are approval-gated. Test suites cover selected auth/console behaviors but do not constitute a complete cross-client authentication test. |
| Property listings | **Implemented for the current listing workflow** | Owners and agents can create listings using sale, long-term rental, or stay journeys, add bounded category-specific facts and an advertiser-authority declaration, and manage listing edits/archives. Verification remains a separate administrator-reviewed process; organization-team access and some category-specific validation remain future work. |
| Property details | **Present for current listing model** | Numeric listing URLs and API detail responses support accommodation/property fields and structured sale, land, and commercial data. Advertiser-reported title information is explicitly not legal verification. |
| Search and filtering | **Implemented locally; database performance verification pending** | `/api/listings/discover` uses validated, parameterized filters for location, journey/category, period-specific currency-aware prices, bedrooms/bathrooms, size, furnishing, amenities, availability, and agent verification. Search uses TiDB-compatible `LIKE` clauses rather than relying on a FULLTEXT index that is not provisioned on upgraded databases. It returns bounded deterministic pages and count metadata. Static web, Django marketplace, and mobile preserve filters and expose page navigation/load-more. Unit tests cover filter combinations and bounds; a representative TiDB/MySQL `EXPLAIN` and production-engine compatibility check remain outstanding because no database service is available locally. |
| Booking functionality | **Present for request-based stays/viewings** | Booking requests validate dates, apply transaction/idempotency logic, and use booking date locks. Preserve this path for stay bookings while separating it from purchase/rental inquiries and future payments. |
| Host and agent functionality | **Implemented foundation; reputation expanded in Stage 10** | Agent/property-owner profiles support bounded specializations and service areas, agency/developer applications, a role-gated verification-officer queue, and listing/request metrics. Stage 10 adds distinct completed-booking-based agent reviews, moderation, responses, and published-review aggregates. Organization verification is not legal certification; team membership and subscription management remain future work. |
| User dashboards | **Present, uneven completeness** | Tenant and agent summaries/workspaces exist on web, and mobile implements selected account/agent actions. The Django `agent_workspace` view currently requests agent bookings twice, duplicating a backend call. |
| Administrator dashboard | **Present** | Founder/delegated admin roles, feature permissions, moderation, reports, verification decisions, audit logs, and settings are represented. Django and Express have separate admin entry/session logic; maintain one explicit permission contract and test every mutation across both. |
| Image/video uploads | **Present, operational risks** | File signatures are checked and images are resized/encoded with Sharp; listing videos and local/S3/Cloudinary storage paths exist. Public-media fallback to local disk after object-storage failure can lose uploaded media on ephemeral deployments. New identity documents are app-encrypted in private local/S3 storage, and Founder Console review now uses a short-lived single-use token; legacy unencrypted documents remain readable and require a future re-encryption plan. |
| Notifications | **Present, partial delivery channels** | In-app notifications and email/SMS integration points exist. Delivery configuration and mobile push behavior still require end-to-end testing; do not report delivery as successful unless the provider confirms it. |
| Payment integrations | **Not complete** | Payment/refund/payout tables and a signature-checked generic webhook are present. No checkout/payment-intent endpoint was found in the API route inventory. Do not collect real payments or treat webhook presence as a complete payment integration. |
| API endpoints | **Present, large surface** | Express exposes public discovery plus account, agent, booking, upload, admin, moderation, messaging, and notification routes. Continue contract tests for authentication, permissions, validation, side effects, and error responses; mobile parity inventory is in `mobile/docs/feature-parity.md`. |
| Mobile responsiveness | **Present, needs workflow verification** | Responsive web styling and an Expo client are in place. The mobile app currently covers a subset of web capability; the parity ledger explicitly records many incomplete workflows. Test real narrow viewports and native Android before calling a journey complete. |
| Security | **Controls present; production verification required** | Parameterized SQL is widely used; Express configures Helmet, CSRF, rate limits, secure HTTP-only cookies in production, session expiry, and upload signature checks. The audit found incorrect admin IP CIDR matching and a predictable Django signing-key fallback; both are corrected. New identity documents are encrypted at rest by the application and exposed only through audited one-time review grants. Express and Django now disallow inline script execution and script attributes; verify production secrets/configuration and deployed headers. |
| Error handling | **Mixed** | Express has a central error handler and request IDs. Django preserves API validation errors on discovery and search pages; upstream network/JSON failures elsewhere can still appear as empty results and should be replaced with explicit error states as those views are improved. |
| Performance and scalability | **Mixed** | Image processing and database indexes exist. Discovery now uses bounded pages, but wildcard location matches, correlated listing subqueries, and session revocation's full-table session scan may become expensive as data grows. Measure query plans and workload before adding indexes or caching. |
| SEO | **Partial** | `robots.txt` and a static sitemap exist. The current sitemap lists only `/` and `/posts.html`; property detail routes are numeric and there is no evidence of dynamic listing metadata/structured data or regional landing pages. Build crawlable pages only when canonical URLs and useful unique content are available. |

### Priority issues

1. **Security and data protection:** IPv4/IPv6 CIDR checks, production Django
   signing-key enforcement, encrypted new identity documents, single-use
   audited review links, and no-inline-script CSP policies are implemented;
   verify deployed headers and the private-document path against production
   storage.
2. **Data integrity and deploy safety:** checksum-based migration tracking
   and focused idempotency/failure tests are implemented. Verify the migration
   runner and DDL on the deployed TiDB/MySQL engine, then document backup and
   recovery procedures before expanding schema.
3. **Product model:** Stage 2 now distinguishes sale, long-term rent, and
   short-stay journeys; defaults new user/listing currency to TZS; and adds
   structured land/commercial facts without converting existing amounts.
4. **Discovery:** filter semantics, stable bounded pagination, and cross-client
   controls are implemented and covered locally; measure query plans and verify
   production-engine behavior before rollout.
5. **Trust:** establish separate user/agent/property verification states,
   private evidence review, audit history, and accurate public verification
   labels.
6. **Workflow completeness:** add listing edit/archive lifecycle, agent
   organization and reputation capabilities, moderated editorial content,
   and complete cross-client journeys.
7. **Reliability and reach:** expose upstream errors, improve SEO and
   low-bandwidth delivery, and complete native/mobile parity incrementally.

## Delivery plan

Each phase is an independently testable stage. Do not begin a later stage
until the preceding data/security dependencies are reviewed. Keep changes
surgical and preserve current tenant bookings and agent approval behavior.

### Stage 1 — Security, private files, and migration safety

- [x] Implement and test correct IPv4/IPv6 CIDR parsing for administrator IP
  allow/deny rules; cover exact addresses, ranges, and invalid input.
- [x] Require a Django signing key of at least 32 characters in production;
  keep the legacy fallback limited to non-production.
- [x] Encrypt new private identity documents, retain compatibility for
  encryption-version-zero legacy files, and add an audited, expiring,
  single-use admin download grant with non-cacheable attachment headers.
- [x] Add migration checksum/version tracking and focused tests for first
  application, repeat application, checksum mismatch, and migration failure.
- [x] Document backup, recovery, migration, and schema-verification steps in
  `DATABASE_OPERATIONS.md`, with a read-only SQL verification script.
- [ ] Verify TiDB/MySQL DDL behavior and migration bootstrap on a production-
  compatible database, and execute a controlled backup/restore exercise.
- **Stage status:** Implementation verified locally; production-engine and
  operational recovery validation remain open.
- Acceptance: security tests pass; no secret fallback is accepted in
  production; existing authentication and admin behavior remains intact.

### Stage 2 — Property journeys and data model

- [x] Define transaction types for Buy, Rent, Stay, and legacy combined-term
  listings; keep Land and Commercial as property categories.
- [x] Add an additive migration for transaction type, sale price, plot size/
  unit, land use, advertiser-reported title status, floor area, and intended
  commercial use. Backfill existing transaction types from `rental_mode`.
- [x] Default new profile/listing currencies to TZS without converting
  existing stored currency or price values.
- [x] Validate price/category combinations server-side; allow booking only
  for stay and legacy combined listings.
- [x] Expose the journey and structured facts in public web, Django
  marketplace, and mobile discovery/listing surfaces.
- [x] Add a TiDB-specific fallback that separates modifying
  `transaction_type` from adding its index when TiDB rejects both operations
  in one ALTER statement.
- **Stage status:** Implementation and local tests/builds are verified.
  Render exposed a same-column TiDB ALTER limitation; a tested fallback is
  pushed in `ec22d4a`. The public health endpoint returned HTTP 200 afterward,
  but deployment-specific logs are needed to confirm the new release completed
  migration. Backup/recovery procedures remain unverified.
- Acceptance: legacy listings still render; existing stays remain bookable;
  invalid combinations are rejected server-side.

### Stage 3 — Search, pagination, and discovery

- [x] Implement combined location/category/transaction/price-period/bed/bath/
  size/furnishing/amenity/availability/verification filters using parameterized
  SQL and period/currency-aware price columns.
- [x] Add deterministic bounded pagination and sorting; preserve query filters
  in browser history and Django page links; add mobile load-more behavior.
- [x] Reuse the existing search-alert model/API to save the applied filter
  state from public web and mobile discovery, with bounded input validation.
- [x] Add structured district/ward/size/furnishing listing details to API
  responses and public detail views.
- [x] Add focused discovery/filter, pagination, and Django form-state tests;
  verify the web production build and mobile type-check.
- [x] Replace the unprovisioned FULLTEXT search dependency with parameterized
  TiDB-compatible matching and add a migration for missing approximate
  coordinate columns used in discovery results.
- [ ] Run `EXPLAIN` and representative latency/cardinality checks against a
  controlled TiDB/MySQL dataset and confirm migration behavior on the
  deployed engine before rollout.
- **Stage status:** Discovery implementation is locally verified. Render
  startup logs exposed TiDB journey migration limitations and a production
  discovery failure caused by the absent approximate-coordinate columns.
  Sequential, additive migration recovery and TiDB-compatible search are now
  covered locally. Query-plan and production-engine verification remain open.
- Acceptance: filter-combination tests, pagination boundary tests, correct
  TZS and price-period behavior, and measured query bounds.

### Stage 4 — Listing lifecycle and property verification

- [x] Add agent-owned listing edit and soft-archive actions with
  category-aware validation. Edits to published, rejected, or unpublished
  properties return them to moderation; drafts stay drafts.
- [x] Track advertiser identity, location, authorization, and property
  document checks independently. Location/category edits restart the
  property-specific checks while retaining the advertiser identity check.
- [x] Record each decision, rejection reason, and operator label in the
  verification event history. Uploaded property documents are not treated as
  proof of legal ownership or title.
- [x] Require all four checks to be current before publishing through either
  the Express API or Founder Console; show the state and limitation language
  on web and mobile property details.
- [x] Backfill legacy listings conservatively as unverified. No uploaded
  identity or property document is exposed through public listing responses.
- Acceptance: focused verification state and Founder Console tests pass;
  migration execution against deployed TiDB/MySQL, backup/restore, and live
  document-storage checks remain required before production rollout.

### Stage 5 — Professional agent ecosystem

- [x] Add property-owner, agent, agency, developer, and verification-officer
  role paths with server-side permission checks; elevated roles remain
  Founder-assigned.
- [x] Add professional profile specializations/service areas, agency and
  developer application/review, verification-officer review queue, and
  listing/request/review analytics from recorded data only.
- [x] Add TiDB startup recovery that retries dependent agent-profile columns
  sequentially and applies an idempotent repair migration.
- [x] Expose profile and review controls in the public web experience and
  organization review/role controls in the Founder Console.
- Acceptance: focused role/profile tests pass. Organization team membership,
  production migration execution, and end-to-end multi-user isolation testing
  remain outstanding; no unverified sales statistics are shown.

### Stage 6 — Structured property listing management

- [x] Extend the existing wizard with category, sale/rent/stay intent,
  journey-specific pricing, and bounded category-specific property details.
- [x] Require a clear advertiser-authority declaration while keeping
  administrator property verification independent.
- [x] Validate and persist listing details server-side and expose safe
  category facts on public property details across web surfaces.
- [x] Permit property owners and approved organization roles to use the
  existing listing workspace without changing existing agent flows.
- Acceptance: focused validation and role tests pass; live database migration
  execution and complete browser submission testing remain outstanding.

### Stage 7 — Posts, reviews, reporting, and fraud triage

- [x] Keep listing announcements linked to active published listings and in
  the existing administrator moderation queue; arbitrary editorial posts are
  not enabled without agreed authoring, URL, and media rules.
- [x] Require completed stays for reviews, prevent listing owners and agents
  from reviewing their own property, and add audited owner/agent responses
  shown with public reviews. Ratings remain based on eligible published
  property reviews only; new submissions enter moderation before publication.
- [x] Add an administrator queue for exact address or listing-text duplicate
  candidates, with decisions and notes in the audit trail. Candidate matching
  is bounded to the 500 most recently updated active listings and never
  changes a listing or account automatically.
- [x] Validate report targets against supported published entities, derive
  the reported user from the selected entity, reject self-reports and
  duplicate open reports, and require an audit-noted resolution when closing
  a report.
- **Stage status:** Implemented and locally verified; free-standing editorial
  content remains gated on a separately defined content and media policy.
- Acceptance: moderation/audit tests and documented report-resolution paths
  pass; possible duplicates are always decided by a human.

### Stage 8 — Map, SEO, mobile performance, and parity

- [x] Preserve approximate public coordinates in discovery and detail
  responses; omit exact coordinate columns from public payloads.
- [x] Add an opt-in map view for the current paginated results, with map
  markers and previews only for listings that have an approximate location.
- [x] Add absolute canonical/Open Graph metadata, structured listing data,
  crawlable `/properties/<id>/` pages, and an absolute dynamic sitemap that
  includes published, non-deleted listings only.
- [x] Expose the approximate map location in the native detail screen using
  OpenStreetMap without adding a provider SDK or API credential.
- [x] Retain existing responsive image processing, lazy-loaded web listing
  images, paginated API requests, and mobile load-more behavior.
- [ ] Run native Android device/emulator smoke tests; no Android runtime is
  installed in the current development environment. Broad cross-client
  workflow parity remains tracked in `mobile/docs/feature-parity.md`.
- **Stage status:** Core implementation and local web/API/Django/mobile type
  checks are verified. Production `staynest-fb9b.onrender.com` sitemap,
  robots, and homepage canonical checks returned HTTP 200; Android runtime
  validation remains open.
- Acceptance: responsive/browser/native smoke tests and cross-client
  persistence checks for each completed slice.

### Stage 9 — Monetization and future modules

- [x] Add an administrator-configurable plan catalog for agent, agency,
  developer, and property-owner subscription/featured-placement concepts.
  Prices, currency, interval, and benefits are stored as plan data rather
  than hardcoded in application flows.
- [x] Keep plan configuration internal and non-transactional: no public
  purchase endpoint, subscription activation, checkout, or payment collection
  is introduced.
- Do not activate real payments, investment collection, pooled funds, or
  return-sharing until provider integration, reconciliation, legal review,
  and regulatory approvals are complete.
- Keep other future payments, agreements, property management, analytics, and
  recommendations behind explicit interfaces; do not build speculative
  modules ahead of validated needs.
- **Stage status:** Plan configuration is locally implemented and covered by
  admin/migration tests. Payment-provider integration and all production
  commercial/legal readiness checks remain explicitly out of scope.

### Stage 10 — Reviews, reputation, and moderation

- [x] Keep property reviews tied to completed bookings and add a separate
  agent review for the actual booking host; block owners/agents from
  self-review and require a rating plus a useful written comment.
- [x] Hold new reviews in `pending_review`; only published reviews appear
  publicly and affect property or agent rating summaries.
- [x] Add an administrator review queue with publish/hide decisions, required
  hide reasons, audit records, and property aggregate refresh.
- [x] Add property/agent review reporting and agent replies; expose verified
  interaction and agent-response information in native listing/profile
  screens.
- [x] Add web booking-history submission actions and native completed-stay
  review history/submission with pending/published state.
- [ ] Apply and exercise the additive schema migration on backup-verified
  isolated staging; confirm TiDB DDL, API eligibility, moderation, and public
  aggregates before any production rollout.
- **Stage status:** Implementation and focused local tests are in place.
  Staging migration, real booking interaction, and production verification are
  gated by the database backup/restore runbook.

### Stage 11 — User-experience improvements

- [x] Improve the new web/mobile review flows with distinct property/agent
  actions, useful validation, submission status, loading/error/empty states,
  retry actions, and accessible labels/alerts.
- [x] Add a native public agent reputation page with verified-stay indicators,
  agent replies, and review-report actions; keep public contact fields private.
- [x] Show verified completed-stay reviews, host replies, and review-report
  actions on web listing details; add published agent ratings/reviews/replies
  and reporting to the public web agent page. Remove the fabricated local
  guest-review fallback in favor of canonical API data.
- [ ] Continue the broader hierarchy, navigation, listing-card/detail,
  discovery, listing-form, dashboard, accessibility, and responsive audit
  across the Vite site, Django marketplace, and Expo app. Preserve the current
  brand and existing workflows; make changes only where testing identifies a
  concrete usability gap.
- **Stage status:** Trust-related UX gaps discovered during Stage 10 are
  implemented and locally verified across Vite, Django admin, and Expo. The
  broader cross-surface visual audit and Android device testing remain open.

### Stage 12 — Administration and security

- [x] Keep admin routes and controls out of public navigation; remove the
  homepage shortcut and hidden brand double-click entry.
- [x] Enforce CSP policies on Express and Django responses that disallow
  inline script execution and script attributes; externalize Django admin
  scripts and replace inline event handlers with data-driven actions.
- [x] Preserve server-side authentication, role/feature authorization,
  CSRF, rate limiting, secure sessions, audit logging, input/upload
  validation, password hashing, and parameterized SQL controls.
- [x] Add regression coverage for public admin entry points, CSP directives,
  and externalized Django admin scripts/actions.
- **Stage status:** Local security tests and Django checks pass. Production
  header verification and a full security assessment remain outstanding.

### Stage 13 — Mobile performance

- [x] Request Cloudinary image variants sized for discovery cards, agent
  avatars, thumbnails, and full listing views, using automatic quality and
  format while leaving non-Cloudinary media URLs unchanged.
- [x] Reduce initial render and batch sizes for discovery and admin lists;
  retain existing pagination/load-more behavior and loading/error states.
- [x] Preserve lazy-loaded listing images and server-side image compression.
- [ ] Verify image transfer sizes and scrolling behavior on representative
  Android devices and slower mobile connections.
- **Stage status:** Mobile TypeScript and Expo web export are locally
  verified. Native Android performance and real-network measurements remain
  outstanding.

### Stage 14 — Monetization architecture

- [x] Configure plan concepts by audience, price, currency, interval, and
  administrator-defined benefits through the protected admin catalog.
- [x] Show enabled plan concepts to eligible professional accounts using the
  catalog data; do not hardcode prices or benefit limits in client code.
- [x] Keep the architecture non-transactional: no subscription activation,
  checkout, or payment collection is available.
- [ ] Complete provider integration, reconciliation, legal review, and
  regulatory approval before offering real subscriptions or sponsored
  placement.
- **Stage status:** The configurable plan catalog and professional read-only
  preview are implemented. Subscription activation and payments remain
  intentionally disabled; schema deployment remains subject to the backup
  and isolated-staging restore gate in `DATABASE_OPERATIONS.md`.

### Stage 14 follow-up — Professional workspace and moderation access

- [x] Make the existing professional profile and analytics workspace directly
  accessible from agent settings, respecting delegated sub-agent permissions.
- [x] Mount professional API endpoints before the API not-found handler.
- [x] Replace unsupported correlated listing/document joins and rebase stored
  listing media URLs to the marketplace origin for Django admin previews.
- [x] Embed the expiring, single-use identity-document preview in the protected
  listing moderation wizard without allowing other admin pages to be framed.
- [x] Show duplicate candidates separately from decision history so listings
  remain reviewable when the duplicate-history table is unavailable.
- [x] Restrict legacy AI aliases to read-only redirects and return explicit
  errors for unsupported methods and nested paths.
- **Stage status:** Application-level fixes only; no database schema changes.
  Production verification and private-document end-to-end testing remain
  pending the backup and isolated-staging restore gate in
  `DATABASE_OPERATIONS.md`.

Stage 8/9 verification:

- Production `https://staynest-fb9b.onrender.com/sitemap.xml`,
  `/robots.txt`, and `/` returned HTTP 200. Sitemap XML parsed successfully
  with absolute URLs; the homepage canonical uses the configured production
  origin.
- Stage 9 adds a non-public plan catalog configurable from the admin console;
  it does not create subscription records or enable checkout/payment flows.
- Android device/emulator smoke testing cannot be performed in this
  environment because `adb` and the Android emulator are unavailable.

## Baseline verification

Initial audit baseline, run on 2026-11-07:

- `npm test` — **30 passed**
- `npm run test:django` — **69 passed**
- `npm run check:django` — **passed**
- `npm run build` — **passed**
- JavaScript syntax checks for the modified Node files — **passed**

These are a baseline, not proof of production database compatibility,
provider delivery, payment readiness, security, or full feature parity.

Stage 2 verification on the current working tree:

- `npm test` — **34 passed**
- `npm run test:django` — **69 passed**
- `npm run build` — **passed**
- JavaScript and Python syntax checks — **passed**
- `git diff --check` — **passed**
- `npm run typecheck` from `mobile/` — **passed**
- TiDB SQL syntax was checked against current TiDB documentation for
  multi-column ALTER behavior and dropping named CHECK constraints. No live
  TiDB database was available, so deployed DDL remains unverified.

Stage 3 verification on the current working tree:

- `npm test` — **41 passed**
- `npm run test:django` — **71 passed**; Django system checks clean
- `npm run build` — **passed**
- `npm run typecheck --prefix mobile` — **passed**
- `git diff --check` and targeted JavaScript syntax checks — **passed**
- TiDB/MySQL `EXPLAIN`, migration execution, backup restore, and live API
  behavior — **not run**; a controlled database environment is still needed.

Stage 4 verification on the earlier working tree:

- `npm test` — **45 passed**
- `npm run test:django` — **73 passed**; Django system checks clean
- `npm run build` — **passed**
- `npm run typecheck --prefix mobile` — **passed**
- JavaScript/Python syntax checks and `git diff --check` — **passed**
- TiDB/MySQL migration execution, query plans, backup/restore, and private
  storage end-to-end checks — **not run**; production access was unavailable.

Stage 5/6 and Render migration-recovery verification:

- The profile-column repair was pushed and the public readiness endpoint
  returned HTTP 200 with database status `ok`. The next Render log showed
  another startup abort, `Unknown column 'category_details' in 'listings'`,
  before HTTP port binding. This is a TiDB combined-ALTER limitation, not a
  port configuration issue.
- The current repair retries the four dependent listing columns sequentially
  and adds an idempotent migration for partially applied/ledger-skipped
  databases. Django console login now supports active delegated administrators
  with username/email and password, with feature-level checks and Founder-only
  controls retained. Latest local validation: 80 Django console/marketplace
  tests, 63 Node tests, Django system checks, production build, Python syntax
  checks, and `git diff --check`. Commit `1d5b62f` is deployed; Node readiness
  reports HTTP 200/database `ok`, and the Django health and updated admin login
  endpoints return HTTP 200. This confirms service startup completed; direct
  access to Render deployment logs was unavailable.
- Production TiDB/MySQL migration execution, backup/restore, and end-to-end
  listing submissions against a controlled database remain outstanding.

Stage 7 verification:

- `npm test` — **54 passed**, including review eligibility and response
  validation.
- `npm run test:django` — **76 passed**; Django system checks clean, including
  duplicate-candidate decision and report-resolution coverage.
- `npm run build` — **passed**.
- Modified JavaScript syntax checks and `git diff --check` — **passed**.
- The new `listing-duplicate-triage-migration.sql` is registered for startup;
  applying it against TiDB and validating the duplicate query plan against
  production-sized data remain outstanding.

## Current handoff for the next development session

- Stages 1–14 are implemented locally. The saved master prompt reference is
  `MAKAZI_GO_MASTER_PROMPT_REFERENCE.txt`. Current local verification: 81 Node
  tests, 102 Django tests, Django system checks, production Vite build,
  JavaScript/Python syntax checks, and `git diff --check` pass. The professional
  workspace is accessible from agent settings; API mounting order, TiDB-safe
  moderation joins, admin media origin handling, inline document preview,
  profile-image fallback, and strict legacy AI alias behavior have regression
  coverage.
- No schema changes were made for the latest admin/workspace reliability work.
  No production database or object-storage credentials were used; TiDB query
  plans, migration state, stored media reachability, and the secure document
  preview remain unverified end-to-end against production.
- Admin review embeds private identity evidence in the listing wizard through
  an audited, expiring, single-use grant. Only that document response can be
  framed by the same admin origin. Listing image URLs are rebased to the
  marketplace origin because Django admin runs on a separate service.
- The agent ecosystem API is now mounted before its API not-found handler.
  Preserve this order when adding routes. Legacy `/ai` and `/makazi-go-ai`
  aliases redirect only safe read requests; no AI provider or recommendation
  service is configured.
- The new migration runner is `server/schema-migrations.js`; its ordered list
  includes `property-categories-migration.sql` and the new
  `private-document-access-migration.sql`.
- New identity uploads use AES-256-GCM via `APP_ENCRYPTION_KEY`; database
  `encryption_version=0` preserves the old plaintext-read path. Do not remove
  the compatibility path until existing stored files are migrated.
- Django issues two-minute SHA-256-hashed review grants; Express consumes
  each grant once and never returns storage keys. Confirm `MARKETPLACE_URL`
  points to the Express API host in deployment.
- Next: follow `DATABASE_OPERATIONS.md` before applying any production schema
  changes: record an authorized provider recovery point, create a protected
  logical backup, restore it to isolated staging, verify migrations and
  representative records, then smoke-test admin document/media review. The
  `EMAIL-TEMPLATES.txt` content is reference material; those messages are not
  sent by the application yet. Preserve unrelated worktree changes.

## Working rules for future stages

- Inspect existing behavior and migrations before coding; prefer additive
  changes and preserve existing data.
- Work on one stage and a small set of user-visible outcomes at a time.
- Keep backend validation/authorization authoritative; never rely on
  frontend-only controls.
- Add focused tests for introduced behavior and run the narrowest applicable
  suite plus relevant builds.
- Record changed files, schema changes, verification evidence, remaining
  gaps, and handoff context in `CHANGELOG.md` and this roadmap.
- Existing worktree edits and untracked files were present during this audit;
  they were not created or discarded by this documentation pass.
