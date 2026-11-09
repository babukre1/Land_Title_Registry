/** District handler returns registration choices and propagates repository errors to the safe global handler. */
import { listDistricts } from "../repositories/district.repository.js";

export async function indexDistricts(request, response) {
  response.status(200).json({ success: true, data: await listDistricts() });
}
