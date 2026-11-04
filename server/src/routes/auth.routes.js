import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { login, logout, me } from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireCsrf } from "../middleware/csrf.js";
import { validate } from "../middleware/validate.js";
import { loginSchema } from "../validators/auth.validators.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (request) => `${ipKeyGenerator(request.ip)}:${String(request.body?.email || "unknown").trim().toLowerCase()}`,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again later." },
});

router.post("/login", loginLimiter, validate(loginSchema), asyncHandler(login));
router.get("/me", authenticate, me);
router.post("/logout", authenticate, requireCsrf, asyncHandler(logout));

export default router;
