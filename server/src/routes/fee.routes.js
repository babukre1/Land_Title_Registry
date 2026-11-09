/** Current fee read and administrator append-only fee update endpoints. */
import { Router } from "express";
import { showFee, updateFee } from "../controllers/payment.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { requireCsrf } from "../middleware/csrf.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { feeSettingSchema } from "../validators/payment.validators.js";

const router = Router();
router.use(authenticate);
router.get("/current", asyncHandler(showFee));
router.put("/current", authorize("ADMIN"), requireCsrf, validate(feeSettingSchema), asyncHandler(updateFee));
export default router;
