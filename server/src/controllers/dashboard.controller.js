/** Dashboard handler returns the authenticated role's database-derived summary and recent activity. */
import { getDashboardSummary } from "../repositories/dashboard.repository.js";

export async function showDashboardSummary(request, response) {
  const data = await getDashboardSummary(request.user);
  response.status(200).json({ success: true, data });
}
