# Monitoring Client Error Report

This endpoint accepts a small, authenticated browser error report. It does not expose Incident queries or diagnostics to browser clients or company AI callers.

## `POST /api/monitoring/client-error`

The server first validates the trusted server principal. `GLIFE_CONTEXT` and request-body identity fields are not accepted as identity. Reports are limited to 8 KiB and rate-limited per principal by the Monitoring Repository (default 20/minute; `EHS_MONITORING_CLIENT_REPORT_LIMIT_PER_MINUTE` accepts 1–100 and otherwise uses 20).

Request content type: `application/json`.

```json
{
  "kind": "BOUNDARY_ERROR",
  "route": "/overview",
  "digest": null
}
```

`kind` is one of `BOUNDARY_ERROR`, `UNHANDLED_ERROR`, `UNHANDLED_REJECTION`, or `DATA_REQUEST_FAILED`. `route` is a slash-prefixed path using letters, digits, `/`, `_`, or `-`, at most 180 characters. `digest` is `null` or at most 100 characters from letters, digits, `.`, `_`, `:`, and `-`. Additional fields are rejected. The client must not send a message, stack, principal, token, or arbitrary diagnostics.

Accepted reports return `202` with `{ "accepted": true, "eventId": "..." }`. Errors return `{ "error": { "code": "..." } }` with these statuses:

| Status | Codes |
| --- | --- |
| 400 | `INVALID_REQUEST_BODY`, `MALFORMED_JSON` |
| 401 | `AUTHENTICATION_REQUIRED` |
| 413 | `REQUEST_TOO_LARGE` |
| 415 | `JSON_CONTENT_TYPE_REQUIRED` |
| 422 | `INVALID_ERROR_REPORT` |
| 429 | `RATE_LIMITED` |
| 503 | `IDENTITY_PROVIDER_UNAVAILABLE`, `MONITORING_STORAGE_UNAVAILABLE` |

Production identity and durable Monitoring storage are integration boundaries; the Production route fails closed when either is unavailable. Diagnostic reads remain behind GLOBAL_ADMIN-authorized Server Actions. A future company AI read path requires an explicitly protected, audited machine principal and a dedicated read-only contract; no such endpoint is implemented by this route.

## Related Server Action diagnostics

Business query capture identifies the configured data source as `Mock Repository` or `Production Repository`. Incomplete results remain WARNING records with `SOURCE_DATA_INCOMPLETE`; unavailable results retain ERROR severity. Mock warnings explicitly identify simulated data and include availability counts, without changing business results. Query validation rejection is recorded as INFO with `INVALID_QUERY_INPUT`, while unexpected exceptions remain ERROR with `SERVER_ACTION_FAILED`.

The administrator detail view and diagnostic copy retain safe event context (environment, source, component, phenomenon, impact, action taken, next step and correlation ID), even when the per-field `diagnostics` array is empty. Raw exception messages and stacks are not added. Existing events retain their originally recorded metadata; this correction does not rewrite or clear monitoring history.
