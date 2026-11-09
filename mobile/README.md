# Makazi Go mobile app

This folder contains the isolated Expo + React Native + TypeScript app. The web app and API remain at the repository root.

## Current stage

The native Explore screen loads published listings from the shared API and supports text/location/property-type/rental-mode/sort filters, saved properties, and saved-search management. Listing details include media, amenities, agent attribution, reviews, and booking/viewing requests. Tenant account screens support profile/photo editing, bookings, reviews, saved homes, search alerts, notification preferences, password changes, and reviewed account-deletion requests. Secure messaging includes an inbox, conversation history, block/report controls, and a separate system-notification center. Account also supports server-session sign-in, MFA challenge, password recovery, sign-out, administrator access, and tenant/agent registration. Agent applications remain pending approval; the mobile client does not grant agent access. The Agent workspace supports summary, permitted inventory/bookings, and booking decisions. The Admin workspace currently covers metrics, read-only people, listing moderation, and post moderation. Google sign-in, complete agent listing/profile and sub-agent workflows, the remaining admin sections, push notifications, and substantial web parity remain open. Photo-library access is requested only when the tenant chooses a profile image; camera and microphone permissions are disabled. The app uses a light theme and shares the canonical API/database with web and admin. See [`docs/feature-parity.md`](./docs/feature-parity.md) and [`AI-HANDOFF.md`](./AI-HANDOFF.md).

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

## Preview and production builds

`app.config.js` selects isolated development, preview, and production app variants. Development may use an HTTP LAN/emulator API and a development-only native identifier. Preview and production builds require an HTTPS `EXPO_PUBLIC_API_URL`; production also requires the iOS bundle identifier and Android application ID registered to the app owner. The production config intentionally has no guessed identifier or API-host fallback.

Configure these EAS environment variables for the matching `preview` and `production` environments:

- `EXPO_PUBLIC_API_URL` — the public API origin for that environment (HTTPS required).
- `IOS_BUNDLE_IDENTIFIER` — the identifier registered with the owning Apple Developer account; required for production.
- `ANDROID_PACKAGE` — the identifier registered with the owning Play Console account; required for production.

The EAS profiles are in `eas.json`. Before building, link the project to the account that owns the store records, create/configure the EAS environments above, and provide signing credentials through EAS. For example, after EAS CLI is available and the project is linked:

```powershell
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform all
```

Do not use the development fallback identifiers for store submission. Store ownership, production API URL, support/privacy/terms URLs, and signing credentials must be confirmed by the project owner; none are embedded in this repository.

Run the TypeScript check with:

```powershell
npm run typecheck
```

Do not add production credentials or private environment files here. The app uses the existing HTTP-only `staynest.sid` session cookie with credentialed API requests and fetches CSRF tokens before mutations. Verify native cookie persistence and admin IP restrictions on iOS/Android before claiming authenticated parity.
