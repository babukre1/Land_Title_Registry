/** Owner-self-service parcel and transfer endpoints derived from the authenticated linked Owner identity. */
import { Router } from "express";
import { parcel, parcels, transfers } from "../controllers/my.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parcelIdSchema } from "../validators/parcel.validators.js";
import { paginationSchema } from "../validators/transfer.validators.js";

const router = Router();
router.use(authenticate, authorize("OWNER"));
router.get("/parcels", validate(paginationSchema, "query"), asyncHandler(parcels));
router.get("/parcels/:id", validate(parcelIdSchema, "params"), asyncHandler(parcel));
router.get("/transfers", validate(paginationSchema, "query"), asyncHandler(transfers));
export default router;
