import { CSRF_COOKIE_NAME } from "../services/auth.service.js";

/** Compares the readable CSRF cookie with X-CSRF-Token for authenticated state changes; responds with 403 on mismatch. */
export function requireCsrf(request, response, next) {
  const cookieToken = request.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = request.get("X-CSRF-Token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return response.status(403).json({ success: false, message: "Invalid CSRF token" });
  }
  next();
}
