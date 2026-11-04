import { Router } from "express";
import { geojson, index, preview, show, store } from "../controllers/parcel.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { requireCsrf } from "../middleware/csrf.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parcelIdSchema, parcelListSchema, parcelProposalSchema, parcelRegistrationSchema } from "../validators/parcel.validators.js";

const router = Router();
router.use(authenticate);
router.get("/geojson", asyncHandler(geojson));
router.post("/preview", authorize("CLERK"), requireCsrf, validate(parcelProposalSchema), asyncHandler(preview));
router.post("/", authorize("CLERK"), requireCsrf, validate(parcelRegistrationSchema), asyncHandler(store));
router.get("/", validate(parcelListSchema, "query"), asyncHandler(index));
router.get("/:id", validate(parcelIdSchema, "params"), asyncHandler(show));
export default router;
