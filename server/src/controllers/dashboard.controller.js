import { getDashboardSummary } from "../repositories/dashboard.repository.js";

export async function showDashboardSummary(request, response) {
  const data = await getDashboardSummary(request.user);
  response.status(200).json({ success: true, data });
}
