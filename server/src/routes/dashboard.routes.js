import { Router } from "express";
import { showDashboardSummary } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.get("/summary", authenticate, asyncHandler(showDashboardSummary));
export default router;
