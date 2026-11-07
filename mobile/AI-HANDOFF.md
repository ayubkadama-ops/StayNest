# Mobile App AI Handoff

Read this file after `MOBILE-APP-ROADMAP.md` and `mobile/docs/feature-parity.md` whenever work resumes. The newest checkpoint is at the top. Check actual files and `git status` before relying on this note.

## Checkpoint: Mobile marketplace header layout
Updated: 2026-11-07
Scope: responsive public marketplace header in `styles.css`.

Completed:
- On mobile, the brand and menu button share the top row; the profile avatar sits beside the menu, account controls are aligned below, and navigation opens as a dropdown.
- Replaced the mobile language label with a globe icon.
- Explicitly hide message, notification, and settings controls while hidden/guest, preventing their display styles from overriding the HTML `hidden` state.

Verification:
- `npm run build` and `git diff --check` passed.
- Browser responsive checks at 320px and 390px confirmed aligned brand/avatar/menu, collapsed navigation that opens below the header, and hidden guest message control.

The local Vite preview used for browser validation was stopped. Preserve unrelated worktree edits.

## Checkpoint: Username sign-in for created administrators
Updated: 2026-11-07
Scope: web and mobile login forms, administrator wizard, shared account login API, and database schema.

Completed:
- Added a required username field to the administrator-creation wizard. Usernames are normalized to lowercase, validated as 3-120 letters/numbers/periods/underscores/hyphens, and retained after validation errors.
- Persisted usernames uniquely in `users`; added `database/admin-username-migration.sql` to the Express startup migration list and updated `database/schema.sql`.
- New administrators can sign in with either username or email using the same password. Existing email sign-in and role assignment behavior remain supported.
- Updated the API administrator-creation endpoint, login form labels, and admin list/detail display. Mobile standard sign-in also accepts usernames, while explicitly identifying the separate protected founder-console sign-in.

Verification:
- `npm test` — 24 tests passed.
- `npm run test:django` — 68 tests passed; Django system check clean.
- `npm run build` and `git diff --check` passed.
- `cd mobile && npm run typecheck` — passed after the username-login update.

Other unrelated worktree edits remain; preserve them.

## Checkpoint: Live web form validation and error retention
Updated: 2026-11-07
Repository: StayNest (workspace `C:\Users\USER\Desktop\new project`)
Scope: shared public-web and Django operations-console forms; no mobile UI changes.

Goal:
Show invalid input next to its field while keeping the user on the current form and retaining other entered values.

Completed:
- Activated shared validation for the public home/listing pages, Django marketplace pages, and standalone admin pages; dynamic forms are covered as they are inserted.
- Required, type, length, range, pattern, custom, strong-password, password-confirmation, founder image URL, and admin IP/CIDR errors are displayed inline with accessible field associations.
- Failed public async requests continue to show form messages without resetting entered fields.
- Failed admin sign-in retains the username but never the password. Founder-profile errors retain non-password profile values through the redirect, while credentials are not stored. Failed administrator creation re-renders the wizard with non-password values and the relevant step restored.
- Updated focused Django tests for retained form values and password clearing.

Verification:
- `npm run test:django` — 67 tests passed; Django system check clean.
- `npm run build` — passed, with shared validation assets included.
- Browser smoke checks confirmed an invalid dynamic form stays on the page, keeps other values, and shows an inline error; password mismatch clears after correction.
- `node --check` for the validation module, `git diff --check`, and Django static asset discovery passed.

Scope note:
The global client validator handles HTML constraints and the custom rules tagged in templates; server-side errors in async marketplace forms remain inline. Passwords and file inputs are never persisted to restore form state. Other pre-existing worktree edits were left untouched.

## Checkpoint: Founder profile and administrator access
Updated: 2026-11-07
Repository: StayNest (workspace `C:\Users\USER\Desktop\new project`)
Scope: Django operations console and marketplace login, Express admin API authorization, and additive database schema; no mobile UI changes.

Goal:
Give the founder a wizard to create administrator accounts, manage each account's status and feature grants, safely delete an administrator, and enforce delegated grants at the API boundary without weakening founder authority.
Keep the founder-gate identity distinct from delegated administrator accounts, expose its profile securely, and let the founder delete the last assigned administrator without losing owner access. After Google-based tenant registration, require the user to sign in with the password they chose instead of signing them in automatically.

Completed:
- Added profile and feature-grant tables to `database/schema.sql` and the additive `database/admin-access-migration.sql`; registered the migration in Express startup.
- New admins created by the Django console or Express API, and users newly assigned the administrator role, receive a restricted access profile with no grants. Existing admins without a profile retain their legacy full API access until the founder saves an access profile for them.
- Added Express feature checks for overview, users, roles/access, agents, listings, posts, badges, bookings, verifications, audit, settings, and analytics endpoints. Grant checks are server-side; unknown features deny restricted admins. IP-rule lookup failures no longer silently allow administrator access.
- Kept the founder-gate session as the only authority for creating/deleting admins, changing administrator roles, impersonation, and modifying another administrator's account security/status.
- Replaced the inline create form with a three-step wizard and added administrator status/access listing, a per-admin access page with feature checkboxes, account status controls, session-revoking deletion, audit logging, and last-active-admin protection for deactivation/role removal.
- Recorded prior-existing administrator behavior as legacy full access; the founder can convert one to explicit restricted permissions by saving its checkbox form.
- Google tenant registration now redirects to `/login/?googleSignup=1`, where a login notice confirms the chosen password can be used. Agent registration retains its pending-approval flow.
- The independent founder console identity is visible in the administrator list as protected, retains full access, and is not deletable as a user account. Its display name, username, email, phone, profile image URL, and password are editable from the founder profile page; username/password changes apply to Django and Express login, require the current password, and revoke existing founder API sessions.
- Founder credentials are bootstrapped from the environment until the profile is first saved, then the bcrypt hash and profile data are stored in the shared database. The last database-backed administrator can be permanently deleted because the separate founder gate remains the recovery path.
- Delegated administrator permissions are grouped into collapsed categories so the founder can expand only the feature sets they need to review.

Verification:
- `npm test` — 24 Node tests passed.
- `npm run test:django` — 66 Django tests passed.
- `npm run check:django` — passed.
- `node --check server/index.js` and Python syntax compilation for the modified console code/tests — passed.

Scope note:
The Django operations console remains founder-gate-only; delegated feature grants currently authorize the Express admin APIs and do not provide email/password login to the Django console. Check Git history for commit status and review the actual worktree before further edits because unrelated local changes were already present.

---

## Checkpoint: Adding administrator creation to the web console
Updated: 2026-11-07
Repository: StayNest (workspace `C:\Users\USER\Desktop\new project`)
Scope: Django operations console only; no mobile app or public web marketplace changes.

Goal:
Expose the existing create-administrator capability in the web console and ensure the new account uses normal signup-style email/password credentials.

Completed:
- Added a CSRF-protected administrator creation form to `django_admin/templates/dashboard.html` under Roles and security. It collects first/last name, email, phone, city, password/confirmation, and the current console password for re-confirmation.
- Added `admin-create` handling to `django_admin/console/views.py`. It checks the console password against `ADMIN_GATE_PASSWORD_HASH`, validates the signup password policy and phone/email/name/location fields, hashes the new password with bcrypt cost 12, creates an active email-verified account/profile, assigns the administrator role, and audits the creation.
- Kept existing role assignment behavior: assigning the administrator role to a registered user does not update their email/password; the account remains signed in with the credentials used at signup. The UI now states this explicitly.
- Added tests covering form visibility, account creation and signup credentials, weak-password rejection, console-password confirmation, and existing credential preservation.

Verification:
- `django_admin/.venv/Scripts/python.exe manage.py test console` — 38 tests passed.
- `django_admin/.venv/Scripts/python.exe manage.py check` — passed.
- `python -m py_compile` for the modified console views and tests — passed.
- `git diff --check` on the three task files — passed.

---

## Checkpoint: Adding mobile registration and improving text contrast
Updated: 2026-11-04
Repository: StayNest (workspace `C:\Users\USER\Desktop\new project`)

Goal:
Address the missing signup flow and text readability report without changing web files or server behavior.

Completed:
- Added `mobile/app/signup.tsx`, a three-step native registration flow matching the web fields: tenant/agent selection, name, email, phone, city, optional agent agency/bio, strong password/confirmation, remember option, progress/back/continue, and pending-approval/verification result messaging.
- Added runtime-validated `registerAccount` using the existing CSRF-protected `POST /api/auth/register`; it preserves the server's pending-agent approval outcome and does not create local agent permissions.
- Added password-recovery request UI/API in the Account screen and a Create account entry point from sign-in.
- Forced the app's existing light design system and navigation theme to light so themed text matches the app's light backgrounds; darkened placeholders and selected secondary labels for stronger contrast.
- No web templates, web client files, or Express routes were changed.

Verification:
- `npm run typecheck` from `mobile/` — passed.
- `npx expo export --platform web --output-dir .expo-export-check-auth` — passed and included the `signup` route; temporary export directory was removed.
- Focused runtime checks verified tenant and agent registration response parsing, CSRF header use, normalized submitted values, and pending-approval handling.
- The temporary web preview could not be validated in-browser; no Android device/Expo Go session is attached. Native on-device appearance and live registration remain unverified.

Remaining:
- Google sign-in is still not implemented natively because the current server OAuth callback returns to the web site and has no secure app deep-link/session handoff.
- Registration/signup remains `In progress` until verified with a test API account and device. Broader parity items in the matrix remain open.

---

## Checkpoint: Matching the latest committed API contract
Updated: 2026-11-04
Repository: StayNest (workspace `C:\Users\USER\Desktop\new project`)
Commit reviewed: `9433641` (`Fix remaining server startup syntax`)

Goal:
Keep the separate native app compatible with the API contracts available in the latest commit, without discarding local worktree changes.

Completed:
- Confirmed commit `9433641` changes only the Express server startup syntax and contains no mobile app files; the mobile app remains an untracked local project.
- Verified every API path currently used by the mobile client is present in `HEAD:server/index.js`.
- The committed `/api/admin/overview` response contains metric fields at the top level and omits `unavailableMetrics`; updated the mobile parser to accept that legacy committed shape while still validating `unavailableMetrics` when supplied by the newer local server.
- Verified both committed and extended admin-overview payloads with a focused runtime check; malformed `unavailableMetrics` is still rejected.

Verification:
- `npm run typecheck` from `mobile/` — passed.
- Android Expo bundle, Metro status, and LAN discovery API returned HTTP 200.

Scope note:
The active API process was started from the existing working tree, which contains unrelated local changes. Do not reset or replace those changes. The committed API compatibility check was performed against `HEAD` route declarations and response shape; no clean checkout or separate HEAD server was created.

---

## Checkpoint: Running the app over the local network
Updated: 2026-11-04
Repository: StayNest (workspace `C:\Users\USER\Desktop\new project`)

Goal:
Start the API and Expo app for Android/Expo Go, then verify the LAN endpoints and native bundle.

Completed:
- Started `npm run dev:api` from the repository root; `GET /api/listings/discover?sort=recent&limit=2` returns HTTP 200 with 2 listings from both localhost and `192.168.1.4`.
- Started Expo from `mobile/` with `EXPO_PUBLIC_API_URL=http://192.168.1.4:3000`, `--host lan`, and port `8081`.
- Verified the Expo status endpoint and Android manifest return HTTP 200, and the Android development bundle compiles and returns HTTP 200.
- Fixed the agent workspace's stale typed Explore link to use the registered `/` route; `npm run typecheck` from `mobile/` now passes.

Current run instructions:
- The API and Expo servers are running in the active terminal sessions (ports 3000 and 8081). Open Expo Go on a phone on the same Wi-Fi and connect to `exp://192.168.1.4:8081`; allow ports 3000 and 8081 through the PC firewall if prompted.
- For an Android emulator instead of a physical phone, restart Expo with `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`.
- Device-side Expo Go loading is not verified; `adb` is unavailable in PATH. Host checks confirm the LAN manifest, API, and bundle only.

---

## Checkpoint: Starting Expo with LAN API configuration
Updated: 2026-11-04
Repository: StayNest (workspace `C:\Users\USER\Desktop\new project`)

Goal:
Make the app launch with the API origin reachable from the Android device at `192.168.1.4`.

Completed:
- `npm run typecheck` from `mobile/` — passed.
- Confirmed `192.168.1.4` is assigned to the PC's Wi-Fi interface and the API on port 3000 returns HTTP 200 with 2 published listings over that LAN address.
- Replaced the previous `mobile` Expo process on port 8081 with `npm run start -- --host lan --port 8081`, setting `EXPO_PUBLIC_API_URL=http://192.168.1.4:3000` in the same process before launch.
- Verified Metro responds with `packager-status:running` at `http://192.168.1.4:8081/status`.

Device-side limitation:
- `adb` is unavailable in PATH, so Expo Go/Android device loading cannot be verified from this machine. Host-side Metro/API checks do not prove the phone can reach either service.
- The Expo server is running in the current PowerShell session; avoid starting another server on 8081. Open its current Expo Go QR/link on a phone on the same Wi-Fi and permit ports 8081 and 3000 through the PC firewall.
- For an Android emulator that cannot reach the API at the LAN address, set `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` and restart Expo. A physical phone should use `http://192.168.1.4:3000`.

Next action:
Open the running Metro URL in Expo Go and confirm the Explore screen displays the two published homes; if it still fails, capture the device's exact API/network error and verify firewall/Wi-Fi reachability.

---

## Checkpoint: Building the mobile agent workspace
Updated: 2026-11-04
Repository: StayNest (workspace `C:\Users\USER\Desktop\new project`)
Scope: Mobile-only; no Django/web or Express server files changed.

Goal:
Begin the agent workspace from the tagged Django `agent_workspace.html` reference, preserving existing API permissions and shared booking/listing behavior.

Completed:
- Added `mobile/app/(tabs)/agent.tsx` with the web workspace's summary metrics, property inventory, and booking request sections, plus refresh/loading/error/empty states.
- Added runtime-validated mobile API methods for `GET /api/agent/summary`, `GET /api/host/listings`, `GET /api/agent/bookings`, and CSRF-protected `POST /api/agent/bookings/:id/decision`.
- Gated inventory, booking-view, and booking-decision controls using the signed-in user's sub-agent permissions; server authorization remains authoritative.
- Added confirmed approve/decline actions and exposed the workspace only to signed-in agent-role users through the tab bar, Explore menu, and Account screen.
- Updated AGT-01/AGT-03 and the mobile README. Listing creation/editing is intentionally not implemented in this slice: the web form requires document and multi-photo/video uploads plus geocoding/map pin validation.

Verification:
- `npm run typecheck` from `mobile/` — passed.
- `npx expo export --platform web --output-dir .expo-export-check-agent-final` — passed; the generated `agent` route was included and temporary output was removed.
- No authenticated agent account or device was available to verify session cookies, booking permissions/actions, or cross-client updates against the running API.

Remaining:
- Listing creation/editing, location/map flow, and required media/registration-document uploads are still open (AGT-02).
- Attention alerts, profile/verification management, posts, sub-agent management, and other agent capabilities remain open.
- AGT-01/AGT-03 are in progress and are not parity-verified.

Next action:
Implement a mobile listing-create flow with explicit platform-compatible document/photo/video selection and address/geocode/map-pin validation before connecting it to `/api/agent/listings`.

---

## Checkpoint: Verifying local app services
Updated: 2026-11-04
Repository: StayNest (workspace `C:\Users\USER\Desktop\new project`)

Goal:
Run the mobile typecheck, API, and Expo service checks after the device reported a DevTools connection warning at `192.168.1.4:8081`.

Completed:
- `npm run typecheck` from `mobile/` — passed.
- Started `npm run dev:api` from the repository root. `GET /api/listings/discover?sort=new` returned HTTP 200 from both `127.0.0.1:3000` and the machine LAN address `192.168.1.4:3000`; the response contained 2 published listings.
- `npm run start` was already running from `mobile/` on port 8081 (PID 77624), so no duplicate Expo server was started or stopped. Metro `/status` returned HTTP 200 at both `127.0.0.1:8081` and `192.168.1.4:8081`.
- `adb` is not available in PATH; no Android device connection or `adb reverse` check could be performed.

Diagnosis/next steps:
- The host-side Expo and API services respond correctly. The DevTools warning at `192.168.1.4:8081` is a Metro/device connectivity path, not evidence that the API is down; host-side checks do not prove that the phone can reach the PC.
- Set the API origin before restarting Expo: use `http://10.0.2.2:3000` for an Android emulator, or `http://192.168.1.4:3000` for a physical phone on the same Wi-Fi. Allow ports 8081 and 3000 through the PC firewall.
- Do not stop or replace the already-running Expo process without coordinating with the user. If using a USB-connected device, install/use Android platform tools and run `adb devices` followed by the matching `adb reverse` commands.
- A live Expo Go/device test remains unverified.

---

## Checkpoint: Matching the mobile home to the website
Updated: 2026-11-04
Repository: StayNest (workspace `C:\Users\USER\Desktop\new project`)
Worktree: Existing changes were present; this slice changed only `mobile/` files and bundled web brand imagery under `mobile/assets/web/`. No web templates/styles or server code were changed.

Goal:
Make the native app's public home/Explore screen follow the website's mobile composition, and make the reported Android API URL typo actionable.

Completed:
- Reworked `mobile/app/(tabs)/index.tsx` to mirror the responsive home structure: brand header/menu, property category shortcuts, dark hero/search, category photo grid, one-column recently listed cards, trust content, how-it-works steps, and footer.
- Bundled the existing website logo, hero, category, and family images under `mobile/assets/web/`; Expo includes these assets in the app bundle.
- Kept Explore API-backed and retained text/location/rental/sort filtering; added property-type selection to the discovery API request and category shortcuts.
- Hid the native Explore tab bar to match the website's top-header navigation; account and administrator routes remain reachable from the menu, and other tabs remain available on those screens.
- Improved invalid/missing API-origin messages and rejected semicolon/comma host values such as the reported malformed address.
- Updated the mobile run guide with the Android emulator URL and the distinct physical-phone LAN-IP setup; updated `PUB-01`/`PUB-02` notes.

Verification:
- `npm run typecheck` from `mobile/` — passed.
- `npx expo export --platform web --output-dir .expo-export-check-home` from `mobile/` — passed; temporary export output was removed.
- An integrated browser preview was attempted but could not be completed: port 8081 was already occupied by an unrelated process, and the local 8082 preview request timed out. No existing process was stopped.
- The mobile build and URL validation have not been tested with a live API or Expo Go device. For Android emulator testing, start Express from the repository root with `npm run dev:api`, set `$env:EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000'` in the Expo terminal, then restart Expo. A physical phone needs the computer's LAN IP instead.

Remaining:
- This visual slice covers the public home/Explore page only. The agent workspace, account, listing-detail, and admin screens still need their own mobile-to-web visual review.
- Live listing loading requires a reachable API; check the API process, host address, Wi-Fi/firewall, and port before interpreting a device connection error.
- PUB-01/PUB-02 remain in progress. Agent directory/entry, signup, footer contact/social links, price filters, pagination, and broader parity are still open.

Next action:
Run the app on the user's Android emulator with the documented API URL and confirm that homes load; then compare the home screen in Expo Go against the website's mobile view and continue the next mobile screen without editing the web client.

---

## Checkpoint: Adding mobile sign-in and admin moderation
Updated: 2026-11-04
Repository: StayNest (workspace `C:\Users\USER\Desktop\new project`)
Branch/commit: `main` / `9433641`
Worktree before/after: Preserved all pre-existing worktree changes. Runtime app changes are under `mobile/`; planning updates are in the mobile docs and root mobile roadmap. No web client or Django runtime files were edited; two Express admin responses were extended additively for mobile content review and reliable overview metrics.

Goal:
Build the separate native app incrementally without modifying the existing web project, using audited API contracts and keeping parity status explicit.

User-confirmed product requirement:
- The mobile app and web are separate applications and must remain separate. Both must provide equivalent capabilities and outcomes for applicable roles, while native UI/navigation may differ. Do not treat the web as the app or the app as a replacement for the web.
- Mobile, web, and the admin console must use the same canonical data and permissions. Admin changes and user changes must be visible across clients after refresh; mobile admin workflows are in scope. This is shared-state consistency, not a realtime guarantee.

Architecture evidence and deployment requirement:
- The Django marketplace forwards API reads to Express through `API_UPSTREAM_URL`; Django admin accesses MySQL directly. Express and Django use the same `MYSQL_*` variable names, but deployment must be verified to point them at the same database and Django at the correct Express API.
- Mobile uses Express as its API boundary. Public discovery and details remain read-only; the new auth/admin flows use credentialed requests and the existing server session/CSRF contracts. Native cookie persistence is unverified.
- Mobile admin moderation writes through Express, not directly to MySQL. The Django console action writes to its configured database directly; status sharing depends on both services using the same actual database. The API and Django action currently differ in publish timestamp/notification side effects.

Completed:
- Replaced the scaffold placeholder with a native Explore screen that fetches published listings and supports text, location, rental-mode, and sort filters, pull-to-refresh, and loading/error/empty states.
- Added read-only listing details with photo selection, property facts, amenities, agent attribution, published reviews, and similar-listing navigation.
- Added `mobile/constants/marketplaceApi.ts` with runtime response validation and `EXPO_PUBLIC_API_URL` origin validation. API requests include credentials to preserve the server session; public browsing still works for guests.
- Added `AuthProvider` session restoration and account sign-in/out for email/password, remember-session, MFA challenge, regular administrator accounts, and the existing admin-gate login. Protected moderation obtains and sends the CSRF token.
- Added the role-gated Admin tab with listing status filters, refresh/error/empty states, and confirmed publish/reject/unpublish actions using the existing Express admin API.
- Audited `GET /api/admin/listings` and `POST /api/admin/listings/:id/moderation`, including access/CSRF rules, query/status constraints, persistence, audit, notification, and archived-listing behavior. Recorded the cross-client acceptance check and the Django side-effect difference in `mobile/docs/feature-parity.md`.
- Added `mobile/app/admin-posts.tsx` with post-status filters, content/metadata review, engagement, refresh/error states, and confirmed publish/return-to-draft actions. Legacy listing fallback rows with no post ID are explicitly non-actionable.
- Audited `GET /api/admin/posts` and `POST /api/admin/posts/:id/moderation`. Added post type, caption, and amenity tags to the authorized queue response so the app can review content; this is an additive Express API change, with no web UI or Django runtime edits.
- Recorded post moderation API/Django behavior and cross-client acceptance steps in `mobile/docs/feature-parity.md`. ADM-07 is now `In progress`.
- Added shared admin overview metrics to the Admin screen. The Express overview now returns `unavailableMetrics` alongside its existing zero placeholders, allowing the app to distinguish failed metric queries from true zero counts. The mixed-currency gross amount is intentionally not displayed.
- Updated ADM-02 and audited its API contract; attention-account actions and the Django page's 30-second auto-refresh remain incomplete.
- Added `mobile/app/admin-users.tsx` as a read-only, administrator-gated people view with status filters, bounded search, role/MFA/verification metadata, and refresh/error states.
- Audited `GET /api/admin/users` and `POST /api/admin/users/:id/status`. The mobile screen does not expose mutations because the Express endpoint lacks Django's last-active-administrator safeguard.
- Updated AUTH-01, AUTH-03, ADM-01, ADM-02, ADM-03, ADM-06, and ADM-07 to `In progress`; updated the mobile README and this handoff. No web frontend or Django runtime files were edited.
- Updated the feature matrix: PUB-01, PUB-02, and PUB-03 are `In progress`, not verified. Video playback, map, booking, save/like, compare/share/report, remaining home content, and other parity actions are still missing.
- Added X-04 to the parity matrix for shared data/admin consistency, and added the same acceptance requirement to the roadmap.
- Kept mobile runtime work inside `mobile/`; no web client or Django runtime files were changed. Express received additive post-review fields and overview metric-availability markers.
- Audited `GET /api/discover`, `GET /api/showcase/posts`, and `GET /api/posts`, including query behavior, response shape, listing/post data sources, caps, ordering, and fallback behavior.
- Confirmed the legacy Vite homepage calls `/api/showcase/posts` for its listing-based showcase; cards open listing details and client-side filtering excludes some names/titles. The inspected Django homepage has no equivalent showcase.
- Confirmed no current client calls `/api/discover` or `/api/posts`; `/posts.html` redirects to the explore section and the legacy Posts navigation is removed. Keep these APIs in the inventory until formally dispositioned.
- Confirmed agent post creation is a separate active Vite flow: `openAgentPostForm()` calls `GET /api/agent/posts/listings` and `POST /api/agent/posts`; the profile's Create post control opens this form. Its parity/audit work remains open.
- Audited 14 auth endpoints in `server/index.js`, the shared `registrationDetails` validator in `server/validation.js`, and the marketplace auth clients.
- Audited the three tenant profile endpoints, upload/storage rules in `server/storage.js`, the legacy Vite profile editor in `app.js`, and the Django tenant dashboard view/template.
- Audited the tenant dashboard summary, bookings, saved-listing reads, and booking cancellation endpoint against the Django dashboard, its client action, and legacy Vite booking controls.
- Audited search-alert list/create/delete handlers and searched the active Django and legacy Vite UI for corresponding controls.
- Audited listing save/unsave handlers and compared legacy Vite card/detail controls with the active Django listing/detail templates.
- Audited listing-like handlers and their listing-query usage; searched the web clients for listing-like controls separately from post likes.
- Audited listing discovery, detail, and general search handlers against Django and legacy Vite routes, filters, cards, and detail actions.
- Audited public agent directory/profile/follower/following handlers against the Django directory/profile and legacy Vite profile/list controls.
- Audited agent follow/unfollow mutations against the Vite profile controls and `agent_follows` persistence.
- Recorded request constraints, outcomes, account/role behavior, session rules, rate limits, CSRF behavior, upload behavior, side effects, and web-surface differences in `mobile/docs/feature-parity.md`.
- Recorded three auth integration findings: Google completion's web-client handler mismatch/double listener, its placement before CSRF middleware, and differing MFA behavior between legacy Vite and Django auth clients.
- Confirmed the legacy Vite tenant profile editor uses the profile endpoints, while the inspected Django dashboard has no profile edit/photo controls.
- Confirmed `/api/account/bookings` mutates past confirmed bookings to completed during GET; Django dashboard does not expose reschedule/review actions in its template.
- Confirmed the Vite UI can list/remove search alerts but no inspected client creates them; `POST /api/search-alerts` also lacks the tenant-role guard applied to list/delete.
- Confirmed Vite exposes save/unsave controls but inspected Django listing/detail templates do not; save mutations are authenticated but not tenant-role restricted while the saved-list read is tenant-only.
- Confirmed the legacy agent-profile gallery labels its engagement as post likes/views but calls listing like/view endpoints using listing ids; the active Django profile has no equivalent controls.
- Confirmed Vite follow controls update local count from the server response; duplicate follow requests are data-idempotent but still trigger another follow notification.
- Confirmed discovery caps at 40 and ignores `limit`/pagination; listing detail read may complete past tenant bookings; Django detail omits review/review-eligibility/similar results passed from the API.
- Confirmed legacy quick-search sends agent/tenant queries to `/api/search` but uses local `currentListings` for estate/location/price; Django uses `/api/listings/discover` for property browsing.
- Confirmed public agent profile responses include email/phone and pending-review listings for the owner; follower/following endpoints expose public relationship data without account-status/agent checks.
- Confirmed Django's agent directory/profile is narrower than Vite: it omits follower/following/review displays and follow controls.
- Confirmed the follow API accepts any authenticated role, while Django agent profiles have no follow/unfollow control.
- Confirmed `/api/discover` returns at most 40 personalized listings without pagination or a row-level rank score; `/api/showcase/posts` returns at most 12 published listings (not `posts` table records); `/api/posts` returns at most 60 actual posts plus eligible legacy listings, with a listing-only fallback if the posts table is missing. `/api/posts` rows report `liked`/`saved` as zero rather than session state.

Verification:
- `npm run typecheck` from `mobile/` — passed after the read-only people view was added.
- `npx expo export --platform web --output-dir .expo-export-check-admin-users` from `mobile/` — passed; temporary export output was removed and all three admin routes were included.
- `node --check server/index.js` — passed after the additive admin posts and overview response changes.
- No live API/device test was run because no `EXPO_PUBLIC_API_URL` is configured. Build/typecheck do not verify session persistence, CSRF on-device, admin IP rules, or cross-client consistency.
- The public feed handlers and corresponding Vite/Django surfaces were inspected directly; the repository was searched for feed API callers and agent post creation controls.
- Verified the shared-backend configuration pattern in `server/db.js`, `django_admin/staynest_admin/settings.py`, and `django_admin/marketplace/views.py`; confirmed admin actions use direct SQL against Django's configured database in `django_admin/console/views.py`.

Parity matrix:
- Handler contracts audited: 47 / 120 Express route declarations.
- Mobile parity verified: 0 / 120 endpoints fully verified; implemented slices remain in progress until tested against the shared backend and all required states/actions.
- PUB-01/PUB-02/PUB-03, AUTH-01/AUTH-03, and ADM-01/ADM-02/ADM-03/ADM-06/ADM-07 have partial native implementations in progress, but no feature is fully parity-verified yet.
- Remaining work includes the other 73 route contracts, live verification of native auth/admin flows, shared-database/API deployment verification, cross-client integration tests, all remaining web-control reconciliation, and other Django-only/admin workflows. See `mobile/docs/feature-parity.md`.

Decisions:
- At the user's direction, begin mobile implementation before Phase 0 inventory is complete; continue the inventory and do not claim readiness until it is complete.
- Keep mobile and web as separate applications. They must provide equivalent capabilities and outcomes, but may use native UI/navigation.
- Continue using the existing session cookie and CSRF API; do not claim native auth works until tested on iOS/Android with the deployed cookie configuration.

Blockers/risks:
- Resolve the Google completion CSRF middleware ordering with the backend auth work before relying on it in native OAuth.
- Reconcile the legacy Google setup submit handlers and cross-client MFA behavior.
- Reconcile the Vite-only tenant profile controls with the active Django surface before deciding whether they are obsolete or still required parity.
- Account-booking reads can change booking status; mobile refresh behavior must account for this existing API side effect.
- Confirm intended search-alert creation UX and authorization before implementing the create endpoint in mobile.
- Confirm intended role policy for listing saves and whether this capability is active on the Django marketplace.
- Reconcile the legacy gallery's post-like labels with listing-level like/view API semantics; do not replace these with a separate posts-like API.
- Preserve the listing-detail booking-completion side effect and surface API response fields that Django currently drops when designing parity.
- Confirm privacy/product policy for public agent emails/phones and public follower/following names and roles.
- Django's public agent profile omits Vite follow/review/social controls; do not mark those parity rows complete based on the directory/profile pages alone.
- Configure a non-production API origin reachable from the test device before live-verifying listing results; never place secrets in `EXPO_PUBLIC_*` variables.
- Verify that the Django console and Express point to the same database before claiming cross-client sync. The Django listing-status action currently lacks the API route's first-publish timestamp and notification side effects.
- Admin overview count failures still produce zero placeholders, now accompanied by `unavailableMetrics`; verify this signal against the deployed API before relying on dashboard counts.
- Express user-status moderation currently lacks Django's last-active-administrator safeguard. Do not expose mobile account suspension/deactivation controls until the server enforces equivalent protection.

Next action (one concrete first step):
Add a transactional last-active-administrator guard to `POST /api/admin/users/:id/status`, compare it with Django's action behavior, and only then add confirmed mobile status actions; run the API integration checks against a non-production database.

Next checkpoint:
Mobile admin people actions — preserve the final active administrator, record audit outcomes, and verify status changes across mobile and Django admin.

Secrets:
No secrets, passwords, production tokens, signing keys, or private documents recorded.

## Checkpoint: Phase 0 — Baseline checks
Updated: 2026-11-04
Repository: StayNest (workspace `C:\Users\USER\Desktop\new project`)
Branch/commit: `main` / `9433641`
Worktree before/after: Existing edits and untracked files were present; no source files were changed in this step. Current status includes the existing web/API changes, `MOBILE-APP-ROADMAP.md`, `mobile-scaffold-staging-20261103/`, `mobile/`, and `new assets/`.

Goal:
Run the existing baseline checks before continuing mobile implementation.

Completed:
- Confirmed `mobile/` contains an Expo Router scaffold and existing handoff/parity documents.
- Preserved all existing worktree changes.

Verification:
- `npm test` — passed, 21 tests.
- `npm run check:django` — passed, no issues.
- `npm run test:django` — passed, 51 tests.
- `Push-Location mobile; npm run typecheck; Pop-Location` — passed.

Parity matrix:
- No feature rows were implemented or newly verified. The matrix remains a first-pass inventory with endpoint/feature parity unverified; see `mobile/docs/feature-parity.md`.

Decisions:
- Continue with the existing isolated Expo scaffold; no framework or feature decisions were made.

Blockers/risks:
- Phase 0 inventory is incomplete. Endpoint contracts/permissions and all active/legacy web controls still need reconciliation before major feature work.

Next action (one concrete first step):
Continue the Phase 0 audit from the open work in `mobile/docs/feature-parity.md`, beginning with Express handler contracts and permissions in `server/index.js`.

Next checkpoint:
Phase 0 acceptance — complete the web-to-mobile parity inventory and record baseline failures, if any, before starting feature implementation.

Secrets:
No secrets, passwords, production tokens, signing keys, or private documents recorded.

## Checkpoint: Phase 0 — Initial source inventory
Updated: 2026-11-03
Repository: StayNest (workspace `C:\Users\USER\Desktop\new project`)
Branch/commit: `main` / `94336418f777fc7f65da2c9477a4114bdf4d38eb`
Worktree before/after: Existing unrelated edits were already present before mobile work. They include `.env.example`, `.vscode/settings.json`, `app.js`, `assets/cloudinary-images.js`, `django_admin/marketplace/static/marketplace/auth-wizard.js`, `index.html`, `listing-detail.html`, `listings-page.js`, `listings.html`, `server/index.js`, `server/session-store.js`, `styles.css`, and untracked `new assets/`. Mobile work added `MOBILE-APP-ROADMAP.md`, `mobile/docs/feature-parity.md`, and this handoff. Nothing has been staged or committed by the mobile work.

Goal:
Start the mobile project safely by mapping the real web/API product and preserving enough context for another AI to continue. The user requires the mobile app to do everything the web can do; any unmatched feature blocks release.

Completed:
- Read `PROJECT-INFO.txt` and documented current roles: guest, tenant, agent, sub-agent, administrator.
- Confirmed active Django marketplace routes in `django_admin/marketplace/urls.py`, Django admin routes in `django_admin/console/urls.py`, and page/workspace templates under `django_admin/templates/marketplace/` and `django_admin/templates/`.
- Identified public pages: home, property search/detail, agent directory/profile, login/signup, tenant workspace, and agent workspace.
- Identified Django administrator sections: overview, users, access, agents, listings, posts, badges, bookings, verifications, reports, audit, settings, analytics; extracted the 16 dispatcher actions from `django_admin/console/views.py`.
- Extracted 120 Express `app.<method>` route declarations from `server/index.js` and listed them in `mobile/docs/feature-parity.md`. This is a route inventory, not yet a handler-by-handler contract/security audit.
- Added granular first-pass web-screen and action-family rows, the Django admin action ledger, the API endpoint ledger, and explicit open Phase 0 audit tasks in `mobile/docs/feature-parity.md`.
- Confirmed `.gitignore` ignores `.env`, `node_modules/`, `dist/`, storage, and secrets; no mobile framework or app code has been scaffolded yet.

Verification:
- `git status --short --branch` confirmed branch `main`, HEAD `94336418f777fc7f65da2c9477a4114bdf4d38eb`, and unrelated existing edits listed above.
- Source extraction found exactly 120 `app.<method>` declarations and the parity ledger currently contains 120 corresponding endpoint rows.
- No baseline test/build command has been run yet in this phase.
- No framework dependencies have been installed and no credentials/secrets have been copied.

Parity matrix:
- `mobile/docs/feature-parity.md`: first-pass public, tenant, agent/sub-agent, administrator, cross-cutting, Django admin action, and 120-route inventory created.
- Mobile implementation parity: `0 / 120` endpoints verified; all feature rows remain `Not started`.
- Inventory remains incomplete: inspect actual route handler contracts/permissions, every active and legacy frontend control, PWA behavior, admin detail pages, and reconcile duplicate/unreachable surfaces. Do not claim Phase 0 complete.

Decisions:
- Keep the mobile app isolated under `mobile/`.
- Roadmap recommends Expo + React Native + TypeScript; this is not yet confirmed/scaffolded. Phase 1 must record the chosen router and API auth architecture before major feature work.
- Treat the currently deployed Django marketplace/admin and any distinct user capability in the retained Vite/vanilla-JS app as in scope until the source audit proves otherwise.

Blockers/risks:
- API inventory rows initially describe likely workflows and must be checked against each handler’s actual input, response, authorization, sub-agent permissions, side effects, and error states.
- The legacy web code and the Django marketplace may expose different capabilities. Reconcile rather than silently dropping either.
- Mobile authentication cannot assume browser session cookies/CSRF work in React Native. Inspect `server/index.js` and Django proxy behavior before choosing cookie-jar versus server token support.
- Admin impersonation and identity-document review are sensitive; reproduce only with server authorization and secure UX.

Next action (one concrete first step):
Run the existing baseline checks (`npm test`, `npm run check:django`, and, if the environment supports it, `npm run test:django`) without changing existing files. Record exact outcomes, then continue Phase 0 by auditing `server/index.js` route handlers and the JS/template controls listed under “Open Phase 0 inventory work” in `mobile/docs/feature-parity.md`.

Next checkpoint:
Phase 0 acceptance — every web screen/control and human-facing capability has a granular parity row; all endpoint permissions/contracts and active-vs-legacy surface decisions are reconciled; baseline checks and pre-existing failures are recorded. Only then proceed to Phase 1 app scaffolding.

Secrets:
No secrets, passwords, production tokens, signing keys, or private documents recorded.
