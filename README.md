# Human resource management system

## Environment variables (background jobs)

This project supports background jobs for contract upload verification and expiring document notifications. Configure these variables in your `.env` (use `.env.example` as a starting point).

- CONTRACT_UPLOAD_PROCESS_LIMIT (default 20)
  - Max number of pending contract uploads processed per run. Limits bandwidth and Cloudinary calls.
- CONTRACT_UPLOAD_CHECK_SCHEDULE
  - Cron expression for contract upload checker (default: `*/5 * * * *` — every 5 minutes).
- CONTRACT_UPLOAD_CHECK_ENABLED
  - Set to `false` to disable the contract upload checker.
- CONTRACT_UPLOAD_STALE_MINUTES (default 30)
  - How old a pending upload must be to be considered stale and marked FAILED.

- DOCUMENTS_EXPIRY_REPORT_LIMIT (default 500)
  - Max number of documents included in the expiring documents report email.
- DOCUMENTS_EXPIRY_SCHEDULE
  - Cron expression for expiring documents checker (default: `0 8 * * *` — daily at 08:00).
- DOCUMENTS_EXPIRY_CHECK_ENABLED
  - Set to `false` to disable the expiring documents checker.
- DOCUMENTS_EXPIRY_WITHIN_DAYS (default 30)
  - Lookahead window (days) for expiring document notifications.

Also ensure mailer and alert settings are configured for notifications:
- FROM_EMAIL
- ALERT_EMAIL

Refer to `.env.example` for example values.
