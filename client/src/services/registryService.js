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
