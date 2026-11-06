# Implemented API

All responses are JSON. Errors use `{ "success": false, "message": "..." }`. Cookie-authenticated state changes also require `X-CSRF-Token` matching the `csrf_token` cookie.

| Method | Path | Authentication | Roles | Purpose |
|---|---|---|---|---|
| GET | `/api/health` | No | All | API liveness |
| POST | `/api/auth/login` | No | All accounts | Validate credentials and set cookies |
| GET | `/api/auth/me` | Yes | Any active role | Current safe profile |
| POST | `/api/auth/logout` | Yes + CSRF | Any active role | Audit logout and clear cookies |
| GET | `/api/users?page=1&limit=25` | Yes | ADMIN | Paginated safe user list |
| GET | `/api/users/:id` | Yes | ADMIN | Safe user detail |
| PATCH | `/api/users/:id/status` | Yes + CSRF | ADMIN | Activate/deactivate account |
| GET | `/api/dashboard/summary` | Yes | Any active role | Role-scoped live counts |
| GET | `/api/districts` | Yes | Any active role | Registration district choices |
| GET | `/api/owners` | Yes | CLERK, REGISTRAR | Search/paginate legal owners |
| GET | `/api/owners/:id` | Yes | CLERK, REGISTRAR | Owner and parcel details |
| POST | `/api/owners` | Yes + CSRF | CLERK, REGISTRAR | Create person/company owner |
| GET | `/api/parcels` | Yes | Any active role | Role-scoped parcel list |
| GET | `/api/parcels/geojson` | Yes | Any active role | Role-scoped parcel map features |
| GET | `/api/parcels/:id` | Yes | Any active role | Parcel, owners, surveys, and geometry |
| POST | `/api/parcels/preview` | Yes + CSRF | CLERK | Validate, calculate area, and inspect overlap |
| POST | `/api/parcels` | Yes + CSRF | CLERK | Register pending parcel or preserve blocked candidate |
| GET | `/api/disputes` | Yes | CLERK, REGISTRAR | List overlap disputes |
| GET | `/api/disputes/:id` | Yes | CLERK, REGISTRAR | Candidate, parties, conflicts, and geometry |
| GET | `/api/surveys` | Yes | SURVEYOR, CLERK, REGISTRAR | Filtered, paginated survey attempts |
| GET | `/api/surveys/:id` | Yes | SURVEYOR, CLERK, REGISTRAR | Survey, parcel, owners, report metadata, and boundaries |
| POST | `/api/surveys/:id/report` | Yes + CSRF | SURVEYOR | Private PDF/JPEG/PNG upload, maximum 10 MB |
| GET | `/api/surveys/:id/report` | Yes | SURVEYOR, CLERK, REGISTRAR | Authorized report retrieval |
| POST | `/api/surveys/:id/verify` | Yes + CSRF | SURVEYOR | Verify current or adjusted boundary |
| POST | `/api/surveys/:id/cannot-verify` | Yes + CSRF | SURVEYOR | Preserve reason and return parcel to clerk |
| PATCH | `/api/parcels/:id/correction` | Yes + CSRF | CLERK | Revalidate correction and create a new survey attempt |
| GET | `/api/registrations/pending-approval` | Yes | REGISTRAR | Verified parcels awaiting approval |
| POST | `/api/parcels/:id/approve` | Yes + CSRF | REGISTRAR | Atomic official registration and initial history |
| GET | `/api/permissions/owner` | Yes | OWNER | Role-boundary demonstration |
| GET | `/api/permissions/clerk` | Yes | CLERK | Role-boundary demonstration |
| GET | `/api/permissions/surveyor` | Yes | SURVEYOR | Role-boundary demonstration |
| GET | `/api/permissions/registrar` | Yes | REGISTRAR | Role-boundary demonstration |
| GET | `/api/permissions/admin` | Yes | ADMIN | Role-boundary demonstration |

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

## Future API (not implemented)

Transfers/consents/payments, dispute resolution, encumbrances, certificates, general uploads, public certificate verification, and SMS processing remain outside Day 1.
