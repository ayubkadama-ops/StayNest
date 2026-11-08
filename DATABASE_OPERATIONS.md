# Database backup, migration, and recovery runbook

This runbook applies to the MySQL-compatible production database used by
Makazi Go. The application migrations are checksum-tracked, but schema DDL is
not transactional on all supported engines. A failed migration can therefore
leave additive schema changes in place without an entry in
`schema_migrations`.

## Before a production migration

1. Confirm the application release and database host are the intended ones.
   Never paste credentials into a command, commit them, or send them to chat.
2. Take a TiDB Cloud managed backup/PITR recovery point using the provider
   console or the database provider's current documented procedure. Record
   the backup ID, completion time, database name, and recovery point.
3. Export a logical backup using a client/tool version supported by the
   deployed TiDB release. For MySQL-compatible environments where
   `mysqldump` is supported, use a preconfigured `mysql_config_editor`
   login-path (not a password in the command line):

   ```powershell
   mysqldump --login-path=makazigo-prod --single-transaction --routines --triggers --events --hex-blob --default-character-set=utf8mb4 --databases staynest --result-file="C:\secure-backups\staynest-before-stage.sql"
   Get-FileHash "C:\secure-backups\staynest-before-stage.sql" -Algorithm SHA256
   ```

   Restrict the backup directory to the operations team. Confirm the dump
   completed successfully and has a non-zero size. If the deployed TiDB
   version does not support these options, use the provider-supported export
   tool instead; do not assume MySQL client options are identical.
4. Restore the backup to an isolated staging database/service and verify the
   restored application can read it. Never test a restore against production.
5. Deploy the candidate release against that restored database. Review the
   startup migration log and run `database/verify-stage-migrations.sql`.
   Compare row counts, currency distributions, and representative listing
   records with the pre-migration snapshot.
6. Smoke-test sign-in, listing discovery, listing details, booking requests,
   agent listing submission, and admin access on staging before production.

## Recovery

- If application startup fails before writes resume, stop the candidate
  service and restore the previous application release.
- Do not edit a migration that has a recorded checksum. Add a new corrective
  migration instead.
- If an unrecorded migration partially changed the schema, inspect the DDL
  and migration log first. Prefer a reviewed forward-fix. Restore the
  pre-migration backup only when the operational owner has chosen the
  recovery point and accounted for writes made after it.
- Test restore and application recovery in isolation before any production
  restore. Record the recovery-point ID, operator, approvals, start/end time,
  and verification results.
- After rollout, retain the provider backup and encrypted logical backup
  according to the organization's retention policy; periodically rehearse a
  restore.

## Current validation status

Local unit tests validate migration ordering, checksum enforcement,
repeat-run behavior, and fail-closed handling of partial duplicate-column
changes. They do not prove DDL support or restoreability on the deployed
TiDB cluster. No live database credentials are used by local validation.
Stage 1 remains operationally pending until the staging run above has been
completed and recorded by an operator with access to the target database.

## 2026-11-08 deployment-gate check

- **Status: blocked; backup and staging restore were not performed.** The
  available workspace has no MySQL backup/client tools, TiDB Cloud or Render
  CLI, configured `makazigo-prod` login path, or authenticated TiDB Cloud
  console session. Production credential values were not inspected or
  copied.
- No production DDL, database restore, deployment, or Git push was attempted.
- Read-only production checks returned `/api/ready` HTTP 200 and
  `/api/listings/discover` HTTP 500. The fix is committed locally, but this
  does not establish that its migration works on TiDB.
- Do not deploy the migration until an authorized operator takes and records
  a provider recovery point, makes a protected logical backup, restores it to
  isolated staging, and completes the application migration and smoke tests
  above.
