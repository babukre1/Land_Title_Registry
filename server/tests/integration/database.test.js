import { beforeAll, describe, expect, it } from "vitest";
import { getPrisma } from "../../src/lib/prisma.js";
import { calculateAreaM2, calculateOverlapM2, validatePolygon } from "../../src/services/geometry.service.js";
import { validateOwnershipShares } from "../../src/services/ownership.service.js";

const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasTestDatabase ? describe : describe.skip;
const rectangle = { type: "Polygon", coordinates: [[[45.31, 2.04], [45.3102, 2.04], [45.3102, 2.0402], [45.31, 2.0402], [45.31, 2.04]]] };

describeDatabase("PostgreSQL/PostGIS integration", () => {
  const prisma = hasTestDatabase ? getPrisma() : null;

  beforeAll(async () => {
    const [database] = await prisma.$queryRaw`SELECT current_database() AS name`;
    if (!database.name.endsWith("_test")) throw new Error(`Refusing integration tests: database ${database.name} does not end in _test`);
  });

  it("connects with Prisma and has PostGIS", async () => {
    const [result] = await prisma.$queryRaw`SELECT postgis_version() AS version`;
    expect(result.version).toBeTruthy();
  });

  it("enforces role uniqueness", async () => {
    await prisma.role.upsert({ where: { name: "OWNER" }, update: {}, create: { name: "OWNER", description: "Owner" } });
    await expect(prisma.role.create({ data: { name: "OWNER", description: "duplicate" } })).rejects.toThrow();
  });

  it("enforces normalized unique user email", async () => {
    const role = await prisma.role.upsert({ where: { name: "OWNER" }, update: {}, create: { name: "OWNER", description: "Owner" } });
    const email = `db-${Date.now()}@example.com`;
    await prisma.user.create({ data: { fullName: "Test Owner", email, passwordHash: "not-used-in-this-test", roleId: role.id } });
    await expect(prisma.user.create({ data: { fullName: "Duplicate", email, passwordHash: "not-used", roleId: role.id } })).rejects.toThrow();
  });

  it("validates polygons and rejects a self-intersection", async () => {
    await expect(validatePolygon(rectangle, prisma)).resolves.toMatchObject({ isValid: true, cornerCount: 4 });
    const bowTie = { type: "Polygon", coordinates: [[[45.31, 2.04], [45.3102, 2.0402], [45.31, 2.0402], [45.3102, 2.04], [45.31, 2.04]]] };
    await expect(validatePolygon(bowTie, prisma)).resolves.toMatchObject({ isValid: false });
  });

  it("calculates believable square-metre area", async () => {
    const area = await calculateAreaM2(rectangle, prisma);
    expect(area).toBeGreaterThan(400);
    expect(area).toBeLessThan(600);
  });

  it("calculates overlap while allowing boundary-only contact", async () => {
    const overlap = { type: "Polygon", coordinates: [[[45.3101, 2.04], [45.3103, 2.04], [45.3103, 2.0402], [45.3101, 2.0402], [45.3101, 2.04]]] };
    const touching = { type: "Polygon", coordinates: [[[45.3102, 2.04], [45.3104, 2.04], [45.3104, 2.0402], [45.3102, 2.0402], [45.3102, 2.04]]] };
    await expect(calculateOverlapM2(rectangle, overlap, prisma)).resolves.toMatchObject({ intersects: true });
    const boundary = await calculateOverlapM2(rectangle, touching, prisma);
    expect(boundary.intersects).toBe(true);
    expect(boundary.overlapM2).toBe(0);
  });

  it("validates ownership shares with exact decimals", () => {
    expect(validateOwnershipShares([{ sharePercent: "75" }, { sharePercent: "25" }])).toBe(true);
  });

  it("defines owner/parcel relationships and a unique parcel identifier", async () => {
    const indexes = await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname IN ('parcels_parcel_number_key', 'parcel_owners_parcel_id_owner_id_key')
    `;
    expect(indexes.map((row) => row.indexname).sort()).toEqual(["parcel_owners_parcel_id_owner_id_key", "parcels_parcel_number_key"]);
  });

  it("protects ownership history and audit logs from updates and deletes", async () => {
    const triggers = await prisma.$queryRaw`
      SELECT DISTINCT event_object_table AS table_name
      FROM information_schema.triggers
      WHERE trigger_name IN ('ownership_history_append_only', 'audit_logs_append_only')
    `;
    expect(triggers.map((row) => row.table_name).sort()).toEqual(["audit_logs", "ownership_history"]);
  });

  it("has consistent seeded parcels when the seed has been run", async () => {
    const seeded = await prisma.parcel.count({ where: { parcelNumber: { startsWith: "MGQ-" } } });
    expect(seeded).toBeGreaterThanOrEqual(3);
    const registered = await prisma.parcel.findMany({ where: { status: "REGISTERED" }, select: { id: true, owners: { select: { sharePercent: true } } } });
    for (const parcel of registered) validateOwnershipShares(parcel.owners);
  });
});
