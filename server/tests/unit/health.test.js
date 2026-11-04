import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("GET /api/health", () => {
  it("responds without authentication or database credentials", async () => {
    const response = await request(createApp()).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: "Land Title Registry API is running" });
  });
});
