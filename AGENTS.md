# Repository Guide

- Application code is JavaScript with ES modules. Prisma tooling configuration may use TypeScript.
- Keep HTTP routes thin: routes call controllers, controllers call services, and services/repositories own business rules and persistence.
- Never bypass PostGIS overlap checks or immutable-history protections in future parcel workflows.
- Run `npm run check` before handing off changes when local prerequisites allow it.
- Never commit `.env` files or real credentials.

