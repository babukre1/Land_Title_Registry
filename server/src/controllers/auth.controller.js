/** Authentication handlers consume validated credentials/session state, return safe JSON/cookies, and propagate service errors. */
import { randomBytes } from "node:crypto";
import { writeAuditLog } from "../services/audit.service.js";
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, authCookieOptions, authenticateCredentials, csrfCookieOptions } from "../services/auth.service.js";

export async function login(request, response) {
  const { email, password } = request.validated.body;
  const { token, user } = await authenticateCredentials(email, password);
  const csrfToken = randomBytes(32).toString("hex");
  response.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
  response.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions());
  response.status(200).json({ success: true, user });
}

export function me(request, response) {
  response.status(200).json({ success: true, user: request.user });
}

export async function logout(request, response) {
  await writeAuditLog({ userId: request.user.id, action: "LOGOUT", entityType: "User", entityId: request.user.id });
  const authOptions = authCookieOptions();
  const csrfOptions = csrfCookieOptions();
  response.clearCookie(AUTH_COOKIE_NAME, { httpOnly: authOptions.httpOnly, secure: authOptions.secure, sameSite: authOptions.sameSite, path: authOptions.path });
  response.clearCookie(CSRF_COOKIE_NAME, { httpOnly: csrfOptions.httpOnly, secure: csrfOptions.secure, sameSite: csrfOptions.sameSite, path: csrfOptions.path });
  response.status(200).json({ success: true, message: "Logged out successfully" });
}
