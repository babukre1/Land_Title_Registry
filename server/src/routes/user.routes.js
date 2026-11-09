/** Administrator user list/detail and activation-status endpoints. */
import { Router } from "express";
import { createUser, listUsers, setUserStatus, showUser } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { requireCsrf } from "../middleware/csrf.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { paginationSchema, userCreateSchema, userIdParamsSchema, userStatusSchema } from "../validators/user.validators.js";

const router = Router();
router.use(authenticate, authorize("ADMIN"));
router.get("/", validate(paginationSchema, "query"), asyncHandler(listUsers));
router.post("/", requireCsrf, validate(userCreateSchema), asyncHandler(createUser));
router.get("/:id", validate(userIdParamsSchema, "params"), asyncHandler(showUser));
router.patch("/:id/status", requireCsrf, validate(userIdParamsSchema, "params"), validate(userStatusSchema), asyncHandler(setUserStatus));

export default router;
