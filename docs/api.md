# Implemented API

All responses are JSON. Errors use `{ "success": false, "message": "..." }`. Cookie-authenticated state changes also require `X-CSRF-Token` matching the `csrf_token` cookie.

| Method | Path | Authentication | Roles | Purpose |
|---|---|---|---|---|
| GET | `/api/health` | No | All | API liveness |
| POST | `/api/auth/login` | No | All accounts | Validate credentials and set cookies |
| GET | `/api/auth/me` | Yes | Any active role | Current safe profile |
| POST | `/api/auth/logout` | Yes + CSRF | Any active role | Audit logout and clear cookies |
| GET | `/api/users?page=1&limit=25` | Yes | ADMIN | Paginated safe user list |
| POST | `/api/users` | Yes + CSRF | ADMIN | Create a staff account with an allowed role |
| GET | `/api/users/:id` | Yes | ADMIN | Safe user detail |
| PATCH | `/api/users/:id/status` | Yes + CSRF | ADMIN | Activate/deactivate account |
| GET | `/api/dashboard/summary` | Yes | Any active role | Role-scoped live counts |
| GET | `/api/districts` | Yes | Any active role | Registration district choices |
| GET | `/api/fees/current` | Yes | Any active role | Current mock-payment fee rule |
| PUT | `/api/fees/current` | Yes + CSRF | ADMIN | Append a new effective fee rule |
| GET | `/api/owners` | Yes | CLERK, REGISTRAR, ADMIN | Search/paginate legal owners |
| GET | `/api/owners/:id` | Yes | CLERK, REGISTRAR, ADMIN | Owner and parcel details |
| POST | `/api/owners` | Yes + CSRF | CLERK | Create person/company owner |
| GET | `/api/parcels` | Yes | Any active role | Role-scoped parcel list |
| GET | `/api/parcels/geojson` | Yes | Any active role | Role-scoped parcel map features |
| GET | `/api/parcels/:id` | Yes | Any active role | Parcel, owners, surveys, and geometry |
| POST | `/api/parcels/preview` | Yes + CSRF | CLERK | Validate, calculate area, and inspect overlap |
| POST | `/api/parcels` | Yes + CSRF | CLERK | Register pending parcel or preserve blocked candidate |
| GET | `/api/disputes` | Yes | CLERK, REGISTRAR | List overlap disputes |
| GET | `/api/disputes/:id` | Yes | CLERK, REGISTRAR | Candidate, parties, conflicts, and geometry |
| POST | `/api/disputes` | Yes + CSRF | CLERK | Open a manual parcel dispute |
| POST | `/api/disputes/:id/review` | Yes + CSRF | REGISTRAR | Move an open dispute under review |
| POST | `/api/disputes/:id/resolve` | Yes + CSRF | REGISTRAR | Resolve a dispute and optionally require boundary resurvey |
| POST | `/api/disputes/:id/evidence` | Yes + CSRF | CLERK, REGISTRAR | Upload private supporting evidence |
| GET | `/api/disputes/:id/evidence/:documentId` | Yes | CLERK, REGISTRAR | Download authorized evidence |
| GET | `/api/surveys` | Yes | SURVEYOR, CLERK, REGISTRAR | Filtered, paginated survey attempts |
| GET | `/api/surveys/:id` | Yes | SURVEYOR, CLERK, REGISTRAR | Survey, parcel, owners, report metadata, and boundaries |
| POST | `/api/surveys/:id/report` | Yes + CSRF | SURVEYOR | Private PDF/JPEG/PNG upload, maximum 10 MB |
| GET | `/api/surveys/:id/report` | Yes | SURVEYOR, CLERK, REGISTRAR | Authorized report retrieval |
| POST | `/api/surveys/:id/verify` | Yes + CSRF | SURVEYOR | Verify current or adjusted boundary |
| POST | `/api/surveys/:id/cannot-verify` | Yes + CSRF | SURVEYOR | Preserve reason and return parcel to clerk |
| PATCH | `/api/parcels/:id/correction` | Yes + CSRF | CLERK | Revalidate correction and create a new survey attempt |
| GET | `/api/registrations/pending-approval` | Yes | REGISTRAR | Verified parcels awaiting approval |
| POST | `/api/parcels/:id/approve` | Yes + CSRF | REGISTRAR | Atomic official registration and initial history |
| GET | `/api/parcels/:id/owners` | Yes | CLERK, REGISTRAR, ADMIN, current owner | Safe current official owners |
| GET | `/api/parcels/:id/history` | Yes | CLERK, REGISTRAR, ADMIN, current owner | Stable immutable ownership timeline |
| GET | `/api/parcels/:id/encumbrances` | Yes | OWNER, CLERK, REGISTRAR, ADMIN | Active and lifted legal restrictions |
| POST | `/api/parcels/:id/encumbrances` | Yes + CSRF | REGISTRAR | Add a mortgage or court hold |
| POST | `/api/encumbrances/:id/lift` | Yes + CSRF | REGISTRAR | Lift with reason and signed evidence |
| GET | `/api/encumbrances/:id/evidence` | Yes | Current owner or staff | Authorized evidence download |
| GET | `/api/my/parcels` | Yes | OWNER | Current parcels derived from linked owner identity |
| GET | `/api/my/parcels/:id` | Yes | OWNER | One currently owned official parcel |
| GET | `/api/transfers` | Yes | CLERK, REGISTRAR, ADMIN | Filtered staff transfer queue |
| GET | `/api/my/transfers` | Yes | OWNER | Transfers involving the linked owner |
| GET | `/api/transfers/buyers` | Yes | OWNER | Safe verified-owner buyer choices |
| POST | `/api/transfers` | Yes + CSRF | OWNER | Initiate a whole-parcel SALE |
| GET | `/api/transfers/:id` | Yes | Staff or participant | Transfer requirements and audit timeline |
| POST | `/api/transfers/:id/consent` | Yes + CSRF | Required OWNER | Confirm or decline seller consent |
| POST | `/api/transfers/:id/buyer-response` | Yes + CSRF | Intended buyer | Accept or reject purchase |
| POST | `/api/transfers/:id/documents` | Yes + CSRF | Participant OWNER, CLERK | Private PDF/JPEG/PNG upload |
| GET | `/api/transfers/:id/documents/:documentId` | Yes | Staff or participant | Authorized private document retrieval |
| POST | `/api/transfers/:id/clerk-review` | Yes + CSRF | CLERK | Approve completeness or return documents |
| POST | `/api/transfers/:id/payment` | Yes + CSRF | Intended buyer | Record an idempotent simulated mobile-money payment |
| POST | `/api/transfers/:id/cancel` | Yes + CSRF | Initiator or buyer | Cancel an open transfer with reason |
| POST | `/api/transfers/:id/reject` | Yes + CSRF | REGISTRAR | Reject an open transfer with reason |
| POST | `/api/transfers/:id/approve` | Yes + CSRF | REGISTRAR | Payment-gated atomic ownership replacement |
| POST | `/api/parcels/:id/certificates` | Yes + CSRF | REGISTRAR | Generate and issue a title certificate |
| GET | `/api/parcels/:id/certificates` | Yes | Current owner or staff | Certificate history for a parcel |
| GET | `/api/certificates` | Yes | OWNER, CLERK, REGISTRAR, ADMIN | Role-scoped certificate list |
| GET | `/api/certificates/:id` | Yes | Current owner or staff | Certificate metadata and immutable snapshot |
| GET | `/api/certificates/:id/download?lang=en\|so` | Yes | Current owner or staff | Protected bilingual PDF download |
| GET | `/api/public/verify/:token` | No | Public | Privacy-safe QR-token verification, rate limited |
| POST | `/api/public/verify` | No | Public | Manual parcel/certificate verification, rate limited |
| GET | `/api/permissions/owner` | Yes | OWNER | Role-boundary demonstration |
| GET | `/api/permissions/clerk` | Yes | CLERK | Role-boundary demonstration |
| GET | `/api/permissions/surveyor` | Yes | SURVEYOR | Role-boundary demonstration |
| GET | `/api/permissions/registrar` | Yes | REGISTRAR | Role-boundary demonstration |
| GET | `/api/permissions/admin` | Yes | ADMIN | Role-boundary demonstration |

## Request and response contracts

Every JSON success response uses `{ "success": true, "data": ... }`; list endpoints may additionally include `pagination: { page, limit, total, pages }`. File-download endpoints return the documented binary MIME type instead. Expected errors use `{ "success": false, "message": "...", "code"?: "...", "errors"?: [...] }` with 401, 403, 404, 409, 422, or 429 as appropriate. Unexpected failures return a generic 500 message. Authenticated state changes require both the session cookie and matching `csrf_token` cookie/`X-CSRF-Token` header.

GET endpoints have no request body. Their supported query parameters appear in the path table above or are pagination/search values (`page`, `limit`, `q`, `status`, `districtId`, `landUse`, `ownerQuery`, `type`, or `parcelNumber`) validated by the route schema. Their `data` value is the resource named in Purpose. The following table documents every state-changing request body and its success data:

| Method and path | Request | Successful `data` |
|---|---|---|
| `POST /api/auth/login` | `{ email, password }` | Safe user profile; also sets session and CSRF cookies |
| `POST /api/auth/logout` | Empty | `{ loggedOut: true }`; clears cookies |
| `PATCH /api/users/:id/status` | `{ isActive }` | Updated safe user |
| `PUT /api/fees/current` | `{ percentageRate, minimumFee }` | New effective fee setting |
| `POST /api/owners` | Person `{ ownerType, fullName, identityNumber, phone?, email?, loginPassword?, address? }` or company equivalent. `loginPassword` requires email and creates a linked OWNER login. | Created owner |
| `POST /api/users` | `{ fullName, email, phone?, role, password }`, where role is `CLERK`, `SURVEYOR`, `REGISTRAR`, or `ADMIN` | Safe created user; password hash is never returned |
| `POST /api/parcels/preview` | `{ districtId, areaName, landUse, geometry, owners[], confirmUnusualArea? }` | Validity, authoritative area, warning and conflicts |
| `POST /api/parcels` | Preview fields plus unique `idempotencyKey` | Created pending parcel; overlap returns structured 409 dispute evidence |
| `PATCH /api/parcels/:id/correction` | Parcel proposal without idempotency key | Corrected parcel and new survey attempt |
| `POST /api/parcels/:id/approve` | Empty | Registered parcel; repeated approval is idempotent |
| `POST /api/parcels/:id/certificates` | Empty | Issued or recovered certificate metadata |
| `POST /api/parcels/:id/encumbrances` | Mortgage `{ type: "MORTGAGE", bankName, mortgageAmount }` or court hold `{ type: "COURT_HOLD", courtCaseNumber }` | Active encumbrance |
| `POST /api/encumbrances/:id/lift` | Multipart `reason` and `evidence` | Lifted historical encumbrance |
| `POST /api/disputes` | `{ description, parcelIds[] }` | Open dispute |
| `POST /api/disputes/:id/review` | Empty | Under-review dispute |
| `POST /api/disputes/:id/resolve` | `{ resolution, boundaryChangeParcelIds: [] }` (zero or one parcel) | Resolved dispute and optional correction-survey task |
| `POST /api/disputes/:id/evidence` | Multipart `evidence` | Protected document metadata |
| `POST /api/surveys/:id/report` | Multipart `report` | Protected report metadata |
| `POST /api/surveys/:id/verify` | `{ notes, adjustedBoundary? }` | Verified survey and parcel state |
| `POST /api/surveys/:id/cannot-verify` | `{ reason }` | Returned survey and parcel state |
| `POST /api/transfers` | `{ parcelId, buyerOwnerId, transferType: "SALE", declaredPrice }` | Transfer awaiting seller consent |
| `POST /api/transfers/:id/consent` | `{ decision: "CONFIRMED" | "DECLINED" }` | Updated transfer |
| `POST /api/transfers/:id/buyer-response` | `{ decision: "ACCEPTED" | "REJECTED" }` | Updated transfer |
| `POST /api/transfers/:id/documents` | Multipart `document` | Protected document metadata |
| `POST /api/transfers/:id/clerk-review` | `{ decision: "APPROVED" | "RETURNED", notes }` | Updated transfer |
| `POST /api/transfers/:id/payment` | `{ paymentMethod, phone }` | Idempotent simulated payment receipt |
| `POST /api/transfers/:id/cancel` | `{ reason }` | Cancelled transfer |
| `POST /api/transfers/:id/reject` | `{ reason }` | Rejected transfer |
| `POST /api/transfers/:id/approve` | Empty | Approved transfer and certificate-recovery state |
| `POST /api/public/verify` | `{ parcelNumber, certificateNumber }` | Privacy-safe CURRENT, SUPERSEDED, or INVALID result |

## Examples

### Login

```http
POST /api/auth/login
Content-Type: application/json

{"email":"clerk@example.com","password":"your-DEMO_PASSWORD"}
```

```json
{
  "success": true,
  "user": {
    "id": 4,
    "fullName": "Cabdiraxmaan Cali",
    "email": "clerk@example.com",
    "role": "CLERK"
  }
}
```

Invalid credentials return 401 with the same generic message for an incorrect password and an unknown email. Invalid payloads return 422; repeated failures return 429.

### Change account status

```http
PATCH /api/users/5/status
Cookie: ltr_session=...; csrf_token=...
X-CSRF-Token: ...
Content-Type: application/json

{"isActive":false}
```

The action and previous/new status are saved in the append-only audit log. An administrator cannot deactivate their own current account through this endpoint.

### Registration conflict

An overlap greater than 1 m² returns `409` with code `PARCEL_OVERLAP`. The data includes the new dispute ID, proposed area, every conflicting parcel, its full geometry, its intersection geometry, and overlap area. Retrying the same `idempotencyKey` returns the original accepted parcel or blocked dispute without creating duplicates.

Payment collection is deliberately simulated. The buyer-facing endpoint creates a trusted server-side `PAID` record only after all preceding gates, returns a receipt, and queues a notification outbox row. No external mobile-money or SMS provider is contacted.
