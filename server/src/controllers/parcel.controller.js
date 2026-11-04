import { getParcel, getParcelGeoJson, listParcels, previewParcel, registerParcel } from "../services/parcel.service.js";

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
