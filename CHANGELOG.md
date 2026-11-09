# Changelog

Notable project changes are recorded here. This log does not replace the
commit history or release notes.

## Unreleased

### Marketplace reliability and listing quality

- Replaced inline image error handlers with a CSP-compatible fallback listener,
  so unavailable listing media and avatars receive safe fallbacks without
  relying on blocked `script-src-attr` execution.
- Removed the duplicate homepage header markup and its cleanup workarounds.
- Moved share and compare controls below listing images on narrow screens so
  their overlays no longer intercept taps intended to open a property.
- Added shared validation for bedroom, bed, bathroom, and guest-capacity values
  so malformed listing submissions return a clear client error instead of
  being silently coerced into plausible values. Apartment listings with zero
  bedrooms are presented as studios.
- Added native property-detail booking and viewing requests using the shared
  Express API, including quote information, tenant-only submission, CSRF,
  idempotent retry keys, request receipts, and server-side guest-capacity
  validation.
- Added tenant booking history and detail views with confirmed cancellation
  and stay rescheduling. Rescheduling now recalculates the total, revalidates
  listing terms and date conflicts, and refreshes booking date locks in one
  transaction. Payment-attached bookings are routed to support rather than
  silently changed or cancelled without refund handling. Exact addresses
  remain hidden from guests until confirmation.
- Added a tenant saved-properties screen with refresh, removal, listing
  availability and pricing details, plus save/unsave actions on marketplace
  cards and listing details. Actions use the shared authenticated API and
  guest/non-tenant users are prompted to sign in as a tenant.
- Added tenant saved-search management with criteria summaries, refresh, and
  confirmed deletion; Explore search creation now validates the server receipt
  and preserves selected-currency criteria. Search-alert delivery is not yet
  implemented or verified.
- Added mobile account settings for password changes, tenant notification
  preferences, and password-confirmed account-deletion requests using the
  existing shared endpoints.
- Added tenant profile editing for names, phone, city, and bio; profile photos
  can be selected, cropped, and uploaded to the existing shared profile
  endpoint. The profile also links followed agents, saved properties, and
  bookings.
- Added mobile secure messaging with an inbox, unread counts, paged 30-day
  conversation history, agent-profile message starts, and protected sends.
  Conversation controls support user block/unblock and reporting. Added a
  separate system-notification center with mark-read behavior and supported
  booking/listing-review links; push notifications remain unimplemented.
- Corrected booking-detail SQL parameter ordering so participant access works
  while the exact-address privacy check remains bound to the signed-in guest.
- Added isolated mobile development/preview/production variants and EAS build
  profiles. Preview/production require an HTTPS API origin, and production
  requires store-owner-supplied native identifiers rather than guessed IDs.
- Verification: 95 Node tests, mobile TypeScript check and Expo web export,
  production Vite build,
  and a local browser interaction check passed. The 105-test Django suite and
  Django system checks passed in the preceding QA run; they were not affected
  by this mobile/API change. Authenticated staging journeys and native-device
  testing remain unverified. No arbitrary maximum price was introduced;
  outlier prices need a documented business rule and review of production data.

### Stages 16–17 — SEO and quality assurance

- Added readable listing URLs using normalized title slugs and stable IDs.
  Legacy numeric paths permanently redirect to the canonical URL while
  retaining return-navigation parameters. Listing cards, map previews, and
  share links now use the same friendly URL format on Express and the Django
  marketplace.
- Expanded listing metadata with dynamic titles and descriptions, canonical
  and Open Graph/Twitter tags, cover-image fallbacks, and escaped
  `RealEstateListing` JSON-LD with available location and offer details.
- Added an index of location guides and server-rendered region/neighborhood
  pages. A guide is published only for an unambiguous location with at least
  three published listings; pages include useful listing links, image alt
  text, canonical/social metadata, and `CollectionPage` structured data.
- Django location-guide URLs permanently hand off to the configured public
  Express origin, keeping one canonical location-page host.
- Extended the dynamic sitemap to include canonical listing URLs and eligible
  location guides. Existing robots rules remain in place. No database schema
  changes were made.
- Added regression tests for SEO slug generation, numeric-ID validation,
  sitemap URLs, social metadata, escaping, thin-page exclusion, and location
  guide content.
- Verification: 84 Node tests, 105 Django tests, Django system checks,
  production Vite build, mobile TypeScript check, and `git diff --check` pass.
  Database-backed cross-service/browser journeys, native-device behavior,
  production crawling, and deployed TiDB/MySQL behavior remain unverified and
  require the documented isolated-staging/backup gate.

### Agent workspace access and admin review reliability

- Added a direct professional dashboard and analytics action in agent settings.
  The action respects sub-agent permissions and opens the existing authenticated
  profile, analytics, verification, and plan-preview workspace.
- Mounted the agent ecosystem API before the API not-found handler, so its
  authenticated professional profile and analytics endpoints can be reached.
- Reworked listing-detail amenity and identity-document lookups to use
  pre-aggregated joins instead of correlated join conditions unsupported by
  TiDB. The listing detail page now serves stored `/media` previews from the
  marketplace origin rather than the separate Django admin host.
- Added an inline, same-origin admin document preview inside the listing
  moderation wizard. Only the identity-document preview response may be
  framed by its own origin; other admin routes retain `frame-ancestors 'none'`.
- Separated possible-duplicate matching from decision history. When duplicate
  history is unavailable, candidate pairs still appear read-only with disabled
  decision controls, while the rest of listing moderation remains usable.
- Improved broken profile-photo handling: profile images now use a JavaScript
  fallback compatible with the admin CSP and render a styled initials avatar
  if both the submitted image and fallback asset fail.
- Legacy AI aliases are restricted to safe GET/HEAD redirects. Writes and
  nested paths return explicit 405/404 responses; no AI recommendation
  endpoint or provider is configured.
- Local verification: 81 Node tests, 102 Django tests, Django system checks,
  production Vite build, JavaScript/Python syntax checks, and
  `git diff --check` pass. The bundled default-avatar asset was confirmed in
  `dist`.
- No schema changes were made. Production database and private-document
  behavior remain subject to the backup and isolated-staging verification gate
  in `DATABASE_OPERATIONS.md`.

### Professional workspace, search, avatars, and Stage 14

- Added the authenticated professional-profile read route that the workspace
  already depended on. Reworked the profile and analytics view into a
  responsive, wider workspace with listing metrics, verification states,
  editable specializations/service areas, organization review status, explicit
  retry/error states, and admin-configured plan previews.
- Professional analytics now separates published listing guest reviews from
  agent reviews. If the gated reputation migration is not installed yet, the
  other analytics still load and the unavailable agent-review metric is
  clearly identified.
- Added audience-scoped, admin-enabled plan previews to professional accounts.
  Plan prices and benefits come from the configured catalog; the preview does
  not activate subscriptions or expose checkout/payment actions.
- Search results now remain visible when a search URL is reopened, explicit
  searches scroll to the results, and discovery failures provide an inline
  retry instead of looking like an empty result set.
- Listing-detail agent portraits now use a valid Makazi Go fallback and
  register image-error handling through JavaScript rather than CSP-blocked
  inline handlers.
- Legacy `/ai` and `/makazi-go-ai` paths now resolve to marketplace discovery
  with a clear message that AI recommendations are not available yet. No AI
  provider or recommendation system is configured; that remains future work.
- Local verification: 78 Node tests, 100 Django tests, Django system checks,
  production Vite build, mobile TypeScript check, JavaScript syntax checks, and
  `git diff --check` pass. Local browser verification could not complete because
  the preview was unreachable through the browser bridge; production behavior
  and deployment database state remain unverified.

### Admin document previews, TiDB moderation, and signup verification setting

- Identity documents now preview through the authenticated admin origin. The
  preview streams only supported PDF/JPEG/PNG content, keeps the audited
  single-use grant, and shows a clear admin error if the upstream link is
  invalid or the file cannot be retrieved instead of displaying a JSON error.
- Reworked listing moderation's latest identity-document joins to use
  pre-aggregated user/document IDs rather than correlated `ON` subqueries,
  which TiDB does not support. Agent-related listing links now open the
  detailed admin moderation page, including its review actions.
- Added an audited admin setting to require email verification after signup.
  When disabled, new accounts are marked verified and existing unverified
  accounts may sign in; verification remains required by default.

### Stages 12–13 — Administration security and mobile performance

- Removed the public homepage admin shortcut and hidden brand double-click
  route. Express and Django now send CSP policies that disallow inline script
  execution and script attributes; Django admin scripts are served externally
  and inline event handlers use data-driven controls.
- Preserved existing server-side admin authentication/authorization, CSRF,
  rate limits, secure sessions, audit logging, upload validation, and
  parameterized database access. Added regression checks for public admin
  entry points, CSP directives, and externalized Django admin scripts.
- Added responsive Cloudinary width/quality/format transformations for mobile
  discovery, listing, and agent images, and reduced initial/batch rendering
  windows for discovery and admin lists without changing pagination.
- Local verification: 74 Node tests, 95 Django tests, Django system checks,
  Vite production build, mobile TypeScript check, Expo web export, JavaScript
  syntax checks, and `git diff --check` pass. Android device/network
  performance tests and production CSP-header verification remain outstanding.

### Stages 10–11 — Reviews, reputation, and mobile experience

- Property and agent reviews are now separate, require a completed booking,
  require a useful written comment, block self-reviews, and enter moderation
  before becoming public. Only published reviews contribute to property or
  agent ratings.
- Added agent review replies and reporting for property/agent reviews, a
  permission-scoped Django moderation queue with audited publish/hide
  decisions, and aggregate refreshes when property reviews are moderated.
- Added web booking-history actions for separate property and agent reviews;
  native review history/submission, public agent reputation and responses,
  web and native verified-stay indicators, per-review report actions,
  retry/error/empty states, and accessible controls. Public listing details
  now use the API response rather than a fabricated local guest-review sample.
- Added the additive `reputation-reviews-migration.sql` migration and updated
  `database/schema.sql`. It has not been applied to staging or production:
  the documented provider-backup and isolated-restore gate remains required.
- Verification: 72 Node tests, 94 Django tests, Django system checks, Vite
  production build, Expo web export, mobile TypeScript check, Python/JavaScript
  syntax checks, and `git diff --check` pass. Live TiDB DDL, end-to-end
  account workflows, and Android device testing remain outstanding.

### Admin review, booking requests, and account details

- Listing review now surfaces the advertiser's latest identity document (owner
  or assigned agent), offers an audited secure preview, and records the
  ordered identity, location, authorization, and document checks before
  publication. API and Django moderation paths reject skipped steps; document
  checks cannot be completed without an uploaded document.
- Admins can add missing listing and agent/account profile details using
  advertiser-confirmed information. Location edits reopen the location review
  and return published listings to moderation.
- Homepage discovery uses the shared server search rather than filtering only
  the currently rendered cards. The property map continues to use approximate
  coordinates from the shared discovery API.
- Booking requests now distinguish scheduled property viewings from stays.
  Viewing requests require a future appointment, do not reserve stay dates or
  create an accommodation charge, and show their schedule and status to both
  tenant and host. Stay requests retain date validation and use an
  idempotency key when supported by the browser.
- Inbox threads and booking details use account names, email fallbacks, listing
  titles, and booking codes rather than showing raw entity IDs; missing profile
  rows no longer hide conversations or booking requests.

### Marketplace search, image uploads, and admin profile photos

- Fixed discovery failures on upgraded TiDB databases by adding the missing
  approximate-coordinate columns through a new additive migration and
  replacing the unprovisioned FULLTEXT dependency with parameterized,
  TiDB-compatible `LIKE` search and deterministic relevance ordering. Web and
  mobile continue using the shared discovery API.
- Listing-photo preparation now falls back to submitting the original image
  when the browser decoder cannot read it, allowing the server's image
  validator/optimizer to handle the upload. Compressed file extensions and
  MIME types now match the actual canvas output.
- Admin user details now prefer the account avatar and fall back to the agent
  profile image; relative marketplace media URLs resolve against the
  configured marketplace host.
- Render logs confirmed the service completed startup migrations; discovery
  still failed because TiDB rejected bound `LIMIT`/`OFFSET` parameters with
  `ER_WRONG_ARGUMENTS`. Discovery pagination now emits bounded integer
  literals after validating the page and limit.
- Deployed the TiDB pagination fix in `f4b48b3`. Production discovery now
  returns HTTP 200 for unfiltered, text-search, land, hotel, and commercial
  requests. The current dataset has 2 total listings and 1 land listing; the
  tested hotel, commercial, and text-search filters return empty results
  without errors.
- Validation: 68 Node tests, 89 Django tests, Django system checks, web
  production build, mobile TypeScript check, and `git diff --check` pass.
  The migration is unchanged in this follow-up; production backup and
  staging-restore verification remain outstanding.

### Stages 8 and 9 validation and monetization plan configuration

- Verified the configured Render homepage canonical, dynamic sitemap, and
  robots sitemap reference over HTTPS (HTTP 200); sitemap XML parsed and
  emitted absolute URLs.
- Added an administrator-configurable, non-public plan catalog for future
  agent, agency, developer, and property-owner subscriptions and
  featured-placement concepts. Plans store administrator-defined prices,
  currency, billing interval, and JSON benefits; admin feature permissions
  control access and all writes are audited.
- Plan configuration is not checkout: no subscription activation, purchase
  endpoint, payment collection, investment collection, or return-sharing was
  added. No example prices or prefilled commercial plans are seeded.
- Validation: 64 Node tests, 88 Django tests, Django system checks, Vite
  production build, mobile TypeScript check, and `git diff --check` pass.
  Production sitemap-listed property pages returned HTTP 200 with matching
  canonical URLs and structured data. TiDB migration execution remains
  unverified; native Android execution is unavailable without `adb`/an
  emulator.

### Admin document preview and listing review details

- Identity-verification documents now open inline in a separate admin tab
  using the existing audited, short-lived, single-use access grant; the admin
  queue identifies the applicant, document suffix, and submission date.
- Listing moderation now links directly to the review page. That page shows
  listing media plus full location, transaction/pricing, land/commercial,
  advertiser-authorization, amenities, and category-specific details.
- Validation: 82 Django console/marketplace tests, 63 Node tests, Django
  system checks, JavaScript/Python syntax checks, and `git diff --check` pass.

### Delegated administrator sign-in and TiDB listing migration recovery

- The Django operations console previously authenticated only the protected
  Founder Console profile, so accounts created or assigned the administrator
  role were rejected even when their account username and password were valid.
  Added active administrator-account sign-in by username or email, revalidated
  role/status on each console request, and enforced delegated feature grants
  without exposing Founder-only account controls.
- Render startup then failed on the combined `listings` ALTER because TiDB
  could not resolve `category_details` used as an `AFTER` position in the same
  statement. Added a sequential TiDB retry and an additive repair migration
  that safely completes missing columns.
- Validation: 63 Node tests, 80 Django console/marketplace tests, Django
  system checks, Python syntax checks, production build, and `git diff --check`
  pass. Commit `1d5b62f` is deployed; Node `/api/ready` returns HTTP 200 with
  database `ok`, and the Django health and updated admin login endpoints
  return HTTP 200.

### Render TiDB agent-profile migration recovery

- Render startup moved past the transaction-type migration but then failed
  because TiDB could not resolve `specializations` inside the combined,
  position-dependent `agent_profiles` ALTER. Startup consequently never bound
  the HTTP port.
- Added a TiDB-specific sequential retry for those three profile columns and
  an additive idempotent repair migration for databases whose migration ledger
  may already have advanced without all profile columns.
- Validation: 61 Node tests, 77 Django tests/system checks, Vite build, mobile
  type-check, migration syntax checks, and `git diff --check` pass. Production
  TiDB deployment and health checks must be confirmed after the push.

### Map discovery, SEO, and mobile location handoff

- Added privacy-safe approximate coordinates to paginated discovery results
  and a lazy, opt-in map/list toggle with price markers and property previews;
  listings without coordinates are excluded from the map.
- Added canonical listing URLs, dynamic absolute sitemap and robots routes,
  per-listing Open Graph metadata, and structured listing data for published
  property pages. Canonical and metadata support is also present on Django
  marketplace pages.
- Updated the native listing detail screen to open the approximate location in
  OpenStreetMap without adding a mapping SDK or requiring credentials.
- Kept existing WebP image processing, lazy-loaded web listing cards, and
  paginated mobile discovery behavior. No database migration was required.
- Validation: 59 Node tests, 77 Django tests/system checks, Vite production
  build, mobile TypeScript check, browser map/list and 375px viewport smoke
  test, and `git diff --check` pass. Production-host canonical/sitemap and
  Android device checks remain pending.

### Posts, reviews, reports, and duplicate triage

- Added a bounded administrator queue for exact listing-address or
  listing-text duplicate candidates, with documented human review decisions
  and audit notes; the system never labels or penalizes an account
  automatically.
- Prevented owners and agents from reviewing their own listings and added
  single owner/agent responses to eligible published reviews; published
  responses appear alongside the reviews.
- Validated report targets against supported published entities, derived the
  reported account from the selected item, reject self-reports and repeated
  open reports, and require an audit-noted resolution when closing reports.
- Existing listing announcement posts remain linked to published properties
  and require administrator moderation. Free-standing editorial posts remain
  disabled pending explicit authoring, URL, and media rules.
- Validation: 54 Node tests, 76 Django tests/system checks, web production
  build, modified JavaScript syntax checks, and `git diff --check` pass.
- The new additive duplicate-triage migration is covered by startup-sequence
  tests; applying it against the deployed TiDB database is still required.

### Professional agent ecosystem

- Added property-owner, agency, developer, and verification-officer role
  paths while keeping elevated-role assignment Founder-only and enforcing
  listing permissions on the server.
- Added bounded professional specializations and service areas, agency and
  developer verification applications, a role-gated verification-officer
  queue, and Founder Console review controls.
- Added listing, booking-request, and published-review metrics based on
  existing records; missing data is not presented as a fabricated score.
- Validation: 52 Node tests, 73 Django tests/system checks, web production
  build, mobile type-check, and syntax checks pass.
- Production migration execution and complete multi-user role-isolation
  testing remain outstanding.

### Structured property listing management

- Extended the existing listing flow with property category, sale/rent/stay
  journeys, corresponding pricing, and bounded category-specific details.
- Added an advertiser-authority declaration and server-side validation while
  keeping property verification independent and administrator-reviewed.
- Added owner/organization access to the existing listing workspace and
  category-specific facts to public property details.
- Added additive migrations for professional profiles/business records and
  structured listing details. Production TiDB/MySQL migration execution and
  complete browser submission testing remain outstanding.

### Listing lifecycle and property verification

- Added independent property identity, location, authorization, and document
  review states with conservative backfill of existing listings as
  unverified. These checks do not certify legal title.
- Added audited check decisions and history, including rejection reasons and
  operator labels for Express and Founder Console reviewers.
- Added agent listing edit and soft-archive operations. Material location or
  category changes restart property checks while preserving advertiser
  identity review; published, rejected, and unpublished edits return to
  moderation.
- Enforced current completion of all four checks before publication in both
  administrative paths, and exposed accurate status explanations on public
  web and mobile details.
- Sensitive review documents remain on the existing private-document path
  and are not included in public listing payloads.
- Local tests and builds pass. Applying the migration and checking database
  recovery and private storage in controlled production-like infrastructure
  remain outstanding.

### Search and discovery

- Added validated, parameterized discovery filters for location breakdown,
  category and journey, price period/currency, bedrooms, bathrooms, size,
  furnishing, amenities, availability, and agent verification.
- Replaced the unpaginated listing response with deterministic bounded pages,
  count metadata, and price/relevance sorting.
- Added full filter and page navigation to the static and Django web surfaces;
  mobile now supports structured filters and load-more paging.
- Added save-current-search actions to public web and mobile discovery using
  the existing search-alert storage/API, with request validation and size
  limits.
- Exposed district, ward, property size, and furnishing on listing details.
- Added focused API-plan and Django search tests, including preserving entered
  filters when validation errors are returned.
- Production TiDB/MySQL migration execution, query-plan measurement, and
  backup/restore verification remain outstanding; no live database was used.

### Property journeys

- Added Buy, Rent, and Stay transaction types while retaining legacy combined
  rental listings and their existing rental-mode data.
- Added sale pricing and structured land (plot size/unit, land use,
  advertiser-reported title status) and commercial (floor area/use) facts.
- Added server-side validation for journey/price/category combinations and
  prevented booking requests for sale and long-term rental listings.
- Added journey filters and sale/land/commercial details to the public web,
  Django marketplace, and mobile listing surfaces.
- Added an additive, checksum-tracked migration that backfills existing
  transaction types from rental mode and changes currency defaults to TZS
  without rewriting stored amounts.
- Render startup logs identified TiDB's `Unsupported operate same column
  'transaction_type'` error when the migration modified and indexed that
  column in one ALTER. The migration runner now retries those as separate
  operations without changing the historical migration checksum. The new
  agent-profile index is also created separately. The fix was pushed in
  `ec22d4a`; the public health endpoint returned HTTP 200 afterward, but
  deployment-specific runtime logs were unavailable, so migration completion
  on the new release remains unconfirmed.

### Security

- Confirmed the username migration adds the nullable column separately from
  its unique index for TiDB compatibility; added a regression test for the
  previously reported startup migration failure.
- Corrected administrator IP allow/deny matching to use validated IPv4/IPv6
  CIDR ranges instead of a string-prefix approximation.
- Made Django startup reject missing or short `DJANGO_SECRET_KEY` values in
  production; the previous fallback remains limited to non-production.
- Added focused tests for exact addresses, subnet boundaries, IPv4-mapped
  addresses, IPv6 ranges, and malformed CIDRs.
- New identity-document uploads are encrypted with AES-256-GCM before local
  or S3 storage. Existing encryption-version-zero documents retain a
  backwards-compatible read path.
- Added a Founder Console review action that issues an audited two-minute,
  single-use hashed token. The Express download route consumes it
  transactionally and serves an attachment with no-store and no-referrer
  protections without exposing its storage key.
- Added checksum-tracked SQL migration history. Already-applied unchanged
  migrations are skipped, modified applied files fail closed, and failed
  migrations are not recorded as successful.
- Added migration, encryption-integrity, and admin token-grant tests.

### Documentation

- Added `DEVELOPMENT_ROADMAP.md` with a repository-grounded Phase 1 system
  audit, prioritized risks, staged delivery plan, and current test baseline.
- Saved the supplied Makazi Go master development prompt verbatim as
  `MAKAZI_GO_MASTER_PROMPT_REFERENCE.txt`.
- Added `DATABASE_OPERATIONS.md` and a read-only
  `database/verify-stage-migrations.sql` for controlled backup/recovery and
  post-migration schema verification.
- Added an additive schema migration for private-document encryption
  versions and single-use review tokens. Apply and verify it against the
  deployed TiDB/MySQL engine before rollout.
- Remaining audit risks, production compatibility checks, and handoff steps
  are tracked in the roadmap.

### Verification

- `npm test` — 41 tests passed.
- `npm run test:django` — 71 tests passed; Django system checks clean.
- JavaScript and Python syntax checks — passed.
- `npm run build` — passed.
- `npm run typecheck --prefix mobile` — passed.
- `git diff --check` — passed.
- Live TiDB/S3 compatibility and query plans were not tested because no
  production database or storage services were available.
