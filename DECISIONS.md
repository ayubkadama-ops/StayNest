# Implementation Decisions

- Map coordinates remain nullable; text location fields remain required. Map view and listing detail maps show only when valid coordinates exist.
- Account lockout counts are stored per account and login attempts are stored by account and IP. IP lockout is derived from the latest 24-hour failure window.
- Password recovery is manual and out-of-band. Recovery requests do not expose account existence. Temporary passwords are bcrypt-hashed, expire in 24 hours, invalidate sessions, and force a password change.
- Property owners are a first-class role alongside existing tenant and agent roles. Listing ownership uses `owner_user_id`; assigned agents use `managing_agent_id`.
- Listing agent invitations require agent acceptance. Revoking an agent clears assignment and accepted invitations are marked revoked.
- Booking decisions use owner and assigned-agent authority; the first status update wins because pending decisions are updated atomically.
- Ownership proof and identity verification remain independent checks. A listing must have approved proof and verified owner/advertising identities before publication.
- Identity documents and selfies are stored in private storage. ID numbers are encrypted at rest and public APIs expose only masked suffixes.
- Manual identity review is the default; a provider interface exists for a future external NIDA API integration.
- Venues are slot-based, booking-only listings. The server validates capacity, opening hours, minimum duration, blocked dates, setup/cleanup buffers, and overlapping confirmed bookings.
- Venue add-ons and final estimates are calculated server-side. Existing nightly stay and viewing flows remain unchanged.
