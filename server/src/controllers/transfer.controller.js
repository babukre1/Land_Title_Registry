/** Transfer handlers accept participant/staff actions, return transfer state, and propagate service 4xx errors. */
import { approveTransfer, cancelTransfer, getTransfer, getTransferDocument, initiateTransfer, listTransfers, rejectTransfer, respondAsBuyer, respondToConsent, reviewTransferDocuments, saveTransferDocument, searchBuyers } from "../services/transfer.service.js";
import { payTransferFee } from "../services/payment.service.js";

export async function index(request, response) { const result = await listTransfers(request.validated.query); response.json({ success: true, data: result.transfers, pagination: result.pagination }); }
export async function show(request, response) { response.json({ success: true, data: await getTransfer(request.validated.params.id, request.user) }); }
export async function store(request, response) { response.status(201).json({ success: true, data: await initiateTransfer(request.validated.body, request.user) }); }
export async function consent(request, response) { response.json({ success: true, data: await respondToConsent(request.validated.params.id, request.validated.body.decision, request.user) }); }
export async function buyerResponse(request, response) { response.json({ success: true, data: await respondAsBuyer(request.validated.params.id, request.validated.body.decision, request.user) }); }
export async function uploadDocument(request, response) { response.status(201).json({ success: true, data: await saveTransferDocument(request.validated.params.id, request.file, request.user) }); }
export async function downloadDocument(request, response) { const file = await getTransferDocument(request.validated.params.id, request.validated.params.documentId, request.user); response.type(file.mimeType).set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`).send(file.buffer); }
export async function clerkReview(request, response) { response.json({ success: true, data: await reviewTransferDocuments(request.validated.params.id, request.validated.body, request.user) }); }
export async function cancel(request, response) { response.json({ success: true, data: await cancelTransfer(request.validated.params.id, request.validated.body.reason, request.user) }); }
export async function reject(request, response) { response.json({ success: true, data: await rejectTransfer(request.validated.params.id, request.validated.body.reason, request.user) }); }
export async function approve(request, response) { const result = await approveTransfer(request.validated.params.id, request.user); response.status(result.repeated ? 200 : 201).json({ success: true, repeated: result.repeated, data: result.transfer }); }
export async function buyers(request, response) { response.json({ success: true, data: await searchBuyers(request.validated.query.q, request.user) }); }
export async function payFee(request, response) { const result = await payTransferFee(request.validated.params.id, request.validated.body, request.user); response.status(result.repeated ? 200 : 201).json({ success: true, repeated: result.repeated, data: result.payment }); }
