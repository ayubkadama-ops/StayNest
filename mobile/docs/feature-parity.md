# StayNest Web-to-Mobile Feature Parity

## Status and scope

This is the source-of-truth parity ledger for the mobile release. The product requirement is **every human-usable web capability, for every applicable role, must work in the mobile app**. No feature is considered out of scope because it is old, uncommon, administrative, difficult, or missing from one of the currently served web shells.

The web and mobile app are separate client applications with independent interfaces, navigation, and release lifecycles. Parity means equivalent user capabilities, role permissions, business rules, validation, and outcomes—not identical layouts or shared frontend code. Keep both clients intact and reconcile the mobile implementation to the same API-backed product behavior; the app does not replace or rewrite the web project.

Web, mobile, and the admin console must share one canonical data set: a change performed by one client must be visible to the others after refresh, and authorized admin decisions must govern the same listing, post, user, booking, and verification records used by the app. Do not create mobile-only persistence or claim instant synchronization without a verified realtime mechanism. The inspected Django marketplace proxies Express via `API_UPSTREAM_URL`; Django admin and Express use the same `MYSQL_*` configuration keys, but deployment must be verified to point both at the same database.

The public Django marketplace and Django operations console are the currently documented public web surfaces (`PROJECT-INFO.txt`). The Vite/vanilla-JS site, `app.js`, listing pages, browser manifest/service worker, and the complete Express API are also in scope until an implementation audit proves a surface is unreachable or purely internal. An unreachable/obsolete web surface still must be recorded and explicitly dispositioned; do not silently discard its capability if another web surface/API exposes it.

This first inventory pass records routes, templates, obvious screen actions, and all Express routes. It is not yet a claim that every dynamic control/edge case has been exhaustively audited. Finish the open inventory tasks below before declaring Phase 0 complete.

### Status values

- `Not started` — mobile behavior is not implemented and verified.
- `In progress` — implementation is underway.
- `Blocked` — work cannot proceed; the blocker and next action are recorded.
- `Verified` — matching capability tested for all applicable roles/states against web/API behavior.
- `Approved exception` — only an approved mobile-specific implementation adaptation with equivalent capability and outcome; never a missing feature.

## Web screen and workflow inventory

Each row is a web workflow family; split into smaller rows as the source audit discovers independently actionable controls or state transitions. Every row starts as `Not started` for mobile parity.

| ID | Web route / surface | Role(s) | Web capability/actions to preserve | Mobile destination / verification | Status |
|---|---|---|---|---|---|
| PUB-01 | `/`, home | Guest and signed-in users | Brand/header navigation; hero search by location and property type; category shortcuts; newest listings; listing cards; agent directory link; how-it-works content; footer contact/social links; account and agent-entry links. | `mobile/app/(tabs)/index.tsx` mirrors the responsive home composition with bundled brand imagery, category shortcuts, location/type search, published listing cards, trust/how-it-works sections, and account/admin navigation. Agent directory/entry, signup, and footer contact/social links remain. | In progress |
| PUB-02 | `/properties/`, browse/search | Guest and signed-in users | Search text/location, category/journey, price period/currency, size, rooms, furnishing, amenities, availability, verification, sorting, pagination, and loading/error/empty states. | Native Explore supports the shared discovery filters, pull-to-refresh, and paginated load-more using the same API. Verify on Android and continue auditing action parity. | In progress |
| PUB-03 | `/properties/<id>/`, listing detail | Guest and signed-in users | Full property fields, category-specific facts, price/unit/currency, amenities, gallery/video, approximate map/location, agent attribution, similar listings/reviews where provided; save/favorite/like, compare, share, report, view count where exposed; booking request or land/commercial enquiry; sign-in gate preserving intended action. | `mobile/app/listing.tsx` provides read-only property details, photo selection, amenities, agent attribution, reviews, similar listings, and an OpenStreetMap handoff using only the API's approximate coordinates. Video playback, booking, save/like, compare/share/report, and sign-in return paths remain. | In progress |
| PUB-04 | `/agents/`, agent discovery | Guest and signed-in users | Agent cards, search/sort/filter if available in other web surface, profile links, verified status and rating/review summaries. | Agent directory; verify parity with current agent API. | Not started |
| PUB-05 | `/agents/<id>/`, public agent profile | Guest and signed-in users | Agent name/photo/agency/bio/location/verification, reviews/ratings, listings/posts/showcase, follow/unfollow, contact/message, share/report if exposed. | Agent profile; preserve public/private field rules. | Not started |
| AUTH-01 | `/login/`, `/account/` | Guest and signed-in users | Email/password, remember session, MFA challenge, Google sign-in, forgot-password request, return-to/deep link, validation/errors, already-authenticated route behavior. | `mobile/app/(tabs)/account.tsx` implements email/password, remember-session option, MFA challenge, password-recovery requests, and restored server session. Google sign-in and return-to behavior remain. | In progress |
| AUTH-02 | `/signup/` | Guest | Tenant/agent role choice; multi-step first/last name, email, phone, city, agent agency/bio, password/confirmation, password rules, remember option, progress/back/continue, pending-agent approval and next route. | `mobile/app/signup.tsx` implements the three-step tenant/agent registration flow through CSRF-protected `POST /api/auth/register`, validates the web password and contact rules, and shows verification/pending-approval outcomes. Device/API end-to-end verification and return-to behavior remain. | In progress |
| AUTH-03 | Account/security and session controls | Tenant, agent, sub-agent, administrator as permitted | Current profile data, profile editing/photo, password change, MFA setup/enable/reset, logout, session revocation/expiry, account deactivation/deletion, email verification, notification preferences. | Account screen restores the Express session and signs out; profile, security, and preference workflows remain. | In progress |
| TEN-01 | `/account/dashboard/` and tenant workspace | Tenant | Summary counts, booking list/details, saved properties, booking cancellation and rescheduling where available, review eligibility/submission, search alerts, navigation to properties. | Tenant dashboard and bookings. | Not started |
| TEN-02 | Saved properties/favorites/likes/comparison | Tenant | Save/unsave, like/unlike, cross-device persistence, favorites list, comparison add/remove/compare/clear, share stable listing links, sign-in prompts. | Saved list and comparison. | Not started |
| TEN-03 | Search alerts | Tenant | Create alert from criteria, view active alerts, delete alert, duplicate/error handling and alert notification preference. | Search-alert management. | Not started |
| TEN-04 | Conversations/messages | Tenant and agent; permitted sub-agent | Start/send message, conversation list, conversation detail, unread count, latest history, retry/error state, block enforcement, authorized participant handling. | Inbox and conversation detail. | Not started |
| TEN-05 | System notifications | Tenant, agent, sub-agent, administrator as eligible | Separate from messages; list, unread state, mark-read, relevant action/deep links, retention, push preference/device handling. | Notifications center. | Not started |
| TEN-06 | Trust/safety | Signed-in roles as allowed | Block/unblock, report listing/user/post/content, reason/details, response/confirmation, moderation outcomes if visible. | Safety and blocking flows. | Not started |
| TEN-07 | Booking lifecycle | Tenant | Availability/date/guest validation, fee/price details, create request, idempotency, confirmation, detail, cancel, reschedule, state history, errors and duplicate requests. | Booking flow and history. | Not started |
| TEN-08 | Listing and agent reviews | Eligible tenant / public reader | Enforce eligibility and one-review rules; submit rating/comment; review moderation/status; listing review display; agent review display and aggregation. | Review form and review lists. | Not started |
| AUTH-04 | Active role selection (retained Vite UI) | Signed-in user with multiple roles | Switch active tenant/agent role, refresh current-user state, update role-specific navigation/profile, and reject unavailable roles. The legacy `app.js` calls `POST /api/auth/active-role`, but no matching handler exists in `server/index.js`. | Role switcher. Resolve API/web mismatch before parity implementation; do not mock role switching locally. | Blocked |
| AGT-01 | `/agent/`, agent workspace | Approved agent; sub-agent only with permission | Dashboard/summary/attention; owned and assigned inventory; booking queue; per-listing statuses; all available workspace navigation. | `mobile/app/(tabs)/agent.tsx` shows API-backed summary counts, permission-gated inventory/bookings, refresh/error/empty states, and booking decisions. Attention alerts, listing creation, and full workspace navigation remain. | In progress |
| AGT-02 | Listing create/edit/manage | Approved agent; explicitly permitted sub-agent | Complete listing wizard, category-specific fields, rental terms, privacy/beds, title/description, location and map pin/geocode, pricing periods, amenities, photos/video, required registration/identity documents/type, validation, local draft recovery, media reordering/removal, submit, moderation status/feedback, edit/unpublish/archive/delete if supported. | Listing management wizard. | Not started |
| AGT-03 | Agent booking decisions | Approved agent; authorized sub-agent | View booking/customer/date/status; approve/decline and any supported status transitions; prevent actions outside assigned listings. | Agent workspace reads `/api/agent/bookings` and uses the CSRF-protected `/api/agent/bookings/:id/decision` for confirmed pending requests, gated by `bookings.view`/`bookings.manage`. Device/session and cross-client outcomes remain unverified. | In progress |
| AGT-04 | Agent profile and verification | Agent; authorized sub-agent | Edit public profile, photo, agency/bio/location, verification documents/status, approved/pending/rejected states and visible review/rating information. | Agent profile editor/status. | Not started |
| AGT-05 | Posts/showcase/social content | Agent; authorized sub-agent | Create, edit, publish/submit, view, remove/archive posts; attach listing/media/caption/type and bilingual amenity tags where provided; handle moderation status and visibility. | Agent showcase/posts. | Not started |
| AGT-06 | Sub-agent management | Main agent with permission; sub-agent self-view only as allowed | Create/invite/link sub-agent, edit label/status, assign/remove exact capabilities, inspect effective access; no privilege escalation or access to other agent data. | Team/sub-agent management. | Not started |
| AGT-07 | Agent followers/following | Agent and public viewer according to API | View follower/following lists, counts, follow/unfollow and privacy rules. | Agent social connections. | Not started |
| ADM-01 | `/admin/login/`, `/admin/logout/` | Administrator only | Protected admin-gate sign-in, session handling, logout, CSRF, redirect safety, errors and authorization. | Account screen supports an administrator account login and the existing rate-limited admin gate; native cookie persistence and complete admin auth parity remain unverified. | In progress |
| ADM-02 | `/admin/?section=overview` | Administrator | Metrics; accounts needing attention; navigate to detail; activate/suspend and other available actions; refresh/auto-refresh. | `mobile/app/(tabs)/admin.tsx` shows shared API metrics and refreshes them with the listing queue. Unavailable metric queries are labeled instead of shown as zero. Attention-account rows/actions and timed auto-refresh remain. | In progress |
| ADM-03 | `/admin/?section=users`, `/admin/users/<id>/` | Administrator | Search/filter/list people; inspect user/profile/roles/status; activate/suspend/reactivate/delete; hard delete with safeguards; user history/detail and return navigation. | `mobile/app/admin-users.tsx` provides server-filtered search and a read-only account summary with roles, status, MFA, verification, and login dates. User detail/history and status/deletion actions remain; actions are withheld until critical-admin safeguards match Django. | In progress |
| ADM-04 | `/admin/?section=access` | Administrator | Assign/remove roles; preserve role exclusivity rules; MFA status/reset; account access/session invalidation; last-active-admin safeguards. | Role and access management. | Not started |
| ADM-05 | `/admin/?section=agents` | Administrator | Agent/sub-agent approval/rejection; inspect parent/child relation; approval state and side effects. | Agent approvals. | Not started |
| ADM-06 | `/admin/?section=listings` and listing detail | Administrator | Review/available tabs; status; search; sort; publish/reject/unpublish; inspect all listing/media/owner details. | `mobile/app/(tabs)/admin.tsx` reads status-filtered listings and performs confirmed publish/reject/unpublish through the authorized API. Search, detail/media inspection, and cross-client live verification remain. | In progress |
| ADM-07 | `/admin/?section=posts` and post detail | Administrator | Inspect post/content; publish/return to draft/moderate; view linked listing and metadata. | `mobile/app/admin-posts.tsx` reviews post type, caption, amenity tags, linked listing, agent, and engagement, and performs confirmed publish/return-to-draft actions. Full owner/detail parity and cross-client live verification remain. | In progress |
| ADM-08 | `/admin/?section=badges` | Administrator | Assign/update/remove agent badge; label and duration/expiry. | Badge management. | Not started |
| ADM-09 | `/admin/?section=bookings` | Administrator | View reservation details and participants; approve/decline/cancel/complete where available; state validation. | Booking oversight. | Not started |
| ADM-10 | `/admin/?section=verifications` | Administrator | Inspect applicant/document type/status and securely review required evidence; approve/reject with audit. | Identity/agent verification. | Not started |
| ADM-11 | `/admin/?section=reports` | Administrator | Review report entity/reporter/target/reason/details; open/review/resolve/dismiss; audit outcome. | Safety report queue. | Not started |
| ADM-12 | `/admin/?section=audit` | Administrator | Inspect audit/security events, entity, timestamp, metadata, pagination/filtering where available. | Audit log. | Not started |
| ADM-13 | `/admin/?section=settings` | Administrator | Footer/contact/social settings, general settings, feature flags, email templates, IP rules, announcements, admin accounts, impersonation start/stop, insights/analytics; exact controls to be extracted from template and API. | Admin settings and controls. | Not started |
| X-01 | All web routes and role navigation | All roles | Role-specific navigation, unauthorized redirects, deep links, loading/empty/error states, language controls (currently English), cookie-consent preference where present, responsive/mobile overflow, touch/keyboard/accessibility behavior. | App navigation and universal states. | Not started |
| X-02 | PWA/service worker and install behavior | Guest and signed-in users | Audit `manifest.webmanifest`, `service-worker.js`, offline/cache/update/install behavior; map useful user capabilities to native equivalents without allowing stale private data. | Native install/offline/update behavior. | Not started |
| X-03 | Legacy web surfaces | All roles as exposed | Audit `index.html`, `listings.html`, `listing-detail.html`, `app.js`, `listings-page.js`, `listing-detail-page.js`, posts/social routes and browser-only controls; reconcile duplicate, legacy, or unreachable capability with active Django/API behavior. | Reconcile every distinct capability into correct mobile destination. | Not started |
| X-04 | Cross-client and admin data consistency | All roles; administrator for admin mutations | Use one canonical database/API; verify web and mobile reads reflect each other's persisted changes after refresh; verify admin status/moderation/role actions govern the same records and invalidate/restrict access as intended. Separate eventual refetch consistency from any explicit realtime requirement. | Shared API/backend configuration, role-aware admin workflows, and cross-client integration tests. | Not started |

## Django operations action inventory

These are individual form actions in `django_admin/console/views.py`; they must be reconciled with dashboard sections and API routes, and represented/tested individually in mobile:

| Action | Web effect | Role | Status |
|---|---|---|---|
| `user-status` | Activate, suspend, or delete/deactivate user; invalidate sessions and update sub-agent status where applicable. | Administrator | Not started |
| `user-hard-delete` | Permanently purge user account with last-admin protection and audit. | Administrator | Not started |
| `user-role` | Assign/remove role, maintain tenant/agent role rules, invalidate sessions, audit. | Administrator | Not started |
| `mfa-reset` | Reset a user’s MFA secret/state and invalidate sessions. | Administrator | Not started |
| `agent-status` | Approve/reject pending agent or sub-agent; update account/sub-account status. | Administrator | Not started |
| `badge` | Assign/update/remove agent badge and expiry. | Administrator | Not started |
| `report-status` | Open/review/resolve/dismiss safety report. | Administrator | Not started |
| `listing-status` | Publish/reject/unpublish listing; preserve queue filters. | Administrator | Not started |
| `post-status` | Publish/return post to draft/moderation state. | Administrator | Not started |
| `booking-status` | Confirm/decline/cancel/complete booking where allowed. | Administrator | Not started |
| `verification-status` | Approve/reject identity verification. | Administrator | Not started |
| `feature` | Enable/disable marketplace feature flag. | Administrator | Not started |
| `email-template` | Update email template/configuration. | Administrator | Not started |
| `ip-rule` | Create IP access rule. | Administrator | Not started |
| `ip-rule-delete` | Remove IP access rule. | Administrator | Not started |
| `setting` | Update general, footer, contact, and social setting. | Administrator | Not started |

Also audit and reconcile Django-only admin functions that do not use the action dispatcher: dashboard refresh/auto-refresh; listing queue tabs/search/status/sort/clear; detail-page navigation; safe logout; and any forms/actions added to the templates.

## Express API endpoint inventory

Source: `server/index.js`. Initial extraction found 120 `app.<method>` route declarations, and an automated set comparison confirmed all 120 appear below with no missing or extra route rows. A first-pass route scan identified middleware such as CSRF, `requireAuth`, `requireRole(...)`, `requireAgentAccess(...)`, and `requireAdmin`; this is not proof of the complete permission contract. Health/readiness, webhooks, static/legacy routes, and internal configuration are recorded for disposition, not assumed to be mobile screens. Verify each actual handler’s authorization, input/output, validation, and side effects before implementing it.

### Handler contract audit — authentication batch

Audited against the handlers and middleware in `server/index.js`, the shared validators in `server/validation.js`, and the marketplace auth client. This documents server behavior; the account/session slice is implemented in part, but remains `In progress` until all required flows are built and verified.

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `GET /api/auth/csrf` | Guest or signed-in; GET is CSRF-exempt. | Creates/persists a random 32-byte hex token in the Express session; returns `{ token }`. The session cookie and token must be retained together. |
| `GET /api/auth/google` | Guest; OAuth must be configured. | Saves a random OAuth `state` in session and redirects to Google. Configuration/session-save failures produce an unavailable/error response. |
| `GET /api/auth/google/callback` | Guest OAuth redirect; state checked against session. | Exchanges the authorization code, requires a verified Google email, rejects suspended/deleted/pending accounts, and regenerates an 8-hour session for an existing account. A new Google identity is stored as pending session data and redirected to `/index.html?auth=google-setup`; errors return to `/index.html?authError=...`. |
| `POST /api/auth/google/complete` | Requires session `googlePending`; route is declared before `requireCsrf` is mounted, so the global CSRF middleware does not run for it. | Requires valid phone, location (1–100 chars), role `tenant` or `agent`, password (12–200 chars; at least three of lowercase, uppercase, digit, symbol), and matching `confirmPassword`. Creates an active tenant or pending agent; returns `201`, with tenant requiring a subsequent login and agent requiring approval. Duplicate Google/email/phone returns `409`. |
| `POST /api/auth/register` | Public; explicit CSRF exemption; auth POST limiter applies (20 per 15 min). | Requires valid email, strong password, first and last name, and `tenant` or `agent`; optional phone, city, bio, agency name are normalized/bounded by `registrationDetails`. Tenant is active but requires email verification and subsequent login; agent is pending approval. Returns `201`; duplicate email/phone returns `409`; registration feature flag off returns `503`. |
| `POST /api/auth/login` | Public; explicit CSRF exemption; auth POST limiter applies. | Email/password login; pending agent returns `403`, unverified email returns `403`, unsupported role returns `403`, invalid credentials/MFA code returns `401`. MFA-enabled accounts first receive `{ mfaRequired: true }`, then must retry with `mfaCode`. Success regenerates the session and returns `{ ok: true, roles }`; `rememberMe` selects an 8-hour or 30-day cookie. Sub-agent status and permissions are loaded from the server. |
| `POST /api/auth/email-verification/confirm` | Public bearer-token flow; CSRF required by middleware. | Requires a 40–64-character URL-safe token; hashes and checks it for unused/unexpired status, marks the email verified, and consumes the token. Invalid/expired token returns `400`. |
| `POST /api/auth/email-verification/resend` | Public; CSRF required; auth POST limiter applies. | Accepts email; always returns the same generic success message to avoid account enumeration. Sends only for an active/pending unverified account. |
| `POST /api/auth/password-reset/request` | Public; explicit CSRF exemption; auth POST limiter applies. | Accepts email; generic response for invalid, unknown, and known emails. Replaces prior unused reset tokens. Production never returns the token; non-production may return `resetUrl`, `expiresInMinutes`, and `emailSent`. |
| `POST /api/auth/password-reset/complete` | Public bearer-token flow; CSRF required by middleware. | Requires valid 40–64-character URL-safe token and strong password; consumes a single-use unexpired token, changes password, invalidates all user sessions, and returns `{ ok: true, message }`. |
| `POST /api/auth/logout` | Authenticated via `requireAuth`; explicit CSRF exemption. | Destroys the current session and returns `204`. `requireAuth` rechecks current account/sub-agent state and roles before proceeding. |
| `GET /api/auth/me` | Guest or authenticated; GET is CSRF-exempt. | Returns `{ user: null, ... }` for a guest, or the refreshed session user and impersonation flag. Authenticated requests recheck account status; roles come from the database except sub-agent role context. `X-Staynest-Guest: 1` explicitly requests guest response. |
| `POST /api/auth/mfa/setup` | Authenticated plus CSRF. | Creates a pending MFA secret in session; returns `{ secret, otpauth }`. |
| `POST /api/auth/mfa/enable` | Authenticated plus CSRF. | Requires a valid code for the session’s pending secret; encrypts and stores the secret, enables MFA, and clears the pending secret. Invalid code returns `400`. |

Session baseline for mobile architecture: cookie name `staynest.sid`, HTTP-only, `SameSite=Lax`, secure in production; idle and absolute timeouts are enforced. Login regenerates the session. `requireAuth` refreshes account state and sub-agent permissions from the database. A native client must preserve the session cookie and pair it with the session CSRF token for protected POST/PATCH/DELETE calls; browser `fetch` behavior cannot be assumed in React Native.

Open auth findings for follow-up:
- The legacy `app.js` Google setup attaches a handler that submits only phone/location/role, while the API requires password and confirmation. A later wrapper adds a second handler with those fields; both listeners can start requests on the same submit. Reconcile this client behavior before treating Google signup as an established contract.
- `POST /api/auth/google/complete` is ordered before the global CSRF middleware. It is session-bound by `googlePending`, but the middleware does not protect it; evaluate/fix this as part of the backend auth work before relying on it for native OAuth.
- The legacy Vite sign-in UI reports that MFA login is unavailable, while the Django marketplace auth flow exposes an MFA challenge. Preserve the supported server behavior and reconcile the clients during the web-control audit.

### Handler contract audit — tenant profile batch

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `GET /api/tenant/profile` | `requireAuth` plus exact `tenant` role; GET is CSRF-exempt. | Returns `{ profile, following, wishlist }`. Profile includes id, email, phone, first/last name, avatar URL, bio, and city. Following and saved-listing collections are also returned. |
| `POST /api/tenant/profile/photo` | `requireAuth` plus `tenant` role; CSRF required. | Multipart field is `profilePic`. Missing/unsupported image returns `400`; upload limit is 20 MB, MIME/signature are checked, image processing rejects over 64 megapixels, and output is WebP cropped to at most 768×768 and 1 MB. Stores a public image (Cloudinary, configured object storage, or local media fallback), updates `user_profiles.avatar_url`, audits the change, and returns `{ avatarUrl }`. |
| `PATCH /api/tenant/profile` | `requireAuth` plus `tenant` role; CSRF required. | JSON fields: `firstName`, `lastName`, `phone`, `city`, `bio`. Names are whitespace-normalized and capped at 80; city is effectively capped at 80 by `normalizeProfileName`; bio is normalized and capped at 5,000; phone is optional but must match the phone pattern after trimming/truncation. Required-name or invalid-phone errors return `400`; duplicate phone returns `409`. Updates user/profile data, audits, and returns `{ ok: true, profile }`. Email is read-only through this route. |

Web-surface reconciliation: the legacy Vite `app.js` loads this endpoint for its tenant profile and exposes edit/photo controls. The current Django `tenant_dashboard` view/template uses `/api/auth/me`, `/api/account/summary`, `/api/account/bookings`, and `/api/account/saved-listings`; the inspected Django tenant dashboard contains no profile editor or photo control. Keep the profile capability in the parity inventory until the legacy surface is fully dispositioned; do not infer that it is part of the active Django dashboard.

### Handler contract audit — tenant dashboard batch

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `GET /api/account/summary` | `requireAuth` plus exact `tenant` role; GET is CSRF-exempt. | Returns `{ role: 'tenant', upcomingBookings, savedHomes, searchAlerts }`. Upcoming includes bookings in `pending`, `payment_pending`, or `confirmed` states. |
| `GET /api/account/bookings` | `requireAuth`; no tenant-only role guard, so it returns only the current account’s guest bookings for any authenticated role. GET is CSRF-exempt. | Returns `{ bookings }` with booking identity/code/kind, appointment or stay dates, total/currency/status/created date, listing id/title/slug. Before reading, it changes that user’s confirmed bookings with `check_out < UTC_DATE()` to `completed`; this GET therefore has a state-changing side effect. |
| `GET /api/account/saved-listings` | `requireAuth` plus exact `tenant` role; GET is CSRF-exempt. | Returns `{ listings }` for the current tenant’s non-deleted saved listings, including title/location/currency/prices/rating/review count/cover URL. Ordered newest saved first. |
| `POST /api/bookings/:id/cancel` | `requireAuth`, ownership restricted to `guest_user_id`; CSRF required. | Cancels only the current user’s `pending`, `payment_pending`, or `confirmed` booking. Optional `reason` defaults to `Guest cancellation` and is capped at 500 characters. Deletes booking date locks, writes an audit event, and returns `{ ok: true }`; no matching active booking returns `404`. |

Web-surface reconciliation: the Django tenant dashboard calls all three reads, renders the three summary counts, a booking table and saved-property cards, and exposes cancellation only for `pending` or `confirmed` rows. Its cancel action confirms with the user, sends the CSRF token, then reloads the page. It does not expose reschedule, review, booking detail, or saved-listing removal controls in this template. The legacy Vite tenant booking view exposes additional booking actions and allows canceling `payment_pending`; reconcile those separately during the full control audit.

### Handler contract audit — search-alert batch

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `GET /api/account/search-alerts` | `requireAuth` plus exact `tenant` role; GET is CSRF-exempt. | Returns `{ alerts }` for the signed-in user, newest first. Each row has id, name, filters, frequency, active state, and creation date. |
| `POST /api/search-alerts` | `requireAuth` only (no tenant-role guard); CSRF required. | Accepts `{ name, filters, frequency }`; frequency defaults to `daily` and must be `instant`, `daily`, or `weekly`. Name and filters are checked only for truthiness before insertion; no explicit type/length/shape validation is performed in this handler. Stores the current user id and JSON-serialized filters; returns `201 { id }`. |
| `DELETE /api/search-alerts/:id` | `requireAuth` plus exact `tenant` role; CSRF required. | Deletes only a row owned by the current user; returns `204`, or `404` if no owned alert matched. |

Web-surface reconciliation: the legacy Vite settings view can list and remove alerts, and its empty-state copy says to save a search, but searches of the inspected web scripts/templates found no control that creates one or calls `POST /api/search-alerts`. The active Django tenant dashboard only displays the alert count. The create endpoint also lacks the tenant-role guard used by list/delete. Do not invent a save-alert UX/API contract; keep create parity open until product/web behavior and role policy are reconciled.

### Handler contract audit — listing save/unsave batch

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `POST /api/listings/:id/save` | `requireAuth` only (no tenant-role guard); CSRF required. | Requires a positive integer listing id and an existing `published`, non-deleted listing; invalid id returns `400`, unavailable listing returns `404`. Inserts the current user/listing pair idempotently and returns `201 { saved: true }`. |
| `DELETE /api/listings/:id/save` | `requireAuth` only (no tenant-role guard); CSRF required. | Requires a positive integer listing id; deletes only the current user’s saved row and returns `204`, including when no row existed. |

Web-surface reconciliation: the legacy Vite listing cards and listing-detail page expose save/remove controls, use `/api/auth/csrf`, and update the heart/button state only after the request succeeds. The listing-card UI displays a sign-in-to-save message on authentication failure. The inspected Django listing grid and `property_detail.html` do not expose save/unsave controls; the Django tenant dashboard displays saved listings but has no remove action. `GET /api/account/saved-listings` is separately tenant-role restricted while these mutations accept any authenticated role; confirm intended role policy and reconcile the legacy Vite controls with the active Django surface.

### Handler contract audit — listing-like batch

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `POST /api/listings/:id/like` | `requireAuth` only; CSRF required. | Inserts the current user/listing pair with `INSERT IGNORE`; returns `{ liked: true, likes }`. The handler does not explicitly validate the id or verify that the listing is published/non-deleted. |
| `DELETE /api/listings/:id/like` | `requireAuth` only; CSRF required. | Deletes the current user’s pair and returns `{ liked: false, likes }`, even if nothing was removed. The handler does not explicitly validate the id or listing status. |

Web-surface reconciliation: listing discovery/detail queries return like counts and a `liked` value in some result shapes, and ranking calculations use like counts. The legacy Vite agent-profile gallery's control is labeled as a post-like action but calls `/api/listings/:id/like` with the profile's listing id; its data comes from the profile handler's listing-result collection. This is a user-facing listing-like behavior on that legacy surface, despite the UI label. The active Django profile has no equivalent engagement control. Preserve the legacy operation in parity and do not route it to a separate posts-like API.

### Handler contract audit — listing discovery/detail batch

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `GET /api/listings/discover` | Public; GET is CSRF-exempt. | Filters published, non-deleted listings by text/location hierarchy, category/journey, period- and currency-aware price, bedrooms/bathrooms, size, furnishing, amenities, availability, and agent verification. Sort supports newest, comparable-price low/high, popular, and relevance. `page` and `limit` are validated and bounded; response includes normalized filters and pagination metadata. Public map fields are rounded `locationLatitude`/`locationLongitude`; exact coordinate columns are omitted. Rows also include listing facts, amenities, rating, agent attribution, cover URL, and session-specific `saved` state. |
| `GET /api/listings/:id/details` | Public; GET is CSRF-exempt. | Returns `{ listing, media, reviews, reviewBookings, similar }` only for a published, non-deleted listing; otherwise `404`. Listing includes price/property/agent/verification fields, amenities and `saved` state; raw coordinates are removed and only approximate public coordinates are returned. Media is ordered cover-first, reviews are the latest 20 published reviews, similar listings are capped at six, and eligible tenant `reviewBookings` are included. For signed-in tenants, this read also marks past confirmed bookings completed before selecting eligible review bookings. |
| `GET /api/search` | Public except `type=tenant`, which requires `req.session.user.roles` to include `agent`; GET is CSRF-exempt. | `type` defaults to `estate` and supports `estate`, `location`, `price`, `agent`, `tenant`; query is trimmed/capped at 100 characters. Non-price searches require at least two characters; price strips `$`, commas, and whitespace and requires a nonnegative number. Returns up to 30 ranked listing rows for estate/location/price, up to 30 agent results, or up to 30 tenant results. Tenant results include id/name/city/avatar and are limited to active tenant accounts; agent search includes public profile/badge/sub-agent label fields. Invalid category/short query returns `400`; non-agent tenant search returns `403`. No pagination. |

Web-surface reconciliation: Vite discovery now uses the shared paginated endpoint and keeps filters in the URL; its map is opt-in and limited to the currently loaded page. Django discovery also forwards filter and page values. Django detail renders canonical/description metadata and an approximate OpenStreetMap link, but still does not render the API reviews, review eligibility, similar listings, or the legacy detail's save/share/compare/report controls. The Vite detail retains its in-page approximate map and review actions. The legacy quick-search still has a separate local-filter path; preserve these differences as open parity/reconciliation items and do not assume one surface's controls exist on another.

### Mobile implementation checkpoint — public listing read flow

The native Explore route calls the audited `GET /api/listings/discover` contract, and its listing route calls `GET /api/listings/:id/details`. The API client requires `EXPO_PUBLIC_API_URL` to be an HTTP(S) origin, validates response shapes, and sends credentialed requests so session-specific fields and authenticated workflows can use the existing server session. Public listing browsing remains available to guests. Native cookie persistence is not verified; the app has not yet been live-tested against a configured API. TypeScript checking and an Expo web bundle build pass, but these do not constitute feature parity verification.

### Handler contract audit — administrator listing moderation

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `GET /api/admin/listings` | `requireAuth` and `requireAdminAccess`; GET is CSRF-exempt. Access requires an administrator role or admin-gate session and passes the configured IP rules. | Supports `q`, a status allowlist (`draft`, `pending_review`, `published`, `unpublished`, `rejected`, `archived`), sort (`recent`, `oldest`, `title`, `status`), and a limit clamped to 1–100 (default 50). Returns `{ listings }` with listing status, title/location/price, owner name/id, and timestamps; no pagination metadata. Reads the canonical listings and user tables. |
| `POST /api/admin/listings/:id/moderation` | `requireAuth` and `requireAdminAccess`; global CSRF token required. | Accepts only `published`, `rejected`, or `unpublished`; archived listings cannot be changed. Updates the shared listing status, sets `published_at` the first time a listing is published, writes an audit event, notifies the owner/agent, and returns `{ ok, status }`. |

Web/admin reconciliation: the Django console's `listing-status` action writes to its configured MySQL database directly and audits the change; the Express API uses the same `MYSQL_*` variable names. Production must confirm both point to the same database. The Django action currently does not share the API route's first-publish timestamp and notification side effects, so status visibility can sync while action side effects differ. Mobile uses the authorized Express API and must not write directly to MySQL. The mobile account screen supports the normal administrator account session and the existing rate-limited admin gate; native cookie persistence and admin IP-rule behavior still need device verification.

Cross-client acceptance check: with the same non-production database configured, publish a pending listing from the Django console and confirm it appears in the mobile Published filter and public Explore after refresh; then unpublish it through mobile and confirm the Django queue/status reflects the same record. Verify audit/notification differences and authorization failures separately. This check has not yet been run.

### Handler contract audit — administrator post moderation

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `GET /api/admin/posts` | `requireAuth` and `requireAdminAccess`; GET is CSRF-exempt. | Returns up to 200 rows with post/listing ids, listing title/city, status, post type/caption/amenity tags, created time, agent display name, and listing-based likes/views/engagement. Supports `status` and `q`; only `draft`, `pending_review`, and `published` status values actually add a status filter. The mobile app uses only those supported filters and does not request sorting. If the `posts` table is missing, the handler falls back to listing rows with `post_id: null` and without post content; mobile identifies that fallback and disables moderation actions. |
| `POST /api/admin/posts/:id/moderation` | `requireAuth` and `requireAdminAccess`; global CSRF token required. | Accepts `draft`, `pending_review`, or `published`; updates the `posts` row, writes a `post_<status>` audit event, and returns `{ ok, status }`. Missing post returns `404`; this handler does not send a notification. |

Web/admin reconciliation: Django's post queue and detail view read the same `posts` records and expose type, caption, amenity tags, linked listing, owner, and created time. Its `post-status` action allows `draft`, `pending_review`, and `published`, updates the shared table, and audits; like the API route, it does not send a notification. Mobile adds type/caption/amenity tags to the existing protected API queue response and renders the review details in the app. No Django or web UI runtime files were changed. Verify Express and Django use the same actual database before claiming state synchronization.

Cross-client acceptance check: using a non-production admin session and shared database, publish a pending post from mobile and confirm the Django queue/detail shows Published; return it to draft in Django and confirm the mobile Draft filter reflects it after refresh. Also verify guests/non-admins receive no queue or mutation access. This check has not yet been run.

### Handler contract audit — administrator overview

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `GET /api/admin/overview` | `requireAuth` and `requireAdminAccess`; GET is CSRF-exempt. | Returns 14 count/volume metrics from the shared database. Each count query catches and logs its own error and returns zero; the mobile-required additive `unavailableMetrics` array now identifies which fields failed so the app renders those as unavailable. `grossBookingVolume` sums confirmed/completed `total_amount` without currency grouping, so the app intentionally does not display it as a single money value. |

The Django overview displays a smaller set of seven metrics and a pending/suspended-account table with activate/suspend actions, plus a 30-second auto-refresh. Mobile currently displays the API counts and uses manual pull-to-refresh; attention-account actions and timed refresh remain open. Cross-client read verification is pending the shared non-production configuration.

### Handler contract audit — administrator people and account status

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `GET /api/admin/users` | `requireAuth` and `requireAdminAccess`; GET is CSRF-exempt. | Supports `q` over email, phone, first name, and last name; status `pending`, `active`, `suspended`, or `deleted`; limit 1–100 (default 50). Returns account id, contact fields, status, MFA/email-verification/last-login/creation metadata, and comma-separated roles. Mobile caps search at 100 characters and only reads the endpoint. |
| `POST /api/admin/users/:id/status` | `requireAuth` and `requireAdminAccess`; global CSRF token required. | Accepts `pending`, `active`, `suspended`, or `deleted`; prevents the current administrator from deactivating their own account, updates linked sub-agent status and destroys sessions for non-active outcomes, then audits. Unlike the Django admin action, it does not protect the last active administrator. Mobile intentionally does not expose this mutation until the server enforces the same last-admin safeguard. |

The mobile people screen is read-only and exposes no account mutations. Its list is server-authorized; client-side role gating is only for navigation. User detail/history and parity-safe status actions remain open. Cross-client verification should compare account status/roles from a shared non-production database after read-only role sessions are validated.

### Handler contract audit — public agent directory/profile batch

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `GET /api/agents` | Public; GET is CSRF-exempt. | Bounded pagination, default 30 and maximum 100, returns `{ agents, page, limit, algorithm }`. Lists active users with agent role, ranked by followers/listings/ratings/engagement; fields include name, city, profile image, bio, online flag, badge, followers, listing count, and rating. No search/filter parameters. |
| `GET /api/agents/:id/profile` | Public; GET is CSRF-exempt. | Returns `{ profile, listings, posts, reviews, following }`; `listings` and `posts` are the same listing-result collection. Requires active user plus agent role or returns `404`. Profile response includes phone and email, badge, ratings/review stats and response time. Shows published listings and also the signed-in owner’s `pending_review` listings. Includes up to 10 published reviews and a session-specific following flag. |
| `GET /api/agents/:id/followers` | Public; GET is CSRF-exempt. | Returns up to 100 follower rows `{ id, firstName, lastName, role, profileImageUrl }`, newest follow first. No agent-existence, follower active-status, or pagination check in this handler. |
| `GET /api/agents/:id/following` | Public; GET is CSRF-exempt. | Returns up to 100 rows with the same shape for accounts followed by the supplied user id, newest follow first. No check that the supplied id is an agent or an active account, and no pagination. |

Web-surface reconciliation: Django exposes an agent directory/profile with basic agent details and published inventory, but does not render profile reviews, follow/follower counts, follow/unfollow, or follower/following lists. The legacy Vite agent profile exposes follow/unfollow, follower/following counts and dialogs, public contact fields, listing-card engagement presented as post likes/views, and review summaries. Its follower dialog displays names and roles before refusing navigation to tenant profiles; confirm the intended privacy policy for public follower/following data, and whether email/phone belong in a public profile response. The follow/unfollow mutation handlers are a separate audit item.

### Handler contract audit — agent follow/unfollow batch

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `POST /api/agents/:id/follow` | `requireAuth` only; CSRF required. | Requires positive agent id, rejects following own user id (`400`), and requires an active user with the agent role (`404` otherwise). `INSERT IGNORE` makes the relationship idempotent, updates the agent follower count, notifies the agent, and returns `{ following: true, followers }`. Notification is attempted even when the relationship already existed. |
| `DELETE /api/agents/:id/follow` | `requireAuth` only; CSRF required. | Requires positive id; deletes only the current user’s relationship, recalculates the target agent follower count, and returns `{ following: false, followers }`. It does not require the target to be an active agent and returns success even if no relationship existed. |

Web-surface reconciliation: legacy Vite requires sign-in before follow/unfollow, sends the session CSRF token, and updates the button and follower count from the response. Django agent profiles have no follow control. The API does not restrict followers to tenant role; preserve this unless product policy explicitly changes it.

### Handler contract audit — public discovery/showcase/post feeds

| Method / endpoint | Access and CSRF | Contract and verified behavior |
|---|---|---|
| `GET /api/discover` | Public; GET is CSRF-exempt. | Accepts `q` and `location`, each trimmed/capped at 100. Returns up to 40 published, non-deleted listings ranked using text/location match, user city, rating/reviews, likes/views, followed agents, saved-listing cities, and freshness. Returns `{ listings, algorithm }`; no pagination and no `rankScore` field in rows. Uses the current session user id for personalization when present. |
| `GET /api/showcase/posts` | Public; GET is CSRF-exempt. | Returns up to 12 published, non-deleted listings from active agents, shaped as showcase posts with listing id/title/description/location/prices/rating, agent/badge/sub-agent data, media, like/view counts, and rank score. This queries listings, not the `posts` table; returns `{ posts, algorithm }`. |
| `GET /api/posts` | Public; GET is CSRF-exempt and sets `Cache-Control: no-store`. | Supports `sort=rank` (default), `recent`, or `trusted`; returns up to 60 published post records joined to published listings, plus eligible published listings without a published post as legacy fallback. If the `posts` table is missing, a listing-only fallback is returned. Response is `{ posts, algorithm, personalized: false }`; no pagination. Feed rows set `liked` and `saved` to `0`, not to the current session's state. |

Web-surface reconciliation: legacy Vite calls `/api/showcase/posts` to populate its home showcase; those listing records are called posts in the UI, filtered client-side by a name/title regex, and clicking one opens listing details. The inspected Django homepage has no equivalent showcase. No client call to `/api/discover` or `/api/posts` was found in the inspected repository; the legacy `/posts.html` route redirects to `/index.html#explore`, and `app.js` removes the Posts navigation link. Keep these API routes in the inventory until confirmed internal/obsolete; do not assume the unused API feed is equivalent to the homepage showcase.

### Confirmed web-to-API mismatch

| Web control | Client request | Backend finding | Required next action |
|---|---|---|---|
| Retained Vite account role switch in `app.js` | `POST /api/auth/active-role` with `{ role: 'tenant' | 'agent' }` | No matching Express route is declared in `server/index.js`; frontend/API cross-check found no other missing API path. | Determine whether this is an intended supported web feature or stale UI. If intended, add a server-authorized implementation and tests before implementing role switching in mobile; never simulate it only in app state. |

| Method | Endpoint | Initial role / classification | Status |
|---|---|---|---|
| POST | `/api/payments/webhook` | Internal provider callback; verify no human mobile action | Not started |
| GET | `/api/health` | Internal health check | Not started |
| GET | `/api/public-config` | Public app configuration; use only approved non-secret fields | Not started |
| GET | `/api/ready` | Internal readiness check | Not started |
| GET | `/api/auth/csrf` | All roles / auth bootstrap | Not started |
| GET | `/api/auth/google` | Guest / OAuth start | Not started |
| GET | `/api/auth/google/callback` | Guest / OAuth callback | Not started |
| POST | `/api/auth/google/complete` | Guest / OAuth completion | Not started |
| POST | `/api/auth/register` | Guest / account registration | Not started |
| POST | `/api/auth/login` | Guest / sign in | Not started |
| POST | `/api/auth/email-verification/confirm` | User / verify email | Not started |
| POST | `/api/auth/email-verification/resend` | User / resend verification | Not started |
| POST | `/api/auth/password-reset/request` | Guest / password recovery | Not started |
| POST | `/api/auth/password-reset/complete` | Guest / complete password reset | Not started |
| POST | `/api/auth/logout` | Authenticated user / sign out | Not started |
| GET | `/api/auth/me` | Authenticated user / current session | Not started |
| POST | `/api/auth/mfa/setup` | Authenticated user / MFA setup | Not started |
| POST | `/api/auth/mfa/enable` | Authenticated user / MFA enable | Not started |
| GET | `/api/tenant/profile` | Tenant / profile read | Not started |
| POST | `/api/tenant/profile/photo` | Tenant / profile photo upload | Not started |
| PATCH | `/api/tenant/profile` | Tenant / profile update | Not started |
| GET | `/api/agents/:id/profile` | Public / agent profile and reviews; verify actual response | Not started |
| GET | `/api/agents/:id/followers` | Agent/profile viewer / followers; verify access | Not started |
| GET | `/api/agents/:id/following` | Agent/profile viewer / following; verify access | Not started |
| GET | `/api/agents` | Public / agent directory | Not started |
| POST | `/api/agents/:id/follow` | Authenticated user / follow agent | Not started |
| DELETE | `/api/agents/:id/follow` | Authenticated user / unfollow agent | Not started |
| GET | `/api/discover` | Public / discover feed | Not started |
| GET | `/api/showcase/posts` | Public / showcase feed | Not started |
| GET | `/api/agent/posts/listings` | Agent / post and listing choices | Not started |
| POST | `/api/agent/posts` | Agent / create showcase post | Not started |
| GET | `/api/agent/geocode` | Agent / listing address geocode | Not started |
| PATCH | `/api/agent/profile` | Agent / profile update | Not started |
| POST | `/api/agent/profile/photo` | Agent / profile photo upload | Not started |
| GET | `/api/agent/summary` | Agent / workspace summary | Not started |
| GET | `/api/agent/attention` | Agent / attention queue | Not started |
| GET | `/api/agent/settings` | Agent / account or workspace settings | Not started |
| POST | `/api/agent/subagents` | Main agent / create or invite sub-agent | Not started |
| PATCH | `/api/agent/subagents/:id` | Main agent / manage sub-agent and permissions | Not started |
| POST | `/api/agent/listings` | Agent / create listing and upload content | Not started |
| GET | `/api/agent/bookings` | Agent / booking queue | Not started |
| POST | `/api/agent/bookings/:id/decision` | Agent / booking decision | Not started |
| GET | `/api/posts` | Public / posts feed | Not started |
| GET | `/api/listings/discover` | Public / listings and filters | Not started |
| POST | `/api/listings/:id/view` | Public / record listing view | Not started |
| POST | `/api/listings/:id/like` | Authenticated user / like listing | Not started |
| DELETE | `/api/listings/:id/like` | Authenticated user / unlike listing | Not started |
| POST | `/api/listings/:id/save` | Tenant / save listing | Not started |
| DELETE | `/api/listings/:id/save` | Tenant / unsave listing | Not started |
| GET | `/api/listings/:id/details` | Public / listing detail, media, reviews and related data | Not started |
| POST | `/api/listings/:id/reviews` | Eligible tenant / submit review | Not started |
| POST | `/api/listings/:id/geocode` | Agent / listing location lookup | Not started |
| POST | `/api/listings/:id/media` | Authorized agent / add listing media | Not started |
| GET | `/api/search` | Public / search | Not started |
| POST | `/api/messages` | Authenticated user / send or start message | Not started |
| GET | `/api/messages` | Authenticated user / conversation list | Not started |
| GET | `/api/messages/unread-count` | Authenticated user / unread message badge | Not started |
| GET | `/api/messages/:conversationId` | Conversation member / conversation detail | Not started |
| GET | `/api/notifications` | Authenticated user / notification list | Not started |
| POST | `/api/notifications/read` | Authenticated user / mark notifications read | Not started |
| POST | `/api/users/:id/block` | Authenticated user / block user | Not started |
| DELETE | `/api/users/:id/block` | Authenticated user / unblock user | Not started |
| POST | `/api/reports` | Authenticated user / submit safety report | Not started |
| GET | `/api/account/bookings` | Tenant / booking history | Not started |
| GET | `/api/account/summary` | Tenant / workspace counts | Not started |
| GET | `/api/account/saved-listings` | Tenant / saved properties | Not started |
| GET | `/api/account/search-alerts` | Tenant / saved search alerts | Not started |
| PATCH | `/api/account/notification-preferences` | Authenticated user / update preferences | Not started |
| GET | `/api/account/notification-preferences` | Authenticated user / read preferences | Not started |
| POST | `/api/account/change-password` | Authenticated user / change password | Not started |
| DELETE | `/api/account` | Authenticated user / delete account | Not started |
| GET | `/api/bookings/:id` | Booking participant / booking detail | Not started |
| POST | `/api/bookings/:id/cancel` | Booking participant / cancel booking | Not started |
| PATCH | `/api/bookings/:id/reschedule` | Booking participant / reschedule booking | Not started |
| POST | `/api/bookings` | Tenant / create booking request | Not started |
| GET | `/api/host/listings` | Agent / owned or assigned listings | Not started |
| GET | `/api/host/bookings` | Agent / host booking list | Not started |
| POST | `/api/host/bookings/:id/decision` | Agent / host booking decision | Not started |
| POST | `/api/presence/ping` | Signed-in user / presence, if used by web | Not started |
| GET | `/api/marketplace/live` | Public / live marketplace content | Not started |
| DELETE | `/api/search-alerts/:id` | Tenant / delete saved search | Not started |
| POST | `/api/search-alerts` | Tenant / create saved search | Not started |
| POST | `/api/admin/gate` | Administrator / admin gate | Not started |
| GET | `/api/admin/settings` | Administrator / settings | Not started |
| GET | `/api/admin/analytics` | Administrator / analytics | Not started |
| PATCH | `/api/admin/settings` | Administrator / update settings | Not started |
| PATCH | `/api/admin/features/:featureKey` | Administrator / feature flag | Not started |
| PATCH | `/api/admin/email-templates/:templateKey` | Administrator / email template | Not started |
| POST | `/api/admin/ip-rules` | Administrator / add IP rule | Not started |
| DELETE | `/api/admin/ip-rules/:id` | Administrator / delete IP rule | Not started |
| POST | `/api/admin/admins` | Administrator / manage administrator access | Not started |
| GET | `/api/admin/announcements` | Administrator / announcement list | Not started |
| POST | `/api/admin/announcements` | Administrator / create announcement | Not started |
| GET | `/api/admin/insights` | Administrator / insights | Not started |
| POST | `/api/admin/users/:id/impersonate` | Administrator / start impersonation; high-risk, inspect exact policy | Not started |
| POST | `/api/admin/impersonation/stop` | Administrator / stop impersonation | Not started |
| GET | `/api/admin/overview` | Administrator / dashboard | In progress |
| GET | `/api/admin/users` | Administrator / people | In progress |
| GET | `/api/admin/listings` | Administrator / listing moderation | Not started |
| GET | `/api/admin/posts` | Administrator / post moderation | In progress |
| POST | `/api/admin/posts/:id/moderation` | Administrator / moderate post | In progress |
| GET | `/api/admin/agents` | Administrator / agent management | Not started |
| POST | `/api/admin/agents/:id/badge` | Administrator / agent badge | Not started |
| GET | `/api/admin/bookings` | Administrator / booking oversight | Not started |
| GET | `/api/admin/verifications` | Administrator / identity checks | Not started |
| GET | `/api/admin/agent-verifications` | Administrator / agent verification queue | Not started |
| POST | `/api/admin/agent-verifications/:id/decision` | Administrator / agent verification decision | Not started |
| POST | `/api/admin/users/:id/status` | Administrator / user status | Not started |
| POST | `/api/admin/users/:id/mfa/reset` | Administrator / reset user MFA | Not started |
| POST | `/api/admin/users/:id/email/verify` | Administrator / verify user email | Not started |
| POST | `/api/admin/users/:id/role` | Administrator / assign role | Not started |
| DELETE | `/api/admin/users/:id/role/:role` | Administrator / remove role | Not started |
| POST | `/api/admin/bookings/:id/status` | Administrator / booking status | Not started |
| GET | `/api/admin/audit-logs` | Administrator / audit history | Not started |
| POST | `/api/admin/listings/:id/moderation` | Administrator / moderate listing | Not started |
| POST | `/api/admin/verifications/:id/decision` | Administrator / verification decision | Not started |
| POST | `/api/identity-documents` | Agent/user per server authorization / sensitive identity upload | Not started |
| POST | `/api/auth/active-role` | Legacy web client calls this, but backend handler is missing; currently a blocker, not an available API | Blocked |
| GET | `/admin/` | Legacy/server admin entry; reconcile with Django `/admin/` | Not started |
| GET | `/posts.html` | Legacy public posts page; disposition after web audit | Not started |
| GET | `/app.js` | Legacy browser script, not a standalone mobile screen | Not started |

## Open Phase 0 inventory work

- [ ] Re-read the active and legacy frontend scripts, templates, forms, and all interactive states; update rows when additional actions are found.
- [ ] Before implementing an API-backed parity row, inspect its exact Express handler and supporting modules for input/output, role checks, sub-agent scope, side effects, errors, and matching UI; record authorization, not just inferred role.
- [ ] Reconcile Django admin dashboard sections and all form controls against the 16 action-dispatcher actions plus API-backed admin operations. Identify duplicate or Django-only operations.
- [ ] Inspect `index.html`, `listings.html`, `listing-detail.html`, `app.js`, `listings-page.js`, `listing-detail-page.js`, `public/service-worker.js`, and `manifest.webmanifest`; map every distinct user operation and decide which surface is actually deployed.
- [ ] Confirm listing comparison, share, reviews, favorites, notifications, profile editing, account deletion, cookie consent, active-role selection, and other features against all active web surfaces; do not assume endpoint presence proves a usable web flow.
- [ ] Resolve mismatches between `PROJECT-INFO.txt`, current templates, frontend scripts, and backend endpoints; add specific rows for every discovered capability.
- [ ] Test web baselines with available tests and record exact pre-existing failures in `mobile/AI-HANDOFF.md`.

**Phase 0 gate:** do not call the matrix exhaustive or begin feature implementation until all web-screen/control inventory items above are complete and every in-scope web action has a row. Endpoint contracts must be inspected before implementing their matching mobile workflow. Any confirmed web-to-API mismatch is a visible blocker until resolved or the web control is verified as stale and dispositioned.
