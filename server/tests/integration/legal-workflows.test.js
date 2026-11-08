import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { getPrisma } from "../../src/lib/prisma.js";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const suite = enabled ? describe : describe.skip;
const app = createApp(); const password = "LegalWorkflow!2026";
const cookiesFrom = (response) => response.headers["set-cookie"]?.map((cookie) => cookie.split(";")[0]) || [];
const csrfFrom = (cookies) => decodeURIComponent(cookies.find((cookie) => cookie.startsWith("csrf_token="))?.split("=")[1] || "");

suite("encumbrance and dispute workflows", () => {
  const prisma = enabled ? getPrisma() : null; const sessions = {}; let owner; let buyer; let parcel; let disputedParcel; let correctedGeometry; let encumbranceId; let disputeId;
  async function login(email) { const response = await request(app).post("/api/auth/login").send({ email, password }); expect(response.status).toBe(200); return cookiesFrom(response); }
  function mutate(name, method, url) { return request(app)[method](url).set("Cookie", sessions[name]).set("X-CSRF-Token", csrfFrom(sessions[name])); }

  beforeAll(async () => {
    const [database] = await prisma.$queryRaw`SELECT current_database() AS name`; if (!database.name.endsWith("_test")) throw new Error("Legal workflow tests require an isolated _test database");
    const suffix = randomUUID().slice(0, 8).toLowerCase(); const hash = await bcrypt.hash(password, 4); const accounts = {}; const roles = {};
    for (const roleName of ["OWNER", "CLERK", "REGISTRAR", "SURVEYOR"]) roles[roleName] = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName, description: roleName } });
    for (const [name, role] of [["owner", "OWNER"], ["buyer", "OWNER"], ["clerk", "CLERK"], ["registrar", "REGISTRAR"], ["surveyor", "SURVEYOR"]]) accounts[name] = await prisma.user.create({ data: { fullName: `Legal ${name}`, email: `legal-${name}-${suffix}@example.com`, passwordHash: hash, roleId: roles[role].id } });
    owner = await prisma.owner.create({ data: { ownerType: "PERSON", fullName: "Legal Owner", identityNumber: `LEGAL-OWNER-${suffix}`, userId: accounts.owner.id } });
    buyer = await prisma.owner.create({ data: { ownerType: "PERSON", fullName: "Legal Buyer", identityNumber: `LEGAL-BUYER-${suffix}`, userId: accounts.buyer.id } });
    const district = await prisma.district.findFirst({ where: { code: "HDN" } }); const seed = parseInt(randomUUID().slice(0, 8), 16) / 0xffffffff; const base = -90 + seed * 5;
    async function createParcel(number, x) { const geometry = { type: "Polygon", coordinates: [[[x, 20], [x + 0.0003, 20], [x + 0.0003, 20.0003], [x, 20.0003], [x, 20]]] }; const [row] = await prisma.$queryRaw`INSERT INTO parcels (parcel_number,district_id,area_name,land_use,geometry,area_m2,status,created_by_id,approved_by_id,approved_at,created_at,updated_at) VALUES (${number},${district.id},'Legal Test','RESIDENTIAL'::"LandUse",ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}),4326),1000,'REGISTERED'::"ParcelStatus",${accounts.clerk.id},${accounts.registrar.id},NOW(),NOW(),NOW()) RETURNING id, parcel_number AS "parcelNumber"`; await prisma.parcelOwner.create({ data: { parcelId: row.id, ownerId: owner.id, sharePercent: 100 } }); await prisma.ownershipHistory.create({ data: { parcelId: row.id, eventType: "REGISTRATION", effectiveAt: new Date(), approvedById: accounts.registrar.id, ownershipSnapshot: { owners: [{ ownerId: owner.id, name: owner.fullName, sharePercent: "100.00" }] } } }); return row; }
    parcel = await createParcel(`LEGAL-ENC-${suffix}`, base); disputedParcel = await createParcel(`LEGAL-DSP-${suffix}`, base + 0.01); correctedGeometry = { type: "Polygon", coordinates: [[[base + 0.01005, 20.00005], [base + 0.01032, 20.00005], [base + 0.01032, 20.00032], [base + 0.01005, 20.00032], [base + 0.01005, 20.00005]]] };
    for (const name of Object.keys(accounts)) sessions[name] = await login(accounts[name].email);
  });

  it("allows only a registrar to add and evidentially lift a court hold", async () => {
    expect((await mutate("clerk", "post", `/api/parcels/${parcel.id}/encumbrances`).send({ type: "COURT_HOLD", courtCaseNumber: "CASE-403" })).status).toBe(403);
    const added = await mutate("registrar", "post", `/api/parcels/${parcel.id}/encumbrances`).send({ type: "COURT_HOLD", courtCaseNumber: "CASE-2026-77" });
    expect(added.status).toBe(201); expect(added.body.data.status).toBe("ACTIVE"); encumbranceId = added.body.data.id;
    const blocked = await mutate("owner", "post", "/api/transfers").send({ parcelId: parcel.id, buyerOwnerId: buyer.id, transferType: "SALE", declaredPrice: 10000 });
    expect(blocked.status).toBe(409); expect(blocked.body.message).toMatch(/encumbrance/i);
    expect((await mutate("registrar", "post", `/api/encumbrances/${encumbranceId}/lift`).field("reason", "Court released the hold")).status).toBe(422);
    const lifted = await mutate("registrar", "post", `/api/encumbrances/${encumbranceId}/lift`).field("reason", "Court released the hold after settlement").attach("evidence", Buffer.from("%PDF-1.4\n%%EOF"), { filename: "release.pdf", contentType: "application/pdf" });
    expect(lifted.status).toBe(200); expect(lifted.body.data.status).toBe("LIFTED");
    expect((await mutate("owner", "post", "/api/transfers").send({ parcelId: parcel.id, buyerOwnerId: buyer.id, transferType: "SALE", declaredPrice: 10000 })).status).toBe(201);
  });

  it("opens, evidences, reviews, and resolves a dispute with a protected resurvey", async () => {
    const opened = await mutate("clerk", "post", "/api/disputes").send({ description: "Manual boundary disagreement requiring registrar review.", parcelIds: [disputedParcel.id] });
    expect(opened.status).toBe(201); disputeId = opened.body.data.id;
    expect((await mutate("owner", "post", "/api/transfers").send({ parcelId: disputedParcel.id, buyerOwnerId: buyer.id, transferType: "SALE", declaredPrice: 12000 })).status).toBe(409);
    const evidence = await mutate("clerk", "post", `/api/disputes/${disputeId}/evidence`).attach("evidence", Buffer.from("%PDF-1.4\n%%EOF"), { filename: "claim.pdf", contentType: "application/pdf" }); expect(evidence.status).toBe(201);
    expect((await mutate("registrar", "post", `/api/disputes/${disputeId}/review`).send({})).body.data.status).toBe("UNDER_REVIEW");
    const resolved = await mutate("registrar", "post", `/api/disputes/${disputeId}/resolve`).send({ resolution: "Parties agreed that a new verified field boundary is required.", boundaryChangeParcelIds: [disputedParcel.id] });
    expect(resolved.status).toBe(200); expect(resolved.body.data.status).toBe("RESOLVED");
    expect((await prisma.parcel.findUnique({ where: { id: disputedParcel.id } })).status).toBe("DISPUTED");
    expect(await prisma.survey.count({ where: { parcelId: disputedParcel.id, status: "PENDING", boundaryCorrection: true } })).toBe(1);
  });

  it("keeps a disputed boundary unchanged until survey and registrar approval", async () => {
    const survey = await prisma.survey.findFirst({ where: { parcelId: disputedParcel.id, boundaryCorrection: true }, select: { id: true } });
    const uploaded = await mutate("surveyor", "post", `/api/surveys/${survey.id}/report`).attach("report", Buffer.from("%PDF-1.4\n%%EOF"), { filename: "boundary.pdf", contentType: "application/pdf" }); expect(uploaded.status).toBe(201);
    const verified = await mutate("surveyor", "post", `/api/surveys/${survey.id}/verify`).send({ notes: "Corrected field boundary verified.", adjustedBoundary: correctedGeometry }); expect(verified.status).toBe(200);
    const [beforeApproval] = await prisma.$queryRaw`SELECT ST_Equals(geometry, ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(correctedGeometry)}),4326)) AS matches FROM parcels WHERE id=${disputedParcel.id}`;
    expect(beforeApproval.matches).toBe(false);
    const approved = await mutate("registrar", "post", `/api/parcels/${disputedParcel.id}/approve`).send({}); expect(approved.status).toBe(201);
    const [afterApproval] = await prisma.$queryRaw`SELECT status, ST_Equals(geometry, ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(correctedGeometry)}),4326)) AS matches FROM parcels WHERE id=${disputedParcel.id}`;
    expect(afterApproval.status).toBe("REGISTERED"); expect(afterApproval.matches).toBe(true);
    expect(await prisma.ownershipHistory.count({ where: { parcelId: disputedParcel.id, eventType: "CORRECTION" } })).toBe(1);
  });
});
