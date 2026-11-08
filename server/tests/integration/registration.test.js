import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { getPrisma } from "../../src/lib/prisma.js";

const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeRegistration = hasTestDatabase ? describe : describe.skip;
const password = "Registration!2026";
const app = createApp();

function rectangle(x, y, width = 0.0004, height = 0.0004) {
  return { type: "Polygon", coordinates: [[[x, y], [x + width, y], [x + width, y + height], [x, y + height], [x, y]]] };
}
function cookiesFrom(response) { return response.headers["set-cookie"]?.map((cookie) => cookie.split(";")[0]) || []; }
function csrfFrom(cookies) { return decodeURIComponent(cookies.find((cookie) => cookie.startsWith("csrf_token="))?.split("=")[1] || ""); }

describeRegistration("owner, parcel, overlap and dispute workflow", () => {
  const prisma = hasTestDatabase ? getPrisma() : null;
  const runSeed = parseInt(randomUUID().slice(0, 8), 16) / 0xffffffff;
  const originX = -130 + runSeed * 10;
  const originY = 15 + runSeed * 5;
  let district; let legalOwner; let clerkUser; let clerkCookies; let ownerCookies; let surveyorCookies;

  async function login(email) {
    const response = await request(app).post("/api/auth/login").send({ email, password });
    expect(response.status).toBe(200);
    return cookiesFrom(response);
  }
  function proposal(geometry, key = randomUUID()) {
    return { districtId: district.id, areaName: `Integration ${key.slice(0, 8)}`, landUse: "RESIDENTIAL", geometry, owners: [{ ownerId: legalOwner.id, sharePercent: 100 }], confirmUnusualArea: false, idempotencyKey: key };
  }
  function postAsClerk(path, body) {
    return request(app).post(path).set("Cookie", clerkCookies).set("X-CSRF-Token", csrfFrom(clerkCookies)).send(body);
  }

  beforeAll(async () => {
    const [database] = await prisma.$queryRaw`SELECT current_database() AS name`;
    if (!database.name.endsWith("_test")) throw new Error(`Refusing registration tests: ${database.name} is not an isolated _test database`);
    const passwordHash = await bcrypt.hash(password, 4);
    const users = {};
    for (const roleName of ["CLERK", "OWNER", "SURVEYOR"]) {
      const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName, description: roleName } });
      const email = `registration-${roleName.toLowerCase()}@example.com`;
      users[roleName] = await prisma.user.upsert({ where: { email }, update: { passwordHash, roleId: role.id, isActive: true }, create: { fullName: `Registration ${roleName}`, email, passwordHash, roleId: role.id } });
    }
    district = await prisma.district.findFirst({ where: { code: "HDN" } });
    legalOwner = await prisma.owner.upsert({ where: { identityNumber: "TEST-REGISTRATION-OWNER" }, update: { fullName: "Sahra Test Owner" }, create: { ownerType: "PERSON", fullName: "Sahra Test Owner", identityNumber: "TEST-REGISTRATION-OWNER" } });
    clerkUser = users.CLERK;
    clerkCookies = await login("registration-clerk@example.com"); ownerCookies = await login("registration-owner@example.com"); surveyorCookies = await login("registration-surveyor@example.com");
  });

  it("creates a person owner, normalizes identity, audits it, and rejects a duplicate", async () => {
    const identityNumber = `test person ${Date.now()}`;
    const body = { ownerType: "PERSON", fullName: "Ayaan Maxamed", identityNumber, phone: "+252 61 555 0101", email: "AYAAN@EXAMPLE.COM", address: "Hodan" };
    const created = await postAsClerk("/api/owners", body);
    expect(created.status).toBe(201);
    expect(created.body.data.identityNumber).toBe(identityNumber.toUpperCase().replaceAll(" ", "-"));
    const duplicate = await postAsClerk("/api/owners", body);
    expect(duplicate.status).toBe(409);
    expect(await prisma.auditLog.count({ where: { action: "OWNER_CREATED", entityId: String(created.body.data.id) } })).toBe(1);
  });

  it("returns real role-scoped dashboard statistics", async () => {
    const response = await request(app).get("/api/dashboard/summary").set("Cookie", clerkCookies);
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("pendingSurveys");
    expect(Number.isInteger(response.body.data.owners)).toBe(true);
  });

  it("accepts a valid non-overlapping polygon and calculates square-metre area", async () => {
    const response = await postAsClerk("/api/parcels", proposal(rectangle(originX, originY)));
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("PENDING_SURVEY");
    expect(Number(response.body.data.areaM2)).toBeGreaterThan(1_000);
    expect(response.body.data.parcelNumber).toMatch(/^MGQ-HDN-\d{6}$/);
    expect(response.body.data.surveys[0].status).toBe("PENDING");
  });

  it("allows parcels sharing an edge or a corner", async () => {
    const x = originX + 0.01; const y = originY;
    const first = await postAsClerk("/api/parcels", proposal(rectangle(x, y)));
    const edge = await postAsClerk("/api/parcels", proposal(rectangle(x + 0.0004, y)));
    const corner = await postAsClerk("/api/parcels", proposal(rectangle(x + 0.0008, y + 0.0004)));
    expect([first.status, edge.status, corner.status]).toEqual([201, 201, 201]);
  });

  it("allows an overlap of one square metre or less", async () => {
    const x = originX + 0.02; const y = originY;
    expect((await postAsClerk("/api/parcels", proposal(rectangle(x, y, 0.0002, 0.0002)))).status).toBe(201);
    const tinyOverlap = rectangle(x + 0.00019996, y, 0.0002, 0.0002);
    const response = await postAsClerk("/api/parcels", proposal(tinyOverlap));
    expect(response.status).toBe(201);
  });

  it("blocks overlap above one square metre with a structured 409 and OPEN dispute", async () => {
    const x = originX + 0.03; const y = originY; const key = randomUUID();
    const accepted = await postAsClerk("/api/parcels", proposal(rectangle(x, y)));
    const response = await postAsClerk("/api/parcels", proposal(rectangle(x + 0.0002, y + 0.0001), key));
    expect(accepted.status).toBe(201); expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ success: false, code: "PARCEL_OVERLAP" });
    expect(response.body.data.conflicts[0].overlapAreaM2).toBeGreaterThan(1);
    expect(response.body.data.conflicts[0].geometry.type).toBe("Polygon");
    const dispute = await prisma.dispute.findUnique({ where: { id: response.body.data.disputeId }, include: { candidate: true } });
    expect(dispute.status).toBe("OPEN"); expect(dispute.candidate.status).toBe("BLOCKED");
    expect(await prisma.parcel.count({ where: { registrationKey: key } })).toBe(0);
  });

  it("detects complete containment and preserves proposed owner evidence", async () => {
    const x = originX + 0.04; const y = originY;
    await postAsClerk("/api/parcels", proposal(rectangle(x, y, 0.0005, 0.0005)));
    const response = await postAsClerk("/api/parcels", proposal(rectangle(x + 0.0001, y + 0.0001, 0.0001, 0.0001)));
    expect(response.status).toBe(409);
    const candidate = await prisma.parcelCandidate.findUnique({ where: { disputeId: response.body.data.disputeId }, select: { ownerSnapshot: true } });
    expect(candidate.ownerSnapshot[0]).toMatchObject({ ownerId: legalOwner.id, sharePercent: 100 });
  });

  it("returns every conflicting active parcel", async () => {
    const x = originX + 0.05; const y = originY;
    await postAsClerk("/api/parcels", proposal(rectangle(x, y, 0.00025, 0.0003)));
    await postAsClerk("/api/parcels", proposal(rectangle(x + 0.00025, y, 0.00025, 0.0003)));
    const response = await postAsClerk("/api/parcels", proposal(rectangle(x + 0.0001, y + 0.00005, 0.0003, 0.0002)));
    expect(response.status).toBe(409); expect(response.body.data.conflicts.length).toBe(2);
  });

  it("keeps a disputed active parcel in the blocking set", async () => {
    const x = originX + 0.06; const y = originY;
    const accepted = await postAsClerk("/api/parcels", proposal(rectangle(x, y)));
    await prisma.parcel.update({ where: { id: accepted.body.data.id }, data: { status: "DISPUTED" } });
    const open = await prisma.dispute.create({ data: { description: "Test open dispute", openedById: clerkUser.id } });
    await prisma.disputeParcel.create({ data: { disputeId: open.id, parcelId: accepted.body.data.id } });
    const response = await postAsClerk("/api/parcels", proposal(rectangle(x + 0.0001, y + 0.0001)));
    expect(response.status).toBe(409);
    expect(response.body.data.conflicts.some((item) => item.parcelId === accepted.body.data.id)).toBe(true);
  });

  it("rejects malformed and self-intersecting geometry before persistence", async () => {
    const malformed = proposal({ type: "Polygon", coordinates: [[[originX, originY], [originX + 0.1, originY]]] });
    const bowTie = proposal({ type: "Polygon", coordinates: [[[originX, originY], [originX + 0.0004, originY + 0.0004], [originX, originY + 0.0004], [originX + 0.0004, originY], [originX, originY]]] });
    expect((await postAsClerk("/api/parcels", malformed)).status).toBe(422);
    expect((await postAsClerk("/api/parcels", bowTie)).status).toBe(422);
  });

  it("blocks OWNER and SURVEYOR roles from parcel registration", async () => {
    const body = proposal(rectangle(originX + 0.07, originY));
    const ownerResponse = await request(app).post("/api/parcels").set("Cookie", ownerCookies).set("X-CSRF-Token", csrfFrom(ownerCookies)).send(body);
    const surveyorResponse = await request(app).post("/api/parcels").set("Cookie", surveyorCookies).set("X-CSRF-Token", csrfFrom(surveyorCookies)).send({ ...body, idempotencyKey: randomUUID() });
    expect(ownerResponse.status).toBe(403); expect(surveyorResponse.status).toBe(403);
  });

  it("deduplicates an overlapping browser retry", async () => {
    const x = originX + 0.08; const y = originY; const key = randomUUID();
    await postAsClerk("/api/parcels", proposal(rectangle(x, y)));
    const body = proposal(rectangle(x + 0.0001, y + 0.0001), key);
    const first = await postAsClerk("/api/parcels", body); const retry = await postAsClerk("/api/parcels", body);
    expect(first.status).toBe(409); expect(retry.status).toBe(409);
    expect(retry.body.data.disputeId).toBe(first.body.data.disputeId);
    expect(await prisma.parcelCandidate.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it("does not modify an existing parcel while checking conflicts", async () => {
    const x = originX + 0.09; const y = originY;
    const accepted = await postAsClerk("/api/parcels", proposal(rectangle(x, y)));
    const before = await prisma.parcel.findUnique({ where: { id: accepted.body.data.id }, select: { updatedAt: true } });
    await postAsClerk("/api/parcels", proposal(rectangle(x + 0.0001, y + 0.0001)));
    const after = await prisma.parcel.findUnique({ where: { id: accepted.body.data.id }, select: { updatedAt: true } });
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
  });

  it("serializes concurrent overlapping registrations so both cannot succeed", async () => {
    const x = originX + 0.1; const y = originY;
    const [first, second] = await Promise.all([
      postAsClerk("/api/parcels", proposal(rectangle(x, y, 0.0004, 0.0004))),
      postAsClerk("/api/parcels", proposal(rectangle(x + 0.00015, y + 0.00015, 0.0004, 0.0004))),
    ]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
  });

  it("returns dispute details with proposed and conflict geometry", async () => {
    const x = originX + 0.11; const y = originY;
    await postAsClerk("/api/parcels", proposal(rectangle(x, y)));
    const blocked = await postAsClerk("/api/parcels", proposal(rectangle(x + 0.0001, y + 0.0001)));
    const detail = await request(app).get(`/api/disputes/${blocked.body.data.disputeId}`).set("Cookie", clerkCookies);
    expect(detail.status).toBe(200);
    expect(detail.body.data.proposedGeometry.type).toBe("Polygon");
    expect(detail.body.data.conflicts[0].geometry.type).toBe("Polygon");
  });
});
