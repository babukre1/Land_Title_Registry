import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { manualVerification, tokenVerification } from "../controllers/public-verification.controller.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { manualVerificationSchema, verificationTokenSchema } from "../validators/certificate.validators.js";

const router = Router();
const verificationLimiter = rateLimit({
  windowMs: 60_000,
  limit: process.env.NODE_ENV === "test" ? 10 : 10,
  keyGenerator: (request) => ipKeyGenerator(request.ip),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many verification requests. Please try again in one minute." },
});
router.use(verificationLimiter);
router.get("/verify/:token", validate(verificationTokenSchema, "params"), asyncHandler(tokenVerification));
router.post("/verify", validate(manualVerificationSchema), asyncHandler(manualVerification));
export default router;
