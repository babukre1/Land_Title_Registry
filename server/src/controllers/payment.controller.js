/** Fee handlers return the active setting or append an administrator-authorized replacement. */
import { getCurrentFeeSetting, updateFeeSetting } from "../services/payment.service.js";

export async function showFee(request, response) { response.json({ success: true, data: await getCurrentFeeSetting() }); }
export async function updateFee(request, response) { response.json({ success: true, data: await updateFeeSetting(request.validated.body, request.user) }); }
