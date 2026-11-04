import { Router } from "express";
import { indexDisputes, showDispute } from "../controllers/dispute.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { disputeIdSchema, disputeListSchema } from "../validators/dispute.validators.js";

const router = Router();
router.use(authenticate, authorize("CLERK", "REGISTRAR"));
router.get("/", validate(disputeListSchema, "query"), asyncHandler(indexDisputes));
router.get("/:id", validate(disputeIdSchema, "params"), asyncHandler(showDispute));
export default router;
