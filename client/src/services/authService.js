import apiClient from "./apiClient.js";

export async function login(credentials) {
  const { data } = await apiClient.post("/auth/login", credentials);
  return data.user;
}

export async function getCurrentUser() {
  const { data } = await apiClient.get("/auth/me");
  return data.user;
}

export async function logout() {
  await apiClient.post("/auth/logout");
}
