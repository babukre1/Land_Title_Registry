import { describe, expect, it } from "vitest";
import { ownerCreateSchema } from "../../src/validators/owner.validators.js";
import { userCreateSchema } from "../../src/validators/user.validators.js";

describe("account creation validation", () => {
  it("accepts a linked owner login with an eight-character password", () => {
    const parsed = ownerCreateSchema.parse({ ownerType: "PERSON", fullName: "Ayaan Cabdi", identityNumber: "SO-NID-100", email: "AYAAN@EXAMPLE.COM", loginPassword: "Password1" });
    expect(parsed.loginPassword).toBe("Password1");
  });

  it("requires an email for owner login credentials", () => {
    const result = ownerCreateSchema.safeParse({ ownerType: "PERSON", fullName: "Ayaan Cabdi", identityNumber: "SO-NID-101", loginPassword: "Password1" });
    expect(result.success).toBe(false);
  });

  it("restricts administrator-created accounts to staff roles", () => {
    const base = { fullName: "New Clerk", email: "clerk-new@example.com", password: "Password1" };
    expect(userCreateSchema.safeParse({ ...base, role: "CLERK" }).success).toBe(true);
    expect(userCreateSchema.safeParse({ ...base, role: "OWNER" }).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...base, role: "CLERK", password: "short" }).success).toBe(false);
  });
});
