import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 10000,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase();
  if (["post", "put", "patch", "delete"].includes(method)) {
    const csrfToken = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("csrf_token="))
      ?.split("=")[1];
    if (csrfToken) config.headers["X-CSRF-Token"] = decodeURIComponent(csrfToken);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.userMessage = "Unable to reach the Land Title Registry API.";
    }
    return Promise.reject(error);
  },
);

export default apiClient;
