# Architecture

## Request flow

```text
Browser
  React pages and AuthContext
        │ Axios (JSON + cookies + CSRF header)
        ▼
Express app
  routes → validation/auth middleware → controllers → services → repositories
                                                               │
                                                               ▼
                                                Prisma Client + PrismaPg
                                                parameterized spatial SQL
                                                               │
                                                               ▼
                                                    PostgreSQL + PostGIS
```

React renders pages, checks the public health endpoint, and holds only safe profile information. Axios centralizes the API URL, credentials, timeout, network messages, and CSRF header.

Express owns the security boundary. Routes declare middleware and controllers; controllers translate HTTP input/output; services contain authentication and business rules; repositories provide reusable Prisma reads. This separation keeps rules out of route declarations and makes each layer testable.

Prisma models relational data and provides migrations and ordinary queries. `PrismaPg` connects it to PostgreSQL. PostGIS stores `geometry(Polygon,4326)` values and performs accurate geography-area calculations. The spatial service uses tagged-template parameterization; it never concatenates user geometry into SQL.

## Authentication flow

1. Zod validates the login payload.
2. The service normalizes the email and loads the user and role.
3. bcrypt compares the supplied password with the stored hash.
4. The server signs a short-lived JWT containing only the user ID.
5. The JWT is returned in an HttpOnly, SameSite cookie; a separate readable random CSRF cookie is also issued.
6. React calls `/auth/me` after login and on refresh.
7. Authentication middleware verifies the JWT and reloads an active user from PostgreSQL.
8. Authorization middleware checks the verified server-side role.
9. POST/PATCH/DELETE authenticated requests require the matching CSRF header and cookie.

`ADMIN` is not a wildcard. Each legal workflow must explicitly name its permitted roles.

## Error handling

Unknown routes return 404. Validation returns 422. Authentication and authorization return 401 and 403 respectively. The global handler logs unexpected server errors outside tests but returns only a safe generic message, never a database stack trace.

## Parcel registration concurrency

Parcel registration runs in one PostgreSQL transaction guarded by a transaction-scoped advisory lock. Inside the lock it checks the idempotency key, validates references and exact ownership shares, asks PostGIS to validate and measure the polygon, and rechecks all protected statuses for overlap above 1 m². It then commits exactly one of two outcomes: a numbered `PENDING_SURVEY` parcel with an unassigned survey task, or a blocked candidate with an `OPEN` dispute and immutable conflict/party evidence. The critical check-and-insert window is serialized, so two simultaneous overlapping candidates cannot both pass.

Survey verification reuses the same lock and spatial helpers. It preserves the exact verified geometry and area on the survey attempt, so registrar approval can prove the parcel boundary still matches field evidence. Registrar approval locks the parcel row, rechecks status, report, boundary equality, disputes, geometry, overlap, owners and exact shares, then atomically sets `REGISTERED`, appends one `REGISTRATION` history event, and audits the action. Any failure rolls back the entire approval.

Survey report bytes are kept outside the web root. Only randomized filenames and validated metadata are stored in PostgreSQL; authenticated role-checked routes read the files.
