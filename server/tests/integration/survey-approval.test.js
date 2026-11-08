import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { getPrisma } from "../../src/lib/prisma.js";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const suite = enabled ? describe : describe.skip;
const app = createApp();
const password = "SurveyFlow!2026";
const cookiesFrom = (response) => response.headers["set-cookie"]?.map((cookie) => cookie.split(";")[0]) || [];
const csrfFrom = (cookies) => decodeURIComponent(cookies.find((cookie) => cookie.startsWith("csrf_token="))?.split("=")[1] || "");
const rectangle = (x, y, w = 0.00025, h = 0.00025) => ({ type: "Polygon", coordinates: [[[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]] });

suite("survey verification and registrar approval", () => {
  const prisma = enabled ? getPrisma() : null;
  let district; let owner; let clerk; let surveyor; let registrar; let ownerUser;
  const base = -160 + (parseInt(randomUUID().slice(0, 8), 16) / 0xffffffff) * 20;

  async function login(email) { const response = await request(app).post("/api/auth/login").send({ email, password }); expect(response.status).toBe(200); return cookiesFrom(response); }
  function mutate(cookies, method, url) { return request(app)[method](url).set("Cookie", cookies).set("X-CSRF-Token", csrfFrom(cookies)); }
  async function register(x, y) {
    const response = await mutate(clerk, "post", "/api/parcels").send({ districtId: district.id, areaName: `Survey test ${randomUUID().slice(0, 8)}`, landUse: "RESIDENTIAL", geometry: rectangle(x, y), owners: [{ ownerId: owner.id, sharePercent: 100 }], confirmUnusualArea: false, idempotencyKey: randomUUID() });
    expect(response.status).toBe(201);
    return response.body.data;
  }
  async function upload(surveyId) { return mutate(surveyor, "post", `/api/surveys/${surveyId}/report`).attach("report", Buffer.from("%PDF-1.4\nphase-seven-test\n%%EOF"), { filename: "field-report.pdf", contentType: "application/pdf" }); }

  beforeAll(async () => {
    const [database] = await prisma.$queryRaw`SELECT current_database() AS name`;
    if (!database.name.endsWith("_test")) throw new Error("Phase 7 tests require an isolated _test database");
    const hash = await bcrypt.hash(password, 4);
    for (const roleName of ["CLERK", "SURVEYOR", "REGISTRAR", "OWNER"]) {
      const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName, description: roleName } });
      await prisma.user.upsert({ where: { email: `phase7-${roleName.toLowerCase()}@example.com` }, update: { passwordHash: hash, roleId: role.id, isActive: true }, create: { fullName: `Phase 7 ${roleName}`, email: `phase7-${roleName.toLowerCase()}@example.com`, passwordHash: hash, roleId: role.id } });
    }
    district = await prisma.district.findFirst({ where: { code: "HDN" } });
    owner = await prisma.owner.upsert({ where: { identityNumber: "PHASE7-OWNER" }, update: {}, create: { ownerType: "PERSON", fullName: "Phase Seven Owner", identityNumber: "PHASE7-OWNER" } });
    clerk = await login("phase7-clerk@example.com"); surveyor = await login("phase7-surveyor@example.com"); registrar = await login("phase7-registrar@example.com"); ownerUser = await login("phase7-owner@example.com");
  });

  it("lists pending surveys and returns boundary details", async () => {
    const parcel = await register(base, 4);
    const list = await request(app).get(`/api/surveys?parcelNumber=${parcel.parcelNumber}`).set("Cookie", surveyor);
    expect(list.status).toBe(200); expect(list.body.data).toHaveLength(1);
    const detail = await request(app).get(`/api/surveys/${parcel.surveys[0].id}`).set("Cookie", clerk);
    expect(detail.status).toBe(200); expect(detail.body.data.currentGeometry.type).toBe("Polygon");
  });

  it("requires a report and rejects unauthorized survey verification", async () => {
    const parcel = await register(base + 0.01, 4); const id = parcel.surveys[0].id;
    expect((await mutate(surveyor, "post", `/api/surveys/${id}/verify`).send({ notes: "Field visit complete" })).status).toBe(422);
    expect((await mutate(ownerUser, "post", `/api/surveys/${id}/verify`).send({ notes: "Not authorized" })).status).toBe(403);
    expect((await mutate(clerk, "post", `/api/surveys/${id}/verify`).send({ notes: "Not authorized" })).status).toBe(403);
  });

  it("validates report signatures and accepts a private PDF report", async () => {
    const parcel = await register(base + 0.02, 4); const id = parcel.surveys[0].id;
    const fake = await mutate(surveyor, "post", `/api/surveys/${id}/report`).attach("report", Buffer.from("not a pdf"), { filename: "fake.pdf", contentType: "application/pdf" });
    expect(fake.status).toBe(422);
    const saved = await upload(id); expect(saved.status).toBe(201); expect(saved.body.data.mimeType).toBe("application/pdf");
    const download = await request(app).get(`/api/surveys/${id}/report`).set("Cookie", registrar);
    expect(download.status).toBe(200); expect(download.headers["content-type"]).toContain("application/pdf");
  });

  it("completes clerk to surveyor to registrar registration atomically", async () => {
    const parcel = await register(base + 0.03, 4); const surveyId = parcel.surveys[0].id;
    expect((await upload(surveyId)).status).toBe(201);
    const verified = await mutate(surveyor, "post", `/api/surveys/${surveyId}/verify`).send({ notes: "Monuments and boundary confirmed on site." });
    expect(verified.status).toBe(200); expect(verified.body.data.status).toBe("VERIFIED"); expect(verified.body.data.parcel.status).toBe("VERIFIED");
    const queue = await request(app).get("/api/registrations/pending-approval").set("Cookie", registrar);
    expect(queue.status).toBe(200); expect(queue.body.data.some((item) => item.id === parcel.id)).toBe(true);
    expect((await mutate(ownerUser, "post", `/api/parcels/${parcel.id}/approve`)).status).toBe(403);
    const approved = await mutate(registrar, "post", `/api/parcels/${parcel.id}/approve`);
    expect(approved.status).toBe(201); expect(approved.body.data.status).toBe("REGISTERED");
    const stored = await prisma.parcel.findUnique({ where: { id: parcel.id }, include: { history: true } });
    expect(stored.approvedById).toBeTruthy(); expect(stored.approvedAt).toBeTruthy(); expect(stored.history).toHaveLength(1); expect(stored.history[0].eventType).toBe("REGISTRATION");
    const repeated = await mutate(registrar, "post", `/api/parcels/${parcel.id}/approve`);
    expect(repeated.status).toBe(200); expect(repeated.body.repeated).toBe(true);
    expect(await prisma.ownershipHistory.count({ where: { parcelId: parcel.id, eventType: "REGISTRATION" } })).toBe(1);
  });

  it("adjusts a boundary and recalculates its area", async () => {
    const parcel = await register(base + 0.04, 4); const surveyId = parcel.surveys[0].id; await upload(surveyId);
    const adjusted = rectangle(base + 0.04, 4, 0.00035, 0.00025);
    const response = await mutate(surveyor, "post", `/api/surveys/${surveyId}/verify`).send({ notes: "Adjusted east monument after field measurement.", adjustedBoundary: adjusted });
    expect(response.status).toBe(200); expect(Number(response.body.data.parcel.areaM2)).toBeGreaterThan(Number(parcel.areaM2));
  });

  it("preserves conflict evidence when an adjusted boundary overlaps", async () => {
    const protectedParcel = await register(base + 0.05, 4); const protectedSurvey = protectedParcel.surveys[0].id; await upload(protectedSurvey); await mutate(surveyor, "post", `/api/surveys/${protectedSurvey}/verify`).send({ notes: "Protected field boundary verified." });
    const parcel = await register(base + 0.051, 4); const surveyId = parcel.surveys[0].id; await upload(surveyId);
    const response = await mutate(surveyor, "post", `/api/surveys/${surveyId}/verify`).send({ notes: "Proposed adjustment conflicts in field.", adjustedBoundary: rectangle(base + 0.0501, 4) });
    expect(response.status).toBe(409); expect(response.body.code).toBe("SURVEY_BOUNDARY_OVERLAP");
    expect(await prisma.parcelCandidate.count({ where: { disputeId: response.body.data.disputeId } })).toBe(1);
    expect((await prisma.parcel.findUnique({ where: { id: parcel.id } })).status).toBe("PENDING_SURVEY");
  });

  it("requires a Cannot Verify reason and preserves history through clerk correction", async () => {
    const parcel = await register(base + 0.06, 4); const surveyId = parcel.surveys[0].id;
    expect((await mutate(surveyor, "post", `/api/surveys/${surveyId}/cannot-verify`).send({ reason: "" })).status).toBe(422);
    const returned = await mutate(surveyor, "post", `/api/surveys/${surveyId}/cannot-verify`).send({ reason: "Boundary monuments could not be located during field visit." });
    expect(returned.status).toBe(200); expect(returned.body.data.parcel.status).toBe("RETURNED_FOR_CORRECTION");
    const correction = await mutate(clerk, "patch", `/api/parcels/${parcel.id}/correction`).send({ districtId: district.id, areaName: "Corrected survey parcel", landUse: "RESIDENTIAL", geometry: rectangle(base + 0.061, 4), owners: [{ ownerId: owner.id, sharePercent: 100 }], confirmUnusualArea: false });
    expect(correction.status).toBe(200); expect(correction.body.data.status).toBe("PENDING_SURVEY");
    const attempts = await prisma.survey.findMany({ where: { parcelId: parcel.id }, orderBy: { createdAt: "asc" } });
    expect(attempts).toHaveLength(2); expect(attempts[0].status).toBe("CANNOT_VERIFY"); expect(attempts[1].status).toBe("PENDING");
  });

  it("rejects approval of an unverified parcel without changing state", async () => {
    const parcel = await register(base + 0.07, 4);
    const response = await mutate(registrar, "post", `/api/parcels/${parcel.id}/approve`);
    expect(response.status).toBe(409);
    expect((await prisma.parcel.findUnique({ where: { id: parcel.id } })).status).toBe("PENDING_SURVEY");
    expect(await prisma.ownershipHistory.count({ where: { parcelId: parcel.id } })).toBe(0);
  });
});
