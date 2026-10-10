# Corporate AI Integration Guide — Production API V1

## Purpose and status

This guide is the handoff boundary for the company AI that will connect the corporate database, SSO, machine identity and deployment platform. The repository does not contain company data, credentials, a database driver, a trusted SSO implementation or durable production storage. Do not infer those details.

Status labels:

- **IMPLEMENTED**: generic code and tests exist in this repository.
- **INTEGRATION REQUIRED**: adapter seam exists; the company environment must provide its implementation and configuration.
- **BLOCKED / TBD**: required business source semantics are not frozen; do not publish these records or claim production readiness.

The API paths are implemented but intentionally return `503 PRODUCTION_IMPORT_NOT_CONFIGURED` until company machine-auth and persistent import adapters are installed. OpenAPI: [`docs/api/production-api-v1.yaml`](../api/production-api-v1.yaml).

## A–C. Existing architecture and completed work

The data chain is:

```text
source records → Store Resolution → normalized domain readers → existing Domain Rules
→ ScoreContribution → existing Overview aggregation → page DTO
```

The API accepts source facts and import metadata only. Never upload score rates, rankings, contributions, final rule states or trends. Existing scoring and Domain Rules remain the only calculation path.

**IMPLEMENTED:** typed `EhsRepository` grouped by Domain; Standard / Performance Mock Repository; server-only data-source selector; Production Repository composition seam; raw batch validation with domain-bound OpenAPI 3.1 schemas; error diagnostics; Store link validation including Store Master complete-coverage equality; revisioned batch lifecycle service; machine principal audit; coverage declaration/proof distinction; status responses that omit staged source records; production fail-closed stubs; GLIFE display-profile adapter; server identity and machine identity interfaces; principal-bound one-time bootstrap gate; tests using test-only memory adapters.

**INTEGRATION REQUIRED:** actual database reads/writes, per-Domain Production Repository readers, atomic CAS and transaction implementation, independent source-proof verifier, SSO validation, M2M authentication/authorization, persistent Access grants/audit, and configured bootstrap storage. Handoff readiness is not production deployment readiness.

Access grants remain keyed by normalized, server-verified email by confirmed product decision. The verified stable `principalId` is recorded as admin actor in audit and is required for bootstrap. Company AI must make the company SSO return a verified email; it must not take the address from GLIFE display data or request payloads.

**CONFIRMED BUSINESS OUTPUT:** Take Charge uses `submissionsPerCapitaYtd >= 4`, `participationRateYtd >= 50`, and `closeRate >= 90`. The first two are source-provided aggregates for the authorized organization scope from January through the current Shanghai reference month; the Dashboard does not derive their denominator or average Store-level results. Company physical field names are mapped to these English logical fields by the Production Repository Adapter. The generic batch import rejects this Domain with `DIRECT_REPOSITORY_INTEGRATION_REQUIRED` because no company batch schema is needed for the selected direct-database path.

## D. Production database connection

Do not add a database dependency or connection until the company integration selects the database and provides the approved driver, network route, credentials and transaction guarantees. Keep SQL/vendor details inside the server-only storage adapter.

Implement `ProductionStorageAdapter` at `src/data/repositories/production-storage-adapter.ts`:

- `readPublishedStoreMaster()` returns the currently published Store Master snapshot with batch, schema, extraction, publication, effective-time, availability and diagnostic metadata.
- `readPublishedDomain<T>(domain, scope)` reads only published data for the requested Domain and authorized scope. It must not return an unpublished staging batch.
- `createOrGet(input, receivedAt, actor)` persists the trusted creator principal and submit audit and atomically enforces `(sourceSystem, domain, idempotencyKey)` uniqueness. Same key/same body returns the existing batch; same key/different body is a conflict.
- `getAuthorized(batchId, allowedDomains)` applies Domain authorization in its storage predicate and never returns an unauthorized batch to the service. `recordValidation(batchId, expectedRevision, ...)` persists lifecycle state, coverage assessment, diagnostics and audit. Validation must be an atomic CAS on revision and allowed state; it cannot overwrite `PUBLISHED`.
- `publishAtomically(batchId, expectedRevision, publishedAt, audit)` must atomically CAS the current `VALIDATED + VERIFIED_COMPLETE` revision, activate the declared records/scope, switch pointer, set terminal state and persist success audit. A repeat publish on that batch is idempotent. Any failure rolls back data and pointer, preserving previous publication.
- `recordPublishFailure(batchId, expectedRevision, audit)` appends a safe failure/conflict outcome without changing state or active data when the observed revision is still current. Failure-audit persistence itself may be unavailable during a database outage and must be surfaced operationally through protected server logs.

Do not implement these as read-then-unconditional-write. The company database Adapter must provide a unique constraint/transaction for idempotency, atomic revision/state predicates, isolation for pointer replacement, and transaction rollback across data, batch and audit. The test memory adapter reproduces semantic conflicts for deterministic tests; it does not prove database guarantees.

The test implementation in `src/data/server/testing/` is a contract test double only. Never import it from application runtime.

## E–F. Production Repository and field mapping

Implement one or more `ProductionRepositoryAdapter` values that provide the existing `EhsRepository` methods, then compose them using `composeProductionEhsRepository`. The composition rejects missing and duplicate methods. Do not fork `EhsRepository`, add a second page-facing query API, or copy Domain Rules into adapters.

The adapter maps company physical fields into the existing logical source contracts in `src/types/ehs.ts` and `src/data/contracts/`. It performs strict schema normalization and Store Resolution; existing domain services continue to decide business results. It must preserve source diagnostics and DataAvailability. Store identifiers must resolve through the current exact-TRTID / exact-unique-English-name policy; never use fuzzy matching.

### Domain Field Mapping Checklist

| Domain | Required source mapping | Identity / period requirement | Remaining gap |
|---|---|---|---|
| Store Master | `region`, `area`, `storeNameCn`, `storeNameEn`, `trtid`; owner/manager/representative names and emails | Unique TRTID; snapshot effective time | Canonical ID lifecycle, hierarchy dictionaries and owner identity semantics TBD |
| Training | Store reference, `month`, `trainingName`, source `completionRate`, `incompletePeople` | Store × item × month; full period coverage | Runtime duplicate guard provisionally uses Store × Month × `trainingName`; this is not a confirmed business natural key. Production record ID/natural-key policy remains TBD |
| Drill | Store reference, `month`, `drillName`, raw `status` | Store × drill × month; full period coverage | Record ID and duplicate semantics TBD |
| Inspection | `inspectionNumber`, Store reference, `inspectionName`, `dueDate`, inspector, raw status | Inspection number unique in Domain; due date is Shanghai business date | Authoritative Store × Month expected task set; stable task identity TBD |
| Action Closure Rate | Store reference, exact start/end and source value (`number|null`) | Store × exact half-open period | Upstream numerator/denominator, complete-empty declaration, source refresh metadata TBD |
| Events / ASTM | `eventId`, Store reference, `eventType`, submitted by, event time, description, raw status, `ASTMInjuryIllness` | Event ID unique in Events; Event Date defines period | Event subtype details and employee identity TBD; ASTM is not a separate feed |
| Actions | `actionId`, Store reference, problem/action, submitted by/owner, submitted/due/closed dates, raw status | Action ID unique in Actions; Submitted Date defines page period | Person identity and source refresh metadata TBD |
| Take Charge | `tchId`, Store reference, submitter/time, summary, raw status and approved extra-field definitions | TCH ID unique in Domain; Submitted At uses Shanghai timezone | Extra-field dictionary and upstream status values must be mapped without inventing meanings |
| Take Charge annual aggregates | `submissionsPerCapitaYtd`, `participationRateYtd` | Authorized organization scope; January through current Shanghai reference month | Direct DB adapter maps company fields; never average Store final values or derive an unapproved denominator |
| Certificates | TRTID/English name, exact Certificate Type, expiry text, Person, Person Email, Business Title | Effective-time history needed for historical score reconstruction | No certificate record ID or issue date; retain invalid expiry text for existing rule diagnostics |
| Environment | Existing typed permit, EIA, emergency, monitoring and 0..N waste-contract fields | One covered Store snapshot and effective time | Monitoring detail/physical additions TBD; no new compliance result allowed |
| Required sets | Store reference, month, either required training item identities or expected inspection task identities | Store × month × set kind, versioned effective range; Training and Inspection sets remain distinct | Authority and stable item/task identity are company decisions; never infer from observed results |

## G. Batch submission and publication

See OpenAPI for the JSON schema. Lifecycle is:

```text
RECEIVED → VALIDATED or REJECTED → PUBLISHED
```

1. Submit one Domain-bound batch with `schemaVersion: v1`, source/batch IDs, optional source/configuration versions, extraction time, optional business/effective time, coverage declaration and proof metadata, expected count, idempotency key and that Domain's record structure. Caller identity is not accepted in the payload.
2. Validation checks JSON shape, known fields, source field types, date-time formats, enum constraints, duplicate keys where the Domain contract defines identity, expected count, Store Resolution and coverage membership.
3. `COMPLETE` means `DECLARED_COMPLETE`, not verified. `PARTIAL` maps to `INCOMPLETE`; `UNKNOWN` remains `UNKNOWN`. Both are unpublishable. The request's `expectedRecordCount` equality only checks its own consistency. `VERIFIED_COMPLETE` requires a separately checked control total, export manifest, scoped digest or authoritative empty declaration; the verifier must be bound to the trusted source, not merely compare two values supplied in the same request. Without an installed verifier, keep the batch unpublishable. For a Pilot, use staged diagnostics and only enable publish with an explicitly configured trusted proof verifier and a labelled non-production dataset; formal Production enablement additionally requires approved source mapping, authorization, operational monitoring and rollback acceptance. A zero-record authoritative empty result needs independently verifiable proof.
4. Publish through one storage transaction that updates the scoped active records and current published-batch pointer. Failed publish leaves the previous version active.
5. Retry with the same idempotency key and identical body. Reusing it with a different body returns conflict. Submit, validation and publish audit carry trusted machine `principalId`, server timestamp, request ID, outcome and diagnostics; never store credentials or tokens. `sourceSystem` remains provenance metadata only.

Current transport limit is 10 MiB and 10,000 records / coverage stores per request. Split larger exports into contract-complete domain/period batches only when each slice has independently verifiable full coverage; do not split an atomic complete scope into partial publications.

## H. GLIFE_CONTEXT and profile display

The browser adapter expects `{ type: "GLIFE_CONTEXT", payload: {...} }` from the configured `NEXT_PUBLIC_GLIFE_PARENT_ORIGIN`. It sends `{ type: "GLIFE_READY" }` to that origin. It validates exact `event.origin`, requires `event.source === window.parent`, validates known payload types, normalizes only display name/email/user ID/employee ID/department/title, and discards `publicMediaToken`. It does not persist the entire context.

This message is untrusted client data. It is never accepted as a server identity, role, grant, or Store scope. Confirm the company's exact envelope and origin in integration; adapt the client display parser if needed without changing server authorization.

## I. Trusted Server Identity Provider

Implement `ServerIdentityProvider.getVerifiedPrincipal()` in `src/data/contracts/server-identity.ts`. It must verify the company SSO session through a trusted server boundary and return stable `principalId`, verified email if available, display name and allowlisted verified attributes. Do not take identity from Server Action JSON, GLIFE_CONTEXT, URL values, `publicMediaToken` or an untrusted proxy header.

The provider must distinguish unauthenticated requests from invalid/expired credentials according to the company integration and fail closed. Production currently throws `SERVER_IDENTITY_PROVIDER_NOT_CONFIGURED`; it does not use GLIFE_CONTEXT or Mock identity as a fallback.

**Confirmed access key:** Access Grants are email-keyed. The trusted provider must supply a server-verified email to map into the existing Access Domain. Stable `principalId` remains mandatory for bootstrap/audit; it does not replace the email grant key.

## J. Initial administrator

Configure `EHS_BOOTSTRAP_PRINCIPAL_ID` from a server-side protected deployment setting after the trusted provider returns the principal ID. `POST /api/v1/access/bootstrap` checks the verified server principal against this exact ID and calls the persistence port once. The storage transaction must ensure no prior bootstrap exists and atomically create the first `GLOBAL_ADMIN` grant plus append-only audit/bootstrap record. Later calls return conflict. Email is not the bootstrap selector and the client cannot choose the principal.

No bootstrap store is enabled by default. Do not enable the endpoint until the company SSO provider and durable atomic storage are installed and reviewed.

## K. Machine identity

Implement `MachineIdentityProvider.authenticate(request)` using a company-managed OAuth client credential, API gateway identity or approved mechanism. The returned principal includes stable machine principal ID, strict Domain allowlist, and operation allowlist (`SUBMIT`, `READ`, `VALIDATE`, `PUBLISH`). Domain authorization is applied in the batch storage predicate before records reach the service. It must not grant Dashboard user roles or admin permissions. Add rotation, revocation, audience and issuer validation, audit logging and deployment secret management in the company adapter. Do not implement an unmanaged long-lived shared key.

## L–M. Deployment and configuration

Run the existing package scripts: `pnpm test`, `pnpm typecheck`, `pnpm build`. Configure secrets only in the platform's server-side secret store. Current code reads:

- `EHS_DATA_SOURCE=mock|production` — mandatory in Production; unknown or absent production value fails closed.
- `EHS_MOCK_PROFILE=standard|performance` — development/test Mock data only.
- `EHS_IDENTITY_MODE=mock|enterprise` — `mock` forbidden in Production; Production defaults to enterprise and requires the adapter.
- `NEXT_PUBLIC_GLIFE_PARENT_ORIGIN` — exact browser display-message parent origin; not a credential.
- `EHS_BOOTSTRAP_PRINCIPAL_ID` — one-time bootstrap principal selector; not a secret and never a client input.

Database connection, SSO credentials, machine credentials, Access persistence and batch storage configuration are company-specific and are not defined in this repository. Do not add their actual values to source control or this guide.

Selecting `EHS_DATA_SOURCE=production` also requires enterprise identity even in a non-production process; Mock identity cannot be combined with Production data for Pilot/UAT. The repository pins Node 22 and pnpm 11.19 for CI/deployment parity. Run `pnpm openapi:validate`, `pnpm performance:v1` and `pnpm audit --prod` with the normal test, typecheck and build gates. The performance suite is a structural/regression baseline until the company approves explicit latency and payload budgets. Application responses set `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and production HSTS. CSP `frame-ancestors` remains a deployment decision because the approved GLIFE parent origin is not yet confirmed.

## N–O. Authorization and end-to-end verification

Verify with the trusted identity and production Access adapter:

- unauthenticated identity is denied before repository reads;
- authorized Store scopes return only authorized rows, counts, summaries and filter options;
- editing a requested Store ID cannot expand scope;
- each Server Action calls `authorizeBusinessScope` before Repository access;
- Manual Grant create/update/delete and Audit are atomic;
- Access audit persists the trusted actor principal ID as well as the currently verified email key;
- last effective administrator cannot be removed under concurrent writes;
- revoked grants stop access after the defined cache/version invalidation boundary;
- machine identity is limited to explicitly granted Domains;
- import staging is invisible to business Repository reads until atomic publish;
- failed publish preserves the prior active batch;
- one Store/Domain source flows through current Domain Result and ScoreContribution producer into existing Overview aggregation.

Do not use Mock happy-path tests as proof of enterprise authentication or database readiness.

## P. Import diagnostics

`ImportDiagnostic` carries `domain`, `batchId`, `recordIndex`, optional `recordId`, `field`, stable `code`, `message` and `severity`. Current structural validation includes unknown fields, version, timestamps, dates, numeric bounds, enums, duplicate known record keys, record count, Store conflicts/unresolved stores, coverage mismatch and partial coverage. Certificate invalid expiry text is a warning and remains available for the existing rule. Take Charge annual aggregate uses direct Production Repository integration; generic import returns `DIRECT_REPOSITORY_INTEGRATION_REQUIRED`.

Company adapters must add source-specific diagnostics without dropping malformed rows silently. Route-level unexpected infrastructure errors return a generic safe response; detailed internal exception data must remain in protected server logs, correlated by batch/request ID, not in the client error body.

## Q. Safe source cutover

1. Keep `EHS_DATA_SOURCE=mock` in development and tests.
2. Deploy the Production adapters in a non-production company environment with import routes disabled or inaccessible until machine auth is verified.
3. Load Store Master and verify uniqueness, hierarchy, contacts, authorization projection and orphan handling.
4. Pilot one or more non-Overview Domains. Label them as pilot data in the deploying environment; do not mix a missing production Domain with Mock rows.
5. Compare raw counts, declared coverage, source control totals and normalized records before publish. Preserve the previous batch for rollback.
6. Enable each Production Repository Domain only after the source mapping, permissions, diagnostic dashboard/operations process and integration tests pass.
7. Do not switch Overview to Production until all score-required sources, required-set configuration, source aggregates and history are ready. The existing 12-point invariant means missing source inputs still produce their existing zero-point diagnostics; this must not be presented as a complete production score.
8. Set `EHS_DATA_SOURCE=production` explicitly. Verify the process fails closed when a reader, identity provider, machine verifier or persistence adapter is removed. Never allow automatic Mock fallback.

Current Production queries take `referenceDate` from the trusted application-server clock and interpret business day/month in `Asia/Shanghai`; client input cannot override it. Snapshot V1 and history compaction are not implemented. The batch contract supports source/configuration versions, fixed `schemaVersion: v1`, extraction/publication time, business/effective periods and declared/verified coverage, but it does **not** freeze historical Snapshot reference dates or replay semantics. Do not claim replay from the API alone or build snapshot jobs in this phase.

## R. System Monitoring & Alerting V1

**IMPLEMENTED:** independent Monitoring contracts and `MonitoringRepository` port; redaction, stable impact-scoped fingerprinting, Event-to-Incident aggregation, revision-based admin acknowledgement/resolution/reopening, verified-recovery boundary, centralized notification policy, transactional Outbox port, finite retry/backoff, provider-acceptance versus delivery semantics, test-only recording provider, test/development memory repository, authenticated browser error route, request-size validation, per-principal rate-limit port, central EHS/Access Server Action capture, Production Import API diagnostics, DataAvailability capture, job execution contract and config-driven watchdog evaluation, `/monitoring` admin page and audit actions.

**INTEGRATION REQUIRED:** implement a durable `MonitoringRepository` for the selected enterprise database. `recordEvent` must commit Event + Incident aggregation + optional Outbox entry atomically. Fingerprint and notification idempotency need unique constraints; incident revisions and state transitions need atomic compare-and-swap; `reopenIncident` must atomically reject stale revisions or an already-active matching fingerprint, clear resolution/acknowledgement fields, restore the active fingerprint mapping and append the trusted REOPEN audit; Outbox claims require cross-worker atomic leases and stale-lease recovery; provider results, retries and trusted audit writes must be conditional/transactional; client rate limiting must be shared across app workers. Production currently fails closed when Monitoring storage is absent and only emits redacted structured server diagnostics as best effort. That fallback does not guarantee persistence or notification during storage outages.

**INTEGRATION REQUIRED:** provide the enterprise Email transport and configure `EHS_MONITORING_ALERT_RECIPIENTS`; notification submission is not inbox delivery unless the transport returns positive delivery confirmation. Configure an external scheduler to invoke `runConfiguredJobWatchdog` and `runConfiguredNotificationWorker`, provide explicit `EHS_MONITORING_JOBS` entries only after each schedule and threshold is approved, and connect job lifecycle updates / heartbeats to monitored tasks. An empty configuration intentionally generates no missing-job alarms. Provide an independent monitoring-storage failure channel, access-controlled retention and backup policy, and end-to-end incident drills in the company environment.

**COMPANY-OWNED INTEGRATION CHOICES:** company database schema/isolation guarantees, SSO implementation, initial GLOBAL_ADMIN, email service and recipients, scheduler platform, approved job names/frequencies/thresholds, log retention, independent failure channel and operational response owner. The company AI may select and implement these from the available company platform, but it must preserve the ports, authorization boundaries and fail-closed behavior documented here. Test adapters demonstrate contract behavior only and are never Production adapters.

The implemented `POST /api/monitoring/client-error` is an authenticated browser telemetry endpoint, not a diagnostic read API. Its request and error contract is documented in [`../api/monitoring-client-error.md`](../api/monitoring-client-error.md). Company AI must not query the Monitoring database directly or use browser telemetry to retrieve incidents. A machine-readable diagnostic read path remains **BLOCKED / TBD** until the company establishes a stable machine principal, explicit least-privilege authorization, audited access, response redaction and retention rules; it must be a protected read-only server API. The current notification provider deliberately throws `EMAIL_NOTIFICATION_PROVIDER_NOT_CONFIGURED` until a company transport is injected. `EHS_MONITORING_CLIENT_REPORT_LIMIT_PER_MINUTE` controls the per-principal report limit (default 20, valid 1–100); `EHS_MONITORING_MODE=disabled` explicitly disables local Monitoring storage. Identity still depends on the production server Identity Provider.

### Monitoring failure injection checklist

1. Remove the Production Monitoring adapter and verify an explicit unavailable state plus redacted fallback diagnostic; confirm no memory fallback and no success response.
2. Race identical Event writes, admin revisions and Outbox claims across workers; verify no lost occurrences, duplicate opening notifications or double claims.
3. Fail storage at each step of Event/Incident/Outbox, state transition and provider-result writes; verify transaction rollback or an explicit degraded signal while preserving prior business data.
4. Make the provider time out after accepting a message and retry with the same idempotency key; verify provider idempotency and do not claim delivery without a receipt.
5. Verify unauthenticated/non-admin requests cannot query or mutate monitoring data; forge client identity fields and exceed the distributed reporting limit.
6. Stop a configured task and its heartbeat, then separately remove schedule configuration; the first must be detected by the independently scheduled Watchdog, the second must not invent an alert.
7. Trigger a positive recovery signal and verify Incident resolution + recovery Outbox transaction. Silence alone must leave the Incident unresolved.
