import apiClient from "./apiClient.js";

export const dashboardApi = { async summary() { return (await apiClient.get("/dashboard/summary")).data.data; } };
export const districtApi = { async list() { return (await apiClient.get("/districts")).data.data; } };
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
};
export const disputeApi = {
  async list(params = {}) { return (await apiClient.get("/disputes", { params })).data; },
  async get(id) { return (await apiClient.get(`/disputes/${id}`)).data.data; },
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
parcelApi.correct = async function correct(id, input) { return (await apiClient.patch(`/parcels/${id}/correction`, input)).data.data; };
