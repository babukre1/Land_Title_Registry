/** Owner handlers map validated search/create/detail requests to safe owner service results. */
import { createOwner, getOwner, listOwners } from "../services/owner.service.js";

export async function indexOwners(request, response) {
  const result = await listOwners(request.validated.query);
  response.status(200).json({ success: true, data: result.owners, pagination: result.pagination });
}
export async function showOwner(request, response) { response.status(200).json({ success: true, data: await getOwner(request.validated.params.id) }); }
export async function storeOwner(request, response) { response.status(201).json({ success: true, data: await createOwner(request.validated.body, request.user) }); }
