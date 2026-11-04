import { Router } from "express";
import { indexDistricts } from "../controllers/district.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.get("/", authenticate, asyncHandler(indexDistricts));
export default router;
