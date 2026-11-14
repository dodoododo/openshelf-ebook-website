import axios from "axios"
import type { ApiResponse } from "@/types/api"
import type { CsrfToken } from "@/types/auth"
import { ApiRequestError, toApiError } from "@/utils/apiErrors"

const baseURL = import.meta.env.VITE_API_BASE_URL || ""
let csrfToken: CsrfToken | null = null
let csrfRequest: Promise<CsrfToken> | null = null

export function clearCsrfToken() {
  csrfToken = null
  csrfRequest = null
}

export function getCsrfToken(): Promise<CsrfToken> {
  if (csrfToken) return Promise.resolve(csrfToken)
  if (!csrfRequest) {
    csrfRequest = apiClient.get<ApiResponse<CsrfToken>>("/api/v1/auth/csrf")
      .then(({ data }) => {
        csrfToken = data.data
        return csrfToken
      }).finally(() => { csrfRequest = null })
  }
  return csrfRequest
}

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
})

apiClient.interceptors.request.use(async (config) => {
  const origin = window.location.origin
  const trustedOrigin = new URL(baseURL || "/", origin).origin
  const target = new URL(apiClient.getUri(config), origin)
  if (target.origin !== trustedOrigin || !/^\/(api|actuator)\//.test(target.pathname)) {
    throw new ApiRequestError("The API request destination is not allowed.", 0, "UNTRUSTED_DESTINATION")
  }
  if (["post", "put", "patch", "delete"].includes(config.method?.toLowerCase() || "get")) {
    const csrf = await getCsrfToken()
    config.headers.set("X-CSRF-TOKEN", csrf.token)
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    // Keep cancellation recognizable to TanStack Query.
    if (axios.isCancel(error)) return Promise.reject(error)
    const failure = toApiError(error)
    const url = axios.isAxiosError(error) ? error.config?.url || "" : ""
    if (failure.code === "CSRF_INVALID" && !url.endsWith("/auth/csrf")) {
      clearCsrfToken()
      try { await getCsrfToken() } catch { /* Next attempt can bootstrap again. */ }
      window.dispatchEvent(new Event("openshelf:check-session"))
      return Promise.reject(new ApiRequestError("Your security token expired. Please submit the form again.", 403, "CSRF_INVALID"))
    }
    if (failure.status === 401 && !/\/auth\/(login|me)$/.test(url)) {
      window.dispatchEvent(new Event("openshelf:unauthenticated"))
    }
    return Promise.reject(failure)
  },
)
