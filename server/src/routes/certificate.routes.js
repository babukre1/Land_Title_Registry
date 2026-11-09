/** Authenticated certificate listing, metadata, and protected bilingual PDF download endpoints. */
import { Router } from "express";
import { download, index, show } from "../controllers/certificate.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { certificateDownloadSchema, certificateIdSchema } from "../validators/certificate.validators.js";

const router = Router();
router.use(authenticate);
router.get("/", asyncHandler(index));
router.get("/:id/download", validate(certificateIdSchema, "params"), validate(certificateDownloadSchema, "query"), asyncHandler(download));
router.get("/:id", validate(certificateIdSchema, "params"), asyncHandler(show));
export default router;
