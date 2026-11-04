import { CSRF_COOKIE_NAME } from "../services/auth.service.js";

export function requireCsrf(request, response, next) {
  const cookieToken = request.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = request.get("X-CSRF-Token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return response.status(403).json({ success: false, message: "Invalid CSRF token" });
  }
  next();
}
