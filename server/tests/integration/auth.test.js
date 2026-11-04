import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { getPrisma } from "../../src/lib/prisma.js";

const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeAuth = hasTestDatabase ? describe : describe.skip;
const password = "IntegrationDemo!2026";
const fixtureUsers = {
  ADMIN: "test-admin@example.com",
  OWNER: "test-owner@example.com",
  CLERK: "test-clerk@example.com",
  REGISTRAR: "test-registrar@example.com",
};

function cookiesFrom(response) {
  return response.headers["set-cookie"]?.map((cookie) => cookie.split(";")[0]) || [];
}

function csrfFrom(cookies) {
  return decodeURIComponent(cookies.find((cookie) => cookie.startsWith("csrf_token="))?.split("=")[1] || "");
}

describeAuth("authentication and authorization API", () => {
  const prisma = hasTestDatabase ? getPrisma() : null;
  const app = createApp();
  const users = {};

  beforeAll(async () => {
    const [database] = await prisma.$queryRaw`SELECT current_database() AS name`;
    if (!database.name.endsWith("_test")) throw new Error(`Refusing auth tests: database ${database.name} does not end in _test`);
    const passwordHash = await bcrypt.hash(password, 4);
    for (const [roleName, email] of Object.entries(fixtureUsers)) {
      const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName, description: `${roleName} test role` } });
      users[roleName] = await prisma.user.upsert({
        where: { email },
        update: { isActive: true, passwordHash, roleId: role.id },
        create: { fullName: `Test ${roleName}`, email, passwordHash, roleId: role.id },
      });
    }
  });

  it("logs in with correct credentials and never returns a password hash", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: fixtureUsers.ADMIN, password });
    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("ADMIN");
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    expect(cookiesFrom(response).some((cookie) => cookie.startsWith("ltr_session="))).toBe(true);
  });

  it("uses a generic error for incorrect and nonexistent credentials", async () => {
    const wrong = await request(app).post("/api/auth/login").send({ email: fixtureUsers.OWNER, password: "Incorrect!2026" });
    const missing = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(wrong.body.message).toBe(missing.body.message);
  });

  it("rejects missing, malformed, and expired authentication", async () => {
    await request(app).get("/api/auth/me").expect(401);
    await request(app).get("/api/auth/me").set("Cookie", ["ltr_session=not-a-jwt"]).expect(401);
    const expired = jwt.sign({ sub: String(users.ADMIN.id) }, process.env.JWT_SECRET, { expiresIn: -1, issuer: "land-title-registry", audience: "land-title-registry-web" });
    await request(app).get("/api/auth/me").set("Cookie", [`ltr_session=${expired}`]).expect(401);
  });

  it("returns the current authenticated user", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: fixtureUsers.OWNER, password });
    const response = await request(app).get("/api/auth/me").set("Cookie", cookiesFrom(login));
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(fixtureUsers.OWNER);
  });

  it("rejects a deactivated user even with an unexpired JWT", async () => {
    await prisma.user.update({ where: { id: users.OWNER.id }, data: { isActive: false } });
    const token = jwt.sign({ sub: String(users.OWNER.id) }, process.env.JWT_SECRET, { expiresIn: "1h", issuer: "land-title-registry", audience: "land-title-registry-web" });
    await request(app).get("/api/auth/me").set("Cookie", [`ltr_session=${token}`]).expect(401);
    await prisma.user.update({ where: { id: users.OWNER.id }, data: { isActive: true } });
  });

  it("enforces distinct OWNER, CLERK, REGISTRAR, and ADMIN permissions", async () => {
    const ownerLogin = await request(app).post("/api/auth/login").send({ email: fixtureUsers.OWNER, password });
    await request(app).get("/api/users").set("Cookie", cookiesFrom(ownerLogin)).expect(403);
    const clerkLogin = await request(app).post("/api/auth/login").send({ email: fixtureUsers.CLERK, password });
    await request(app).get("/api/permissions/registrar").set("Cookie", cookiesFrom(clerkLogin)).expect(403);
    const registrarLogin = await request(app).post("/api/auth/login").send({ email: fixtureUsers.REGISTRAR, password });
    await request(app).get("/api/users").set("Cookie", cookiesFrom(registrarLogin)).expect(403);
    const adminLogin = await request(app).post("/api/auth/login").send({ email: fixtureUsers.ADMIN, password });
    const usersResponse = await request(app).get("/api/users").set("Cookie", cookiesFrom(adminLogin));
    expect(usersResponse.status).toBe(200);
    expect(JSON.stringify(usersResponse.body)).not.toContain("passwordHash");
  });

  it("clears the session cookie on logout with CSRF protection", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: fixtureUsers.ADMIN, password });
    const cookies = cookiesFrom(login);
    await request(app).post("/api/auth/logout").set("Cookie", cookies).expect(403);
    const response = await request(app).post("/api/auth/logout").set("Cookie", cookies).set("X-CSRF-Token", csrfFrom(cookies));
    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"].join(";")).toContain("ltr_session=;");
  });

  it("rejects invalid login payloads", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: "not-email", password: "short" });
    expect(response.status).toBe(422);
  });

  it("rate limits repeated failed attempts for one account", async () => {
    let response;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      response = await request(app).post("/api/auth/login").send({ email: "rate-limit@example.com", password });
    }
    expect(response.status).toBe(429);
  });
});
