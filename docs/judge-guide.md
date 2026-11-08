# Judge guide

## Architecture and data flow

React renders role-aware pages and calls the same-origin Express API. Express validates input, authenticates cookies, authorizes roles, and delegates business rules to services. Prisma manages relational records and transactions in PostgreSQL. PostGIS owns polygon validity, area, and overlap calculations. Cloudflare R2 stores private documents and issued PDFs; database rows store metadata and immutable certificate snapshots.

Authentication answers who the user is; authorization answers whether that verified role may perform an action. The browser is never the security boundary.

## Eighteen important functions

| File and function | Purpose, inputs, logic, output, errors |
|---|---|
| `server/src/app.js — createApp()` | Builds middleware/routes in security order and returns a testable Express app; configuration failures reach the error handler. |
| `server/src/services/auth.service.js — authenticateCredentials(email, password)` | Normalizes credentials, checks bcrypt/active account, audits, signs a JWT, and returns a safe profile; invalid login is a generic 401. |
| `server/src/middleware/authenticate.js — authenticate(req,res,next)` | Verifies the HttpOnly-cookie JWT and reloads the active user; attaches trusted `request.user` or returns 401. |
| `server/src/services/geometry.service.js — validatePolygon(geometry)` | Sends bound GeoJSON to PostGIS, checks polygon/SRID/validity/corners, and returns validation facts; malformed geometry is rejected. |
| `server/src/services/geometry.service.js — findParcelOverlaps(geometry, excludeId)` | Uses spatial indexes/intersection area to return active overlaps above 1 m²; database failures propagate safely. |
| `server/src/services/parcel.service.js — registerParcel(input, actor)` | Validates ownership, locks numbering/registry state, rechecks overlap, then creates the parcel/survey or conflict evidence atomically. |
| `server/src/services/survey.service.js — verifySurvey(id, input, actor)` | Persists verified geometry/report facts after surveyor checks; invalid state/role/evidence is rejected. |
| `server/src/services/ownership.service.js — validateOwnershipShares(owners)` | Adds exact decimal shares and requires unique positive allocations totaling 100.00; returns true or throws 422. |
| `server/src/services/transfer.service.js — initiateTransfer(input, actor)` | Derives the seller from auth, checks title/restrictions/open sales, snapshots sellers, and creates consents/audit; conflicts return 409/403. |
| `server/src/services/transfer.service.js — approveTransfer(id, actor)` | Locks/revalidates every gate, replaces current title, appends history, supersedes certificates, audits, then attempts recoverable reissue; returns transfer and pending flag. |
| `server/src/services/certificate.service.js — issueTitleCertificate(parcelId, registrar)` | Creates/reuses an ownership-matched pending snapshot under lock, generates bilingual PDFs/QR, stores R2 bytes, and atomically promotes one CURRENT certificate. |
| `server/src/services/certificate-pdf.service.js — generateCertificatePdf(input)` | Renders bilingual registry facts, vector parcel boundary, QR, and notice with PDFKit; returns a validated PDF buffer or throws. |
| `server/src/services/certificate.service.js — verifyByToken(token)` | Looks up the opaque token and returns privacy-filtered CURRENT/SUPERSEDED data or a generic INVALID result without authentication. |
| `server/src/repositories/parcel.repository.js — findParcels(query, actor)` | Builds role-scoped search across parcel number, owner identity/name, status, district, and land use; returns paginated safe records. |
| `server/src/repositories/dashboard.repository.js — getDashboardSummary(actor)` | Aggregates role-scoped totals plus status/district datasets directly in the database and returns chart-ready data. |
| `server/src/services/payment.service.js — payTransferFee(id, input, actor)` | Authorizes the buyer, locks the transfer, calculates the configured exact-decimal fee, creates one simulated paid receipt, advances status, audits, and queues an SMS outbox row. |
| `server/src/services/encumbrance.service.js — liftEncumbrance(id, input, evidence, actor)` | Requires registrar authority, reason, signed evidence and active state; stores private evidence, retains history, audits, and rolls storage back if the database action fails. |
| `server/src/services/dispute.service.js — resolveDispute(id, input, actor)` | Resolves a reviewed case under lock; when legal geometry may change it creates a protected correction survey instead of editing the parcel boundary. |

## Likely technical questions

1. **Why PostGIS?** It validates/indexes real polygons and computes authoritative geodesic area/intersection in the database.
2. **How are overlaps detected?** A GiST-assisted `ST_Intersects` query calculates intersection geography area; more than 1 m² blocks registration.
3. **Can adjacent parcels share a boundary?** Yes. Boundary contact has zero intersection area and is not a prohibited overlap.
4. **Why immutable history?** Legal title needs an auditable sequence; database triggers reject updates/deletes and corrections append events.
5. **What prevents double sales?** One-open-transfer partial unique index plus advisory/row locks and an ownership snapshot recheck.
6. **How are joint owners handled?** Each exact `ParcelOwner` share must total 100, and all snapshotted sellers must consent.
7. **Who approves a transfer?** The registrar only after seller consents, buyer acceptance, clerk document review, trusted payment, and restriction checks.
8. **How do mock payments work?** The intended buyer submits an explicit simulation after clerk review. The server calculates the fee, creates one `PAID` receipt idempotently, advances the transfer, audits, and queues a simulated notification. No real provider is contacted.
9. **What are encumbrances?** Active mortgage/court restrictions associated with a parcel; they block transfer initiation/approval.
10. **How are disputes resolved?** A registrar reviews evidence and records a resolution. If a boundary must change, the system creates a correction survey; only later surveyor verification plus registrar approval can append the legal correction.
11. **Why survey verification?** A surveyor supplies field evidence and a verified boundary before a registrar creates legal title.
12. **How is a certificate generated?** Eligibility/snapshot/number/token are recorded pending, PDFs are rendered, R2 stores the artifact, then one row becomes CURRENT.
13. **What is in the QR code?** Only an opaque public verification URL containing a random 32-byte token—not personal data.
14. **How is an old certificate detected?** Transfer/reissue marks the previous CURRENT row SUPERSEDED; public verification shows that status and current owners.
15. **What if PDF or R2 generation fails?** The pending row remains retryable; a completed legal transfer is never rolled back by presentation-layer failure.
16. **What prevents duplicate current certificates?** Parcel advisory locking plus partial unique indexes for one CURRENT and one pending row.
17. **Why rate-limit public verification?** Token/manual endpoints are public, so one shared 10-per-minute/IP limiter reduces enumeration and abuse.
18. **How is privacy protected?** Public responses use an explicit safe projection and omit identity numbers, contacts, files, raw tokens, and storage paths.
19. **Why store a certificate snapshot?** It freezes the facts printed at issuance so later profile or title changes cannot rewrite old documents.
20. **How does search avoid data leakage?** Server-side role scope is applied before filters; owners cannot broaden a query beyond their own parcels.
21. **Where do charts get data?** Database group/count queries return status and district datasets; the client only draws them.
22. **How do transactions protect integrity?** Legal rows, history, statuses, and audit entries commit together, while locks serialize competing decisions.
23. **How is SQL injection avoided in spatial SQL?** Prisma tagged templates bind GeoJSON and IDs as parameters rather than concatenating user text.
24. **Why separate User and Owner?** A legal owner may have no login, and account deactivation must not delete or alter title.
25. **Can resolving a dispute directly edit a legal boundary?** No. It creates a correction survey; the database blocks the geometry update until field verification, overlap recheck, registrar approval, and a transaction-local authorization flag.
26. **Why retain lifted encumbrances?** A lift changes active legal effect but must not erase the historical restriction, evidence, actor, or reason.
27. **Which parts are simulations?** Mobile-money settlement and SMS delivery. The application labels them as mock adapters while preserving realistic authorization, receipts, audit, and idempotency behavior.
