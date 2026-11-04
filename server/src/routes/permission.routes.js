import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();
router.get("/owner", authenticate, authorize("OWNER"), (request, response) => response.json({ success: true, data: { role: "OWNER" } }));
router.get("/clerk", authenticate, authorize("CLERK"), (request, response) => response.json({ success: true, data: { role: "CLERK" } }));
router.get("/surveyor", authenticate, authorize("SURVEYOR"), (request, response) => response.json({ success: true, data: { role: "SURVEYOR" } }));
router.get("/registrar", authenticate, authorize("REGISTRAR"), (request, response) => response.json({ success: true, data: { role: "REGISTRAR" } }));
router.get("/admin", authenticate, authorize("ADMIN"), (request, response) => response.json({ success: true, data: { role: "ADMIN" } }));

export default router;
