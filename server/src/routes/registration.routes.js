/** Registrar queue endpoint for verified initial registrations and protected boundary corrections. */
import { Router } from "express";
import { pending } from "../controllers/registration.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { registrationListSchema } from "../validators/registration.validators.js";

const router = Router();
router.use(authenticate, authorize("REGISTRAR"));
router.get("/pending-approval", validate(registrationListSchema, "query"), asyncHandler(pending));
export default router;
