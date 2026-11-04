import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env, requireAuthEnv } from "../config/env.js";
import { findUserForLogin, toSafeUser } from "../repositories/user.repository.js";
import { writeAuditLog } from "./audit.service.js";

export const AUTH_COOKIE_NAME = "ltr_session";
export const CSRF_COOKIE_NAME = "csrf_token";

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export async function authenticateCredentials(email, password) {
  requireAuthEnv();
  const normalizedEmail = normalizeEmail(email);
  const user = await findUserForLogin(normalizedEmail);
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordMatches || !user.isActive) {
    if (user) {
      await writeAuditLog({ userId: user.id, action: "LOGIN_FAILED", entityType: "User", entityId: user.id, details: { reason: "INVALID_CREDENTIALS_OR_INACTIVE" } });
    }
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  const token = jwt.sign({ sub: String(user.id) }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN, issuer: "land-title-registry", audience: "land-title-registry-web" });
  await writeAuditLog({ userId: user.id, action: "LOGIN_SUCCEEDED", entityType: "User", entityId: user.id });
  return { token, user: toSafeUser(user) };
}

export function verifyAuthToken(token) {
  requireAuthEnv();
  return jwt.verify(token, env.JWT_SECRET, { issuer: "land-title-registry", audience: "land-title-registry-web" });
}

export function authCookieOptions() {
  const production = env.NODE_ENV === "production";
  return { httpOnly: true, secure: production, sameSite: production ? "strict" : "lax", path: "/", maxAge: 8 * 60 * 60 * 1000 };
}

export function csrfCookieOptions() {
  const production = env.NODE_ENV === "production";
  return { httpOnly: false, secure: production, sameSite: production ? "strict" : "lax", path: "/", maxAge: 8 * 60 * 60 * 1000 };
}
