import { Router } from "express";
import { indexOwners, showOwner, storeOwner } from "../controllers/owner.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { requireCsrf } from "../middleware/csrf.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ownerCreateSchema, ownerIdSchema, ownerListSchema } from "../validators/owner.validators.js";

const router = Router();
router.use(authenticate);
router.get("/", authorize("CLERK", "REGISTRAR", "ADMIN"), validate(ownerListSchema, "query"), asyncHandler(indexOwners));
router.post("/", authorize("CLERK"), requireCsrf, validate(ownerCreateSchema), asyncHandler(storeOwner));
router.get("/:id", authorize("CLERK", "REGISTRAR", "ADMIN"), validate(ownerIdSchema, "params"), asyncHandler(showOwner));
export default router;
