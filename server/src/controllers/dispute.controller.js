import { getDispute, listDisputes } from "../services/dispute.service.js";

export async function indexDisputes(request, response) {
  const result = await listDisputes(request.validated.query);
  response.status(200).json({ success: true, data: result.disputes, pagination: result.pagination });
}
export async function showDispute(request, response) { response.status(200).json({ success: true, data: await getDispute(request.validated.params.id) }); }
