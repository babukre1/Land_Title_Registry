/** Parcel endpoints for read-only maps, proposals, corrections, approval, restrictions, certificates, owners, and history. */
import { Router } from "express";
import { approve, correct, geojson, history, index, owners, preview, show, store } from "../controllers/parcel.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { requireCsrf } from "../middleware/csrf.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parcelCorrectionSchema, parcelIdSchema, parcelListSchema, parcelProposalSchema, parcelRegistrationSchema } from "../validators/parcel.validators.js";
import { issue, listForParcel } from "../controllers/certificate.controller.js";
import { indexForParcel as listEncumbrances, storeForParcel as addEncumbrance } from "../controllers/encumbrance.controller.js";
import { createEncumbranceSchema } from "../validators/encumbrance.validators.js";

const router = Router();
router.use(authenticate);
router.get("/geojson", asyncHandler(geojson));
router.post("/preview", authorize("CLERK"), requireCsrf, validate(parcelProposalSchema), asyncHandler(preview));
router.post("/", authorize("CLERK"), requireCsrf, validate(parcelRegistrationSchema), asyncHandler(store));
router.patch("/:id/correction", authorize("CLERK"), requireCsrf, validate(parcelIdSchema, "params"), validate(parcelCorrectionSchema), asyncHandler(correct));
router.post("/:id/approve", authorize("REGISTRAR"), requireCsrf, validate(parcelIdSchema, "params"), asyncHandler(approve));
router.post("/:id/certificates", authorize("REGISTRAR"), requireCsrf, validate(parcelIdSchema, "params"), asyncHandler(issue));
router.get("/:id/certificates", authorize("OWNER", "CLERK", "REGISTRAR", "ADMIN"), validate(parcelIdSchema, "params"), asyncHandler(listForParcel));
router.get("/:id/encumbrances", authorize("OWNER", "CLERK", "REGISTRAR", "ADMIN"), validate(parcelIdSchema, "params"), asyncHandler(listEncumbrances));
router.post("/:id/encumbrances", authorize("REGISTRAR"), requireCsrf, validate(parcelIdSchema, "params"), validate(createEncumbranceSchema), asyncHandler(addEncumbrance));
router.get("/", validate(parcelListSchema, "query"), asyncHandler(index));
router.get("/:id/owners", validate(parcelIdSchema, "params"), asyncHandler(owners));
router.get("/:id/history", validate(parcelIdSchema, "params"), asyncHandler(history));
router.get("/:id", validate(parcelIdSchema, "params"), asyncHandler(show));
export default router;
