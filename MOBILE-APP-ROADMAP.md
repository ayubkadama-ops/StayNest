# StayNest Mobile App Roadmap

## Purpose and definition of done

Build a downloadable iOS and Android application that can do **everything a user can do in the web project**. The mobile app must provide complete feature and workflow parity across every web page, role, action, form, setting, and supported administrative operation. The native layout and interactions may differ to suit phones; the concepts, labels, values, validation, and outcomes must stay consistent with the website and API.

The mobile app is a separate application inside this repository, not a mobile website and not a replacement for the web app. Recommended location and starting stack:

- `mobile/` — Expo + React Native + TypeScript application, with its own dependencies and build configuration.
- Keep the existing web app, Django marketplace/admin, Express API, database, and deployment in place.
- Treat the existing API and its authorization rules as the source of truth. Do not copy business rules into the app as a substitute for server validation.
- Build store artifacts separately from the web build: Android App Bundle (`.aab`) and an iOS signed archive submitted through Apple’s supported upload flow. EAS Build/Submit can be evaluated for this; store accounts, signing, review, and release approval remain required.

The web marketplace, mobile app, and administrator console are separate clients over one canonical StayNest data set. They must use the same deployed API/database configuration: user changes made in either client must persist for the other clients, and authorized administrator actions must affect what web and mobile users see on their next refresh. Do not introduce a mobile-only database or treat local cache as authoritative. The current Django marketplace proxies the Express API, while the Django admin uses MySQL directly; deployment must point Express and Django at the same database and configure Django's `API_UPSTREAM_URL` to that Express service. This is shared-state consistency, not a promise of instantaneous live updates; real-time behavior requires a separately verified push/streaming mechanism.

“Everything” is a release gate, not an aspiration or a subset. It means complete, verified parity for every web route/screen, visible action, form, filter, setting, role-protected workflow, and human-facing capability, including admin and sub-agent workflows. No feature may be omitted or deferred as “web-only” for convenience. If a capability is technically unavailable on a phone, implement a safe, usable mobile equivalent that produces the same result and document the adaptation; it still counts as required parity. Do not claim the app is complete or store-ready while any parity row is missing, unverified, blocked, or an unapproved exception.

The inventory phase must reconcile this rule against the live code before implementation. The roadmap is not itself proof of a complete inventory. Do not release based only on the representative feature bullets below.

## Project-specific baseline

The current project information identifies these user categories and flows:

- **Guest:** browse public marketplace listings and public showcase content.
- **Tenant:** account/profile and profile photo; saved homes; agent follows; listing discovery; booking requests and history; permitted reviews; messaging; notifications.
- **Agent:** approved profile; listing creation/editing and moderation status; listing media and required documents; booking requests; posts; tenant communication; explicitly assigned listing/media permissions.
- **Sub-agent:** separate login under a main agent; only explicitly assigned permissions; no elevation to main-agent access.
- **Administrator:** protected operations console with metrics; people and role management; account status actions; agent approval; listing/post moderation; booking management; badges; identity verification; MFA resets; reports; trust-and-safety tools; audit events.

Related shared workflows include authentication, optional MFA, Google sign-in, listing and agent discovery, listing reviews, messaging, notifications, uploads, moderation, and account-security controls. The exact current inventory must be verified against `PROJECT-INFO.txt`, `server/index.js`, the Django marketplace and console routes/templates, the database schema, and the actual web interactions.

## Delivery rules

- [ ] Preserve the web app and keep mobile configuration isolated under `mobile/`; do not move or rewrite web files as part of bootstrapping.
- [ ] Match the StayNest/Makazi Go brand, wording, listing and profile fields, currencies, units, statuses, validation, and role behavior. A visual redesign for native screen sizes is fine; changing product meaning is not.
- [ ] Enforce permissions on the server. Hiding a button in the UI is not authorization.
- [ ] Keep web, mobile, and admin changes on the shared canonical API/database; verify writes and status changes are visible across clients after refresh, including administrator moderation and role actions.
- [ ] Keep messages, system notifications, and administrative alerts as separate concepts and destinations where the web does.
- [ ] Treat uploads and personal/identity documents as sensitive; reuse server validation and private-storage behavior.
- [ ] Never put credentials, API secrets, signing keys, or production environment files into the app bundle, repository, or checkpoint notes.
- [ ] Keep every milestone checkpoint current using the handoff format at the end of this file. Mark work done only after its acceptance checks pass.
- [ ] Preserve unrelated worktree changes. Before editing, inspect `git status`; do not stage or commit unrelated files.

## Phase 0 — Establish the handoff and repository baseline

- [ ] Read this roadmap and `PROJECT-INFO.txt` before changing code.
- [ ] Check `git status --short --branch`; record the branch and existing modifications in the first checkpoint. Do not overwrite or include them in mobile commits.
- [ ] Confirm the actual public web pages and role workspaces in `django_admin/marketplace/urls.py`, `django_admin/console/urls.py`, their views/templates/static scripts, and the legacy Vite pages that are still linked or in use.
- [ ] Inventory every Express route, route-level guard, and owning user workflow. Record exact payload, validation, pagination, upload, response, and error contracts against the matching parity row before implementing that mobile workflow.
- [ ] Inspect `database/schema.sql` and migrations for data entities, status values, and ownership relationships used by mobile workflows.
- [ ] Record existing test/build commands from `package.json` and Django requirements/scripts; run the applicable baseline checks and record failures without silently treating existing failures as app regressions.
- [ ] Create a parity matrix before implementation: web route/screen, feature/action, minimum role, API endpoint, data/validation, mobile screen, test coverage, and status.
- [ ] Reconcile the matrix against every visible web control/form and every human-facing API workflow. Add uncovered rows to this roadmap/matrix; explicitly label non-user/internal endpoints.
- [ ] Include every page reached through links, tabs, menus, modals, dashboards, forms, and role workspaces, including secondary/less-used flows. Split each screen into independently testable actions and states; do not use broad rows such as “account features” or “admin tools” as substitutes for enumeration.
- [ ] Mark an inventory row as in scope if any role can reach or use its web functionality. Do not exclude a row because it is low-traffic, visually secondary, available only after approval, destructive, or intended for administrators.
- [ ] Identify the canonical product display name and application identifiers/package names to use across Apple and Google listings; do not infer production identifiers from a local folder name.
- [ ] Create `mobile/docs/feature-parity.md` from the matrix template below and `mobile/AI-HANDOFF.md` with the first verified checkpoint. These are the persistent working records for subsequent phases.

**Checkpoint 0 acceptance:** another developer can point to the source files for every role and feature, explain the current dirty worktree, and see an exhaustive web-to-mobile parity matrix reconciled against actual routes and controls. The matrix contains no unexamined “other features” category. No mobile code is required yet.

## Phase 1 — Define product, framework, and parity architecture

- [ ] Confirm Expo + React Native + TypeScript and Expo Router against project needs and current Apple/Google requirements. Record any reason for a different choice before scaffolding.
- [ ] Create the mobile app in `mobile/` with its own package manifest, lockfile, app config, TypeScript config, test/lint scripts, and README/handoff entry point. Do not place mobile dependencies in the root package unless a documented workspace decision requires it.
- [ ] Define navigation and deep-link conventions for marketplace, listing detail, agent profile, account, booking, conversation, notification, and role workspace destinations.
- [ ] Define shared API types for payloads, response envelopes, errors, pagination, dates, currency/price periods, and status values from actual server contracts. Generate types from the API schema if one is added; otherwise document and test the manually maintained boundary.
- [ ] Define a component/design system that follows the web brand and keeps the same names, field order/meaning, badges, listing data, and review presentation while adapting layouts to native controls.
- [ ] Plan offline/network behavior explicitly: show cached/read-only information only where safe; never imply that an unsent booking, message, review, or admin action succeeded.
- [ ] Decide whether administrative work is in the main app under protected admin navigation or a distinct app flavor. In either case, include the admin feature parity in the matrix and do not expose admin screens to non-admins.
- [x] Document and validate API environment configuration for local development, preview, and production. Release variants require HTTPS, and production native identifiers must come from the app owner; no secrets are embedded.

**Checkpoint 1 acceptance:** app structure, navigation map, API contract approach, environment strategy, and role-aware parity matrix are documented and reviewed before building major screens.

## Phase 2 — Secure API connectivity and authentication

- [ ] Inspect the current Express session and CSRF implementation and Django `/api/` proxy behavior before choosing a mobile authentication transport.
- [ ] Implement a secure mobile-compatible session/token strategy. If using the existing cookie session, use a correctly configured cookie jar and CSRF flow; if adding token support, implement scoped, expiring, revocable credentials on the server. Do not assume browser cookies automatically work in React Native.
- [ ] Store only the minimum session credential in the platform secure store (Keychain/Keystore via a maintained Expo-compatible library). Never store passwords or sensitive identity documents in AsyncStorage/plaintext.
- [ ] Implement login, logout, session restoration, expiry/revocation handling, CSRF protection as applicable, and safe handling of 401/403/network errors.
- [ ] Implement signup and role selection according to current eligibility and approval rules. Preserve pending agent approval; do not grant agent powers simply because the user selected an agent role.
- [ ] Implement optional MFA enrollment/challenge/reset states consistently with server behavior and protect recovery/error messages.
- [ ] Implement Google OAuth using the supported native redirect/deep-link flow, verify callback configuration for local/staging/production, and handle cancellation/errors safely.
- [ ] Load authenticated user roles and explicit sub-agent permissions from trusted server responses; support role changes and account suspension/revocation without stale privileged UI.
- [x] Implement mobile password change, tenant notification preferences, and password-confirmed account-deletion requests against the existing API; full profile/MFA/session-revocation parity remains open.
- [ ] Complete tenant/professional profile and photo editing, MFA, email verification, and any supported account deactivation/deletion workflows after confirming server policy. Tenant profile fields/photo are now implemented against the existing endpoints; professional profile and the remaining security workflows are still open.
- [ ] Add authentication/security tests, including no accidental authorization from client-side role state and no session leakage after logout/account switch.

**Checkpoint 2 acceptance:** guest, tenant, agent-pending, approved-agent, sub-agent, and admin test accounts receive only their server-authorized access; auth survives app restarts safely and expires/revokes correctly.

## Phase 3 — Public marketplace and discovery parity

- [ ] Implement home/marketplace content and all public showcase content present on the web.
- [ ] Implement property/listing search, location and category/rental filters, price bounds, pagination/load-more, empty/error/loading states, and the web’s default newest-first ordering.
- [ ] Implement listing cards with the same core data, price period/currency, status, image fallback, review summary, and public agent attribution as web.
- [ ] Implement listing detail with all public fields, media gallery, location/amenities/availability/booking information, agent links, similar listings, and published reviews.
- [ ] Implement share and comparison actions using platform-native share where suitable, with stable public URLs and the same comparison data/limits as web.
- [ ] Implement guest-access boundaries: browsing remains available without login; account-only actions prompt for sign-in without losing the user’s place or search state.
- [ ] Verify image loading, resize behavior, accessibility labels, and graceful failure for missing/slow media.
- [ ] Test discovery filter/order behavior against API results, including boundaries, empty data, slow responses, and malformed/error responses.

**Checkpoint 3 acceptance:** a guest can complete the public discovery and listing-detail journeys on both platforms, and the parity matrix confirms all public web actions have an equivalent mobile action or a documented platform-appropriate equivalent.

## Phase 4 — Tenant parity

- [x] Implement tenant profile view/edit and profile-photo upload against the shared profile endpoints; authenticated staging/device verification remains open in the parity ledger.
- [x] Implement saved listings/favorites with server persistence, correct empty/loading states, and consistent behavior from both listing cards and details; cross-client verification remains open in the parity ledger.
- [x] Implement search-alert creation, list, and removal against the shared API; delivery scheduling, duplicate policy, cross-client verification, and tenant-role consistency remain open in the parity ledger.
- [ ] Implement agent follow/unfollow and agent discovery/profile navigation.
- [ ] Implement booking request flow with date selection, price/fee breakdown, availability, validation, duplicate-submit protection, confirmation, and clear pending/confirmed/cancelled/completed states as supported by the API.
- [x] Implement mobile booking history/details, confirmed cancellation, and eligible stay rescheduling with server-side validation and refreshed date locks; authenticated staging/device verification remains tracked in the parity ledger.
- [ ] Implement review eligibility and review submission; show published listing reviews in listing detail and agent reviews on agent profiles, including ratings, author/date, moderation/empty states, and duplicate/permission errors.
- [ ] Implement tenant account/dashboard features present on web and add explicit sign-in/session-expiry behavior.
- [ ] Test that booking, saved-item, follow, profile, and review changes persist after relaunch and are consistent with web/API state.

**Checkpoint 4 acceptance:** a tenant can complete every tenant workflow from the parity matrix on iOS/Android test builds, with server-side validation and cross-client persistence demonstrated.

## Phase 5 — Agent and sub-agent parity

- [ ] Implement agent directory/profile, profile editing, review display, verification/approval status, and public/private field boundaries.
- [ ] Implement agent dashboard and all agent workspace metrics/queues shown on web.
- [ ] Implement listing create/edit, draft/submission, moderation feedback/status, archive/delete behavior if available, and every web listing field/validation rule.
- [ ] Implement listing image/video/document upload with progress, retry/cancel, size/type handling, signed/public versus private handling, and safe cleanup/error UX.
- [ ] Implement availability and booking-request management, with the same state transitions and rules as web/API.
- [ ] Implement posts/showcase content create/edit/delete/moderation actions present on web.
- [ ] Implement agent tenant communication and profile/media management permissions.
- [ ] Implement sub-agent assignment/access in the same scope as web; display effective permissions and never let a sub-agent grant itself permissions or access another agent’s resources.
- [ ] Test pending/rejected/approved agent states, removed assignments, concurrent edits, upload failures, and server-side permission denials.

**Checkpoint 5 acceptance:** approved agents and sub-agents can perform exactly their assigned web capabilities; pending or revoked users cannot bypass status/permission checks through the mobile client.

## Phase 6 — Messaging, notifications, and trust/safety

- [ ] Implement conversations, inbox, message history, send/retry states, unread state, and any web retention/display limits. Mobile now has an inbox, thread history/pagination, unread counts, and send actions against the shared API; ambiguous sends are not blindly retried, but authenticated staging/device verification remains open.
- [ ] Keep conversations/messages separate from system notifications and administrative alerts in navigation, storage, badges, actions, and tests. The mobile app has distinct inbox and notifications routes; badge-independence tests and role access checks remain.
- [ ] Implement notifications list/detail/read/unread behavior and relevant deep links. Respect server retention/visibility and notification preferences. Mobile lists and marks system notifications read and routes supported booking/listing-review actions; push and remaining action mappings are still open.
- [ ] Implement push notifications only after permission rationale, server device-token registration/revocation, environment separation, deep-link validation, and privacy review are in place.
- [ ] Ensure notification taps route to an authorized destination and stale/forged notification payloads cannot reveal private content.
- [ ] Implement block/report/trust-and-safety flows that are available to the mobile user’s role. Conversation block/unblock and member reporting use shared APIs; reporting for all listing/post/profile surfaces remains open.
- [ ] Test message blocking, access boundaries, offline/duplicate sends, notification/message badge independence, logout/device-token cleanup, and deep links.

**Checkpoint 6 acceptance:** messages and notifications operate independently and do not interfere with each other; trust/safety rules remain enforced by the API.

## Phase 7 — Protected administrator parity

- [ ] Implement protected admin entry, dashboard metrics, and role/action-based navigation.
- [ ] Implement people search/detail, role management, account suspend/restore/reactivate/delete actions, and clear confirmation/results.
- [ ] Implement agent approvals, listing/post moderation, booking oversight, badges, identity verification, MFA reset, reports/trust-and-safety, and audit-log views/actions present in the web console.
- [ ] Confirm each operation uses the same server endpoint, permission checks, confirmation requirements, and action-specific feedback as web.
- [ ] Make high-impact/destructive operations explicit: explain the target and consequence, require confirmation, prevent accidental duplicate submissions, and show the actual result.
- [ ] Avoid storing/displaying private identity documents or sensitive admin data beyond what is necessary; ensure logs and analytics do not capture secrets or document contents.
- [ ] Test that guest, tenant, agent, and sub-agent accounts cannot discover or call admin surfaces; test auditability and revoked-admin sessions.
- [ ] If any admin feature is intentionally unavailable on mobile for platform/safety reasons, record it as an explicit, approved exception in the parity matrix rather than silently omitting it.

**Checkpoint 7 acceptance:** all admin functions intended for mobile are verified against web and role protections; sensitive operations have secure confirmation and auditable outcomes.

## Phase 8 — Cross-cutting quality and store readiness

- [ ] Add automated tests for API client/auth, navigation/deep links, role/permission visibility, validation, and critical user journeys. Mock services in unit tests; do not depend on production data.
- [ ] Add end-to-end coverage for representative guest, tenant, agent, sub-agent, and admin journeys on Android and iOS simulators/devices.
- [ ] Test accessibility: screen-reader names/order, dynamic text, contrast, focus behavior, touch target size, keyboard/form handling, reduced-motion considerations, and safe-area/gesture behavior.
- [ ] Test slow/failed networks, offline start, session expiry, app background/resume, low storage, interrupted uploads, duplicate taps, and API maintenance/error responses.
- [ ] Verify privacy/security: HTTPS, secure credential storage, least-privilege role routing, no secrets in bundle/logs, safe deep links, dependency review, and sensitive data not exposed in screenshots/notifications where inappropriate.
- [ ] Add privacy policy, terms, support/contact links, and accurate Apple privacy disclosures / Google Play Data safety disclosures based on actual collection, SDKs, analytics, tracking, and retention.
- [ ] Provide account deletion initiation and required data deletion/retention messaging according to actual backend capability and store policy; implement missing server support before claiming the requirement is met.
- [ ] Request camera, photo, location, and notification permissions only when needed, with clear purpose text and a usable alternative when declined. Do not request unused permissions.
- [ ] Prepare branded app icon, launch screen, screenshots, descriptions, age/content rating answers, and review/demo account instructions. Ensure review accounts work and do not expose real personal data.
- [ ] Verify app name, bundle/package IDs, signing ownership, version/build numbering, environment-specific config, release channel, and crash reporting policy.
- [ ] Check current Apple App Store Review Guidelines and Google Play policies/technical requirements at release time; record links and review date because requirements change.
- [ ] Produce signed release candidates and run install/upgrade/smoke tests on real devices, not just development builds.

**Checkpoint 8 acceptance:** release candidates pass the project’s automated tests and documented device checklist, and the policy/privacy/submission checklist is complete with no unresolved critical issues.

- [ ] Before store submission, independently audit every parity-matrix row against the web behavior and test evidence. Require every in-scope row to be `Verified`; no `Not started`, `In progress`, or `Blocked` rows may remain.
- [ ] Do not use `Approved exception` to waive the user's complete-parity requirement. Use it only to document an approved implementation adaptation where mobile still achieves the same capability and outcome.

## Phase 9 — Store submission and post-release

- [ ] Create/configure Apple Developer and Google Play Console records under the correct organization/account owner.
- [ ] Upload the signed iOS build through the approved Apple submission workflow and the Android `.aab` through Play Console; use internal/test tracks before public rollout.
- [ ] Complete store metadata, privacy/data-safety declarations, age rating, screenshots, support URL, privacy policy URL, reviewer notes, and test credentials truthfully.
- [ ] Respond to review questions/rejections with evidence; fix policy or quality issues and resubmit rather than disguising restricted behavior.
- [ ] Roll out to a limited audience first where available; monitor crash-free sessions, API failures, login/booking/upload completion, store feedback, and server health without collecting unnecessary personal data.
- [ ] Establish support, incident response, rollback/disable strategy, dependency/security updates, and a release cadence.
- [ ] Update this roadmap’s release checkpoint with store version/build numbers, submission dates/status, outstanding issues, and next maintenance task. Never put signing credentials in the checkpoint.

**Checkpoint 9 acceptance:** the app is approved and available to install from the intended stores, or the exact review blocker and next corrective step are recorded. Store submission alone is not the same as approval/release.

## Feature parity matrix template

Maintain a working copy as `mobile/docs/feature-parity.md` during Phase 0. Add one row per web screen and user-visible action; split role-specific actions into separate rows.

| Web route/screen | Feature/action | Minimum role | API endpoint / server rule | Mobile destination | Automated/manual test | Status / exception |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  | Not started |

Use only these status values: `Not started`, `In progress`, `Blocked`, `Verified`, `Approved exception`. `Verified` means the mobile capability has been tested for every applicable role and state against web/API behavior. `Approved exception` cannot mean a feature is missing; it may only describe an approved mobile-specific implementation adaptation with equivalent capability and outcome. Any row lacking parity keeps the project from release.

## AI continuation checkpoint format

At the end of **every phase or work session**, update a dated checkpoint in `mobile/AI-HANDOFF.md`. Keep the newest checkpoint at the top. Do not rely on conversation history as the only record.

Copy this template and fill it with evidence:

```text
## Checkpoint: Phase N — short name
Updated: YYYY-MM-DD
Repository: StayNest (root path as seen in the current workspace)
Branch/commit: <branch and commit hash>
Worktree before/after: <pre-existing changes and current status; do not claim clean unless verified>

Goal:
<The phase’s measurable outcome>

Completed:
- <change and exact file path>
- <change and exact file path>

Verification:
- <exact command/device/account role used>
- <pass/fail result; include failure details and distinguish baseline failures>

Parity matrix:
- <rows completed/verified, rows still open, and file path>
- <explicit parity count: verified rows / total in-scope rows; list any missing or unverified rows>

Decisions:
- <decision and reason, or “none”>

Blockers/risks:
- <specific blocker, owner/action needed, or “none known”>

Next action (one concrete first step):
<Exact file/symbol or command to inspect/run, followed by the expected outcome>

Next checkpoint:
<Phase number and acceptance condition>

Secrets:
No secrets, passwords, production tokens, signing keys, or private documents recorded.
```

### Instructions to the next AI/developer

1. Read `MOBILE-APP-ROADMAP.md`, then the newest `mobile/AI-HANDOFF.md` checkpoint and `mobile/docs/feature-parity.md`.
2. Verify the actual workspace/repository, branch, commit, and `git status --short --branch` before editing. The checkpoint may be stale; inspect the actual files and tests.
3. Resume from the checkpoint’s **Next action**. Do not restart discovery or ask the user to explain the project unless the repository evidence and checkpoint genuinely conflict.
4. Inspect the referenced source/API behavior before implementing. Preserve all unrelated and pre-existing changes.
5. Complete one coherent phase slice, run its exact checks plus relevant regression tests, update the parity matrix, and write a new checkpoint with evidence.
6. If blocked by missing credentials, store accounts, API capability, policy decision, or product choice, document the precise blocker and safe next action; never fabricate credentials or claim a release.
7. Do not mark a feature `Verified` until the matching role-specific flow is tested against the actual API and the acceptance condition is met.
8. The user requires the mobile app to do everything the web can do. Never remove, omit, defer, or silently reinterpret a web capability. Keep all unmatched web functions visible in the parity matrix and treat any unmatched function as a release blocker.
