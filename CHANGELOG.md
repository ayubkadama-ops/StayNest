# Changelog

Notable project changes are recorded here. This log does not replace the
commit history or release notes.

## Unreleased

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
