/** Owner-self-service handlers derive legal identity from authentication and return only owned parcels/transfers. */
import { getParcelOwnedByUser, getParcelsOwnedByUser } from "../services/ownership.service.js";
import { getMyTransfers } from "../services/transfer.service.js";

export async function parcels(request, response) {
  const result = await getParcelsOwnedByUser(request.user.id, request.validated.query);
  response.json({ success: true, data: result.parcels, pagination: result.pagination });
}
export async function parcel(request, response) { response.json({ success: true, data: await getParcelOwnedByUser(request.user.id, request.validated.params.id) }); }
export async function transfers(request, response) {
  const result = await getMyTransfers(request.user, request.validated.query);
  response.json({ success: true, data: result.transfers, pagination: result.pagination });
}
