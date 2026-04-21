import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

export interface ApiErrorPayload {
  message?: string;
  errors?: Record<string, string[] | undefined>;
}

export function extractErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<ApiErrorPayload>;
    if (axiosErr.response?.data?.message) return axiosErr.response.data.message;
    if (axiosErr.code === "ERR_NETWORK") return "Cannot reach server. Check your connection.";
    if (axiosErr.message) return axiosErr.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// Dispatch a custom event on 401 so the auth store can react without hard redirects.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default api;
