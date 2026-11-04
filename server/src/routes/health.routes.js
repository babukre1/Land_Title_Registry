import { Router } from "express";

const router = Router();
router.get("/", (request, response) => {
  response.status(200).json({ success: true, message: "Land Title Registry API is running" });
});

export default router;
