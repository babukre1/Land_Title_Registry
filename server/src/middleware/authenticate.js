import { findActiveUserById, toSafeUser } from "../repositories/user.repository.js";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "../services/auth.service.js";

export async function authenticate(request, response, next) {
  const token = request.cookies?.[AUTH_COOKIE_NAME];
  if (!token) return response.status(401).json({ success: false, message: "Authentication required" });

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    return response.status(401).json({ success: false, message: "Invalid or expired authentication session" });
  }

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId)) return response.status(401).json({ success: false, message: "Invalid authentication session" });
  const user = await findActiveUserById(userId);
  if (!user) return response.status(401).json({ success: false, message: "Authentication session is no longer valid" });
  request.user = toSafeUser(user);
  next();
}
