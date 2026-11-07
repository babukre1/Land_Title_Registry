import { correctReturnedParcel, getParcel, getParcelGeoJson, listParcels, previewParcel, registerParcel } from "../services/parcel.service.js";
import { approveParcelRegistration } from "../services/registration.service.js";
import { getCurrentOwners, getOwnershipHistory } from "../services/ownership.service.js";

export async function preview(request, response) {
  response.status(200).json({ success: true, data: await previewParcel(request.validated.body) });
}

export async function store(request, response) {
  const result = await registerParcel(request.validated.body, request.user);
  if (result.conflict) {
    return response.status(409).json({
      success: false,
      code: "PARCEL_OVERLAP",
      message: "Registration blocked because the proposed parcel overlaps an existing parcel.",
      data: result,
    });
  }
  response.status(result.repeated ? 200 : 201).json({ success: true, data: result.parcel, repeated: Boolean(result.repeated) });
}

export async function index(request, response) {
  const result = await listParcels(request.validated.query, request.user);
  response.status(200).json({ success: true, data: result.parcels, pagination: result.pagination });
}

export async function show(request, response) { response.status(200).json({ success: true, data: await getParcel(request.validated.params.id, request.user) }); }
export async function geojson(request, response) { response.status(200).json({ success: true, data: await getParcelGeoJson(request.user) }); }
export async function correct(request, response) { response.json({ success: true, data: await correctReturnedParcel(request.validated.params.id, request.validated.body, request.user) }); }
export async function approve(request, response) { const result = await approveParcelRegistration(request.validated.params.id, request.user); response.status(result.repeated ? 200 : 201).json({ success: true, repeated: result.repeated, data: result.parcel }); }
export async function owners(request, response) { response.json({ success: true, data: await getCurrentOwners(request.validated.params.id, request.user) }); }
export async function history(request, response) { response.json({ success: true, data: await getOwnershipHistory(request.validated.params.id, request.user) }); }
