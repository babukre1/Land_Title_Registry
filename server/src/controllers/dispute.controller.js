/** Dispute handlers translate validated case actions/evidence into JSON or protected binary downloads. */
import { getDispute, getDisputeEvidence, listDisputes, openManualDispute, resolveDispute, saveDisputeEvidence, startDisputeReview } from "../services/dispute.service.js";

export async function indexDisputes(request, response) {
  const result = await listDisputes(request.validated.query);
  response.status(200).json({ success: true, data: result.disputes, pagination: result.pagination });
}
export async function showDispute(request, response) { response.status(200).json({ success: true, data: await getDispute(request.validated.params.id) }); }
export async function storeDispute(request, response) { response.status(201).json({ success: true, data: await openManualDispute(request.validated.body, request.user) }); }
export async function reviewDispute(request, response) { response.json({ success: true, data: await startDisputeReview(request.validated.params.id, request.user) }); }
export async function decideDispute(request, response) { response.json({ success: true, data: await resolveDispute(request.validated.params.id, request.validated.body, request.user) }); }
export async function uploadEvidence(request, response) { response.status(201).json({ success: true, data: await saveDisputeEvidence(request.validated.params.id, request.file, request.user) }); }
export async function downloadEvidence(request, response) { const file = await getDisputeEvidence(request.validated.params.id, request.validated.params.documentId); response.type(file.mimeType).set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`).send(file.buffer); }
