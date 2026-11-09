# Code module reference

The application uses thin HTTP routes, request controllers, business services, repositories, and explicit validation schemas. Unless stated otherwise, asynchronous functions return the described value or throw an error carrying an HTTP `status`. Controllers convert successful values to the standard JSON envelope, while the global error handler converts expected errors to safe client messages.

## Server entry and security modules

| Module and public function | Inputs | Output | Errors and side effects |
|---|---|---|---|
| `app.js — createApp()` | None | Configured Express application | Mounts security middleware and all API routers; configuration errors propagate at startup. |
| `authenticate.js — authenticate(req,res,next)` | Session cookie | Calls `next` with `req.user` | Returns 401 for missing, invalid, expired, or inactive sessions. |
| `authorize.js — authorize(...roles)` | Allowed role names | Express middleware | Returns 403 when the authenticated role is not explicitly allowed. |
| `csrf.js — requireCsrf(req,res,next)` | CSRF cookie and `X-CSRF-Token` | Calls `next` | Returns 403 when tokens are missing or unequal. |
| `validate.js — validate(schema, source)` | Zod schema and body/query/params source | Adds `req.validated` | Returns 422 with field information for invalid input. |
| `errorHandler.js` | Express error | Safe JSON error response | Hides database stacks and internal details from clients. |

## Registry services

| Module | Main functions | Inputs and outputs | Expected errors |
|---|---|---|---|
| `auth.service.js` | `authenticateCredentials`, `verifyAuthToken` | Credentials/token → safe user and signed/verified session data | 401 invalid credentials/token; 403 inactive account. |
| `owner.service.js` | `listOwners`, `getOwner`, `createOwner` | Filters, owner ID, validated owner data and optional login password → safe owner records and linked OWNER login | 404 missing owner; 409 duplicate identity/registration/email. |
| `user.service.js` | `getUsers`, `getUser`, `createStaffUser`, `changeUserStatus` | Admin-validated account fields/status → safe user records | 404 missing user; 409 duplicate email or self-deactivation. |
| `geometry.service.js` | `validatePolygon`, `calculateAreaM2`, `calculateOverlapM2`, `findParcelOverlaps`, `getParcelGeometry` | GeoJSON/parcel ID → PostGIS validation, area, intersections, or geometry | 422 malformed polygon; database errors propagate safely. |
| `parcel.service.js` | `previewParcel`, `registerParcel`, `getParcelGeoJson`, `correctReturnedParcel` | Validated proposal/current user → preview, parcel, conflict evidence, or map FeatureCollection | 403 role/ownership; 404 references; 409 overlap/state; 422 geometry/shares/area. |
| `survey.service.js` | `getPendingSurveys`, `getSurvey`, `saveSurveyReport`, `verifySurvey`, `returnSurveyToClerk` | Survey ID, evidence, boundary and notes → updated survey/parcel | 404 survey; 409 wrong state/overlap; 422 file or geometry validation. |
| `registration.service.js` | `getPendingRegistrations`, `approveParcelRegistration` | Queue filters or parcel ID/registrar → queue or registered parcel | 409 incomplete survey, dispute, ownership, overlap, or stale state. |
| `ownership.service.js` | `validateOwnershipShares`, `getLinkedOwner`, `getCurrentOwners`, `getOwnershipHistory`, owner parcel reads | Shares/user/parcel → current title and immutable timeline | 403 non-owner access; 404 link/parcel; 422 shares not exactly 100%. |
| `transfer.service.js` | `initiateTransfer`, consent/buyer/document/review actions, `approveTransfer` | Transfer IDs, actor decisions, files and price → transfer state/timeline | 403 wrong participant; 404 transfer; 409 state, restriction, dispute, consent, payment, or stale title. |
| `payment.service.js` | `getCurrentFeeSetting`, `updateFeeSetting`, `calculateTransferFee`, `payTransferFee` | Fee values or transfer/payment data → setting or idempotent mock receipt | 403 non-buyer; 409 wrong transfer state; 503 missing fee setting. |
| `encumbrance.service.js` | `listParcelEncumbrances`, `createEncumbrance`, `liftEncumbrance`, `getEncumbranceEvidence` | Parcel/encumbrance ID, legal data and file → restriction/history/evidence | 403 access; 404 record; 409 wrong state; 422 missing/invalid signed evidence. |
| `dispute.service.js` | `listDisputes`, `getDispute`, `openManualDispute`, `startDisputeReview`, `resolveDispute`, evidence actions | Case filters/IDs, parcel IDs, decision and evidence → case/evidence/correction task | 404 case; 409 invalid state; 422 unrelated correction parcel or invalid evidence. |
| `certificate.service.js` | `issueTitleCertificate`, list/get/download functions, public verification functions | Parcel/certificate/token/language → certificate metadata, PDF, or privacy-safe verification | 403 access; 404 private record; 409 ineligible title; storage/PDF failures leave retryable state. |
| `certificate-pdf.service.js` | `generateCertificatePdf` | Immutable snapshot, language, number and verification URL → PDF buffer | Throws when snapshot/geometry rendering cannot complete. |
| `object-storage.service.js` | `storeObject`, `loadObject`, `deleteObject` | Category/reference and bytes → private R2 reference or bytes | Configuration/provider errors; tests use isolated memory storage. |
| `notification.service.js` | `queueSms` | Transaction, recipient phone and message | Writes an SMS outbox row; it does not contact a live provider. |
| `audit.service.js` | `writeAuditLog` | Actor/action/entity/details | Appends an immutable audit row. |

## Repository modules

| Module | Responsibility |
|---|---|
| `user.repository.js` | Login lookup, safe user projections, pagination, and activation status. |
| `owner.repository.js` | Owner search/detail projections and parcel relationships. |
| `parcel.repository.js` | Role-scoped parcel lists/details and geometry-safe projections. |
| `district.repository.js` | Active district choices and sequence metadata. |
| `dashboard.repository.js` | Role-specific counts, chart datasets, pending tasks, and recent activity. |

## Client modules

| Area | Responsibility |
|---|---|
| `App.jsx` | Defines public/protected routes and role-aware page access. |
| `AuthContext.jsx` | Loads the current session, exposes login/logout, and keeps only the safe user profile. |
| `LanguageContext.jsx` | Stores English/Somali preference and translates shared status/interface labels. |
| `apiClient.js` | Configures same-origin Axios requests, cookies, timeouts, CSRF headers, and safe network messages. |
| `registryService.js` | Typed-by-convention browser methods for registry API resources and protected file downloads. |
| `ParcelDrawingMap.jsx` | Keeps existing registry parcels read-only while the new proposal alone belongs to Leaflet Draw's editable group. |
| Page modules | Load route data, render role-specific actions, validate basic UI state, and delegate all authoritative rules to the API. |

The complete HTTP method/path/role list and request/response payload reference are maintained in [api.md](api.md).
