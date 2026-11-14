import type { ApiResponse } from "@/types/api"
import type { LoginRequest, RegisterRequest, User } from "@/types/auth"
import { ApiRequestError } from "@/utils/apiErrors"
import { apiClient, clearCsrfToken, getCsrfToken } from "./apiClient"

async function renewCsrf() {
  clearCsrfToken()
  // Login/logout already succeeded. A token bootstrap failure must not misreport that outcome.
  try { await getCsrfToken() } catch { clearCsrfToken() }
}

export async function getCurrentUser(signal?: AbortSignal): Promise<User | null> {
  await getCsrfToken()
  try {
    return (await apiClient.get<ApiResponse<User>>("/api/v1/auth/me", { signal })).data.data
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) return null
    throw error
  }
}

export async function register(request: RegisterRequest): Promise<User> {
  return (await apiClient.post<ApiResponse<User>>("/api/v1/auth/register", request)).data.data
}

export async function login(request: LoginRequest): Promise<User> {
  const { data } = await apiClient.post<ApiResponse<User>>("/api/v1/auth/login", request)
  await renewCsrf()
  return data.data
}

export async function logout(): Promise<void> {
  await apiClient.post("/api/v1/auth/logout")
  await renewCsrf()
}
