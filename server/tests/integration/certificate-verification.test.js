import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { getPrisma } from "../../src/lib/prisma.js";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const suite = enabled ? describe : describe.skip;
const app = createApp(); const password = "Certificate!2026";
const cookiesFrom = (response) => response.headers["set-cookie"]?.map((cookie) => cookie.split(";")[0]) || [];
const csrfFrom = (cookies) => decodeURIComponent(cookies.find((cookie) => cookie.startsWith("csrf_token="))?.split("=")[1] || "");

suite("title certificates and public verification", () => {
  const prisma = enabled ? getPrisma() : null; let registrar; let clerk; let ownerCookies; let parcel; let owner; let certificate;
  async function login(email) { const response = await request(app).post("/api/auth/login").send({ email, password }); expect(response.status).toBe(200); return cookiesFrom(response); }
  function postAs(cookies, url) { return request(app).post(url).set("Cookie", cookies).set("X-CSRF-Token", csrfFrom(cookies)); }

  beforeAll(async () => {
    const [database] = await prisma.$queryRaw`SELECT current_database() AS name`; if (!database.name.endsWith("_test")) throw new Error("Certificate tests require an isolated _test database");
    const hash = await bcrypt.hash(password, 4); const suffix = randomUUID().slice(0, 8).toUpperCase();
    const users = {};
    for (const roleName of ["REGISTRAR", "CLERK", "OWNER"]) {
      const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName, description: roleName } });
      users[roleName] = await prisma.user.create({ data: { fullName: `Certificate ${roleName}`, email: `certificate-${roleName.toLowerCase()}-${suffix.toLowerCase()}@example.com`, passwordHash: hash, roleId: role.id } });
    }
    owner = await prisma.owner.create({ data: { ownerType: "PERSON", fullName: "Certificate Owner", identityNumber: `NID-${randomUUID()}`, phone: "+252610000999", email: `private-${suffix.toLowerCase()}@example.com`, userId: users.OWNER.id } });
    const district = await prisma.district.findFirst({ where: { code: "HDN" } });
    const geometry = { type: "Polygon", coordinates: [[[49, 6], [49.001, 6], [49.001, 6.001], [49, 6.001], [49, 6]]] };
    const [row] = await prisma.$queryRaw`INSERT INTO parcels (parcel_number,district_id,area_name,land_use,geometry,area_m2,status,created_by_id,approved_by_id,approved_at,created_at,updated_at) VALUES (${`TST-CERT-${suffix}`},${district.id},'Certificate Area','RESIDENTIAL'::"LandUse",ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}),4326),10000,'REGISTERED'::"ParcelStatus",${users.CLERK.id},${users.REGISTRAR.id},NOW(),NOW(),NOW()) RETURNING id`;
    await prisma.parcelOwner.create({ data: { parcelId: row.id, ownerId: owner.id, sharePercent: 100 } });
    await prisma.ownershipHistory.create({ data: { parcelId: row.id, eventType: "REGISTRATION", effectiveAt: new Date(), approvedById: users.REGISTRAR.id, ownershipSnapshot: { owners: [{ ownerId: owner.id, name: owner.fullName, sharePercent: "100.00" }] } } });
    parcel = { id: row.id, number: `TST-CERT-${suffix}` };
    registrar = await login(users.REGISTRAR.email); clerk = await login(users.CLERK.email); ownerCookies = await login(users.OWNER.email);
  });

  it("allows only a registrar to issue a certificate", async () => {
    expect((await postAs(clerk, `/api/parcels/${parcel.id}/certificates`)).status).toBe(403);
    const response = await postAs(registrar, `/api/parcels/${parcel.id}/certificates`);
    expect(response.status).toBe(201); expect(response.body.data.status).toBe("CURRENT"); expect(response.body.data.certificateNumber).toContain(parcel.number);
    certificate = await prisma.certificate.findFirst({ where: { parcelId: parcel.id, status: "CURRENT" } });
    expect(certificate.certificateSnapshot.owners[0].name).toBe("Certificate Owner");
    expect(await prisma.certificate.count({ where: { parcelId: parcel.id, status: "CURRENT" } })).toBe(1);
  });

  it("supersedes the previous certificate while keeping it downloadable", async () => {
    const previous = certificate;
    const response = await postAs(registrar, `/api/parcels/${parcel.id}/certificates`);
    expect(response.status).toBe(201);
    certificate = await prisma.certificate.findFirst({ where: { parcelId: parcel.id, status: "CURRENT" } });
    expect(certificate.id).not.toBe(previous.id);
    expect((await prisma.certificate.findUnique({ where: { id: previous.id } })).status).toBe("SUPERSEDED");
    expect(await prisma.certificate.count({ where: { parcelId: parcel.id, status: "CURRENT" } })).toBe(1);
    expect((await request(app).get(`/api/certificates/${previous.id}/download?lang=en`).set("Cookie", ownerCookies)).status).toBe(200);
  });

  it("downloads English and Somali PDFs for an authorized owner", async () => {
    for (const lang of ["en", "so"]) {
      const response = await request(app).get(`/api/certificates/${certificate.id}/download?lang=${lang}`).set("Cookie", ownerCookies);
      expect(response.status).toBe(200); expect(response.headers["content-type"]).toContain("application/pdf"); expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
    }
  });

  it("verifies a current certificate publicly without leaking identity or contact fields", async () => {
    const response = await request(app).get(`/api/public/verify/${certificate.verificationToken}`).set("X-Forwarded-For", "198.51.100.10");
    expect(response.status).toBe(200); expect(response.body.data.status).toBe("CURRENT"); expect(response.body.data.owners[0].name).toBe("Certificate Owner");
    const serialized = JSON.stringify(response.body); expect(serialized).not.toContain(owner.identityNumber); expect(serialized).not.toContain(owner.phone); expect(serialized).not.toContain(owner.email);
  });

  it("manual verification requires a matching parcel and certificate", async () => {
    const valid = await request(app).post("/api/public/verify").set("X-Forwarded-For", "198.51.100.11").send({ parcelNumber: parcel.number, certificateNumber: certificate.certificateNumber });
    expect(valid.body.data.status).toBe("CURRENT");
    const invalid = await request(app).post("/api/public/verify").set("X-Forwarded-For", "198.51.100.12").send({ parcelNumber: "MGQ-HDN-999999", certificateNumber: certificate.certificateNumber });
    expect(invalid.body.data).toEqual({ status: "INVALID", message: "This certificate could not be verified." });
  });

  it("shares one ten-per-minute limit across token and manual verification", async () => {
    const ip = "198.51.100.20";
    for (let index = 0; index < 5; index += 1) expect((await request(app).get(`/api/public/verify/${certificate.verificationToken}`).set("X-Forwarded-For", ip)).status).toBe(200);
    for (let index = 0; index < 5; index += 1) expect((await request(app).post("/api/public/verify").set("X-Forwarded-For", ip).send({ parcelNumber: parcel.number, certificateNumber: certificate.certificateNumber })).status).toBe(200);
    expect((await request(app).get(`/api/public/verify/${certificate.verificationToken}`).set("X-Forwarded-For", ip)).status).toBe(429);
  });
});
