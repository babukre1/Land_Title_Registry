/** Encumbrance endpoints for evidence-backed registrar lifting and authorized evidence retrieval. */
import { Router } from "express";
import { evidence, lift } from "../controllers/encumbrance.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { requireCsrf } from "../middleware/csrf.js";
import { uploadLegalEvidence } from "../middleware/legalEvidenceUpload.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { encumbranceIdSchema, liftEncumbranceSchema } from "../validators/encumbrance.validators.js";

const router = Router();
router.use(authenticate);
router.post("/:id/lift", authorize("REGISTRAR"), requireCsrf, validate(encumbranceIdSchema, "params"), uploadLegalEvidence, validate(liftEncumbranceSchema), asyncHandler(lift));
router.get("/:id/evidence", validate(encumbranceIdSchema, "params"), asyncHandler(evidence));
export default router;
