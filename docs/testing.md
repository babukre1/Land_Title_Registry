# Testing

Use an isolated PostgreSQL/PostGIS database whose name ends in `_test`.

```powershell
Set-Location server
npm run prisma:deploy
npm run db:seed
npm test
```

The integration suites refuse to modify any database not ending in `_test`. With `NODE_ENV=test`, uploaded bytes use an isolated in-memory object store instead of Cloudflare R2. CI provisions PostgreSQL/PostGIS, applies every migration, seeds the test database, runs all server tests, and builds the client.

Certificate coverage includes authorization, snapshots, English/Somali PDF rendering, real boundary rendering, private owner downloads, current/superseded lifecycle, public token/manual lookup, privacy, and the shared ten-per-minute limit.
