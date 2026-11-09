/** Administrator user handlers return safe projections and audited activation/deactivation results. */
import { changeUserStatus, getUser, getUsers } from "../services/user.service.js";

export async function listUsers(request, response) {
  const result = await getUsers(request.validated.query);
  response.status(200).json({ success: true, data: result.users, pagination: result.pagination });
}

export async function showUser(request, response) {
  const user = await getUser(request.validated.params.id);
  response.status(200).json({ success: true, data: user });
}

export async function setUserStatus(request, response) {
  const user = await changeUserStatus({
    targetUserId: request.validated.params.id,
    isActive: request.validated.body.isActive,
    actor: request.user,
  });
  response.status(200).json({ success: true, data: user });
}
