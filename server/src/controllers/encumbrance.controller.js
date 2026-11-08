import { createEncumbrance, getEncumbranceEvidence, liftEncumbrance, listParcelEncumbrances } from "../services/encumbrance.service.js";

export async function indexForParcel(request, response) { response.json({ success: true, data: await listParcelEncumbrances(request.validated.params.id, request.user) }); }
export async function storeForParcel(request, response) { response.status(201).json({ success: true, data: await createEncumbrance(request.validated.params.id, request.validated.body, request.user) }); }
export async function lift(request, response) { response.json({ success: true, data: await liftEncumbrance(request.validated.params.id, request.validated.body.reason, request.file, request.user) }); }
export async function evidence(request, response) { const file = await getEncumbranceEvidence(request.validated.params.id, request.user); response.type(file.mimeType).set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`).send(file.buffer); }
