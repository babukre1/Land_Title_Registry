/** Browser-facing registry API methods; each returns parsed resource data or propagates the normalized Axios error. */
import apiClient from "./apiClient.js";

export const dashboardApi = { async summary() { return (await apiClient.get("/dashboard/summary")).data.data; } };
export const districtApi = { async list() { return (await apiClient.get("/districts")).data.data; } };
export const userApi = { async list(params = {}) { return (await apiClient.get("/users", { params })).data; }, async setStatus(id, isActive) { return (await apiClient.patch(`/users/${id}/status`, { isActive })).data.data; } };
export const ownerApi = {
  async list(params = {}) { return (await apiClient.get("/owners", { params })).data; },
  async get(id) { return (await apiClient.get(`/owners/${id}`)).data.data; },
  async create(input) { return (await apiClient.post("/owners", input)).data.data; },
};
export const parcelApi = {
  async list(params = {}) { return (await apiClient.get("/parcels", { params })).data; },
  async get(id) { return (await apiClient.get(`/parcels/${id}`)).data.data; },
  async geojson() { return (await apiClient.get("/parcels/geojson")).data.data; },
  async preview(input) { return (await apiClient.post("/parcels/preview", input)).data.data; },
  async create(input) { return (await apiClient.post("/parcels", input)).data; },
  async owners(id) { return (await apiClient.get(`/parcels/${id}/owners`)).data.data; },
  async history(id) { return (await apiClient.get(`/parcels/${id}/history`)).data.data; },
};
export const myApi = {
  async parcels(params = {}) { return (await apiClient.get("/my/parcels", { params })).data; },
  async transfers(params = {}) { return (await apiClient.get("/my/transfers", { params })).data; },
};
export const transferApi = {
  async list(params = {}) { return (await apiClient.get("/transfers", { params })).data; },
  async get(id) { return (await apiClient.get(`/transfers/${id}`)).data.data; },
  async buyers(q = "") { return (await apiClient.get("/transfers/buyers", { params: { q } })).data.data; },
  async create(input) { return (await apiClient.post("/transfers", input)).data.data; },
  async consent(id, decision) { return (await apiClient.post(`/transfers/${id}/consent`, { decision })).data.data; },
  async buyerResponse(id, decision) { return (await apiClient.post(`/transfers/${id}/buyer-response`, { decision })).data.data; },
  async upload(id, file) { const form = new FormData(); form.append("document", file); return (await apiClient.post(`/transfers/${id}/documents`, form)).data.data; },
  async clerkReview(id, input) { return (await apiClient.post(`/transfers/${id}/clerk-review`, input)).data.data; },
  async cancel(id, reason) { return (await apiClient.post(`/transfers/${id}/cancel`, { reason })).data.data; },
  async reject(id, reason) { return (await apiClient.post(`/transfers/${id}/reject`, { reason })).data.data; },
  async approve(id) { return (await apiClient.post(`/transfers/${id}/approve`)).data.data; },
  async pay(id, input) { return (await apiClient.post(`/transfers/${id}/payment`, input)).data.data; },
  async openDocument(id, documentId) { const response = await apiClient.get(`/transfers/${id}/documents/${documentId}`, { responseType: "blob" }); window.open(URL.createObjectURL(response.data), "_blank", "noopener,noreferrer"); },
};
export const disputeApi = {
  async list(params = {}) { return (await apiClient.get("/disputes", { params })).data; },
  async get(id) { return (await apiClient.get(`/disputes/${id}`)).data.data; },
  async create(input) { return (await apiClient.post("/disputes", input)).data.data; },
  async review(id) { return (await apiClient.post(`/disputes/${id}/review`)).data.data; },
  async resolve(id, input) { return (await apiClient.post(`/disputes/${id}/resolve`, input)).data.data; },
  async uploadEvidence(id, file) { const form = new FormData(); form.append("evidence", file); return (await apiClient.post(`/disputes/${id}/evidence`, form)).data.data; },
  async openEvidence(id, documentId) { const response = await apiClient.get(`/disputes/${id}/evidence/${documentId}`, { responseType: "blob" }); window.open(URL.createObjectURL(response.data), "_blank", "noopener,noreferrer"); },
};
export const feeApi = {
  async current() { return (await apiClient.get("/fees/current")).data.data; },
  async update(input) { return (await apiClient.put("/fees/current", input)).data.data; },
};
export const encumbranceApi = {
  async list(parcelId) { return (await apiClient.get(`/parcels/${parcelId}/encumbrances`)).data.data; },
  async create(parcelId, input) { return (await apiClient.post(`/parcels/${parcelId}/encumbrances`, input)).data.data; },
  async lift(id, reason, file) { const form = new FormData(); form.append("reason", reason); form.append("evidence", file); return (await apiClient.post(`/encumbrances/${id}/lift`, form)).data.data; },
  async openEvidence(id) { const response = await apiClient.get(`/encumbrances/${id}/evidence`, { responseType: "blob" }); window.open(URL.createObjectURL(response.data), "_blank", "noopener,noreferrer"); },
};
export const surveyApi = {
  async list(params = {}) { return (await apiClient.get("/surveys", { params })).data; },
  async get(id) { return (await apiClient.get(`/surveys/${id}`)).data.data; },
  async uploadReport(id, file) { const form = new FormData(); form.append("report", file); return (await apiClient.post(`/surveys/${id}/report`, form)).data.data; },
  async verify(id, input) { return (await apiClient.post(`/surveys/${id}/verify`, input)).data.data; },
  async cannotVerify(id, reason) { return (await apiClient.post(`/surveys/${id}/cannot-verify`, { reason })).data.data; },
  async openReport(id) { const response = await apiClient.get(`/surveys/${id}/report`, { responseType: "blob" }); window.open(URL.createObjectURL(response.data), "_blank", "noopener,noreferrer"); },
};
export const registrationApi = {
  async pending(params = {}) { return (await apiClient.get("/registrations/pending-approval", { params })).data; },
  async approve(parcelId) { return (await apiClient.post(`/parcels/${parcelId}/approve`)).data; },
};
export const certificateApi = {
  async list() { return (await apiClient.get("/certificates")).data.data; },
  async listForParcel(parcelId) { return (await apiClient.get(`/parcels/${parcelId}/certificates`)).data.data; },
  async get(id) { return (await apiClient.get(`/certificates/${id}`)).data.data; },
  async issue(parcelId) { return (await apiClient.post(`/parcels/${parcelId}/certificates`)).data.data; },
  async download(id, lang = "en") {
    const response = await apiClient.get(`/certificates/${id}/download`, { params: { lang }, responseType: "blob" });
    const url = URL.createObjectURL(response.data); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `land-title-certificate-${id}-${lang}.pdf`; anchor.click(); URL.revokeObjectURL(url);
  },
};
export const publicVerificationApi = {
  async byToken(token) { return (await apiClient.get(`/public/verify/${encodeURIComponent(token)}`)).data.data; },
  async manual(input) { return (await apiClient.post("/public/verify", input)).data.data; },
};
parcelApi.correct = async function correct(id, input) { return (await apiClient.patch(`/parcels/${id}/correction`, input)).data.data; };
