/** Registration handlers expose the registrar queue and atomic parcel/correction approval result. */
import { approveParcelRegistration, getPendingRegistrations } from "../services/registration.service.js";

export async function pending(request, response) { const result = await getPendingRegistrations(request.validated.query); response.json({ success: true, data: result.parcels, pagination: result.pagination }); }
export async function approve(request, response) { const result = await approveParcelRegistration(request.validated.params.id, request.user); response.status(result.repeated ? 200 : 201).json({ success: true, repeated: result.repeated, data: result.parcel }); }
