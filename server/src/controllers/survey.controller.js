/** Survey handlers accept validated IDs/evidence/decisions and return metadata, binary reports, or workflow state. */
import { getPendingSurveys, getSurvey, getSurveyReport, returnSurveyToClerk, saveSurveyReport, verifySurvey } from "../services/survey.service.js";

export async function index(request, response) { const result = await getPendingSurveys(request.validated.query); response.json({ success: true, data: result.surveys, pagination: result.pagination }); }
export async function show(request, response) { response.json({ success: true, data: await getSurvey(request.validated.params.id) }); }
export async function uploadReport(request, response) { response.status(201).json({ success: true, data: await saveSurveyReport(request.validated.params.id, request.file, request.user) }); }
export async function downloadReport(request, response) { const report = await getSurveyReport(request.validated.params.id); response.setHeader("Content-Type", report.mimeType); response.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(report.originalName)}`); response.send(report.buffer); }
export async function verify(request, response) { const result = await verifySurvey(request.validated.params.id, request.validated.body, request.user); if (result.conflict) return response.status(409).json({ success: false, code: "SURVEY_BOUNDARY_OVERLAP", message: "The adjusted survey boundary overlaps protected land.", data: result }); response.json({ success: true, data: result }); }
export async function cannotVerify(request, response) { response.json({ success: true, data: await returnSurveyToClerk(request.validated.params.id, request.validated.body.reason, request.user) }); }
