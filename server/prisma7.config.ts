import "dotenv/config";
import { defineConfig } from "prisma/config";

const runtimeUrl = process.env["DATABASE_URL"];
const migrationUrl = process.env["DIRECT_URL"] || runtimeUrl?.replace("-pooler.", ".");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    // CLI operations need a session-stable direct connection. For Neon, fall
    // back to the matching direct hostname when only the pooled URL is set.
    // Runtime queries still use DATABASE_URL in src/lib/prisma.js.
    url: migrationUrl,
  },
});
