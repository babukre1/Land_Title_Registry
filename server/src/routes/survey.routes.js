import { Router } from "express";
import { cannotVerify, downloadReport, index, show, uploadReport, verify } from "../controllers/survey.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { requireCsrf } from "../middleware/csrf.js";
import { uploadSurveyReport } from "../middleware/surveyUpload.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cannotVerifySchema, surveyIdSchema, surveyListSchema, verifySurveySchema } from "../validators/survey.validators.js";

const router = Router();
router.use(authenticate);
router.get("/", authorize("SURVEYOR", "REGISTRAR", "CLERK"), validate(surveyListSchema, "query"), asyncHandler(index));
router.get("/:id", authorize("SURVEYOR", "REGISTRAR", "CLERK"), validate(surveyIdSchema, "params"), asyncHandler(show));
router.get("/:id/report", authorize("SURVEYOR", "REGISTRAR", "CLERK"), validate(surveyIdSchema, "params"), asyncHandler(downloadReport));
router.post("/:id/report", authorize("SURVEYOR"), requireCsrf, validate(surveyIdSchema, "params"), uploadSurveyReport, asyncHandler(uploadReport));
router.post("/:id/verify", authorize("SURVEYOR"), requireCsrf, validate(surveyIdSchema, "params"), validate(verifySurveySchema), asyncHandler(verify));
router.post("/:id/cannot-verify", authorize("SURVEYOR"), requireCsrf, validate(surveyIdSchema, "params"), validate(cannotVerifySchema), asyncHandler(cannotVerify));
export default router;
