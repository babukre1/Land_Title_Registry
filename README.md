# Land Title Registry

A secure foundation for digital land registration and ownership management in Somalia. The system stores geographic parcel boundaries, separates account identities from legal owner identities, preserves permanent ownership history, and enforces five distinct server-side roles.

This repository implements Day 1 Phases 1–8: the foundation, owner/parcel registration, protected spatial workflow, survey verification and correction, registrar approval, immutable initial ownership history, integration tests, and documentation. Transfers and certificates remain later-phase work.

## Technology versions

- Node.js 22 LTS, Express 5.1, JavaScript ES modules
- React 19.2, Vite 8.3, Tailwind CSS 4.3, React Router 7.18, Axios 1.21
- PostgreSQL 17 with PostGIS
- Prisma ORM and Client 7.10.1 with `@prisma/adapter-pg` 7.10.1 and `pg` 8.16
- JWT, bcrypt, Zod, Helmet, CORS, rate limiting
- Vitest 4.1 and Supertest 7

Versions are pinned in the lockfiles. Prisma 7 uses `server/prisma7.config.ts`, ESM, and the PostgreSQL driver adapter.

## Architecture

```text
React UI → Axios → Express routes → controllers → services → repositories
                                                        ↓
                                           Prisma 7 / spatial SQL
                                                        ↓
                                              PostgreSQL + PostGIS
```

The browser keeps only a safe user profile in React Context. The signed JWT is stored in an HttpOnly cookie. State-changing authenticated requests also require a double-submit CSRF token. The API reloads the user on every protected request, so deactivation invalidates an existing session immediately.

## Repository layout

```text
client/                  React/Vite application
  src/components/       Route guards and reusable UI
  src/context/          Session profile state
  src/pages/            Home, login, dashboard, unauthorized
  src/services/         Central Axios and auth clients
server/
  prisma/               Prisma schema, migration, repeatable seed
  src/controllers/      HTTP request/response handling
  src/middleware/       Authentication, authorization, CSRF, errors
  src/repositories/     Focused database reads
  src/services/         Business, auth, audit, ownership, geometry rules
  src/validators/       Zod request schemas
  tests/                Unit and isolated-database integration tests
docs/                   Architecture, database, API, and demo learning guide
.github/workflows/      Automated validation and test workflow
```

## Prerequisites

1. Node.js 22 or another Prisma 7-supported Node version (minimum 20.19).
2. PostgreSQL 17 and PostGIS 3.x.
3. A PostgreSQL login allowed to create a database and extension, or databases prepared by an administrator.

### Install PostGIS on Windows

Open **Application Stack Builder** from the PostgreSQL 17 Start menu, select the PostgreSQL 17 installation, choose **Spatial Extensions → PostGIS**, and complete the installer. Confirm that `postgis.control` appears under the PostgreSQL `share/extension` directory. On Ubuntu, install the matching PostgreSQL package, for example `sudo apt install postgresql-17-postgis-3` when PostgreSQL 17 packages are configured.

## Local setup

```powershell
npm install
npm run install:all
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Edit `server/.env` with real local credentials and generate strong local-only values:

```env
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/land_title_registry
TEST_DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/land_title_registry_test
JWT_SECRET=a-random-value-of-at-least-32-characters
DEMO_PASSWORD=a-local-demo-password-at-least-8-characters
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=land-title-registry-documents
R2_OBJECT_PREFIX=land-title-registry
```

Survey reports and transfer evidence are stored in a private Cloudflare R2 bucket. Create an R2 API token restricted to that bucket with **Object Read & Write** permission. Keep the bucket private; the authenticated API streams documents to authorized users. `R2_OBJECT_PREFIX` is optional and defaults to `land-title-registry`.

Create both databases with your own PostgreSQL administrator account. Do not point `TEST_DATABASE_URL` at development or production; integration tests refuse any database whose name does not end in `_test`.

```powershell
Set-Location server
npm run prisma:validate
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run prisma:studio
```

For the isolated test database, temporarily set `DATABASE_URL` to the `_test` URL and run `npm run prisma:deploy`. Restore the development URL afterwards.

Start both applications from the repository root:

```powershell
npm run dev
```

- Client: `http://localhost:5173`
- API health: `http://localhost:5000/api/health`

Separate commands are `npm run dev:client` and `npm run dev:server`.

## Testing

```powershell
npm test                       # server tests; DB suites skip without TEST_DATABASE_URL
npm run build                  # production client build
npm run check                  # schema, server tests, client build
```

Database tests require migrations on an isolated database and `TEST_DATABASE_URL`. They verify PostGIS, spatial validity/area/overlap, the 1 m² rule, concurrent registration, idempotent retries, dispute evidence, uniqueness, relationships, ownership totals, append-only protections, login, deactivation, role separation, logout/CSRF, validation, and rate limiting.

## Demo accounts

The repeatable seed creates these development-only accounts. Every account uses the value you set in `DEMO_PASSWORD`; no password is hard-coded.

| Role | Email |
|---|---|
| ADMIN | `admin@example.com` |
| REGISTRAR | `registrar@example.com` |
| SURVEYOR | `surveyor@example.com` |
| CLERK | `clerk@example.com` |
| OWNER | `owner@example.com` |
| OWNER (buyer demo) | `buyer@example.com` |

## Implemented

- Responsive foundation UI and API connectivity indicator
- Complete relational schema for parcels, owners, joint shares, surveys, transfers, consents, immutable history, encumbrances, disputes, rejected candidates, certificates, fees, payments, documents, audit, and simulated SMS
- PostGIS polygons and parameterized validity, area, intersection, overlap, and GeoJSON helpers
- Versioned migration with PostGIS, spatial/domain constraints, partial unique indexes, registered-boundary guard, and append-only history/audit triggers
- Repeatable Somali demonstration seed with valid non-overlapping Mogadishu polygons
- Cookie JWT login, session profile, logout, CSRF protection, backend role enforcement, user administration, audit logging, and login rate limiting
- Protected React route, refresh-safe session, minimal role-aware dashboard
- Role-aware dashboard statistics and responsive navigation with an English/Somali language switch
- Owner creation, search, lists, details, and duplicate identity protection
- Parcel drawing/manual coordinates, PostGIS preview, authoritative registration, lists, details, and GeoJSON maps
- Atomic district parcel numbering, pending survey creation, idempotent submission, and concurrent-safe overlap enforcement
- Persisted blocked candidates, conflict geometry, dispute parties, and dispute list/detail maps
- Private Cloudflare R2-backed PDF/JPEG/PNG survey reports with signature validation and a 10 MB limit
- Survey queues, field verification, boundary adjustment, Cannot Verify, clerk correction, and preserved survey attempts
- Registrar review and atomic approval with duplicate protection and immutable initial ownership history
- Unit/integration tests and CI workflow
- Owner-scoped My Parcels, safe current-owner details, and immutable ownership timeline
- Whole-parcel SALE workflow: joint consent, buyer response, private documents, clerk review, payment gate, registrar decision, and atomic title replacement
- Certificate supersession with an explicit replacement-generation dependency

## Not implemented yet

- Phase 11 payment collection/receipt UI (Phase 10 only consumes a trusted `PAID` record)
- Phase 14 replacement certificate PDF generation (approval supersedes the old certificate and records reissue required)
- Legally distinct GIFT, INHERITANCE, and COURT_ORDER authorization workflows; partial-share transfers
- Dispute resolution, encumbrance creation/lifting, public certificate verification, and SMS workflows
- Complete translation of every workflow message beyond the bilingual application shell

The database and focused services support these future workflows, but the application does not simulate their completion.

## Known limitations

- Prisma 7 treats PostGIS geometry as `Unsupported`, so spatial values must be read/written with carefully parameterized raw SQL. Ordinary Prisma queries should explicitly select non-geometry fields.
- Authentication cannot operate until `DATABASE_URL` and `JWT_SECRET` are configured; the public health endpoint intentionally remains available for diagnosis.
- Leaflet uses OpenStreetMap tiles, so the base map requires an internet connection; coordinate entry and all server-side spatial enforcement still work without map tiles.
- Uploaded evidence is stored in private Cloudflare R2 object storage. Production still needs a documented retention policy, malware scanning, and tested backup/recovery procedures.
- The cookie maximum age is eight hours; keep it aligned if `JWT_EXPIRES_IN` is changed.

## Assumptions

- Banaadir region code is `MGQ`; district codes include `HDN`, `WDJ`, `HMW`, `YQS`, and `KRN`.
- More than 1 m² of overlap blocks an active registration; zero-area shared boundaries remain allowed.
- `PENDING_SURVEY`, `VERIFIED`, `REGISTERED`, `RETURNED_FOR_CORRECTION`, and `DISPUTED` parcels remain protected by overlap checks.
- `ADMIN` is operational administration, not a legal approval role, and receives no implicit registrar/surveyor powers.
- Owner identity and company registration numbers are globally unique in this initial national registry.
- A later boundary-change workflow will set the transaction-local `app.boundary_change_approved` database flag only after registrar authorization and overlap validation.

See [architecture](docs/architecture.md), [database design](docs/database.md), [implemented API](docs/api.md), [registration flow](docs/land-registration-flow.md), [ownership transfer flow](docs/ownership-transfer-flow.md), and the [demo and judge guide](docs/demo-guide.md).

## Vercel deployment

The root `vercel.json` deploys two services in one Vercel project:

- `client`: Vite SPA, public at `/`
- `server`: Express API, public at `/api/*`

The browser calls the same-origin `/api` path. There are no service bindings because neither service makes a server-side call to the other; the static Vite application calls the public API from the user's browser.

In Vercel, select the **Services** preset and leave the project root as `./`. Add these server environment variables for Production and Preview:

- `DATABASE_URL`: hosted PostgreSQL connection string with PostGIS available
- `DIRECT_URL`: non-pooled connection to the same database for migrations; for Neon, copy the connection string with connection pooling disabled
- `JWT_SECRET`: random value of at least 32 characters
- `JWT_EXPIRES_IN`: optional, defaults to `8h`
- `CLIENT_URL`: the public deployment origin, used only for cross-origin access; same-origin `/api` requests do not depend on it

Do not add `VITE_API_URL` for the single-domain Services deployment. Before the first production deployment, apply migrations to the hosted database from a trusted local shell with `DATABASE_URL` pointing to that database:

```powershell
npm run prisma:deploy --prefix server
```

For Neon, keep the pooled `-pooler` URL in `DATABASE_URL` for application traffic and the non-pooled URL in `DIRECT_URL` for Prisma CLI operations. Both URLs must target the same branch, database, and role.

The server's current survey/transfer document storage writes to the local filesystem. Vercel Functions do not provide durable local storage, so uploads require an object-storage migration (for example, Vercel Blob or S3) before that feature is production-safe.
