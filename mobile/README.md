# Makazi Go mobile app

This folder contains the isolated Expo + React Native + TypeScript app. The web app and API remain at the repository root.

## Current stage

The native Explore screen mirrors the website's mobile home composition and loads published listings from the API. It supports text/location/property-type/rental-mode/sort filters and opens read-only listing details with photos, amenities, agent attribution, reviews, and similar listings. Account includes server-session sign-in, MFA challenge, password-recovery requests, sign-out, administrator access, and a three-step tenant/agent registration wizard using the shared API. Agent applications remain pending approval; the mobile client does not grant agent access. The role-gated Agent workspace shows shared summary counts, permitted inventory/bookings, and protected booking approve/decline actions. The Admin workspace shows shared marketplace metrics, a read-only people view, listing moderation, and post moderation through authorized APIs. Google sign-in, agent listing creation, full account/security workflows, other admin sections, and remaining web parity are still pending. The app uses a consistent light theme and higher-contrast text against its light surfaces. Mobile and web use separate interfaces but must share the same deployed API and canonical database as the admin console; changes should appear across clients after refresh. See [`docs/feature-parity.md`](./docs/feature-parity.md) and [`AI-HANDOFF.md`](./AI-HANDOFF.md).

## Local development

```powershell
npm install
npm run start
```

Use the Expo Go app or an Android emulator to open the development build. An iOS simulator/build requires macOS; cloud iOS builds can be configured later through EAS after the app identifiers and developer-account ownership are confirmed.

Start the API in a separate terminal from the repository root:

```powershell
npm run dev:api
```

Set `EXPO_PUBLIC_API_URL` before starting or restarting Expo. For an Android emulator, use the exact origin below (note the colon before `3000`):

```powershell
$env:EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000'
npm run start
```

For a physical phone, replace `10.0.2.2` with the development computer's LAN IP (for example, `http://192.168.1.25:3000`), keep both devices on the same Wi-Fi, and allow the API port through the computer's firewall. `10.0.2.2` is only for the Android emulator. Use HTTPS for deployed environments. This public URL is configuration, not a credential; do not put secrets in `EXPO_PUBLIC_*` variables.

For a shared production environment, configure Express and Django with the same `MYSQL_*` database values, configure Django's `API_UPSTREAM_URL` to that Express service, and point mobile's `EXPO_PUBLIC_API_URL` at that same API. A separate database per client would prevent updates from syncing.

Run the TypeScript check with:

```powershell
npm run typecheck
```

Do not add production credentials or private environment files here. The app uses the existing HTTP-only `staynest.sid` session cookie with credentialed API requests and fetches CSRF tokens before mutations. Verify native cookie persistence and admin IP restrictions on iOS/Android before claiming authenticated parity.
