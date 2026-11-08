# Changelog

Notable project changes are recorded here. This log does not replace the
commit history or release notes.

## Unreleased

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
- Verified TiDB ALTER TABLE syntax against current documentation; execution
  against the deployed TiDB instance is still required before rollout.

### Security

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
