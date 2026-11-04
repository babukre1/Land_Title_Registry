# Demo and judge preparation

## Explain the architecture simply

- **React** draws the pages, collects login input, and remembers only the safe current-user profile.
- **Express** receives HTTP requests, validates them, checks identity/permissions, and calls the correct business service.
- **Prisma** maps JavaScript operations to relational records, generates the client, and versions the database schema through migrations.
- **PostgreSQL** permanently stores accounts, owners, parcels, ownership, and legal history while enforcing relationships and constraints.
- **PostGIS** adds polygon storage and geographic calculations such as validity, square-metre area, and overlap.
- **Axios** sends JSON between React and Express and includes secure cookies automatically.

Authentication asks “who are you?” Authorization asks “may that authenticated role do this action?” Passwords are hashed with bcrypt so the original password is not stored. A JWT is a signed, expiring session claim; middleware verifies it and then reloads the active user. Backend enforcement matters because a user can modify browser code or call the API directly.

`owners` and `users` are separate because someone can legally own land without having a website account. `parcel_owners` is needed because a parcel can have several owners and an owner can have several parcels; it also stores each share. Immutable history is essential because a registry must show the legal sequence and corrections, not silently rewrite the past.

## Important function walkthrough

1. `createApp` — `server/src/app.js`. Input: none. Builds the Express app in order: headers, CORS, parsers, rate limiting, routes, 404, errors. Output: testable app. Errors flow to the global handler.
2. `getPrisma` — `server/src/lib/prisma.js`. Input: configured environment. Lazily builds one Prisma client with `PrismaPg`. Output: shared database client. Throws a helpful error if `DATABASE_URL` is missing.
3. `authenticateCredentials` — `server/src/services/auth.service.js`. Inputs: email/password. Normalizes email, loads account, bcrypt-compares, checks active status, audits, signs JWT. Output: token and safe user. Invalid cases all return the same 401 message.
4. `verifyAuthToken` — same file. Input: JWT. Verifies signature, expiry, issuer, and audience. Output: decoded claim. Throws for malformed/expired tokens.
5. `authenticate` — `server/src/middleware/authenticate.js`. Input: request cookie. Verifies JWT, reloads an active user, adds safe `request.user`. Output: next middleware or 401.
6. `authorize` — `server/src/middleware/authorize.js`. Input: allowed role names. Returns middleware comparing only the verified server-side role. Output: continuation or 403.
7. `requireCsrf` — `server/src/middleware/csrf.js`. Inputs: CSRF cookie/header. Requires exact match on state changes. Output: continuation or 403.
8. `validate` — `server/src/middleware/validate.js`. Inputs: Zod schema and request section. Replaces input with parsed values. Output: continuation or safe 422 field errors.
9. `changeUserStatus` — `server/src/services/user.service.js`. Inputs: target ID, Boolean status, admin actor. Prevents self-deactivation; transactionally updates and audits. Output: safe user. May return 404/409/database errors.
10. `validateOwnershipShares` — `server/src/services/ownership.service.js`. Input: owner shares. Uses exact decimals, validates each range, totals 100. Output: true. Throws 422 for empty/invalid totals.
11. `validatePolygon` — `server/src/services/geometry.service.js`. Input: GeoJSON Polygon. Binds JSON to PostGIS, checks validity and corner count. Output: validity details. Rejects wrong GeoJSON shape or database errors.
12. `calculateAreaM2` — same file. Input: GeoJSON Polygon. Converts to SRID 4326 geography and calculates area. Output: number of square metres.
13. `calculateOverlapM2` — same file. Inputs: two polygons. Tests intersection and calculates intersection geography area. Output: `{ intersects, overlapM2 }`; boundary contact can yield zero area.
14. `findParcelOverlaps` — same file. Inputs: candidate geometry and optional excluded parcel. Searches active parcels through the GiST-backed spatial operations and returns overlaps above 1 m².
15. `seedParcels` — `server/prisma/seed.js`. Inputs: seeded districts/users/owners. Inserts valid spatial parcels, exact shares, survey task, and initial snapshots idempotently. Throws if a spatial insert fails.

## Likely judge questions

1. **Why PostGIS instead of text coordinates?** It validates real polygons, indexes them spatially, and accurately calculates intersections and area.
2. **Why longitude before latitude?** GeoJSON and SRID 4326 use `[x, y]`, meaning longitude then latitude.
3. **Can adjoining parcels be accepted?** Yes. Their boundaries intersect, but the intersection area is 0 m²; blocking begins above 1 m².
4. **How do you prevent two simultaneous overlapping registrations?** The registration transaction takes a registry advisory lock, rechecks overlap, then writes the accepted parcel or rejected-candidate evidence before commit.
5. **Why is ownership share Decimal?** Binary floating point can make values such as 33.33 sum incorrectly; Decimal gives exact registry percentages.
6. **Why not a SQL CHECK for total ownership?** A normal row check cannot safely add other rows. The service validates the total inside the approval transaction.
7. **Why separate User and Owner?** Login identity and legal ownership are different; many legal owners will never create accounts.
8. **How is history protected?** The API never updates it, and a database trigger rejects UPDATE and DELETE even if another client tries.
9. **How is a mistake corrected?** Insert a new CORRECTION event referencing the wrong entry; never erase the original.
10. **Where is the JWT stored?** In an HttpOnly cookie, so browser JavaScript cannot read it.
11. **What prevents CSRF?** SameSite cookies plus a random CSRF cookie whose value must match a custom request header.
12. **What happens after an admin disables a user?** Every request reloads the account, so an older unexpired JWT is rejected immediately.
13. **Does ADMIN approve land?** No. ADMIN manages operations; REGISTRAR and SURVEYOR powers are explicitly separate.
14. **How do you prevent password theft from the database?** bcrypt stores a salted one-way hash, never plaintext.
15. **How do you avoid SQL injection in geometry queries?** Prisma tagged templates bind GeoJSON and IDs as parameters; SQL is not assembled with user strings.
16. **Why keep rejected candidates?** Their proposed boundary and conflicting parcel evidence may be needed for correction, review, or a dispute, but they are not valid parcels.
17. **How do you protect sensitive owner information?** Public verification APIs are not built yet; their design must select only certificate-safe snapshot fields and exclude identity/phone data.
18. **How can the database be reconstructed?** Install PostGIS, run the committed Prisma migration, generate the client, then run the repeatable seed.
