import axios, { AxiosError } from "axios";

import { env } from "@/shared/constants/env";
import { ApiError, ERROR_CODES } from "@/shared/utils/errors";
import { logger } from "@/shared/utils/logger";
import { AUTH_TOKEN_KEY } from "@/shared/constants/auth";

import type { IHttpClient } from "../interfaces/IHttpClient";

type ErrorEnvelope = {
  statusCode?: number;
  code?: string;
  message?: string | string[];
  details?: unknown;
  errors?: Record<string, string[]>;
};

// With cookie-based Sanctum auth the session cookie is HttpOnly and sent
// automatically on every request. The XSRF-TOKEN cookie (readable by JS) is
// read by Axios and forwarded as the X-XSRF-TOKEN header on mutating requests.
const axiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

function clearStoredSession(): void {
  // Clears the mock-mode token only; the real session lives in an HttpOnly cookie.
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function redirectToLogin() {
  if (typeof window !== "undefined") {
    if (!window.location.pathname.startsWith("/auth/login")) {
      const redirect = window.location.pathname + window.location.search;
      window.location.href = `/auth/login?redirect=${encodeURIComponent(redirect)}`;
    }
  }
}

// ── Response interceptor: clear the session and return to /auth/login on 401 ─────
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorEnvelope>) => {
    const status = error.response?.status ?? 0;
    const envelope = error.response?.data;
    const isMeRequest = Boolean(error.config?.url?.includes("/me"));

    if (status === 401) {
      clearStoredSession();
      // Router guards handle initial session check for /me cleanly.
      // For all other requests, redirect to login preserving current location.
      if (!isMeRequest) {
        redirectToLogin();
      }
    }

    // Chuẩn hóa mọi lỗi khác thành ApiError
    if (!envelope) {
      logger.error("Yêu cầu mạng thất bại", error.message);
      return Promise.reject(
        new ApiError(status, "NETWORK_ERROR", "Không kết nối được máy chủ"),
      );
    }

    const message = Array.isArray(envelope.message)
      ? envelope.message.join(", ")
      : (envelope.message ?? "Đã xảy ra lỗi");

    return Promise.reject(
      new ApiError(
        envelope.statusCode ?? status,
        envelope.code ?? "UNKNOWN_ERROR",
        message,
        envelope.details ?? envelope.errors,
      ),
    );
  },
);

export default axiosInstance;

export const httpClient: IHttpClient = axiosInstance;

export { ERROR_CODES };
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const data = error.response?.data as
      | { errors?: Record<string, string[]>; message?: string }
      | undefined
    if (data?.errors) {
      const firstError = Object.values(data.errors).flat()[0]
      if (firstError) return String(firstError)
    }
    if (data?.message) return data.message
    if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
    if (!error.response) return 'Cannot reach the server. Check your connection and try again.'
    return `Request failed (${error.response?.status ?? 0}).`
  }
  if (error instanceof Error && error.message) return error.message
  return 'An unexpected error occurred. Please try again.'
}