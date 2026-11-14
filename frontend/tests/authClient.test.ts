import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { beforeEach, describe, expect, it } from "vitest"
import { apiClient, clearCsrfToken, getCsrfToken } from "@/services/apiClient"
import * as authService from "@/services/authService"
import { ApiRequestError } from "@/utils/apiErrors"

describe("session and CSRF transport", () => {
  let tokenRequests = 0
  let mutationRequests: InternalAxiosRequestConfig[] = []
  let failMutation = false
  let meStatus = 200

  beforeEach(() => {
    clearCsrfToken()
    localStorage.clear()
    sessionStorage.clear()
    tokenRequests = 0
    mutationRequests = []
    failMutation = false
    meStatus = 200
    apiClient.defaults.adapter = async (config) => {
      let status = 200
      let payload: unknown = { success: true, data: { id: "user-1", email: "reader@example.com" } }
      if (config.url?.endsWith("/csrf")) {
        tokenRequests++
        payload = { success: true, data: { headerName: "X-CSRF-TOKEN", token: `token-${tokenRequests}` } }
      } else if (config.method === "post") {
        mutationRequests.push(config)
        if (failMutation) {
          status = 403
          payload = { success: false, error: { code: "CSRF_INVALID", message: "Expired", details: [] } }
        }
      } else if (config.url?.endsWith("/me") && meStatus !== 200) {
        status = meStatus
        payload = { success: false, error: { code: "UNAUTHENTICATED", message: "Sign in", details: [] } }
      }
      const response: AxiosResponse = { config, status, statusText: "test", data: payload, headers: {} }
      if (status >= 400) throw new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, undefined, response)
      return response
    }
  })

  it("deduplicates bootstrap requests and attaches the token before an unsafe request", async () => {
    await Promise.all([getCsrfToken(), getCsrfToken()])
    expect(tokenRequests).toBe(1)
    await authService.register({ email: "reader@example.com", password: "long test passphrase", displayName: "Reader" })
    expect(mutationRequests[0]?.headers.get("X-CSRF-TOKEN")).toBe("token-1")
    expect(mutationRequests[0]?.withCredentials).toBe(true)
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it("renews CSRF after successful login and logout", async () => {
    await authService.login({ email: "reader@example.com", password: "long test passphrase" })
    expect(tokenRequests).toBe(2)
    await authService.logout()
    expect(mutationRequests[1]?.headers.get("X-CSRF-TOKEN")).toBe("token-2")
    expect(tokenRequests).toBe(3)
  })

  it("refreshes expired CSRF without automatically replaying a mutation", async () => {
    failMutation = true
    await expect(authService.login({ email: "reader@example.com", password: "long test passphrase" }))
      .rejects.toMatchObject({ code: "CSRF_INVALID", status: 403 })
    expect(tokenRequests).toBe(2)
    expect(mutationRequests).toHaveLength(1)
    failMutation = false
    await authService.login({ email: "reader@example.com", password: "long test passphrase" })
    expect(mutationRequests[1]?.headers.get("X-CSRF-TOKEN")).toBe("token-2")
  })

  it("treats only 401 as a guest, preserving server/network failures", async () => {
    meStatus = 401
    await expect(authService.getCurrentUser()).resolves.toBeNull()
    meStatus = 503
    await expect(authService.getCurrentUser()).rejects.toBeInstanceOf(ApiRequestError)
  })

  it("never sends credentials or CSRF to an arbitrary origin", async () => {
    await expect(apiClient.post("https://evil.example/api/v1/auth/logout"))
      .rejects.toMatchObject({ code: "UNTRUSTED_DESTINATION" })
    expect(mutationRequests).toHaveLength(0)
    expect(tokenRequests).toBe(0)
    expect(axios.isCancel(new Error("network"))).toBe(false)
  })
})
