/** Public verification handlers return privacy-filtered status data for validated token/manual lookups. */
import { verifyByToken, verifyManually } from "../services/certificate.service.js";

export async function tokenVerification(request, response) { response.json({ success: true, data: await verifyByToken(request.validated.params.token) }); }
export async function manualVerification(request, response) { response.json({ success: true, data: await verifyManually(request.validated.body.parcelNumber, request.validated.body.certificateNumber) }); }
