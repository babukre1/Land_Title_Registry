import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { getPrisma } from "../../src/lib/prisma.js";

const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suite = hasTestDatabase ? describe : describe.skip;
const app = createApp(); const password = "Transfer!2026";
function cookiesFrom(response) { return response.headers["set-cookie"]?.map((cookie) => cookie.split(";")[0]) || []; }
function csrfFrom(cookies) { return decodeURIComponent(cookies.find((cookie) => cookie.startsWith("csrf_token="))?.split("=")[1] || ""); }

suite("official ownership and whole-parcel sale transfer", () => {
  const prisma = hasTestDatabase ? getPrisma() : null; const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const sessions = {}; let parcel; let seller; let jointSeller; let buyer; let transferId;
  async function login(email) { const response = await request(app).post("/api/auth/login").send({ email, password }); expect(response.status).toBe(200); return cookiesFrom(response); }
  function postAs(name, path, body) { return request(app).post(path).set("Cookie", sessions[name]).set("X-CSRF-Token", csrfFrom(sessions[name])).send(body); }

  beforeAll(async () => {
    const [database] = await prisma.$queryRaw`SELECT current_database() AS name`; if (!database.name.endsWith("_test")) throw new Error("Transfer tests require an isolated _test database");
    const hash = await bcrypt.hash(password, 4); const roles = {};
    for (const roleName of ["OWNER", "CLERK", "REGISTRAR"]) roles[roleName] = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName, description: roleName } });
    async function user(name, role = "OWNER") { return prisma.user.create({ data: { fullName: name, email: `${name.toLowerCase().replaceAll(" ", "-")}-${suffix}@example.com`, passwordHash: hash, roleId: roles[role].id } }); }
    const sellerUser = await user("Transfer Seller"); const jointUser = await user("Transfer Joint"); const buyerUser = await user("Transfer Buyer"); const unrelatedUser = await user("Transfer Unrelated"); const clerk = await user("Transfer Clerk", "CLERK"); const registrar = await user("Transfer Registrar", "REGISTRAR");
    seller = await prisma.owner.create({ data: { ownerType: "PERSON", fullName: "Transfer Seller", identityNumber: `SELLER-${suffix}`, userId: sellerUser.id } });
    jointSeller = await prisma.owner.create({ data: { ownerType: "PERSON", fullName: "Transfer Joint", identityNumber: `JOINT-${suffix}`, userId: jointUser.id } });
    buyer = await prisma.owner.create({ data: { ownerType: "PERSON", fullName: "Transfer Buyer", identityNumber: `BUYER-${suffix}`, userId: buyerUser.id } });
    await prisma.owner.create({ data: { ownerType: "PERSON", fullName: "Transfer Unrelated", identityNumber: `UNRELATED-${suffix}`, userId: unrelatedUser.id } });
    const district = await prisma.district.upsert({ where: { regionCode_code: { regionCode: "TST", code: "TRF" } }, update: {}, create: { name: "Transfer Test", code: "TRF", regionName: "Tests", regionCode: "TST" } });
    const x = 48 + ((Date.now() % 10000) / 1000000); const geometry = { type: "Polygon", coordinates: [[[x, 5], [x + 0.0003, 5], [x + 0.0003, 5.0003], [x, 5.0003], [x, 5]]] };
    const [row] = await prisma.$queryRaw`INSERT INTO parcels (parcel_number,district_id,area_name,land_use,geometry,area_m2,status,created_by_id,approved_by_id,approved_at,created_at,updated_at) VALUES (${`TST-TRF-${suffix}`},${district.id},'Transfer Area','RESIDENTIAL'::"LandUse",ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}),4326),1000,'REGISTERED'::"ParcelStatus",${clerk.id},${registrar.id},NOW(),NOW(),NOW()) RETURNING id, parcel_number AS "parcelNumber"`;
    parcel = row;
    await prisma.parcelOwner.createMany({ data: [{ parcelId: parcel.id, ownerId: seller.id, sharePercent: 60 }, { parcelId: parcel.id, ownerId: jointSeller.id, sharePercent: 40 }] });
    await prisma.ownershipHistory.create({ data: { parcelId: parcel.id, eventType: "REGISTRATION", effectiveAt: new Date(), approvedById: registrar.id, ownershipSnapshot: { owners: [{ ownerId: seller.id, name: seller.fullName, sharePercent: "60.00" }, { ownerId: jointSeller.id, name: jointSeller.fullName, sharePercent: "40.00" }] } } });
    for (const [name, account] of Object.entries({ seller: sellerUser, joint: jointUser, buyer: buyerUser, unrelated: unrelatedUser, clerk, registrar })) sessions[name] = await login(account.email);
  });

  it("returns current official ownership and keeps unrelated owners private", async () => {
    const own = await request(app).get(`/api/parcels/${parcel.id}/owners`).set("Cookie", sessions.seller); expect(own.status).toBe(200); expect(own.body.data.map((item) => item.sharePercent)).toEqual(["60.00", "40.00"]);
    const history = await request(app).get(`/api/parcels/${parcel.id}/history`).set("Cookie", sessions.seller); expect(history.status).toBe(200); expect(history.body.data[0].ownershipSnapshot.owners[0].sharePercent).toBe("60.00");
    expect((await request(app).get(`/api/parcels/${parcel.id}/owners`).set("Cookie", sessions.unrelated)).status).toBe(403);
    const mine = await request(app).get("/api/my/parcels").set("Cookie", sessions.seller); expect(mine.body.data.some((item) => item.id === parcel.id && item.ownershipShare === "60.00")).toBe(true);
  });

  it("creates seller consents and enforces participant identities", async () => {
    const created = await postAs("seller", "/api/transfers", { parcelId: parcel.id, buyerOwnerId: buyer.id, transferType: "SALE", declaredPrice: 25000 });
    expect(created.status).toBe(201); transferId = created.body.data.id; expect(created.body.data.consents).toHaveLength(2); expect(created.body.data.status).toBe("AWAITING_OWNER_CONSENT");
    expect((await postAs("unrelated", `/api/transfers/${transferId}/consent`, { decision: "CONFIRMED" })).status).toBe(403);
    expect((await postAs("seller", "/api/transfers", { parcelId: parcel.id, buyerOwnerId: buyer.id, transferType: "SALE", declaredPrice: 25000 })).status).toBe(409);
  });

  it("requires every seller, the buyer, documents, clerk review, and payment", async () => {
    expect((await postAs("seller", `/api/transfers/${transferId}/consent`, { decision: "CONFIRMED" })).body.data.status).toBe("AWAITING_OWNER_CONSENT");
    expect((await postAs("joint", `/api/transfers/${transferId}/consent`, { decision: "CONFIRMED" })).body.data.status).toBe("AWAITING_BUYER_ACCEPTANCE");
    expect((await postAs("unrelated", `/api/transfers/${transferId}/buyer-response`, { decision: "ACCEPTED" })).status).toBe(403);
    expect((await postAs("buyer", `/api/transfers/${transferId}/buyer-response`, { decision: "ACCEPTED" })).body.data.status).toBe("CLERK_REVIEW");
    const noDocument = await postAs("clerk", `/api/transfers/${transferId}/clerk-review`, { decision: "APPROVED", notes: "Checked complete file" }); expect(noDocument.status).toBe(422);
    const upload = await request(app).post(`/api/transfers/${transferId}/documents`).set("Cookie", sessions.seller).set("X-CSRF-Token", csrfFrom(sessions.seller)).attach("document", Buffer.from("%PDF-1.4\n%%EOF"), { filename: "sale.pdf", contentType: "application/pdf" }); expect(upload.status).toBe(201);
    const reviewed = await postAs("clerk", `/api/transfers/${transferId}/clerk-review`, { decision: "APPROVED", notes: "Supporting sale document checked" }); expect(reviewed.body.data.status).toBe("AWAITING_PAYMENT");
    const blocked = await postAs("registrar", `/api/transfers/${transferId}/approve`, {}); expect(blocked.status).toBe(409); expect(blocked.body.message).toMatch(/Payment required/i);
  });

  it("atomically changes ownership once after an internally verified payment", async () => {
    await prisma.payment.create({ data: { transferId, amount: 500, paymentMethod: "EVC_PLUS", status: "PAID", referenceNumber: `PAID-${suffix}`, paidAt: new Date() } });
    const approved = await postAs("registrar", `/api/transfers/${transferId}/approve`, {}); expect(approved.status).toBe(201); expect(approved.body.data.status).toBe("APPROVED");
    const retry = await postAs("registrar", `/api/transfers/${transferId}/approve`, {}); expect(retry.status).toBe(200); expect(retry.body.repeated).toBe(true);
    const owners = await prisma.parcelOwner.findMany({ where: { parcelId: parcel.id } }); expect(owners).toHaveLength(1); expect(owners[0].ownerId).toBe(buyer.id); expect(owners[0].sharePercent.toFixed(2)).toBe("100.00");
    expect(await prisma.ownershipHistory.count({ where: { transferId } })).toBe(1); expect(await prisma.ownershipHistory.count({ where: { parcelId: parcel.id } })).toBe(2);
    expect((await postAs("seller", `/api/transfers/${transferId}/cancel`, { reason: "Too late" })).status).toBe(409);
  });
});
